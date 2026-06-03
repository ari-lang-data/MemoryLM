from pydantic import BaseModel
from typing import Optional

# ─── Memories ─────────────────────────────────────────────────────────────────

class MemoryAdd(BaseModel):
    id:              str
    chat_id:         str
    summary:         str
    embedding:       list[float]
    source:          str
    timestamp:       str
    turns:           int = 0
    pinned:          bool = False
    retrieval_count: int = 0
    last_retrieved:  str = ""

class MemoryUpdate(BaseModel):
    summary:   str
    embedding: list[float]
    timestamp: str
    pinned:    bool = False

class MemoryQuery(BaseModel):
    chat_id:   str
    embedding: list[float]
    n_results: int = 4
    threshold: float = 0.35
    alpha:     float = 0.7
    decay_rate: float = 0.01

class ClusterAssign(BaseModel):
    memory_id:    str
    chat_id:      str
    embedding:    list[float]
    summary:      str
    threshold:    float = 0.75  # higher than retrieval — only cluster truly similar memories

# ─── Lorebook ─────────────────────────────────────────────────────────────────

class LorebookAdd(BaseModel):
    id: str
    title: str
    type: str
    tags: str = ""
    content: str
    embedding: list[float]
    timestamp: str
    pinned:    bool = False

class LorebookUpdate(BaseModel):
    title: str
    type: str
    tags: str = ""
    content: str
    embedding: list[float]
    timestamp: str
    pinned:    bool = False

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
    branchMode: str = "inline"  # "inline" | "fork"

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