from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import json

router = APIRouter()

MESSAGES_DIR = Path("./messages")
MESSAGES_DIR.mkdir(exist_ok=True)

def chat_file(chat_id: str) -> Path:
    return MESSAGES_DIR / f"{chat_id}.json"

# ─── Models ───────────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str
    injectedMems: int = 0
    injectedLore: int = 0

class MessagesSave(BaseModel):
    messages: list[Message]

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/{chat_id}")
def get_messages(chat_id: str):
    f = chat_file(chat_id)
    if not f.exists():
        return []
    return json.loads(f.read_text(encoding="utf-8"))

@router.post("/{chat_id}")
def save_messages(chat_id: str, body: MessagesSave):
    chat_file(chat_id).write_text(
        json.dumps([m.model_dump() for m in body.messages], ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    return {"ok": True}

@router.delete("/{chat_id}")
def clear_messages(chat_id: str):
    f = chat_file(chat_id)
    if f.exists():
        f.unlink()
    return {"ok": True}