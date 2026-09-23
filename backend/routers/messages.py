from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from typing import Optional
from database.sqlite import (
    get_session,
    add_message_node, update_message_node, delete_message_node,
    get_chat_message_nodes, clear_chat_messages, replace_chat_messages,
    set_active_children, get_active_children,
    truncate_after_node,   # NEW
)

router = APIRouter()

# ─── Models ───────────────────────────────────────────────────────────────────

class MessageNodeIn(BaseModel):
    id:               str
    parentId:         Optional[str] = None
    role:             str
    content:          str
    implicit:         bool = False
    finishReason:     str  = "stop"
    reasoning:        Optional[str] = None
    timestamp:        str  = ""
    regenerated:      bool = False
    char_id:          Optional[str] = None
    char_name:        Optional[str] = None
    injectedMems:     int  = 0
    injectedLore:     int  = 0
    injectedRefs:     dict = {}

class ChatMessages(BaseModel):
    nodes:          list[MessageNodeIn]
    activeChildren: dict[str, str] = {}

class NodeUpdate(BaseModel):
    content:      Optional[str]  = None
    finishReason: Optional[str]  = None
    reasoning:    Optional[str]  = None
    injectedMems: Optional[int]  = None
    injectedLore: Optional[int]  = None
    injectedRefs: Optional[dict] = None

class ActiveChildrenUpdate(BaseModel):
    activeChildren: dict[str, str]

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/{chat_id}")
def get_messages(chat_id: str, session: Session = Depends(get_session)):
    nodes = get_chat_message_nodes(session, chat_id)
    active_children = get_active_children(session, chat_id)
    return {"nodes": nodes, "activeChildren": active_children}

@router.post("/{chat_id}/node", status_code=201)
def append_node(chat_id: str, body: MessageNodeIn, session: Session = Depends(get_session)):
    """Append a single message node — single INSERT, never touches other rows."""
    add_message_node(session, {**body.model_dump(), "chat_id": chat_id})
    return {"ok": True}

@router.patch("/{chat_id}/node/{node_id}")
def patch_node(chat_id: str, node_id: str, body: NodeUpdate, session: Session = Depends(get_session)):
    """Update a single message node — single UPDATE."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_message_node(session, chat_id, node_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Message node not found")
    return {"ok": True}

@router.delete("/{chat_id}/node/{node_id}")
def remove_node(chat_id: str, node_id: str, session: Session = Depends(get_session)):
    """Delete a single message node — single DELETE."""
    if not delete_message_node(session, chat_id, node_id):
        raise HTTPException(status_code=404, detail="Message node not found")
    return {"ok": True}

@router.delete("/{chat_id}/node/{node_id}/subtree")
def rewind(chat_id: str, node_id: str, session: Session = Depends(get_session)):
    """Rewind — delete node_id's entire descendant subtree, keep node_id itself."""
    truncate_after_node(session, chat_id, node_id)
    return {"ok": True}

@router.patch("/{chat_id}/active-children")
def patch_active_children(chat_id: str, body: ActiveChildrenUpdate, session: Session = Depends(get_session)):
    """Update the branch-pointer map — single-row JSON update on Chat."""
    if not set_active_children(session, chat_id, body.activeChildren):
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"ok": True}

@router.post("/{chat_id}")
def save_messages(chat_id: str, body: ChatMessages, session: Session = Depends(get_session)):
    """
    Bulk replace — used for fork and full resync only.
    NOT called on every message; App.jsx uses the granular endpoints above
    for normal send/edit/delete flow.
    """
    replace_chat_messages(
        session, chat_id,
        [n.model_dump() for n in body.nodes],
        body.activeChildren,
    )
    return {"ok": True}

@router.delete("/{chat_id}")
def clear_messages(chat_id: str, session: Session = Depends(get_session)):
    clear_chat_messages(session, chat_id)
    set_active_children(session, chat_id, {})
    return {"ok": True}