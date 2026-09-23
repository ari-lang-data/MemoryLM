from fastapi import Request, HTTPException, Depends
from sqlmodel import Session
from database.sqlite import get_session, verify_api_token

LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost"}

def _extract_token(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    # EventSource can't set custom headers — the SSE stream route takes ?token= instead
    return request.query_params.get("token")

def require_auth(request: Request, session: Session = Depends(get_session)):
    client_host = request.client.host if request.client else None
    if client_host in LOOPBACK_HOSTS:
        return  # the machine running the server is always trusted
    token = _extract_token(request)
    if not token or not verify_api_token(session, token):
        raise HTTPException(status_code=401, detail="Missing or invalid API token")