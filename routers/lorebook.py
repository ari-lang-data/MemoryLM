from fastapi import APIRouter, HTTPException
from database.chroma import get_lorebook_collection
from models.schemas import LorebookAdd, LorebookUpdate, LorebookQuery, SuccessResponse

router = APIRouter()

@router.post("/", response_model=SuccessResponse)
def add_entry(body: LorebookAdd):
    col = get_lorebook_collection()
    col.add(
        ids=[body.id],
        embeddings=[body.embedding],
        documents=[body.content],
        metadatas=[{
            "title":     body.title,
            "type":      body.type,
            "tags":      body.tags,
            "timestamp": body.timestamp,
        }]
    )
    return SuccessResponse()

@router.post("/query")
def query_lorebook(body: LorebookQuery):
    col = get_lorebook_collection()
    count = col.count()
    if count == 0:
        return []
    results = col.query(
        query_embeddings=[body.embedding],
        n_results=min(body.n_results, count),
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
    return hits

@router.put("/{entry_id}", response_model=SuccessResponse)
def update_entry(entry_id: str, body: LorebookUpdate):
    col = get_lorebook_collection()
    existing = col.get(ids=[entry_id])
    if not existing["ids"]:
        raise HTTPException(status_code=404, detail="Lorebook entry not found")
    col.update(
        ids=[entry_id],
        embeddings=[body.embedding],
        documents=[body.content],
        metadatas=[{
            "title":     body.title,
            "type":      body.type,
            "tags":      body.tags,
            "timestamp": body.timestamp,
        }]
    )
    return SuccessResponse()

@router.delete("/{entry_id}", response_model=SuccessResponse)
def delete_entry(entry_id: str):
    col = get_lorebook_collection()
    existing = col.get(ids=[entry_id])
    if not existing["ids"]:
        raise HTTPException(status_code=404, detail="Lorebook entry not found")
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