from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
from backend.database.sqlite import get_session, World, WorldCharacterLink, DEFAULT_CALENDAR
from backend.database.worldtime import advance_world_time, format_world_time
from datetime import datetime, timezone
import json, uuid

router = APIRouter()

def now(): return datetime.now(timezone.utc).isoformat()

class WorldCreate(BaseModel):
    name: str
    blurb: str = ""
    llm_context: str = ""
    preset_id: Optional[str] = None
    calendar_config: dict = DEFAULT_CALENDAR

class AdvanceRequest(BaseModel):
    text: str

@router.post("/")
def create_world(body: WorldCreate, session: Session = Depends(get_session)):
    world = World(
        id=str(uuid.uuid4()), name=body.name, description=body.description,
        preset_id=body.preset_id, calendar_config=json.dumps(body.calendar_config),
        current_offset_minutes=0, created_at=now(), updated_at=now(),
    )
    session.add(world); session.commit(); session.refresh(world)
    return world

@router.get("/")
def list_worlds(preset_id: Optional[str] = None, session: Session = Depends(get_session)):
    q = select(World)
    if preset_id: q = q.where(World.preset_id == preset_id)
    worlds = session.exec(q).all()
    return [{
        **w.model_dump(),
        "formatted_time": format_world_time(w.current_offset_minutes, json.loads(w.calendar_config)),
    } for w in worlds]

@router.get("/{world_id}")
def get_world(world_id: str, session: Session = Depends(get_session)):
    w = session.get(World, world_id)
    if not w: raise HTTPException(404, "World not found")
    return {**w.model_dump(), "formatted_time": format_world_time(w.current_offset_minutes, json.loads(w.calendar_config))}

@router.post("/{world_id}/advance")
def advance(world_id: str, body: AdvanceRequest, session: Session = Depends(get_session)):
    new_offset = advance_world_time(session, world_id, body.text)
    w = session.get(World, world_id)
    return {"current_offset_minutes": new_offset, "formatted_time": format_world_time(new_offset, json.loads(w.calendar_config))}

@router.post("/{world_id}/characters/{char_id}", status_code=201)
def link_character(world_id: str, char_id: str, session: Session = Depends(get_session)):
    session.add(WorldCharacterLink(world_id=world_id, char_id=char_id))
    session.commit()
    return {"ok": True}

@router.delete("/{world_id}/characters/{char_id}")
def unlink_character(world_id: str, char_id: str, session: Session = Depends(get_session)):
    link = session.exec(select(WorldCharacterLink).where(
        WorldCharacterLink.world_id == world_id, WorldCharacterLink.char_id == char_id
    )).first()
    if link:
        session.delete(link); session.commit()
    return {"ok": True}

@router.get("/{world_id}/characters")
def get_world_characters(world_id: str, session: Session = Depends(get_session)):
    links = session.exec(select(WorldCharacterLink).where(WorldCharacterLink.world_id == world_id)).all()
    return [l.char_id for l in links]