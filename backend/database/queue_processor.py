import asyncio
from backend.database.queue import get_queue, push_sse, _queues
from backend.models.events import QueueItem
from backend.handlers.evaluate import handle_evaluate
from backend.handlers.generate import handle_generate
import os

async def process_item(item: QueueItem):
    print(f"[processor] processing {item.kind} {item.task_type} for chat {item.chat_id}")
    if item.kind == "task":
        if item.task_type == "Evaluate":
            preset_id = item.payload.get("preset_id", "")
            await handle_evaluate(item, preset_id)
        elif item.task_type == "Generate":
            print(f"[processor] generate payload keys: {list(item.payload.keys())}")
            await handle_generate(item)
    print(f"[processor] done {item.id}")

async def run_processor(chat_id: str):
    """Per-chat queue processor. Runs until queue is empty then exits."""
    print(f"[processor] started for chat {chat_id}")
    q = get_queue(chat_id)
    while True:
        try:
            _, _, item = await asyncio.wait_for(q.get(), timeout=60.0)
        except asyncio.TimeoutError:
            # Queue idle for 60s — exit, will be restarted on next enqueue
            print(f"[processor] idle timeout, exiting for chat {chat_id}")
            break

        item.status = "processing"
        try:
            await asyncio.wait_for(process_item(item), timeout=item.timeout_s)
            item.status = "completed"
        except asyncio.TimeoutError:
            item.retries += 1
            if item.retries <= item.max_retries:
                item.status = "queued"
                await q.put((-item.priority, item.created_at.isoformat(), item))
            else:
                item.status = "dropped"
                push_sse(item.chat_id, {
                    "event": "turn_dropped",
                    "id":    item.id,
                    "data":  {
                        "chat_id": item.chat_id,
                        "reason":  "timeout",
                        "task":    item.task_type,
                    },
                })
        except Exception as e:
            item.status = "failed"
            push_sse(item.chat_id, {
                "event": "turn_dropped",
                "id":    item.id,
                "data":  {
                    "chat_id": item.chat_id,
                    "reason":  str(e),
                    "task":    item.task_type,
                },
            })
        finally:
            q.task_done()

    # Clean up processor reference
    from database.queue import _processors
    _processors.pop(chat_id, None)

async def ensure_processor(chat_id: str):
    """Start a processor for chat_id if one isn't already running."""
    from database.queue import _processors
    if chat_id in _processors and not _processors[chat_id].done():
        return
    task = asyncio.create_task(run_processor(chat_id))
    _processors[chat_id] = task