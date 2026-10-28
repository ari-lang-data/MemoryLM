import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from database.sqlite import (
    get_session, engine, Chat, create_lorebook, list_lorebooks, get_lorebook,
    update_lorebook, delete_lorebook_row, LOREBOOK_ENTRY_CAP, DEFAULT_LOREBOOK_ID, CharacterLorebookLink,
)
from database.chroma import get_lorebook_collection
from database.graph import  purge_entity
from models.schemas import LoreBookCreate, LoreBookUpdate, SuccessResponse

router = APIRouter()

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

@router.get("/")
def get_all(session: Session = Depends(get_session)):
    return [
        {
            "id": b.id, "title": b.title, "cover": json.loads(b.cover or {}),
            "world_id": b.world_id, "entry_cap": LOREBOOK_ENTRY_CAP,
            "created_at": b.created_at, "updated_at": b.updated_at,
        }
        for b in list_lorebooks(session)
    ]

@router.post("/")
def create(body: LoreBookCreate, session: Session = Depends(get_session)):
    book_id = str(uuid.uuid4())
    create_lorebook(session, id=book_id, title=body.title, cover=json.dumps(body.cover),
                    world_id=body.world_id, created_at=_now(), updated_at=_now())
    return {"ok": True, "id": book_id}

@router.patch("/{book_id}", response_model=SuccessResponse)
def update(book_id:str, body: LoreBookUpdate, session: Session = Depends(get_session)):
    updates = body.model_dump(exclude_unset=True)
    if "cover" in updates:
        updates["cover"] = json.dumps(updates["cover"])
    updates["updated_at"] = _now()
    if not update_lorebook(session, book_id, updates):
        raise HTTPException(status_code=404, detail="Lorebook not found")
    return SuccessResponse()

@router.delete("/{book_id}", response_model=SuccessResponse)
def delete(book_id: str, session: Session =  Depends(get_session)):
    if not get_lorebook(session, book_id):
        raise HTTPException(status_code=404, detail="Lorebook not found")
    col = get_lorebook_collection()
    ids = col.get(where={"lorebook_id": book_id}, include=[])["ids"]
    for entry_id in ids:
        purge_entity(entry_id)
    if ids:
        col.delete(ids=ids)
    delete_lorebook_row(session, book_id)
    return SuccessResponse()

class CharacterBooksUpdate(BaseModel):
    lorebook_ids: list[str]

@router.get("/by-character/{char_id}")
def books_for_character(char_id: str, session: Session = Depends(get_session)):
    links = session.exec(select(CharacterLorebookLink).where(CharacterLorebookLink.char_id == char_id)).all()
    return [l.lorebook_id for l in links]

@router.put("/by-character/{char_id}", response_model=SuccessResponse)
def set_books_for_character(char_id: str, body: CharacterBooksUpdate, session: Session = Depends(get_session)):
    for link in session.exec(select(CharacterLorebookLink).where(CharacterLorebookLink.char_id == char_id)).all():
        session.delete(link)
    for book_id in dict.fromkeys(body.lorebook_ids):      # de-duplicated, order kept
        session.add(CharacterLorebookLink(char_id=char_id, lorebook_id=book_id))
    session.commit()
    return SuccessResponse()

def backfill_default_lorebook():
    """One-off: stamp pre-existing entries into an 'Imported lore' book and keep
    existing chats pointed at it so nothing changes once retieval becomes scoped."""

    col = get_lorebook_collection()
    data = col.get(include=["metadatas"])
    orphans = [(i, m or {}) for i, m in zip(data["ids"], data["metadatas"] or []) if not (m or {}).get("lorebook_id")]
    if not orphans:
        return
    with Session(engine) as session:
        if not get_lorebook(session, DEFAULT_LOREBOOK_ID):
            create_lorebook(
                session, id=DEFAULT_LOREBOOK_ID, title="Imported lore",
                cover=json.dumps({"h1": 28, "h2": 215, "h3": 38, "angle": 160, "seed": 7}),
                world_id=None, created_at=_now(), updated_at=_now(),
            )
        for chat in session.exec(select(Chat)).all():
            if (chat.lorebook_ids or "[]") == "[]":
                chat.lorebook_ids = json.dumps([DEFAULT_LOREBOOK_ID])
                session.add(chat)
        session.commit()
    col.update(ids=[i for i, _ in orphans], metadatas=[{**m, "lorebook_id": DEFAULT_LOREBOOK_ID} for _, m in orphans])
        