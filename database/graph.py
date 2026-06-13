import duckdb
import sqlite3
import os
from pathlib import Path
from typing import Optional

DUCKDB_PATH  = os.getenv("DUCKDB_PATH",  "./graph.duckdb")
SQLITE_PATH  = os.getenv("SQLITE_GRAPH_PATH", "./graph_backup.db")

_conn        = None
_backend     = None  # "duckdb" | "sqlite"

# ─── Schema ───────────────────────────────────────────────────────────────────

SCHEMA = """
CREATE TABLE IF NOT EXISTS entities (
    id           VARCHAR PRIMARY KEY,
    name         VARCHAR NOT NULL,
    type         VARCHAR NOT NULL,
    description  TEXT    DEFAULT '',
    chat_id      VARCHAR DEFAULT NULL,
    preset_id    VARCHAR DEFAULT NULL,
    embedding_id VARCHAR DEFAULT NULL,
    created_at   VARCHAR NOT NULL,
    metadata     VARCHAR DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS edges (
    id           VARCHAR PRIMARY KEY,
    source_id    VARCHAR NOT NULL,
    target_id    VARCHAR NOT NULL,
    relationship VARCHAR NOT NULL,
    weight       FLOAT   DEFAULT 1.0,
    created_at   VARCHAR NOT NULL,
    metadata     VARCHAR DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS character_cards (
    id                VARCHAR PRIMARY KEY,
    appearance        TEXT    DEFAULT '',
    behaviour         TEXT    DEFAULT '',
    speech_pattern    TEXT    DEFAULT '',
    background        TEXT    DEFAULT '',
    preset_id         VARCHAR DEFAULT NULL,
    is_active_char    BOOLEAN DEFAULT FALSE,
    is_user_char      BOOLEAN DEFAULT FALSE,
    narrative_alias   VARCHAR DEFAULT NULL,
    address_formal    VARCHAR DEFAULT NULL,
    address_informal  VARCHAR DEFAULT NULL,
    bias  FLOAT       DEFAULT 0.5
);

CREATE TABLE IF NOT EXISTS template_vars (
    id         VARCHAR PRIMARY KEY,
    var_name   VARCHAR NOT NULL,
    entity_id  VARCHAR DEFAULT NULL,
    preset_id  VARCHAR DEFAULT NULL,
    created_at VARCHAR NOT NULL
);
"""

# Migrations applied to existing databases that pre-date the current schema.
# Each entry is (description, sql). Safe to re-run — errors are caught and
# logged but do not abort startup, since "column already exists" is expected
# on a fresh database where SCHEMA already includes the column.
MIGRATIONS = [
    (
        "character_cards: add narrative_alias",
        "ALTER TABLE character_cards ADD COLUMN narrative_alias VARCHAR DEFAULT NULL",
    ),
    (
        "character_cards: add address_formal",
        "ALTER TABLE character_cards ADD COLUMN address_formal VARCHAR DEFAULT NULL",
    ),
    (
        "character_cards: add address_informal",
        "ALTER TABLE character_cards ADD COLUMN address_informal VARCHAR DEFAULT NULL",
    ),
    (
        "character_cards: add bias",
        "ALTER TABLE character_cards ADD COLUMN bias FLOAT DEFAULT 0.5",
    ),
]

# ─── Initialisation ───────────────────────────────────────────────────────────

def _run_migrations(conn, backend: str):
    for description, sql in MIGRATIONS:
        try:
            if backend == "duckdb":
                conn.execute(sql)
            else:
                conn.execute(sql)
                conn.commit()
            print(f"Migration applied: {description}")
        except Exception as e:
            # "column already exists" is expected on a current-schema database
            msg = str(e).lower()
            if "already exists" in msg or "duplicate column" in msg:
                pass  # expected — column was created by SCHEMA on fresh DB
            else:
                print(f"Migration warning ({description}): {e}")

def _init_duckdb() -> duckdb.DuckDBPyConnection:
    conn = duckdb.connect(DUCKDB_PATH)
    conn.execute(SCHEMA)
    _run_migrations(conn, "duckdb")
    return conn

def _init_sqlite() -> sqlite3.Connection:
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    _run_migrations(conn, "sqlite")
    conn.commit()
    return conn

def get_graph_connection():
    global _conn, _backend
    if _conn is not None:
        return _conn, _backend
    try:
        _conn    = _init_duckdb()
        _backend = "duckdb"
        print("Graph: DuckDB initialised")
    except Exception as e:
        _conn    = None
        _backend = None
        raise RuntimeError(f"GRAPH_INIT_FAILED:{e}")
    return _conn, _backend

def init_graph() -> str:
    """Called on startup. Returns backend name or raises with failure message."""
    global _conn, _backend
    try:
        _conn, _backend = get_graph_connection()
        return _backend
    except RuntimeError as e:
        raise e

def switch_to_sqlite():
    """Called when user chooses option (b) — open SQLite backup."""
    global _conn, _backend
    _conn    = _init_sqlite()
    _backend = "sqlite"
    print("Graph: switched to SQLite backup")

def execute(query: str, params: list = []):
    conn, backend = get_graph_connection()
    if backend == "duckdb":
        result = conn.execute(query, params)
        return result.fetchall()
    else:
        cursor = conn.execute(query, params)
        conn.commit()
        return cursor.fetchall()

def executemany(query: str, params_list: list):
    conn, backend = get_graph_connection()
    if backend == "duckdb":
        conn.executemany(query, params_list)
    else:
        conn.executemany(query, params_list)
        conn.commit()