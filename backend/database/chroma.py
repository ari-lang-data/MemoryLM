import chromadb
from chromadb import Collection
from chromadb.api import ClientAPI
from typing import Optional

# top of database/chroma.py
from dotenv import load_dotenv
import os
load_dotenv()
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_data")

_client: Optional[ClientAPI] = None

def get_client() -> ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
    return _client

def get_memories_collection() -> Collection:
    return get_client().get_or_create_collection(
        name="memories",
        metadata={"hnsw:space": "cosine"}
    )

def get_lorebook_collection() -> Collection:
    return get_client().get_or_create_collection(
        name="lorebook",
        metadata={"hnsw:space": "cosine"}
    )

def get_clusters_collection() -> Collection:
    return get_client().get_or_create_collection(
        name="memory_clusters",
        metadata={"hnsw:space": "cosine"}
    )