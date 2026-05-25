from fastapi import APIRouter, HTTPException
from database.chroma import get_memories_collection
from models.schemas import MemoryAdd, MemoryUpdate, MemoryQuery, SuccessResponse
import math
from datetime import datetime, timezone

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
        similarity = 1 - dist
        if similarity < body.threshold:
            continue
        recency = recency_score(str(meta.get("timestamp", "")), body.decay_rate)
        score   = (body.alpha * similarity) + ((1 - body.alpha) * recency)
        hits.append({
            "id":         id,
            "summary":    doc,
            "score":      round(score, 4),
            "similarity": round(similarity, 4),
            "recency":    round(recency, 4),
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
