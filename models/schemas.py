from pydantic import BaseModel
from typing import Optional

# ─── Memories ─────────────────────────────────────────────────────────────────

class MemoryAdd(BaseModel):
    id: str
    chat_id: str
    summary: str
    embedding: list[float]
    source: str                  # "auto" | "manual"
    timestamp: str
    turns: int = 0

class MemoryUpdate(BaseModel):
    summary: str
    embedding: list[float]
    timestamp: str

class MemoryQuery(BaseModel):
    chat_id:   str
    embedding: list[float]
    n_results: int = 4
    threshold: float = 0.35
    alpha:     float = 0.7
    decay_rate: float = 0.01

# ─── Lorebook ─────────────────────────────────────────────────────────────────

class LorebookAdd(BaseModel):
    id: str
    title: str
    type: str
    tags: str = ""
    content: str
    embedding: list[float]
    timestamp: str

class LorebookUpdate(BaseModel):
    title: str
    type: str
    tags: str = ""
    content: str
    embedding: list[float]
    timestamp: str

class LorebookQuery(BaseModel):
    embedding: list[float]
    n_results: int = 4
    threshold: float = 0.35

# ─── Chats ────────────────────────────────────────────────────────────────────

class ChatCreate(BaseModel):
    id: str
    title: str = "New Chat"
    created_at: str
    updated_at: str

class ChatUpdate(BaseModel):
    title: Optional[str] = None
    updated_at: str

class Message(BaseModel):
    role:             str
    content:          str
    injectedMems:     int = 0
    injectedLore:     int = 0
    injectedMemData:  list = []
    injectedLoreData: list = []
    implicit:         bool = False
    finishReason:     str = "stop"
    reasoning:        str | None = None

# ─── Presets ──────────────────────────────────────────────────────────────────

class PresetConfig(BaseModel):
    chunkEvery: int = 4
    topK: int = 4
    threshold: float = 0.35
    temperature: float = 0.7
    repetitionPenalty: float = 1.0
    autoSummarise: bool = True
    dedupMode: str = "merge"
    dedupThreshold: float = 0.85
    modelName: str = ""
    # Recency ranking
    alpha: float = 0.7           # similarity weight (1-alpha = recency weight)
    decayRate: float = 0.01      # how fast recency score decays per hour
    # Narrative continuation
    style: str = "none"          # "none" | "creative" | "roleplay" | "technical"
    continuationPrompt: str = "Advance the narrative."

class PresetSave(BaseModel):
    id: str
    name: str
    icon: str = "✨"
    systemPrompt: str
    config: PresetConfig

# ─── Generic responses ────────────────────────────────────────────────────────

class SuccessResponse(BaseModel):
    ok: bool = True

class ErrorResponse(BaseModel):
    ok: bool = False
    detail: str