from sqlmodel import SQLModel, Field, create_engine, Session, select
from sqlalchemy import text
from typing import Optional
from typing import Sequence
import json
from dotenv import load_dotenv
import os

# ─── Models ───────────────────────────────────────────────────────────────────

class Chat(SQLModel, table=True):
    id: str = Field(primary_key=True)
    title: str = Field(default="New Chat")
    chat_type:           str = Field(default="standard")
    character_bindings:  str = Field(default="{}")  # JSON
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

# ─── Engine ───────────────────────────────────────────────────────────────────

load_dotenv()
SQLITE_PATH = os.getenv("SQLITE_PATH", "sqlite:///./memorylm.db")
engine = create_engine(SQLITE_PATH, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)
    with engine.connect() as conn:
        for col, definition in [
            ("chat_type",          "VARCHAR DEFAULT 'standard'"),
            ("character_bindings", "VARCHAR DEFAULT '{}'"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE chat ADD COLUMN {col} {definition}"))
                conn.commit()
            except Exception as e:
                if "duplicate column" not in str(e).lower() and "already exists" not in str(e).lower():
                    print(f"Migration warning (chat.{col}): {e}")

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