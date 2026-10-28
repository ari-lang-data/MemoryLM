from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from database.sqlite import get_session, get_connection, get_default_connection
from models.schemas import ChatCompletionRequest
from providers import get_provider
import json

router = APIRouter()

@router.post("/chat")
async def chat_completion(body: ChatCompletionRequest, session: Session = Depends(get_session)):
    connection = get_connection(session, body.connection_id) if body.connection_id else get_default_connection(session)
    if not connection:
        raise HTTPException(status_code=400, detail="No connection configured — add one in Settings → Connections.")

    provider = get_provider(connection.provider)

    async def event_stream():
        async for chunk in provider.stream_chat(connection, body.messages, body.temperature, body.max_tokens, body.extra_params):
            yield f"data: {json.dumps(chunk)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")