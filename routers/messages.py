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
    id:               str = ""
    parentId:         str | None = None
    role:             str
    content:          str
    injectedMems:     int = 0
    injectedLore:     int = 0
    injectedMemData:  list = []
    injectedLoreData: list = []
    implicit:         bool = False
    finishReason:     str = "stop"
    reasoning:        str | None = None
    timestamp:        str = ""

class ChatMessages(BaseModel):
    nodes:          list[Message]
    activeChildren: dict[str, str] = {}

# ─── Migration helper ─────────────────────────────────────────────────────────

def migrate_flat(data: list) -> dict:
    """Convert legacy flat array to node/activeChildren format."""
    nodes          = []
    activeChildren = {}
    prev_id        = None

    for i, msg in enumerate(data):
        node_id = msg.get("id") or f"msg_legacy_{i}"
        node    = { **msg, "id": node_id, "parentId": prev_id }
        nodes.append(node)
        if prev_id:
            activeChildren[prev_id] = node_id
        prev_id = node_id

    return { "nodes": nodes, "activeChildren": activeChildren }

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/{chat_id}")
def get_messages(chat_id: str):
    f = chat_file(chat_id)
    if not f.exists():
        return { "nodes": [], "activeChildren": {} }
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        # File is corrupted — return empty and let frontend start fresh
        f.unlink()
        return { "nodes": [], "activeChildren": {} }
    if isinstance(data, list):
        data = migrate_flat(data)
        f.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

@router.post("/{chat_id}")
def save_messages(chat_id: str, body: ChatMessages):
    chat_file(chat_id).write_text(
        json.dumps({
            "nodes":          [m.model_dump() for m in body.nodes],
            "activeChildren": body.activeChildren,
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    return { "ok": True }

@router.delete("/{chat_id}")
def clear_messages(chat_id: str):
    f = chat_file(chat_id)
    if f.exists():
        f.unlink()
    return { "ok": True }