from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database.sqlite import get_session, create_chat, get_all_chats, get_chat, update_chat, delete_chat
from database.chroma import get_memories_collection
from models.schemas import ChatCreate, ChatUpdate, ChatBindCharacters, SuccessResponse
from database.sqlite import bind_chat_characters
import json

router = APIRouter()

@router.post("/", response_model=SuccessResponse)
def create(body: ChatCreate, session: Session = Depends(get_session)):
    create_chat(session, body.id, body.title, body.created_at, body.updated_at)
    return SuccessResponse()

@router.get("/")
def get_all(session: Session = Depends(get_session)):
    chats = get_all_chats(session)
    return [
        {
            "id":                  c.id,
            "title":               c.title,
            "created_at":          c.created_at,
            "updated_at":          c.updated_at,
            "chat_type":           c.chat_type,
            "character_bindings":  json.loads(c.character_bindings or "{}"),
        }
        for c in chats
    ]

@router.patch("/{chat_id}", response_model=SuccessResponse)
def update(chat_id: str, body: ChatUpdate, session: Session = Depends(get_session)):
    result = update_chat(session, chat_id, body.title, body.updated_at)
    if not result:
        raise HTTPException(status_code=404, detail="Chat not found")
    return SuccessResponse()

@router.patch("/{chat_id}/bind", response_model=SuccessResponse)
def bind_characters(chat_id: str, body: ChatBindCharacters, session: Session = Depends(get_session)):
    bindings = {
        "active_char_id": body.active_char_id,
        "user_char_id":   body.user_char_id,
        "chat_type":      body.chat_type,
        "members":        body.members,
    }
    if not bind_chat_characters(session, chat_id, bindings):
        raise HTTPException(status_code=404, detail="Chat not found")
    return SuccessResponse()

@router.delete("/{chat_id}", response_model=SuccessResponse)
def delete(chat_id: str, session: Session = Depends(get_session)):
    # Also wipe this chat's memories from ChromaDB
    col = get_memories_collection()
    existing = col.get(where={"chat_id": chat_id})
    if existing["ids"]:
        col.delete(ids=existing["ids"])
    result = delete_chat(session, chat_id)
    if not result:
        raise HTTPException(status_code=404, detail="Chat not found")
    return SuccessResponse()