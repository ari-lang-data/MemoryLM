from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.sqlite import init_db
from dotenv import load_dotenv
import os
from routers import memories, lorebook, chats, presets, messages, clusters, graph, episodic
from database.graph import init_graph, switch_to_sqlite
from routers import events
from database.queue_processor import ensure_processor
from database.queue import enqueue as queue_enqueue
import sys

load_dotenv()

app = FastAPI(title="MemoryLM Backend")

app.include_router(messages.router,  prefix="/messages",  tags=["messages"])
app.include_router(clusters.router,  prefix="/clusters",  tags=["clusters"])
app.include_router(graph.router,     prefix="/graph",     tags=["graph"])
app.include_router(episodic.router,  prefix="/episodic",  tags=["episodic"])

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()

    try:
        backend = init_graph()
        print(f"Graph backend: {backend}")
    except RuntimeError as e:
        print(f"\n{'='*50}")
        print(f"DuckDB graphbase failed to initialise: {e}")
        print("(a) Repair — fix DuckDB and restart")
        print("(b) Open SQLite graphbase backup")
        print("(c) Exit")
        print('='*50)
        choice = input("Choose (a/b/c): ").strip().lower()
        if choice == "b":
            switch_to_sqlite()
            print("Running on SQLite graphbase backup.")
        elif choice == "c":
            sys.exit(1)
        else:
            print("Please repair DuckDB and restart.")
            sys.exit(1)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(memories.router,  prefix="/memories",  tags=["memories"])
app.include_router(lorebook.router,  prefix="/lorebook",  tags=["lorebook"])
app.include_router(chats.router,     prefix="/chats",     tags=["chats"])
app.include_router(presets.router,   prefix="/presets",   tags=["presets"])
app.include_router(events.router, prefix="/events", tags=["events"])

# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok"}