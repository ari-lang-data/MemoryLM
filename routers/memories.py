from fastapi import APIRouter, HTTPException
from database.chroma import get_memories_collection
from models.schemas import MemoryAdd, MemoryUpdate, MemoryQuery, SuccessResponse
import math
from datetime import datetime, timezone
from pydantic import BaseModel

router = APIRouter()

@router.post("/", response_model=SuccessResponse)
def add_memory(body: MemoryAdd):
    col = get_memories_collection()
    col.add(
        ids=[body.id],
        embeddings=[body.embedding],
        documents=[body.summary],
        metadatas=[{
            "chat_id": body.chat_id,
            "source":  body.source,
            "timestamp": body.timestamp,
            "turns":   body.turns,
        }]
    )
    return SuccessResponse()

@router.post("/query")
def query_memories(body: MemoryQuery):
    col   = get_memories_collection()
    count = col.count()
    if count == 0:
        return []

    results = col.query(
        query_embeddings=[body.embedding],
        n_results=min(body.n_results, count),
        where={"chat_id": body.chat_id},
        include=["documents", "metadatas", "distances"]
    )

    ids       = results["ids"][0]
    documents = (results["documents"] or [])[0]
    metadatas = (results["metadatas"] or [])[0]
    distances = (results["distances"] or [])[0]

    hits = []
    for id, doc, meta, dist in zip(ids, documents, metadatas, distances):
        similarity = max(0.0, min(1.0, 1 - dist))
        if similarity < body.threshold:
            continue
        recency = recency_score(str(meta.get("timestamp", "")), body.decay_rate)
        importance = importance_score(meta)
        score = (
            body.alpha             * similarity  +
            ((1 - body.alpha) / 2) * recency     +
            ((1 - body.alpha) / 2) * importance
        )
        hits.append({
            "id":         id,
            "summary":    doc,
            "score":      round(score, 4),
            "similarity": round(similarity, 4),
            "recency":    round(recency, 4),
            "importance": round(importance, 4),
            **meta
        })

    # Re-sort by combined score since ChromaDB sorted by similarity only
    hits.sort(key=lambda x: x["score"], reverse=True)
    return hits

def recency_score(timestamp: str, decay_rate: float = 0.01) -> float:
    try:
        ts  = datetime.fromisoformat(timestamp).replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        age_hours = (now - ts).total_seconds() / 3600
        return math.exp(-decay_rate * age_hours)
    except Exception:
        return 1.0  # if timestamp is malformed, don't penalise
    
def importance_score(meta: dict) -> float:
    retrieval_count = int(meta.get("retrieval_count", 0))
    pinned          = bool(meta.get("pinned", False))

    if pinned:
        return 1.0

    # Logarithmic scaling — first few retrievals matter most
    # log(1) = 0, log(2) ≈ 0.3, log(10) ≈ 1.0, capped at 1.0
    import math
    raw = math.log(retrieval_count + 1) / math.log(10)
    return min(1.0, raw)

@router.get("/chat/{chat_id}")
def get_chat_memories(chat_id: str):
    col = get_memories_collection()
    results = col.get(
        where={"chat_id": chat_id},
        include=["documents", "metadatas"]
    )
    return [
        {"id": id, "summary": doc, **meta}
        for id, doc, meta in zip(
            results["ids"],
            results["documents"] or [],
            results["metadatas"] or []
        )
    ]

@router.delete("/chat/{chat_id}", response_model=SuccessResponse)
def clear_chat_memories(chat_id: str):
    col = get_memories_collection()
    existing = col.get(where={"chat_id": chat_id})
    if existing["ids"]:
        col.delete(ids=existing["ids"])
    return SuccessResponse()


@router.put("/{memory_id}", response_model=SuccessResponse)
def update_memory(memory_id: str, body: MemoryUpdate):
    col = get_memories_collection()
    existing = col.get(ids=[memory_id])
    if not existing["ids"]:
        raise HTTPException(status_code=404, detail="Memory not found")
    col.update(
        ids=[memory_id],
        embeddings=[body.embedding],
        documents=[body.summary],
        metadatas=[{
            **(existing["metadatas"] or [])[0],
            "timestamp": body.timestamp,
        }]
    )
    return SuccessResponse()

@router.delete("/{memory_id}", response_model=SuccessResponse)
def delete_memory(memory_id: str):
    col = get_memories_collection()
    existing = col.get(ids=[memory_id])
    if not existing["ids"]:
        raise HTTPException(status_code=404, detail="Memory not found")
    col.delete(ids=[memory_id])
    return SuccessResponse()

class MemoryFork(BaseModel):
    source_chat_id:   str
    target_chat_id:   str
    before_timestamp: str

@router.post("/fork", response_model=SuccessResponse)
def fork_memories(body: MemoryFork):
    col = get_memories_collection()

    # Get all memories for source chat
    existing = col.get(
        where={"chat_id": body.source_chat_id},
        include=["documents", "metadatas", "embeddings"]
    )

    if not existing["ids"]:
        return SuccessResponse()

    # Filter to memories before fork timestamp
    to_copy = [
        (id, doc, meta, emb)
        for id, doc, meta, emb in zip(
            existing["ids"],
            existing["documents"],
            (existing["metadatas"] or []),
            (existing["embeddings"] if existing.get("embeddings") is not None else []),
        )
        if meta.get("timestamp", "") <= body.before_timestamp
    ]

    if not to_copy:
        return SuccessResponse()

    # Add copies with new IDs and target chat_id
    ids, docs, metas, embs = zip(*to_copy)
    col.add(
        ids=        [f"mem_{id}_fork_{body.target_chat_id[:8]}" for id in ids],
        documents=  list(docs),
        embeddings= list(embs),
        metadatas=  [{ **m, "chat_id": body.target_chat_id } for m in metas],
    )

    return SuccessResponse()

class MemoryPin(BaseModel):
    pinned: bool

@router.patch("/{memory_id}/pin", response_model=SuccessResponse)
def pin_memory(memory_id: str, body: MemoryPin):
    col      = get_memories_collection()
    existing = col.get(ids=[memory_id], include=["metadatas", "documents", "embeddings"])
    if not existing["ids"]:
        raise HTTPException(status_code=404, detail="Memory not found")
    col.update(
        ids=[memory_id],
        metadatas=[{ **(existing["metadatas"] or [[]])[0], "pinned": body.pinned }]
    )
    return SuccessResponse()

@router.get("/pinned/{chat_id}")
def get_pinned_memories(chat_id: str):
    col     = get_memories_collection()
    results = col.get(
        where={"$and": [{"chat_id": chat_id}, {"pinned": True}]},
        include=["documents", "metadatas"]
    )
    return [
        {"id": id, "summary": doc, **meta}
        for id, doc, meta in zip(
            results["ids"],
            results["documents"] or [],
            results["metadatas"] or []
        )
    ]

class MemoryRetrievalUpdate(BaseModel):
    last_retrieved: str

@router.patch("/{memory_id}/retrieved", response_model=SuccessResponse)
def mark_retrieved(memory_id: str, body: MemoryRetrievalUpdate):
    col      = get_memories_collection()
    existing = col.get(ids=[memory_id], include=["metadatas"])
    if not existing["ids"]:
        raise HTTPException(status_code=404, detail="Memory not found")
    meta  = (existing["metadatas"] or [[]])[0]
    count = int(meta.get("retrieval_count", 0)) + 1
    col.update(
        ids=[memory_id],
        metadatas=[{
            **meta,
            "retrieval_count": count,
            "last_retrieved":  body.last_retrieved,
        }]
    )
    return SuccessResponse()