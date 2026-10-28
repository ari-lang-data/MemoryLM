from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database.sqlite import (
    get_session, create_connection, list_connections, get_connection,
    update_connection, delete_connection, set_default_connection,
)
from models.schemas import ConnectionCreate, ConnectionUpdate, SuccessResponse
from datetime import datetime, timezone
import uuid
import httpx

router = APIRouter()

def mask_key(key):
    return f"***{key[-4:]}" if key and len(key) > 4 else ("***" if key else None)

@router.get("/")
def get_all(session: Session = Depends(get_session)):
    return [
        {
            "id": c.id, "label": c.label, "provider": c.provider,
            "base_url": c.base_url, "model_name": c.model_name,
            "api_key_masked": mask_key(c.api_key), "has_key": bool(c.api_key),
            "is_default": c.is_default, "reasoning_enabled": c.reasoning_enabled, 
            "reasoning_effort": c.reasoning_effort, "reasoning_budget_tokens": c.reasoning_budget_tokens,
            "created_at": c.created_at,
        }
        for c in list_connections(session)
    ]

@router.post("/")
def create(body: ConnectionCreate, session: Session = Depends(get_session)):
    conn_id = str(uuid.uuid4())
    create_connection(
        session, id=conn_id, label=body.label, provider=body.provider,
        base_url=body.base_url, api_key=body.api_key, model_name=body.model_name,
        reasoning_enabled=body.reasoning_enabled, reasoning_effort=body.reasoning_effort,
        reasoning_budget_tokens=body.reasoning_budget_tokens,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    return {"ok": True, "id": conn_id}

@router.patch("/{conn_id}", response_model=SuccessResponse)
def update(conn_id: str, body: ConnectionUpdate, session: Session = Depends(get_session)):
    if not update_connection(session, conn_id, body.model_dump(exclude_none=True)):
        raise HTTPException(status_code=404, detail="Connection not found")
    return SuccessResponse()

@router.delete("/{conn_id}", response_model=SuccessResponse)
def delete(conn_id: str, session: Session = Depends(get_session)):
    if not delete_connection(session, conn_id):
        raise HTTPException(status_code=404, detail="Connection not found")
    return SuccessResponse()

@router.patch("/{conn_id}/default", response_model=SuccessResponse)
def make_default(conn_id: str, session: Session = Depends(get_session)):
    if not set_default_connection(session, conn_id):
        raise HTTPException(status_code=404, detail="Connection not found")
    return SuccessResponse()

@router.post("/{conn_id}/test")
async def test_connection(conn_id: str, session: Session = Depends(get_session)):
    conn = get_connection(session, conn_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    headers = {}
    if conn.provider == "anthropic":
        headers = {"x-api-key": conn.api_key or "", "anthropic-version": "2023-06-01"}
    elif conn.api_key:
        headers["Authorization"] = f"Bearer {conn.api_key}"
    url = conn.base_url.rstrip("/") + "/models"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url, headers=headers)
        if r.status_code == 200:
            return {"ok": True, "detail": f"Reachable: {url}"}
        hint = " (check the API key)" if r.status_code in (401, 403) else ""
        return {"ok": False, "detail": f"{url} answered {r.status_code}{hint}"}
    except Exception as e:
        return {"ok": False, "detail": f"Couldn't reach {url}: {type(e).__name__}: {e}"}