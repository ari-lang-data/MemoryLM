from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session
from typing import Optional
from datetime import datetime, timezone
from database.sqlite import (
    get_session,
    create_inference, get_inferences, get_inference,
    resolve_inference, update_inference_confidence, delete_inference,
    create_fact, get_facts, get_fact, delete_fact,
)
from models.schemas import (
    InferenceCreate, InferenceResolve, InferenceConfidenceUpdate,
    FactCreate, SuccessResponse,
)
import uuid

router = APIRouter()

def now() -> str:
    return datetime.now(timezone.utc).isoformat()

# ─── Inferences ───────────────────────────────────────────────────────────────

@router.post("/inferences", response_model=SuccessResponse)
def create_inference_route(body: InferenceCreate, session: Session = Depends(get_session)):
    inference_id = body.id or str(uuid.uuid4())
    create_inference(
        session=session,
        id=inference_id,
        chat_id=body.chat_id,
        state=body.state,
        confidence=body.confidence,
        source_episode_ids=body.source_episode_ids,
        created_at=now(),
    )
    return SuccessResponse()

@router.get("/inferences")
def list_inferences(
    chat_id: str,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """
    Returns inferences for a chat, optionally filtered by status.
    status: "active" | "resolved" | None (returns all)
    """
    if status and status not in ("active", "resolved"):
        raise HTTPException(status_code=400, detail="status must be 'active' or 'resolved'")
    return get_inferences(session, chat_id, status)

@router.get("/inferences/{inference_id}")
def get_inference_route(inference_id: str, session: Session = Depends(get_session)):
    inference = get_inference(session, inference_id)
    if not inference:
        raise HTTPException(status_code=404, detail="Inference not found")
    from database.sqlite import _inference_to_dict
    return _inference_to_dict(inference)

@router.patch("/inferences/{inference_id}/resolve", response_model=SuccessResponse)
def resolve_inference_route(
    inference_id: str,
    body: InferenceResolve,
    session: Session = Depends(get_session),
):
    """
    Mark an inference as resolved. Optionally provide a replacement_state
    if the consequence has been superseded rather than simply nullified.
    """
    result = resolve_inference(
        session=session,
        inference_id=inference_id,
        resolution=body.resolution,
        replacement_state=body.replacement_state,
        updated_at=now(),
    )
    if not result:
        raise HTTPException(status_code=404, detail="Inference not found")
    return SuccessResponse()

@router.patch("/inferences/{inference_id}/confidence", response_model=SuccessResponse)
def update_confidence_route(
    inference_id: str,
    body: InferenceConfidenceUpdate,
    session: Session = Depends(get_session),
):
    """Adjust confidence score on an existing inference."""
    result = update_inference_confidence(
        session=session,
        inference_id=inference_id,
        confidence=body.confidence,
        updated_at=now(),
    )
    if not result:
        raise HTTPException(status_code=404, detail="Inference not found")
    return SuccessResponse()

@router.delete("/inferences/{inference_id}", response_model=SuccessResponse)
def delete_inference_route(inference_id: str, session: Session = Depends(get_session)):
    if not delete_inference(session, inference_id):
        raise HTTPException(status_code=404, detail="Inference not found")
    return SuccessResponse()

# ─── Facts ────────────────────────────────────────────────────────────────────

@router.post("/facts", response_model=SuccessResponse)
def create_fact_route(body: FactCreate, session: Session = Depends(get_session)):
    fact_id = body.id or str(uuid.uuid4())
    create_fact(
        session=session,
        id=fact_id,
        chat_id=body.chat_id,
        content=body.content,
        confidence=body.confidence,
        source_episode_ids=body.source_episode_ids,
        created_at=now(),
    )
    return SuccessResponse()

@router.get("/facts")
def list_facts(chat_id: str, session: Session = Depends(get_session)):
    return get_facts(session, chat_id)

@router.get("/facts/{fact_id}")
def get_fact_route(fact_id: str, session: Session = Depends(get_session)):
    fact = get_fact(session, fact_id)
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")
    from database.sqlite import _fact_to_dict
    return _fact_to_dict(fact)

@router.delete("/facts/{fact_id}", response_model=SuccessResponse)
def delete_fact_route(fact_id: str, session: Session = Depends(get_session)):
    if not delete_fact(session, fact_id):
        raise HTTPException(status_code=404, detail="Fact not found")
    return SuccessResponse()