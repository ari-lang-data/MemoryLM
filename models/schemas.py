from pydantic import BaseModel, field_validator
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
    threshold:    float = 0.75

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

class ChatBindCharacters(BaseModel):
    active_char_id: Optional[str] = None
    user_char_id:   Optional[str] = None
    chat_type:      str = "standard"
    members:        list[str] = []  # group chat member IDs

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
    alpha: float = 0.7
    decayRate: float = 0.01
    style: str = "none"
    continuationPrompt: str = "Advance the narrative."
    branchMode: str = "inline"

class PresetSave(BaseModel):
    id: str
    name: str
    icon: str = "✨"
    systemPrompt: str
    config: PresetConfig

# ─── Episodic inference ───────────────────────────────────────────────────────

class InferenceCreate(BaseModel):
    id:                 Optional[str]  = None
    chat_id:            str
    state:              str
    confidence:         float          = 1.0
    source_episode_ids: list[str]      = []

    @field_validator("confidence")
    @classmethod
    def confidence_range(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("confidence must be between 0.0 and 1.0")
        return v

    @field_validator("source_episode_ids")
    @classmethod
    def ids_non_empty_strings(cls, v: list[str]) -> list[str]:
        for item in v:
            if not isinstance(item, str) or not item.strip():
                raise ValueError("source_episode_ids must be a list of non-empty strings")
        return v

class InferenceResolve(BaseModel):
    resolution:        str
    replacement_state: Optional[str] = None

class InferenceConfidenceUpdate(BaseModel):
    confidence: float

    @field_validator("confidence")
    @classmethod
    def confidence_range(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("confidence must be between 0.0 and 1.0")
        return v

# ─── Facts ────────────────────────────────────────────────────────────────────

class FactCreate(BaseModel):
    id:                 Optional[str]  = None
    chat_id:            str
    content:            str
    confidence:         float          = 1.0
    source_episode_ids: list[str]      = []

    @field_validator("confidence")
    @classmethod
    def confidence_range(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("confidence must be between 0.0 and 1.0")
        return v

    @field_validator("source_episode_ids")
    @classmethod
    def ids_non_empty_strings(cls, v: list[str]) -> list[str]:
        for item in v:
            if not isinstance(item, str) or not item.strip():
                raise ValueError("source_episode_ids must be a list of non-empty strings")
        return v

# ─── Character card (updated with reference forms) ────────────────────────────

class CharacterCardUpdate(BaseModel):
    appearance:        str            = ""
    behaviour:         str            = ""
    speech_pattern:    str            = ""
    background:        str            = ""
    preset_id:         Optional[str]  = None
    is_active_char:    bool           = False
    is_user_char:      bool           = False
    # Preferred reference forms — all optional, fall back to entity name if absent
    narrative_alias:   Optional[str]  = None   # narrator voice: "Dumbledore"
    address_formal:    Optional[str]  = None   # formal address: "Professor Dumbledore"
    address_informal:  Optional[str]  = None   # informal address: "Albus"

# ─── Generic responses ────────────────────────────────────────────────────────

class SuccessResponse(BaseModel):
    ok: bool = True

class ErrorResponse(BaseModel):
    ok: bool = False
    detail: str