from fastapi import APIRouter
from pydantic import BaseModel
from database.chroma import get_clusters_collection, get_memories_collection
from models.schemas import SuccessResponse
import json
import numpy as np

router = APIRouter()

def cosine_sim(a, b):
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))

def update_centroid(old_centroid, old_count, new_embedding):
    """Incremental centroid update — no need to store all embeddings."""
    old = np.array(old_centroid)
    new = np.array(new_embedding)
    updated = (old * old_count + new) / (old_count + 1)
    # Renormalise
    updated = updated / (np.linalg.norm(updated) + 1e-8)
    return updated.tolist()

class ClusterAssign(BaseModel):
    memory_id: str
    chat_id:   str
    embedding: list[float]
    summary:   str
    threshold: float = 0.75

@router.post("/assign", response_model=SuccessResponse)
def assign_to_cluster(body: ClusterAssign):
    col = get_clusters_collection()

    # Find existing clusters for this chat
    existing = col.get(
        where={"chat_id": body.chat_id},
        include=["embeddings", "metadatas"]
    )

    best_score    = -1
    best_cluster  = None

    if existing["ids"]:
        embeddings = existing["embeddings"] or []
        for cid, cemb, meta in zip(existing["ids"], embeddings, existing["metadatas"] or []):
            score = cosine_sim(body.embedding, cemb)
            if score > best_score:
                best_score   = score
                best_cluster = (cid, cemb, meta)

    if best_score >= body.threshold and best_cluster:
        # Add to existing cluster
        cid, cemb, meta = best_cluster
        members      = json.loads(meta.get("members", "[]"))
        member_count = len(members)
        members.append(body.memory_id)
        new_centroid = update_centroid(cemb, member_count, body.embedding)

        col.update(
            ids=[cid],
            embeddings=[new_centroid],
            metadatas=[{**meta, "members": json.dumps(members)}]
        )
    else:
        # Create new cluster
        col.add(
            ids=[f"cluster_{body.chat_id[:8]}_{body.memory_id}"],
            embeddings=[body.embedding],
            documents=[body.summary],
            metadatas=[{
                "chat_id": body.chat_id,
                "members": json.dumps([body.memory_id]),
            }]
        )

    return SuccessResponse()

@router.post("/query")
def query_clusters(body: dict):
    col      = get_clusters_collection()
    chat_id  = body.get("chat_id")
    embedding = body.get("embedding")
    n_results = body.get("n_results", 4)
    threshold = body.get("threshold", 0.2)

    count = col.count()
    if count == 0:
        return []

    # Filter by chat
    chat_clusters = col.get(where={"chat_id": chat_id})
    if not chat_clusters["ids"]:
        return []

    results = col.query(
        query_embeddings=[embedding],
        n_results=min(n_results, len(chat_clusters["ids"])),
        where={"chat_id": chat_id},
        include=["metadatas", "distances"]
    )

    ids       = results["ids"][0]
    metadatas = (results["metadatas"] or [])[0]
    distances = (results["distances"] or [])[0]

    # For each cluster, return its member IDs
    hits = []
    for cid, meta, dist in zip(ids, metadatas, distances):
        similarity = max(0.0, min(1.0, 1 - dist))
        if similarity >= threshold:
            hits.append({
                "cluster_id": cid,
                "members":    json.loads(meta.get("members", "[]")),
                "score":      round(similarity, 4),
            })

    return hits