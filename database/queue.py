import asyncio
import math
import json
from collections import defaultdict
from datetime import datetime
from typing import Optional
from models.events import QueueItem

# ── Per-chat stores ───────────────────────────────────────────────────────────
_queues:      dict[str, asyncio.PriorityQueue] = {}
_sse_queues:  dict[str, asyncio.Queue]         = {}
_activation:  dict[str, dict[str, dict]]       = {}
_sse_buffers: dict[str, list]                  = defaultdict(list)
_processors:  dict[str, asyncio.Task]          = {}  # running processor tasks

_BUFFER_MAX       = 200
TAU_DEFAULT       = 1800.0   # 30 minutes
THRESHOLD_DEFAULT = 0.6
DISCHARGE_FACTOR  = 0.4

STIMULUS_TABLE = {
    "CharacterAddressed": 0.6,
    "CharacterMentioned": 0.3,
    "NarrativeFocus":     0.2,
    "UserSent":           0.05,
}

# ── Queue management ──────────────────────────────────────────────────────────

def get_queue(chat_id: str) -> asyncio.PriorityQueue:
    if chat_id not in _queues:
        _queues[chat_id] = asyncio.PriorityQueue()
    return _queues[chat_id]

def get_sse_queue(chat_id: str) -> asyncio.Queue:
    if chat_id not in _sse_queues:
        _sse_queues[chat_id] = asyncio.Queue()
    return _sse_queues[chat_id]

async def enqueue(item: QueueItem):
    q = get_queue(item.chat_id)
    # PriorityQueue is min-heap; negate priority for max-heap behaviour
    await q.put((-item.priority, item.created_at.isoformat(), item))

def push_sse(chat_id: str, event: dict):
    buf = _sse_buffers[chat_id]
    buf.append(event)
    if len(buf) > _BUFFER_MAX:
        buf.pop(0)
    try:
        get_sse_queue(chat_id).put_nowait(event)
    except asyncio.QueueFull:
        pass  # frontend disconnected — buffer handles replay

def get_buffered_events(chat_id: str, since_id: Optional[str] = None) -> list:
    buf = _sse_buffers.get(chat_id, [])
    if not since_id:
        return buf
    ids = [e.get("id") for e in buf]
    if since_id in ids:
        return buf[ids.index(since_id) + 1:]
    return buf

# ── Activation model ──────────────────────────────────────────────────────────

def _decayed(activation: float, last_updated: datetime, tau: float) -> float:
    dt = (datetime.utcnow() - last_updated).total_seconds()
    return activation * math.exp(-dt / tau)

def _set(chat_id: str, char_id: str, value: float, tau: float):
    _activation.setdefault(chat_id, {})[char_id] = {
        "activation":   max(0.0, value),
        "last_updated": datetime.utcnow(),
        "tau":          tau,
    }

def get_activation(chat_id: str, char_id: str) -> float:
    s = _activation.get(chat_id, {}).get(char_id)
    if not s:
        return 0.0
    return _decayed(s["activation"], s["last_updated"], s.get("tau", TAU_DEFAULT))

def stimulate(
    chat_id:    str,
    char_id:    str,
    event_type: str,
    edge_weight: float = 1.0,
    bias:       float  = 0.5,
    tau:        float  = TAU_DEFAULT,
) -> float:
    current  = get_activation(chat_id, char_id)
    stimulus = STIMULUS_TABLE.get(event_type, 0.0) * edge_weight * (1.0 + bias)
    new_val  = current + stimulus
    _set(chat_id, char_id, new_val, tau)
    return new_val

def discharge(chat_id: str, char_id: str):
    s = _activation.get(chat_id, {}).get(char_id)
    if not s:
        return
    current = _decayed(s["activation"], s["last_updated"], s.get("tau", TAU_DEFAULT))
    _set(chat_id, char_id, current * DISCHARGE_FACTOR, s.get("tau", TAU_DEFAULT))

def characters_above_threshold(chat_id: str) -> list[tuple[str, float]]:
    result = [
        (char_id, get_activation(chat_id, char_id))
        for char_id in _activation.get(chat_id, {})
    ]
    return sorted(
        [(cid, val) for cid, val in result if val >= THRESHOLD_DEFAULT],
        key=lambda x: x[1],
        reverse=True,
    )

def serialise_activation(chat_id: str) -> str:
    state = _activation.get(chat_id, {})
    return json.dumps({
        char_id: {
            "activation":   s["activation"],
            "last_updated": s["last_updated"].isoformat(),
            "tau":          s["tau"],
        }
        for char_id, s in state.items()
    })

def restore_activation(chat_id: str, json_str: str):
    if not json_str or json_str == "{}":
        return
    try:
        data = json.loads(json_str)
        _activation[chat_id] = {
            char_id: {
                "activation":   s["activation"],
                "last_updated": datetime.fromisoformat(s["last_updated"]),
                "tau":          s.get("tau", TAU_DEFAULT),
            }
            for char_id, s in data.items()
        }
    except Exception:
        pass