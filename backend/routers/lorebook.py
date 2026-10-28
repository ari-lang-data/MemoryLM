from fastapi import APIRouter, HTTPException
from typing import Optional
from database.chroma import get_lorebook_collection
from models.schemas import LorebookAdd, LorebookUpdate, LorebookQuery, SuccessResponse
from database.sqlite import LOREBOOK_ENTRY_CAP
from database.graph import purge_entity
from pydantic import BaseModel

router = APIRouter()

def _meta(body, pinned: bool = False) -> dict:
    meta={
        "title": body.title, "type": body.type, "tags": body.tags, "timestamp": body.timestamp,
        "lorebook_id": body.lorebook_id, "embedding_model": body.embedding_model, "pinned": pinned,
    }
    return {k: v for k, v in meta.items() if v is not None}    # Chroma rejects None values 

@router.post("/", response_model=SuccessResponse)
def add_entry(body: LorebookAdd):
    col = get_lorebook_collection()
    if len(col.get(where={"lorebook_id": body.lorebook_id}, include=[])["ids"]):
        raise HTTPException(status_code=409, detail=f"This lorebook is full ({LOREBOOK_ENTRY_CAP} entries).")
    col.add(
        ids=[body.id],
        embeddings=[body.embedding],
        documents=[body.content],
        metadatas=[_meta(body, body.pinned)]
    )
    return SuccessResponse()

@router.post("/query")
def query_lorebook(body: LorebookQuery):
    col = get_lorebook_collection()
    count = col.count()
    where = {"lorebook_id": {"$in": body.lorebook_ids}} if body.lorebook_ids else None
    if count == 0:
        return []
    results = col.query(
        query_embeddings=[body.embedding],
        n_results=min(body.n_results, count),
        where=where,
        include=["documents", "metadatas", "distances"]
    )
    ids       = results["ids"][0]
    documents = (results["documents"] or [])[0]
    metadatas = (results["metadatas"] or [])[0]
    distances = (results["distances"] or [])[0]
    hits = []
    for id, doc, meta, dist in zip(ids, documents, metadatas, distances):
        similarity = max(0.0, min(1.0, 1 - dist))
        if similarity >= body.threshold:
            hits.append({
                "id":      id,
                "content": doc,
                "score":   round(similarity, 4),
                **meta
            })
            print(f"Lorebook query threshold: {body.threshold}")
    return hits

@router.put("/{entry_id}", response_model=SuccessResponse)
def update_entry(entry_id: str, body: LorebookUpdate):
    col = get_lorebook_collection()
    existing = col.get(ids=[entry_id], include=["metadatas"])
    if not existing["ids"]:
        raise HTTPException(status_code=404, detail="Lorebook entry not found")
    old = existing["metadatas"][0] or {}
    meta = _meta(body, bool(old.get("pinned", False)))
    lid = body.lorebook_id or old.get("lorebook_id")
    if lid:
        meta["lorebook_id"] = lid
    col.update(
        ids=[entry_id],
        embeddings=[body.embedding],
        documents=[body.content],
        metadatas=[meta]
    )
    return SuccessResponse()

@router.delete("/{entry_id}", response_model=SuccessResponse)
def delete_entry(entry_id: str):
    col = get_lorebook_collection()
    existing = col.get(ids=[entry_id])
    if not existing["ids"]:
        raise HTTPException(status_code=404, detail="Lorebook entry not found")
    purge_entity(entry_id)
    col.delete(ids=[entry_id])
    return SuccessResponse()

@router.get("/")
def get_all():
    col = get_lorebook_collection()
    results = col.get(include=["documents", "metadatas"])
    return [
        {"id": id, "content": doc, **meta}
        for id, doc, meta in zip(
            results["ids"],
            results["documents"] or [],
            results["metadatas"] or []
        )
    ]

class LorebookPin(BaseModel):
    pinned: bool

@router.patch("/{entry_id}/pin", response_model=SuccessResponse)
def pin_entry(entry_id: str, body: LorebookPin):
    col      = get_lorebook_collection()
    existing = col.get(ids=[entry_id], include=["metadatas", "documents", "embeddings"])
    if not existing["ids"]:
        raise HTTPException(status_code=404, detail="Lorebook entry not found")
    col.update(
        ids=[entry_id],
        metadatas=[{ **(existing["metadatas"] or [[]])[0], "pinned": body.pinned }]
    )
    return SuccessResponse()

@router.get("/pinned")
def get_pinned_lorebook(lorebook_ids: Optional[str] = None):
    col     = get_lorebook_collection()
    ids = [i for i in (lorebook_ids or "").split(",") if i]
    where = {"$and": [{"pinned": True}, {"lorebook_id": {"$in": ids}}]} if ids else {"pinned": True}
    results = col.get(
        where={"pinned": True},
        include=["documents", "metadatas"]
    )
    return [
        {"id": id, "content": doc, **meta}
        for id, doc, meta in zip(
            results["ids"],
            results["documents"] or [],
            results["metadatas"] or []
        )
    ]

@router.get("/{lore_id}")
def get_lore_entry(lore_id: str):
    col = get_lorebook_collection()
    existing = col.get(ids=[lore_id], include=["documents", "metadatas"])
    if not existing["ids"]:
        raise HTTPException(status_code=404, detail="Lorebook entry not found")
    meta = existing["metadatas"][0]
    return {"id": lore_id, "content": existing["documents"][0], **meta}