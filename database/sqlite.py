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
    created_at: str
    updated_at: str

class Preset(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    icon: str = Field(default="✨")
    system_prompt: str
    config: str = Field(default="{}")  # JSON string

# ─── Engine ───────────────────────────────────────────────────────────────────

from sqlmodel import create_engine, Session

load_dotenv()
SQLITE_PATH = os.getenv("SQLITE_PATH", "sqlite:///./memorylm.db")
engine = create_engine(SQLITE_PATH, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)

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
            "systemPrompt": p.system_prompt,  # camelCase for frontend
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