from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database.graph import execute, executemany
from models.schemas import SuccessResponse, CharacterCardUpdate
from datetime import datetime, timezone
import json
import uuid

router = APIRouter()

def now() -> str:
    return datetime.now(timezone.utc).isoformat()

# ─── Schemas ──────────────────────────────────────────────────────────────────

class EntityCreate(BaseModel):
    id:           Optional[str] = None
    name:         str
    type:         str
    description:  str = ""
    chat_id:      Optional[str] = None
    preset_id:    Optional[str] = None
    embedding_id: Optional[str] = None
    metadata:     dict = {}

class EntityUpdate(BaseModel):
    name:         Optional[str] = None
    description:  Optional[str] = None
    metadata:     Optional[dict] = None

class EdgeCreate(BaseModel):
    id:           Optional[str] = None
    source_id:    str
    target_id:    str
    relationship: str
    weight:       float = 1.0
    metadata:     dict = {}

class EdgeUpdate(BaseModel):
    relationship: Optional[str] = None
    weight:       Optional[float] = None
    metadata:     Optional[dict] = None

class TemplateVarSet(BaseModel):
    var_name:  str
    entity_id: Optional[str] = None
    preset_id: Optional[str] = None

# ─── Column list helpers ───────────────────────────────────────────────────────

ENTITY_COLS = ["id","name","type","description","chat_id","preset_id","embedding_id","created_at","metadata"]

CHARACTER_COLS = [
    "id","name","type","description","chat_id","preset_id","embedding_id","created_at","metadata",
    "appearance","behaviour","speech_pattern","background","is_active_char","is_user_char",
    "narrative_alias","address_formal","address_informal",
]

# ─── Entity routes ─────────────────────────────────────────────────────────────

@router.post("/entities", response_model=SuccessResponse)
def create_entity(body: EntityCreate):
    entity_id = body.id or str(uuid.uuid4())
    execute(
        "INSERT OR REPLACE INTO entities (id, name, type, description, chat_id, preset_id, embedding_id, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [entity_id, body.name, body.type, body.description, body.chat_id, body.preset_id, body.embedding_id, now(), json.dumps(body.metadata)]
    )
    return SuccessResponse()

@router.get("/entities")
def get_entities(chat_id: Optional[str] = None, preset_id: Optional[str] = None, type: Optional[str] = None):
    query  = "SELECT * FROM entities WHERE 1=1"
    params = []
    if chat_id:
        query += " AND (chat_id = ? OR chat_id IS NULL)"
        params.append(chat_id)
    if preset_id:
        query += " AND (preset_id = ? OR preset_id IS NULL)"
        params.append(preset_id)
    if type:
        query += " AND type = ?"
        params.append(type)
    rows = execute(query, params)
    return [dict(zip(ENTITY_COLS, row)) for row in rows]

@router.get("/entities/{entity_id}")
def get_entity(entity_id: str):
    rows = execute("SELECT * FROM entities WHERE id = ?", [entity_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Entity not found")
    return dict(zip(ENTITY_COLS, rows[0]))

@router.patch("/entities/{entity_id}", response_model=SuccessResponse)
def update_entity(entity_id: str, body: EntityUpdate):
    rows = execute("SELECT * FROM entities WHERE id = ?", [entity_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Entity not found")
    if body.name        is not None: execute("UPDATE entities SET name = ? WHERE id = ?",        [body.name, entity_id])
    if body.description is not None: execute("UPDATE entities SET description = ? WHERE id = ?", [body.description, entity_id])
    if body.metadata    is not None: execute("UPDATE entities SET metadata = ? WHERE id = ?",    [json.dumps(body.metadata), entity_id])
    return SuccessResponse()

@router.delete("/entities/{entity_id}", response_model=SuccessResponse)
def delete_entity(entity_id: str):
    execute("DELETE FROM edges           WHERE source_id = ? OR target_id = ?", [entity_id, entity_id])
    execute("DELETE FROM character_cards WHERE id = ?",                          [entity_id])
    execute("DELETE FROM template_vars   WHERE entity_id = ?",                   [entity_id])
    execute("DELETE FROM entities        WHERE id = ?",                          [entity_id])
    return SuccessResponse()

# ─── Edge routes ──────────────────────────────────────────────────────────────

@router.post("/edges", response_model=SuccessResponse)
def create_edge(body: EdgeCreate):
    edge_id = body.id or str(uuid.uuid4())
    execute(
        "INSERT OR REPLACE INTO edges (id, source_id, target_id, relationship, weight, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [edge_id, body.source_id, body.target_id, body.relationship, body.weight, now(), json.dumps(body.metadata)]
    )
    return SuccessResponse()

@router.get("/edges/{entity_id}")
def get_edges(entity_id: str, direction: str = "both"):
    if direction == "out":
        rows = execute("SELECT * FROM edges WHERE source_id = ?", [entity_id])
    elif direction == "in":
        rows = execute("SELECT * FROM edges WHERE target_id = ?", [entity_id])
    else:
        rows = execute("SELECT * FROM edges WHERE source_id = ? OR target_id = ?", [entity_id, entity_id])
    return [dict(zip(["id","source_id","target_id","relationship","weight","created_at","metadata"], row)) for row in rows]

@router.patch("/edges/{edge_id}", response_model=SuccessResponse)
def update_edge(edge_id: str, body: EdgeUpdate):
    if body.relationship is not None: execute("UPDATE edges SET relationship = ? WHERE id = ?", [body.relationship, edge_id])
    if body.weight       is not None: execute("UPDATE edges SET weight = ? WHERE id = ?",       [body.weight, edge_id])
    if body.metadata     is not None: execute("UPDATE edges SET metadata = ? WHERE id = ?",     [json.dumps(body.metadata), edge_id])
    return SuccessResponse()

@router.delete("/edges/{edge_id}", response_model=SuccessResponse)
def delete_edge(edge_id: str):
    execute("DELETE FROM edges WHERE id = ?", [edge_id])
    return SuccessResponse()

# ─── Character card routes ─────────────────────────────────────────────────────

@router.put("/characters/{entity_id}", response_model=SuccessResponse)
def upsert_character_card(entity_id: str, body: CharacterCardUpdate):
    execute(
        """INSERT OR REPLACE INTO character_cards
           (id, appearance, behaviour, speech_pattern, background,
            preset_id, is_active_char, is_user_char,
            narrative_alias, address_formal, address_informal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            entity_id,
            body.appearance, body.behaviour, body.speech_pattern, body.background,
            body.preset_id, body.is_active_char, body.is_user_char,
            body.narrative_alias, body.address_formal, body.address_informal,
        ]
    )
    return SuccessResponse()

@router.get("/characters")
def get_characters(preset_id: Optional[str] = None):
    if preset_id:
        rows = execute(
            """SELECT e.*, c.appearance, c.behaviour, c.speech_pattern, c.background,
                      c.is_active_char, c.is_user_char,
                      c.narrative_alias, c.address_formal, c.address_informal
               FROM entities e JOIN character_cards c ON e.id = c.id
               WHERE c.preset_id = ?""",
            [preset_id]
        )
    else:
        rows = execute(
            """SELECT e.*, c.appearance, c.behaviour, c.speech_pattern, c.background,
                      c.is_active_char, c.is_user_char,
                      c.narrative_alias, c.address_formal, c.address_informal
               FROM entities e JOIN character_cards c ON e.id = c.id"""
        )
    return [dict(zip(CHARACTER_COLS, row)) for row in rows]

@router.get("/characters/{entity_id}")
def get_character(entity_id: str):
    rows = execute(
        """SELECT e.*, c.appearance, c.behaviour, c.speech_pattern, c.background,
                  c.is_active_char, c.is_user_char,
                  c.narrative_alias, c.address_formal, c.address_informal
           FROM entities e JOIN character_cards c ON e.id = c.id
           WHERE e.id = ?""",
        [entity_id]
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Character not found")
    return dict(zip(CHARACTER_COLS, rows[0]))

@router.patch("/characters/{entity_id}/activate", response_model=SuccessResponse)
def set_active_character(entity_id: str, is_user: bool = False):
    rows = execute("SELECT preset_id FROM character_cards WHERE id = ?", [entity_id])
    if rows:
        preset_id = rows[0][0]
        if is_user:
            execute("UPDATE character_cards SET is_user_char = FALSE WHERE preset_id = ?", [preset_id])
            execute("UPDATE character_cards SET is_user_char = TRUE  WHERE id = ?",        [entity_id])
        else:
            execute("UPDATE character_cards SET is_active_char = FALSE WHERE preset_id = ?", [preset_id])
            execute("UPDATE character_cards SET is_active_char = TRUE  WHERE id = ?",        [entity_id])
    return SuccessResponse()

# ─── Template variable routes ──────────────────────────────────────────────────

@router.post("/template-vars", response_model=SuccessResponse)
def set_template_var(body: TemplateVarSet):
    var_id = str(uuid.uuid4())
    execute("DELETE FROM template_vars WHERE var_name = ? AND preset_id = ?", [body.var_name, body.preset_id])
    execute(
        "INSERT INTO template_vars (id, var_name, entity_id, preset_id, created_at) VALUES (?, ?, ?, ?, ?)",
        [var_id, body.var_name, body.entity_id, body.preset_id, now()]
    )
    return SuccessResponse()

@router.get("/template-vars")
def get_template_vars(preset_id: Optional[str] = None):
    if preset_id:
        rows = execute("SELECT * FROM template_vars WHERE preset_id = ?", [preset_id])
    else:
        rows = execute("SELECT * FROM template_vars")
    return [dict(zip(["id","var_name","entity_id","preset_id","created_at"], row)) for row in rows]

# ─── Graph traversal ───────────────────────────────────────────────────────────

@router.get("/traverse/{entity_id}")
def traverse(entity_id: str, depth: int = 1, relationship: Optional[str] = None):
    """Walk outgoing edges from entity_id up to given depth."""
    visited = set()
    result  = []

    def walk(eid: str, current_depth: int):
        if current_depth > depth or eid in visited:
            return
        visited.add(eid)
        query  = "SELECT * FROM edges WHERE source_id = ?"
        params = [eid]
        if relationship:
            query  += " AND relationship = ?"
            params.append(relationship)
        edges = execute(query, params)
        for edge in edges:
            edge_dict   = dict(zip(["id","source_id","target_id","relationship","weight","created_at","metadata"], edge))
            target_rows = execute("SELECT * FROM entities WHERE id = ?", [edge_dict["target_id"]])
            if target_rows:
                target = dict(zip(ENTITY_COLS, target_rows[0]))
                result.append({"edge": edge_dict, "entity": target})
                walk(edge_dict["target_id"], current_depth + 1)

    walk(entity_id, 1)
    return result