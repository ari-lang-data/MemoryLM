"""
One-time migration: messages/*.json -> SQLite MessageNode rows.

Run automatically on startup (called from main.py) if the messages/
directory still contains .json files. Never deletes source files —
moves the directory to messages_backup/ once every file has been
migrated successfully, so nothing is lost if migration is interrupted.
"""
import json
import shutil
from pathlib import Path
from sqlmodel import Session
from backend.database.sqlite import engine, replace_chat_messages, get_chat

MESSAGES_DIR = Path("./messages")
BACKUP_DIR   = Path("./messages_backup")

def migrate_json_messages_to_sqlite():
    if not MESSAGES_DIR.exists():
        return

    json_files = list(MESSAGES_DIR.glob("*.json"))
    if not json_files:
        return

    print(f"Migration: found {len(json_files)} JSON message files — migrating to SQLite...")
    migrated, skipped, failed = 0, 0, 0

    with Session(engine) as session:
        for f in json_files:
            chat_id = f.stem
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                print(f"  ! {chat_id}: corrupted JSON, skipping (left in place for manual recovery)")
                failed += 1
                continue

            # Handle legacy flat-array format too
            if isinstance(data, list):
                nodes, active_children, prev_id = [], {}, None
                for i, msg in enumerate(data):
                    node_id = msg.get("id") or f"msg_legacy_{chat_id}_{i}"
                    node = {**msg, "id": node_id, "parentId": prev_id}
                    nodes.append(node)
                    if prev_id:
                        active_children[prev_id] = node_id
                    prev_id = node_id
            else:
                nodes          = data.get("nodes", [])
                active_children = data.get("activeChildren", {})

            if not nodes:
                skipped += 1
                continue

            # Only migrate if the chat still exists in SQLite
            if not get_chat(session, chat_id):
                print(f"  ! {chat_id}: no matching chat record, skipping")
                skipped += 1
                continue

            try:
                # Normalise field names the SQLite layer expects
                normalised = [{
                    "id":           n.get("id"),
                    "parentId":     n.get("parentId"),
                    "role":         n.get("role", "user"),
                    "content":      n.get("content", ""),
                    "implicit":     n.get("implicit", False),
                    "finishReason": n.get("finishReason", "stop"),
                    "reasoning":    n.get("reasoning"),
                    "timestamp":    n.get("timestamp", ""),
                    "regenerated":  n.get("regenerated", False),
                    "char_id":      n.get("char_id"),
                    "char_name":    n.get("char_name"),
                    "injectedMems": n.get("injectedMems", 0),
                    "injectedLore": n.get("injectedLore", 0),
                    # Drop full injected copies — refs only, scores unrecoverable
                    # from legacy format so left empty; historical panel will
                    # show counts only for these older messages.
                    "injectedRefs": {},
                } for n in nodes]

                replace_chat_messages(session, chat_id, normalised, active_children)
                migrated += 1
            except Exception as e:
                session.rollback()
                print(f"  ! {chat_id}: migration failed — {e}")
                failed += 1

    print(f"Migration complete: {migrated} migrated, {skipped} skipped, {failed} failed.")

    if failed == 0:
        BACKUP_DIR.mkdir(exist_ok=True)
        for f in json_files:
            if f.exists():
                shutil.move(str(f), str(BACKUP_DIR / f.name))
        print(f"Source files moved to {BACKUP_DIR}/ (not deleted).")
    else:
        print("Some files failed to migrate — originals left in place in messages/. Re-run on next startup.")