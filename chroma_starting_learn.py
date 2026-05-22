import chromadb

client = chromadb.PersistentClient(path="./chroma_data")

# Create a collection
memories = client.get_or_create_collection(name="memories")

# Add an entry manually
memories.add(
    ids=["mem_001"],
    embeddings=[[0.1, 0.2, 0.3]],  # normally 384 floats from Xenova
    documents=["User prefers concise answers and works in Python."],
    metadatas=[{"chat_id": "chat_abc", "source": "auto", "timestamp": "2026-01-01T00:00:00"}]
)

# Query it
results = memories.query(
    query_embeddings=[[0.1, 0.2, 0.3]],
    n_results=1,
    where={"chat_id": "chat_abc"}  # metadata filter
)

print(results)
client.delete_collection("memories")