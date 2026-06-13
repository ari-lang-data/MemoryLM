import asyncio
import json
from database.queue import push_sse, discharge, enqueue
from database.graph import execute as graph_execute
from models.events import QueueItem
import httpx
import os

LM_URL = os.getenv("LM_STUDIO_URL", "http://localhost:1234")

async def handle_generate(item: QueueItem):
    """
    Generate handler — streams a response as the given character.
    Context construction payload comes from the frontend.
    """
    chat_id  = item.chat_id
    char_id  = item.payload.get("char_id")
    messages = item.payload.get("messages", [])   # history from frontend
    injected = item.payload.get("system_prompt", "")  # assembled by frontend
    model    = item.payload.get("model", "")

    if not messages:
        push_sse(chat_id, {
            "event": "turn_dropped",
            "id":    item.id,
            "data":  {"chat_id": chat_id, "char_id": char_id, "reason": "empty_history"},
        })
        return

    node_id = f"msg_{item.id}"

    # Signal frontend to create a placeholder node
    push_sse(chat_id, {
        "event": "turn_start",
        "id":    item.id,
        "data":  {
            "chat_id": chat_id,
            "char_id": char_id,
            "node_id": node_id,
            "reason":  item.payload.get("reason", ""),
        },
    })

    # ── Stream from LM ───────────────────────────────────────────────────────
    accumulated = ""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{LM_URL}/v1/chat/completions",
                json={
                    "model":      model or None,
                    "messages":   messages,
                    "system":     injected,
                    "stream":     True,
                    "max_tokens": item.payload.get("max_tokens", 1024),
                },
            ) as resp:
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    chunk = line[6:]
                    if chunk.strip() == "[DONE]":
                        break
                    try:
                        data    = json.loads(chunk)
                        content = data["choices"][0]["delta"].get("content", "")
                        if content:
                            accumulated += content
                            # Token events are NOT buffered — ephemeral
                            get_sse_queue = __import__(
                                "database.queue", fromlist=["get_sse_queue"]
                            ).get_sse_queue
                            try:
                                get_sse_queue(chat_id).put_nowait({
                                    "event": "token",
                                    "data":  {
                                        "chat_id": chat_id,
                                        "node_id": node_id,
                                        "content": content,
                                    },
                                })
                            except asyncio.QueueFull:
                                pass
                    except Exception:
                        continue
    except Exception as e:
        push_sse(chat_id, {
            "event": "turn_dropped",
            "id":    item.id,
            "data":  {"chat_id": chat_id, "char_id": char_id, "reason": str(e)},
        })
        return

    # ── Discharge activation ─────────────────────────────────────────────────
    if char_id:
        discharge(chat_id, char_id)

    # ── Signal turn complete ─────────────────────────────────────────────────
    push_sse(chat_id, {
        "event": "turn_completed",
        "id":    item.id,
        "data":  {
            "chat_id":  chat_id,
            "char_id":  char_id,
            "node_id":  node_id,
            "content":  accumulated,
            "caused_by": item.caused_by,
        },
    })