import json
import re
import asyncio
from datetime import datetime, timezone
from database.queue import (
    enqueue, push_sse, stimulate, discharge,
    characters_above_threshold, serialise_activation,
)
from database.graph import execute as graph_execute
from models.events import QueueItem, SpeakerDecision
import httpx
import os

DIRECTOR_URL       = os.getenv("DIRECTOR_URL",   "http://localhost:1234")
DIRECTOR_MODEL     = os.getenv("DIRECTOR_MODEL", "")
DIRECTOR_MAX_TOK   = 256

def _get_group_members(chat_id: str, preset_id: str) -> list[dict]:
    """Fetch character cards for all group members of this chat."""
    from database.sqlite import engine
    from sqlmodel import Session, select, text
    with Session(engine) as session:
        result = session.execute(
            text("SELECT character_bindings FROM chat WHERE id = :id"),
            {"id": chat_id}
        ).fetchone()
    if not result:
        return []
    bindings = json.loads(result[0] or "{}")
    member_ids = bindings.get("members", [])
    if not member_ids:
        return []

    chars = []
    for mid in member_ids:
        rows = graph_execute(
            """SELECT e.id, e.name, c.narrative_alias, c.bias
               FROM entities e
               LEFT JOIN character_cards c ON e.id = c.id
               WHERE e.id = ?""",
            [mid]
        )
        if rows:
            r = rows[0]
            chars.append({
                "id":             r[0],
                "name":           r[1],
                "narrative_alias": r[2],
                "bias":           float(r[3]) if r[3] is not None else 0.5,
            })
    return chars

def _build_alias_map(members: list[dict]) -> dict[str, str]:
    """Map lowercased name and alias → char_id for O(1) string match."""
    mapping = {}
    for m in members:
        mapping[m["name"].lower()] = m["id"]
        if m.get("narrative_alias"):
            mapping[m["narrative_alias"].lower()] = m["id"]
    return mapping

def _string_match(content: str, alias_map: dict[str, str]) -> list[str]:
    """Return list of char_ids whose name/alias appears in content."""
    content_lower = content.lower()
    return list({
        char_id
        for alias, char_id in alias_map.items()
        if re.search(r'\b' + re.escape(alias) + r'\b', content_lower)
    })

def _graph_stimuli(chat_id: str, matched_id: str, members: list[dict], content: str):
    """
    Traverse graph from matched character.
    Apply relationship stimuli to connected group members.
    """
    try:
        edges = graph_execute(
            "SELECT target_id, weight FROM edges WHERE source_id = ?",
            [matched_id]
        )
    except Exception:
        return

    member_ids = {m["id"] for m in members}
    bias_map   = {m["id"]: m.get("bias", 0.5) for m in members}

    for row in edges:
        target_id, weight = row[0], float(row[1])
        if target_id not in member_ids:
            continue
        stimulate(
            chat_id, target_id,
            "CharacterMentioned",
            edge_weight=weight,
            bias=bias_map.get(target_id, 0.5),
        )

async def _call_director(
    candidates:  list[tuple[str, float]],
    members:     list[dict],
    last_content: str,
) -> list[SpeakerDecision]:
    """
    Call director LLM with candidates above threshold.
    Returns ordered list of SpeakerDecisions.
    """
    id_to_name = {m["id"]: m.get("narrative_alias") or m["name"] for m in members}
    candidate_lines = "\n".join(
        f"- {id_to_name.get(cid, cid)} (id: {cid}, activation: {val:.2f})"
        for cid, val in candidates
    )

    prompt = f"""You are a narrative director for a group roleplay session.

Last message: "{last_content[:300]}"

Characters with activation above threshold:
{candidate_lines}

Decide which characters should speak and in what order.
Reply ONLY with a JSON array, no preamble, no markdown:
[
  {{"speaker": "<char_id>", "priority": <0.0-1.0>, "reason": "<direct_address|mentioned|relationship_pressure|narrative_focus|ambient>"}},
  ...
]
Be conservative. If a character has no compelling reason to speak, omit them."""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{DIRECTOR_URL}/v1/chat/completions",
                json={
                    "model":      DIRECTOR_MODEL or None,
                    "messages":   [
                        {"role": "system", "content": "You are a narrative director. Return only JSON arrays."},
                        {"role": "user",   "content": prompt},
                    ],
                    "max_tokens": DIRECTOR_MAX_TOK,
                    "stream":     False,
                },
            )
        raw = resp.json()["choices"][0]["message"]["content"]
        clean = raw.replace("```json", "").replace("```", "").strip()
        data  = json.loads(clean)
        return [
            SpeakerDecision(
                speaker=  d["speaker"],
                priority= float(d["priority"]),
                reason=   d["reason"],
            )
            for d in data
            if "speaker" in d and "priority" in d and "reason" in d
        ]
    except Exception:
        # Director failed — fall back to activation order without LLM
        return [
            SpeakerDecision(speaker=cid, priority=val, reason="narrative_focus")
            for cid, val in candidates
        ]

async def handle_evaluate(item: QueueItem, preset_id: str):
    """
    Evaluate handler — string match → graph traversal → activation → director.
    Enqueues Generate tasks for confirmed speakers.
    """
    chat_id = item.chat_id
    content = item.payload.get("content", "")
    members = _get_group_members(chat_id, preset_id)

    if not members:
        return

    # ── 1. Ambient UserSent stimulus ─────────────────────────────────────────
    bias_map = {m["id"]: m.get("bias", 0.5) for m in members}
    for m in members:
        stimulate(chat_id, m["id"], "UserSent", bias=m.get("bias", 0.5))

    # ── 2. String match ──────────────────────────────────────────────────────
    alias_map = _build_alias_map(members)
    matched   = _string_match(content, alias_map)

    # ── 3. Graph traversal + direct stimulus for matches ────────────────────
    for char_id in matched:
        # Direct stimulus for the matched character
        stimulate(
            chat_id, char_id,
            "CharacterMentioned",
            edge_weight=1.0,
            bias=bias_map.get(char_id, 0.5),
        )
        # Relationship stimuli for connected characters
        _graph_stimuli(chat_id, char_id, members, content)

    # ── 4. Check threshold ───────────────────────────────────────────────────
    candidates = characters_above_threshold(chat_id)
    if not candidates:
        push_sse(chat_id, {"event": "scene_pause", "data": {"chat_id": chat_id}})
        return

    # ── 5. Director LLM ──────────────────────────────────────────────────────
    decisions = await _call_director(candidates, members, content)
    if not decisions:
        push_sse(chat_id, {"event": "scene_pause", "data": {"chat_id": chat_id}})
        return

    # ── 6. Enqueue Generate tasks in priority order ──────────────────────────
    for decision in decisions:
        await enqueue(QueueItem(
            kind=       "task",
            task_type=  "Generate",
            chat_id=    chat_id,
            priority=   decision.priority,
            caused_by=  item.id,
            payload={
                "char_id": decision.speaker,
                "reason":  decision.reason,
            },
        ))
        push_sse(chat_id, {
            "event": "speaker_queued",
            "id":    item.id,
            "data":  {
                "chat_id":  chat_id,
                "char_id":  decision.speaker,
                "priority": decision.priority,
                "reason":   decision.reason,
            },
        })

    # ── 7. Persist activation state ──────────────────────────────────────────
    from database.sqlite import engine
    from sqlmodel import Session, text
    with Session(engine) as session:
        session.execute(
            text("UPDATE chat SET activation_state = :state WHERE id = :id"),
            {"state": serialise_activation(chat_id), "id": chat_id}
        )
        session.commit()