from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database.sqlite import get_session, create_chat, get_all_chats, get_chat, update_chat, delete_chat
from database.chroma import get_memories_collection
from models.schemas import ChatCreate, ChatUpdate, SuccessResponse

router = APIRouter()

@router.post("/", response_model=SuccessResponse)
def create(body: ChatCreate, session: Session = Depends(get_session)):
    create_chat(session, body.id, body.title, body.created_at, body.updated_at)
    return SuccessResponse()

@router.get("/")
def get_all(session: Session = Depends(get_session)):
    return get_all_chats(session)

@router.patch("/{chat_id}", response_model=SuccessResponse)
def update(chat_id: str, body: ChatUpdate, session: Session = Depends(get_session)):
    result = update_chat(session, chat_id, body.title, body.updated_at)
    if not result:
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