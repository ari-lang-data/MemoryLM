from dataclasses import dataclass, field
from typing import Optional, Literal
from datetime import datetime
import uuid

EventType = Literal[
    "UserSent", "UserAddressed", "ContinuationRequested",
    "CharacterMentioned", "CharacterAddressed", "NarrativeFocus", "ScenePause",
    "TurnCompleted", "TurnDropped", "QueueDrained",
]

TaskType = Literal["Generate", "Evaluate", "Summarise", "ImageRequest"]

ReasonType = Literal[
    "direct_address", "mentioned", "relationship_pressure", "narrative_focus", "ambient"
]

@dataclass
class QueueItem:
    id:           str                    = field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:8]}")
    kind:         Literal["event","task"] = "event"
    event_type:   Optional[EventType]    = None
    task_type:    Optional[TaskType]     = None
    chat_id:      str                    = ""
    payload:      dict                   = field(default_factory=dict)
    priority:     float                  = 0.5
    status:       str                    = "queued"
    retries:      int                    = 0
    max_retries:  int                    = 2
    created_at:   datetime               = field(default_factory=datetime.utcnow)
    timeout_s:    int                    = 30
    caused_by:    Optional[str]          = None

@dataclass
class SpeakerDecision:
    speaker:  str        # char_id
    priority: float
    reason:   ReasonType