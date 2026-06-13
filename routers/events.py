from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from database.queue import (
    enqueue, get_sse_queue, push_sse,
    get_buffered_events, restore_activation,
)
from models.events import QueueItem
from database.sqlite import get_session, engine
from sqlmodel import Session, text
import asyncio
import json

router = APIRouter()

# ── Enqueue endpoint ──────────────────────────────────────────────────────────

class EnqueueRequest(BaseModel):
    kind:        str
    event_type:  Optional[str] = None
    task_type:   Optional[str] = None
    chat_id:     str
    payload:     dict          = {}
    priority:    float         = 0.5
    caused_by:   Optional[str] = None
    timeout_s:   int           = 30

@router.post("/enqueue", status_code=202)
async def enqueue_item(body: EnqueueRequest):
    item = QueueItem(
        kind=       body.kind,
        event_type= body.event_type,
        task_type=  body.task_type,
        chat_id=    body.chat_id,
        payload=    body.payload,
        priority=   body.priority,
        caused_by=  body.caused_by,
        timeout_s=  body.timeout_s,
    )
    await enqueue(item)
    return {"id": item.id, "status": "queued"}

# ── SSE endpoint ──────────────────────────────────────────────────────────────

@router.get("/stream/{chat_id}")
async def stream_events(chat_id: str, since: Optional[str] = None):
    """
    SSE stream for a chat. Replays buffered non-token events on reconnect.
    Frontend passes ?since=<last_event_id> to get missed events.
    """
    # Restore activation state if needed
    with Session(engine) as session:
        result = session.execute(
            text("SELECT activation_state FROM chat WHERE id = :id"),
            {"id": chat_id}
        ).fetchone()
    if result and result[0]:
        restore_activation(chat_id, result[0])

    async def event_generator():
        # Replay buffered events first
        buffered = get_buffered_events(chat_id, since_id=since)
        for evt in buffered:
            if evt.get("event") != "token":  # never replay tokens
                yield f"id: {evt.get('id','')}\nevent: {evt['event']}\ndata: {json.dumps(evt.get('data', {}))}\n\n"

        # Then stream live events
        q = get_sse_queue(chat_id)
        while True:
            try:
                evt = await asyncio.wait_for(q.get(), timeout=30.0)
                yield f"id: {evt.get('id','')}\nevent: {evt['event']}\ndata: {json.dumps(evt.get('data', {}))}\n\n"
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"  # keep connection alive

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
        },
    )