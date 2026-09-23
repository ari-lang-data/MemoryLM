import re
from datetime import datetime, timezone
from sqlmodel import Session, select
from database.sqlite import World, EpisodicInference, engine
from typing import Optional
import json, math

TAU_WORLD_DEFAULT = 43200.0  # 30 world-days in minutes, mirrors the 30-min real-time tau's proportional feel

# ── Relative — safe as flat deltas ──────────────────────────────────────────
RELATIVE = [
    (re.compile(r"\bmoments? later\b", re.I),        lambda cal: 5),
    (re.compile(r"\ba few (minutes|hours) later\b", re.I),  lambda cal: 180),
    (re.compile(r"\bhours? later\b", re.I),          lambda cal: 120),
    (re.compile(r"\bthe following day\b", re.I),     lambda cal: cal["minutes_per_day"]),
    (re.compile(r"\bweeks? later\b", re.I),          lambda cal: cal["minutes_per_day"] * 7),
    (re.compile(r"\bmonths? later\b", re.I),         lambda cal: cal["minutes_per_day"] * 30),
    (re.compile(r"(\d+)\s*minutes? later", re.I),    lambda cal, m: int(m.group(1))),
    (re.compile(r"(\d+)\s*hours? later", re.I),      lambda cal, m: int(m.group(1)) * 60),
    (re.compile(r"(\d+)\s*days? later", re.I),       lambda cal, m: int(m.group(1)) * cal["minutes_per_day"]),
    (re.compile(r"(\d+)\s*weeks? later", re.I),      lambda cal, m: int(m.group(1)) * cal["minutes_per_day"] * 7),
]

# ── Anchored — resolve against the calendar, not a delta ────────────────────
def _next_morning(current, cal):
    day_start = (current // cal["minutes_per_day"]) * cal["minutes_per_day"]
    return day_start + cal["minutes_per_day"] + cal["morning_offset"]

def _that_evening(current, cal):
    day_start = (current // cal["minutes_per_day"]) * cal["minutes_per_day"]
    target    = day_start + cal["evening_offset"]
    return target if current < target else target + cal["minutes_per_day"]

def _next_dawn(current, cal):
    day_start = (current // cal["minutes_per_day"]) * cal["minutes_per_day"]
    target    = day_start + cal["dawn_offset"]
    return target if current < target else target + cal["minutes_per_day"]

ANCHORED = [
    (re.compile(r"\bthe next morning\b", re.I),   _next_morning),
    (re.compile(r"\bthat (evening|night)\b", re.I), _that_evening),
    (re.compile(r"\bat dawn\b", re.I),             _next_dawn),
]

def parse_time_delta(text: str, current: int, cal: dict) -> Optional[int]:
    """
    Returns an ABSOLUTE new offset if a match is found, else None.
    Anchored phrases checked first — they're more specific.
    """
    for pattern, resolver in ANCHORED:
        if pattern.search(text):
            return resolver(current, cal)

    for entry in RELATIVE:
        pattern = entry[0]
        m = pattern.search(text)
        if m:
            resolver = entry[1]
            delta = resolver(cal, m) if m.groups() else resolver(cal)
            return current + delta

    return None

def ambient_minutes(text: str) -> int:
    words = len(text.split())
    return min(1 + words // 60, 8)   # 1 min baseline, +1 per ~60 words, capped at 8

def advance_world_time(session: Session, world_id: str, text: str) -> int:
    """Parses text for time-skip language, advances the world clock, returns new offset."""
    world = session.get(World, world_id)
    if not world:
        return 0
    cal = json.loads(world.calendar_config)
    new_offset = parse_time_delta(text, world.current_offset_minutes, cal)
    if new_offset is None:
        new_offset = world.current_offset_minutes + ambient_minutes(text)
    world.current_offset_minutes = new_offset
    world.updated_at = datetime.now(timezone.utc).isoformat()
    session.add(world)
    session.commit()
    return new_offset

def format_world_time(offset_minutes: int, cal: dict) -> str:
    day_index   = offset_minutes // cal["minutes_per_day"]
    minute_of_day = offset_minutes % cal["minutes_per_day"]
    hour, minute = divmod(minute_of_day, 60)

    days_per_month = cal["days_per_month"]
    month_idx, day_in_month, remaining = 0, day_index, day_index
    for i, dpm in enumerate(days_per_month):
        if remaining < dpm:
            month_idx, day_in_month = i, remaining
            break
        remaining -= dpm
    else:
        month_idx, day_in_month = len(days_per_month) - 1, remaining

    month_name = cal["month_names"][month_idx % len(cal["month_names"])]
    return f"{hour:02d}:{minute:02d}, Day {day_in_month + 1} of {month_name}, {cal['epoch_label']}"

# ── World-time-aware decay for episodic inference ────────────────────────────

def world_decayed_confidence(base: float, world_time_at_update: Optional[int],
                              current_world_offset: Optional[int], tau: float = TAU_WORLD_DEFAULT) -> float:
    if world_time_at_update is None or current_world_offset is None:
        return base  # no world attached — caller falls back to real-time decay
    dt = max(0, current_world_offset - world_time_at_update)
    return base * math.exp(-dt / tau)

from datetime import datetime, timezone

TAU_REALTIME_DEFAULT = 7 * 24 * 3600.0  # 7 real days — tune later, this is a placeholder default

def real_time_decayed_confidence(base: float, updated_at_iso: str, tau: float = TAU_REALTIME_DEFAULT) -> float:
    try:
        updated = datetime.fromisoformat(updated_at_iso)
        if updated.tzinfo is None:
            updated = updated.replace(tzinfo=timezone.utc)
        dt = max(0.0, (datetime.now(timezone.utc) - updated).total_seconds())
        return base * math.exp(-dt / tau)
    except Exception:
        return base