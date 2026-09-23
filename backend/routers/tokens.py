from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from pydantic import BaseModel
from database.sqlite import get_session, create_api_token, list_api_tokens, revoke_api_token

router = APIRouter()

class TokenCreate(BaseModel):
    label: str

@router.get("/")
def get_tokens(session: Session = Depends(get_session)):
    tokens = list_api_tokens(session)
    return [{"id": t.id, "label": t.label, "created_at": t.created_at, "last_used_at": t.last_used_at} for t in tokens]

@router.post("/")
def create_token(body: TokenCreate, session: Session = Depends(get_session)):
    raw = create_api_token(session, body.label)
    return {"token": raw}

@router.delete("/{token_id}")
def delete_token(token_id: str, session: Session = Depends(get_session)):
    if not revoke_api_token(session, token_id):
        raise HTTPException(status_code=404, detail="Token not found")
    return {"ok": True}