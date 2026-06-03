from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.sqlite import init_db
from dotenv import load_dotenv
import os
from routers import memories, lorebook, chats, presets, messages, clusters

load_dotenv()

app = FastAPI(title="MemoryLM Backend")

app.include_router(messages.router, prefix="/messages", tags=["messages"])
app.include_router(clusters.router, prefix="/clusters", tags=["clusters"])

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGIN", "http://localhost:5173")],  # Vite's default port
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(memories.router,  prefix="/memories",  tags=["memories"])
app.include_router(lorebook.router,  prefix="/lorebook",  tags=["lorebook"])
app.include_router(chats.router,     prefix="/chats",     tags=["chats"])
app.include_router(presets.router,   prefix="/presets",   tags=["presets"])

# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok"}