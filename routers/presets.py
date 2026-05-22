from fastapi import APIRouter, HTTPException
from sqlmodel import Session
from fastapi import Depends
from database.sqlite import get_session, save_preset, get_all_presets, delete_preset
from models.schemas import PresetSave, SuccessResponse

router = APIRouter()

@router.post("/", response_model=SuccessResponse)
def upsert_preset(body: PresetSave, session: Session = Depends(get_session)):
    save_preset(
        session,
        id=body.id,
        name=body.name,
        icon=body.icon,
        system_prompt=body.systemPrompt,
        config=body.config.model_dump()
    )
    return SuccessResponse()

@router.get("/")
def get_all(session: Session = Depends(get_session)):
    return get_all_presets(session)

@router.delete("/{preset_id}", response_model=SuccessResponse)
def delete(preset_id: str, session: Session = Depends(get_session)):
    result = delete_preset(session, preset_id)
    if not result:
        raise HTTPException(status_code=404, detail="Preset not found")
    return SuccessResponse()