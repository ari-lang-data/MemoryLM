from sqlmodel import SQLModel, Field, create_engine, Session, select
from sqlalchemy import text
from typing import Optional
from typing import Sequence
import json
from dotenv import load_dotenv
import os

import datetime
import hashlib
import secrets
import uuid

# ─── Models ───────────────────────────────────────────────────────────────────

class Chat(SQLModel, table=True):
    id: str = Field(primary_key=True)
    title: str = Field(default="New Chat")
    chat_type:           str = Field(default="standard")
    character_bindings:  str = Field(default="{}")  # JSON
    world_id: Optional[str] = Field(default=None)
    activation_state: str = Field(default="{}")
    active_children: str = Field(default="{}")
    archived: bool = Field(default=False)
    created_at: str
    updated_at: str

class Preset(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    icon: str = Field(default="✨")
    system_prompt: str
    config: str = Field(default="{}")  # JSON string

class EpisodicInference(SQLModel, table=True):
    """
    An inferred consequence derived from one or more episodic memories.
    Remains active until contradictory evidence triggers resolution.

    source_episode_ids: JSON array of memory IDs (ChromaDB). Stored as plain
    JSON — no FK constraint since ChromaDB is not SQLite. Validated on write.
    """
    id:                  str            = Field(primary_key=True)
    chat_id:             str            = Field(index=True)
    state:               str                               # the inferred consequence
    status:              str            = Field(default="active")   # "active" | "resolved"
    confidence:          float          = Field(default=1.0)        # 0.0–1.0
    source_episode_ids:  str            = Field(default="[]")       # JSON array of memory IDs
    resolution:          Optional[str]  = Field(default=None)       # how it was resolved
    replacement_state:   Optional[str]  = Field(default=None)       # superseding state if applicable
    world_time_at_update: Optional[int] = Field(default=None)       # world-minutes, if chat has a world
    created_at:          str
    updated_at:          str

class Fact(SQLModel, table=True):
    """
    A discrete fact extracted from episodic memories.
    Separate from inferences — facts record what happened,
    inferences record the ongoing consequence.

    source_episode_ids: JSON array of memory IDs. Same validation contract
    as EpisodicInference.source_episode_ids.
    """
    id:                  str    = Field(primary_key=True)
    chat_id:             str    = Field(index=True)
    content:             str                              # the fact itself
    confidence:          float  = Field(default=1.0)     # 0.0–1.0
    source_episode_ids:  str    = Field(default="[]")    # JSON array of memory IDs
    created_at:          str

from sqlmodel import UniqueConstraint

class MessageNode(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("chat_id", "id", name="uq_messagenode_chat_msg"),)
    row_id:        Optional[int] = Field(default=None, primary_key=True)
    id:            str           = Field(index=True)
    chat_id:       str           = Field(index=True)
    parent_id:     Optional[str] = Field(default=None, index=True)
    role:          str
    content:       str
    implicit:      bool          = False
    finish_reason: str           = "stop"
    reasoning:     Optional[str] = None
    timestamp:     str           = ""
    regenerated:   bool          = False
    char_id:       Optional[str] = None
    char_name:     Optional[str] = None
    injected_mems: int           = 0
    injected_lore: int           = 0
    injected_refs: str           = "{}"

DEFAULT_CALENDAR = {
    "minutes_per_day":   1440,
    "days_per_month":    [30] * 12,          # uniform default, override per world
    "month_names":       [f"Month {i+1}" for i in range(12)],
    "day_names":         ["Day1","Day2","Day3","Day4","Day5","Day6","Day7"],
    "epoch_label":       str(datetime.date.today().year),
    "dawn_offset":       360,   # 06:00
    "morning_offset":    480,   # 08:00
    "evening_offset":    1080,  # 18:00
    "night_offset":      1320,  # 22:00
}

class World(SQLModel, table=True):
    id:                     str = Field(primary_key=True)
    name:                   str
    blurb:                  str = Field(default="")   # short, shown to user during selection
    llm_context:            str = Field(default="")   # scene-setting brief, sent to the model
    preset_id:              Optional[str] = None
    calendar_config:        str = Field(default=json.dumps(DEFAULT_CALENDAR))
    current_offset_minutes: int = Field(default=0)
    created_at:             str
    updated_at:             str

class WorldCharacterLink(SQLModel, table=True):
    id:         Optional[int] = Field(default=None, primary_key=True)
    world_id:   str = Field(index=True)
    char_id:    str = Field(index=True)   # DuckDB entity id — no FK, cross-store by convention

# ─── Engine ───────────────────────────────────────────────────────────────────

load_dotenv()
SQLITE_PATH = os.getenv("SQLITE_PATH", "sqlite:///./memorylm.db")
engine = create_engine(SQLITE_PATH, echo=False)

# database/sqlite.py — replace the migration section inside init_db()
SQLITE_MIGRATIONS = [
    ("chat", "chat_type",           "VARCHAR DEFAULT 'standard'"),
    ("chat", "character_bindings",  "VARCHAR DEFAULT '{}'"),
    ("chat", "activation_state",    "VARCHAR DEFAULT '{}'"),
    ("chat", "active_children",     "VARCHAR DEFAULT '{}'"),
    ("chat", "world_id",            "VARCHAR DEFAULT NULL"),
    ("episodicinference", "world_time_at_update", "INTEGER DEFAULT NULL"),
]

def init_db():
    SQLModel.metadata.create_all(engine)
    with engine.connect() as conn:
        for table, col, definition in SQLITE_MIGRATIONS:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {definition}"))
                conn.commit()
            except Exception as e:
                msg = str(e).lower()
                if "duplicate column" not in msg and "already exists" not in msg:
                    print(f"Migration warning ({table}.{col}): {e}")
                    
def get_session():
    with Session(engine) as session:
        yield session

# ─── Chat helpers ─────────────────────────────────────────────────────────────

def create_chat(session: Session, id: str, title: str, created_at: str, updated_at: str) -> Chat:
    chat = Chat(id=id, title=title, created_at=created_at, updated_at=updated_at)
    session.add(chat)
    session.commit()
    session.refresh(chat)
    return chat

def get_all_chats(session: Session) -> Sequence[Chat]:
    return session.exec(select(Chat).order_by(Chat.created_at)).all()

def get_chat(session: Session, chat_id: str) -> Optional[Chat]:
    return session.get(Chat, chat_id)

def update_chat(session: Session, chat_id: str, title: Optional[str], updated_at: str) -> Optional[Chat]:
    chat = session.get(Chat, chat_id)
    if not chat:
        return None
    if title is not None:
        chat.title = title
    chat.updated_at = updated_at
    session.add(chat)
    session.commit()
    session.refresh(chat)
    return chat

def delete_chat(session: Session, chat_id: str) -> bool:
    chat = session.get(Chat, chat_id)
    if not chat:
        return False
    session.delete(chat)
    session.commit()
    return True

def bind_chat_characters(session: Session, chat_id: str, bindings: dict) -> bool:
    chat = session.get(Chat, chat_id)
    if not chat:
        return False
    chat.character_bindings = json.dumps(bindings)
    if bindings.get("chat_type"):
        chat.chat_type = bindings["chat_type"]
    session.add(chat)
    session.commit()
    return True

def set_chat_world(session: Session, chat_id: str, world_id: Optional[str]) -> bool:
    chat = session.get(Chat, chat_id)
    if not chat:
        return False
    chat.world_id = world_id
    session.add(chat)
    session.commit()
    return True

def set_chat_archived(session: Session, chat_id: str, archived: bool) -> bool:
    chat = session.get(Chat, chat_id)
    if not chat:
        return False
    chat.archived = archived
    session.add(chat)
    session.commit()
    return True

# ─── Preset helpers ───────────────────────────────────────────────────────────

def save_preset(session: Session, id: str, name: str, icon: str, system_prompt: str, config: dict) -> Preset:
    existing = session.get(Preset, id)
    if existing:
        existing.name = name
        existing.icon = icon
        existing.system_prompt = system_prompt
        existing.config = json.dumps(config)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    preset = Preset(id=id, name=name, icon=icon, system_prompt=system_prompt, config=json.dumps(config))
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return preset

def get_all_presets(session: Session) -> list[dict]:
    presets = session.exec(select(Preset)).all()
    return [
        {
            "id":           p.id,
            "name":         p.name,
            "icon":         p.icon,
            "systemPrompt": p.system_prompt,
            "config":       json.loads(p.config),
        }
        for p in presets
    ]

def delete_preset(session: Session, preset_id: str) -> bool:
    preset = session.get(Preset, preset_id)
    if not preset:
        return False
    session.delete(preset)
    session.commit()
    return True

# ─── EpisodicInference helpers ────────────────────────────────────────────────

def create_inference(
    session: Session,
    id: str,
    chat_id: str,
    state: str,
    confidence: float,
    source_episode_ids: list[str],
    created_at: str,
) -> EpisodicInference:
    inference = EpisodicInference(
        id=id,
        chat_id=chat_id,
        state=state,
        status="active",
        confidence=confidence,
        source_episode_ids=json.dumps(source_episode_ids),
        created_at=created_at,
        updated_at=created_at,
    )
    session.add(inference)
    session.commit()
    session.refresh(inference)
    return inference

def get_inferences(session: Session, chat_id: str, status: Optional[str] = None) -> list[dict]:
    query = select(EpisodicInference).where(EpisodicInference.chat_id == chat_id)
    if status:
        query = query.where(EpisodicInference.status == status)
    rows = session.exec(query).all()
    return [_inference_to_dict(r) for r in rows]

def get_inference(session: Session, inference_id: str) -> Optional[EpisodicInference]:
    return session.get(EpisodicInference, inference_id)

def resolve_inference(
    session: Session,
    inference_id: str,
    resolution: str,
    replacement_state: Optional[str],
    updated_at: str,
) -> Optional[EpisodicInference]:
    inference = session.get(EpisodicInference, inference_id)
    if not inference:
        return None
    inference.status            = "resolved"
    inference.resolution        = resolution
    inference.replacement_state = replacement_state
    inference.updated_at        = updated_at
    session.add(inference)
    session.commit()
    session.refresh(inference)
    return inference

def update_inference_confidence(
    session: Session,
    inference_id: str,
    confidence: float,
    updated_at: str,
) -> Optional[EpisodicInference]:
    inference = session.get(EpisodicInference, inference_id)
    if not inference:
        return None
    inference.confidence  = confidence
    inference.updated_at  = updated_at
    session.add(inference)
    session.commit()
    session.refresh(inference)
    return inference

def delete_inference(session: Session, inference_id: str) -> bool:
    inference = session.get(EpisodicInference, inference_id)
    if not inference:
        return False
    session.delete(inference)
    session.commit()
    return True

def _inference_to_dict(i: EpisodicInference) -> dict:
    return {
        "id":                 i.id,
        "chat_id":            i.chat_id,
        "state":              i.state,
        "status":             i.status,
        "confidence":         i.confidence,
        "source_episode_ids": json.loads(i.source_episode_ids),
        "resolution":         i.resolution,
        "replacement_state":  i.replacement_state,
        "created_at":         i.created_at,
        "updated_at":         i.updated_at,
    }

# ─── Fact helpers ─────────────────────────────────────────────────────────────

def create_fact(
    session: Session,
    id: str,
    chat_id: str,
    content: str,
    confidence: float,
    source_episode_ids: list[str],
    created_at: str,
) -> Fact:
    fact = Fact(
        id=id,
        chat_id=chat_id,
        content=content,
        confidence=confidence,
        source_episode_ids=json.dumps(source_episode_ids),
        created_at=created_at,
    )
    session.add(fact)
    session.commit()
    session.refresh(fact)
    return fact

def get_facts(session: Session, chat_id: str) -> list[dict]:
    rows = session.exec(select(Fact).where(Fact.chat_id == chat_id)).all()
    return [_fact_to_dict(r) for r in rows]

def get_fact(session: Session, fact_id: str) -> Optional[Fact]:
    return session.get(Fact, fact_id)

def delete_fact(session: Session, fact_id: str) -> bool:
    fact = session.get(Fact, fact_id)
    if not fact:
        return False
    session.delete(fact)
    session.commit()
    return True

def _fact_to_dict(f: Fact) -> dict:
    return {
        "id":                 f.id,
        "chat_id":            f.chat_id,
        "content":            f.content,
        "confidence":         f.confidence,
        "source_episode_ids": json.loads(f.source_episode_ids),
        "created_at":         f.created_at,
    }

# ─── Message helpers ───────────────────────────────────────────────────────
 
def _get_node(session: Session, chat_id: str, node_id: str) -> Optional[MessageNode]:
    return session.exec(
        select(MessageNode).where(MessageNode.chat_id == chat_id, MessageNode.id == node_id)
    ).first()

def add_message_node(session: Session, node: dict) -> MessageNode:
    m = MessageNode(
        id=            node["id"],
        chat_id=       node["chat_id"],
        parent_id=     node.get("parentId"),
        role=          node["role"],
        content=       node.get("content", ""),
        implicit=      node.get("implicit", False),
        finish_reason= node.get("finishReason", "stop"),
        reasoning=     node.get("reasoning"),
        timestamp=     node.get("timestamp", ""),
        regenerated=   node.get("regenerated", False),
        char_id=       node.get("char_id"),
        char_name=     node.get("char_name"),
        injected_mems= node.get("injectedMems", 0),
        injected_lore= node.get("injectedLore", 0),
        injected_refs= json.dumps(node.get("injectedRefs", {})),
    )
    session.add(m)
    session.commit()
    session.refresh(m)
    return m
 
def update_message_node(session: Session, chat_id: str, node_id: str, updates: dict) -> Optional[MessageNode]:
    m = _get_node(session, chat_id, node_id)
    if not m:
        return None
    if "content"      in updates: m.content       = updates["content"]
    if "finishReason" in updates: m.finish_reason  = updates["finishReason"]
    if "reasoning"    in updates: m.reasoning      = updates["reasoning"]
    if "injectedMems" in updates: m.injected_mems  = updates["injectedMems"]
    if "injectedLore" in updates: m.injected_lore  = updates["injectedLore"]
    if "injectedRefs" in updates: m.injected_refs  = json.dumps(updates["injectedRefs"])
    session.add(m)
    session.commit()
    session.refresh(m)
    return m
 
def delete_message_node(session: Session, chat_id: str, node_id: str) -> bool:
    m = _get_node(session, chat_id, node_id)
    if not m:
        return False
    session.delete(m)
    session.commit()
    return True

def truncate_after_node(session: Session, chat_id: str, node_id: str) -> bool:
    """Delete every descendant of node_id, keeping node_id itself. Used by rewind."""
    all_nodes = session.exec(select(MessageNode).where(MessageNode.chat_id == chat_id)).all()
    by_parent: dict = {}
    for n in all_nodes:
        by_parent.setdefault(n.parent_id, []).append(n)

    to_delete = []
    def collect(pid):
        for child in by_parent.get(pid, []):
            to_delete.append(child)
            collect(child.id)
    collect(node_id)

    if not to_delete:
        return True  # nothing after this node — valid no-op

    deleted_ids = {n.id for n in to_delete}
    for n in to_delete:
        session.delete(n)

    chat = session.get(Chat, chat_id)
    if chat:
        active_children = json.loads(chat.active_children or "{}")
        pruned = {k: v for k, v in active_children.items() if k not in deleted_ids and v not in deleted_ids}
        chat.active_children = json.dumps(pruned)
        session.add(chat)

    session.commit()
    return True
 
def get_chat_message_nodes(session: Session, chat_id: str) -> list[dict]:
    rows = session.exec(select(MessageNode).where(MessageNode.chat_id == chat_id)).all()
    return [_node_to_dict(m) for m in rows]
 
def clear_chat_messages(session: Session, chat_id: str) -> bool:
    rows = session.exec(select(MessageNode).where(MessageNode.chat_id == chat_id)).all()
    for m in rows:
        session.delete(m)
    session.commit()
    return True
 
def replace_chat_messages(session: Session, chat_id: str, nodes: list[dict], active_children: dict):
    """Bulk replace — used by fork and by the JSON migration. Transactional."""
    existing = session.exec(select(MessageNode).where(MessageNode.chat_id == chat_id)).all()
    for m in existing:
        session.delete(m)
    for node in nodes:
        node = {**node, "chat_id": chat_id}
        m = MessageNode(
            id=            node["id"],
            chat_id=       chat_id,
            parent_id=     node.get("parentId"),
            role=          node["role"],
            content=       node.get("content", ""),
            implicit=      node.get("implicit", False),
            finish_reason= node.get("finishReason", "stop"),
            reasoning=     node.get("reasoning"),
            timestamp=     node.get("timestamp", ""),
            regenerated=   node.get("regenerated", False),
            char_id=       node.get("char_id"),
            char_name=     node.get("char_name"),
            injected_mems= node.get("injectedMems", 0),
            injected_lore= node.get("injectedLore", 0),
            injected_refs= json.dumps(node.get("injectedRefs", {})),
        )
        session.add(m)
    set_active_children(session, chat_id, active_children, commit=False)
    session.commit()
 
def set_active_children(session: Session, chat_id: str, active_children: dict, commit: bool = True) -> bool:
    chat = session.get(Chat, chat_id)
    if not chat:
        return False
    chat.active_children = json.dumps(active_children)
    session.add(chat)
    if commit:
        session.commit()
    return True
 
def get_active_children(session: Session, chat_id: str) -> dict:
    chat = session.get(Chat, chat_id)
    if not chat:
        return {}
    return json.loads(chat.active_children or "{}")
 
def _node_to_dict(m: MessageNode) -> dict:
    return {
        "id":               m.id,
        "parentId":         m.parent_id,
        "role":             m.role,
        "content":          m.content,
        "implicit":         m.implicit,
        "finishReason":     m.finish_reason,
        "reasoning":        m.reasoning,
        "timestamp":        m.timestamp,
        "regenerated":      m.regenerated,
        "char_id":          m.char_id,
        "char_name":        m.char_name,
        "injectedMems":     m.injected_mems,
        "injectedLore":     m.injected_lore,
        "injectedRefs":     json.loads(m.injected_refs or "{}"),
    }

# ―――――― Authentication ――――――――――――――――――――――――――――――――――――――――――――――――
from datetime import datetime, timezone

class ApiToken(SQLModel, table=True):
    id: str = Field(primary_key=True)
    label: str
    token_hash: str
    created_at: str
    last_used_at: Optional[str] = None

def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()

def create_api_token(session: Session, label: str) -> str:
    """Returns the raw token — this is the only moment it's ever visible again."""
    raw = secrets.token_urlsafe(32)
    session.add(ApiToken(
        id=str(uuid.uuid4()),
        label=label,
        token_hash=hash_token(raw),
        created_at=datetime.now(timezone.utc).isoformat(),
    ))
    session.commit()
    return raw

def list_api_tokens(session: Session):
    return session.exec(select(ApiToken)).all()

def revoke_api_token(session: Session, token_id: str) -> bool:
    token = session.get(ApiToken, token_id)
    if not token:
        return False
    session.delete(token)
    session.commit()
    return True

def verify_api_token(session: Session, raw: str) -> bool:
    if not raw:
        return False
    token = session.exec(select(ApiToken).where(ApiToken.token_hash == hash_token(raw))).first()
    if not token:
        return False
    token.last_used_at = datetime.now(timezone.utc).isoformat()
    session.add(token)
    session.commit()
    return True