import { useEffect, useRef, useCallback } from "react";
import { eventsAPI } from "../lib/api";

/**
 * Manages the SSE connection for a chat and dispatches
 * incoming events to registered handlers.
 *
 * Usage:
 *   const { enqueue } = useEventQueue(activeChatId, {
 *     token:           ({ node_id, content }) => ...,
 *     turn_start:      ({ char_id, node_id, reason }) => ...,
 *     turn_completed:  ({ char_id, node_id, content }) => ...,
 *     turn_dropped:    ({ reason }) => ...,
 *     speaker_queued:  ({ char_id, priority, reason }) => ...,
 *     scene_pause:     () => ...,
 *     queue_end:       () => ...,
 *   });
 */
export function useEventQueue(chatId, handlers) {
  const esRef         = useRef(null);
  const lastEventId   = useRef(null);
  const handlersRef   = useRef(handlers);

  // Keep handlers ref current without re-subscribing
  useEffect(() => { handlersRef.current = handlers; }, [handlers]);

  useEffect(() => {
    if (!chatId) return;

    function connect() {
      if (esRef.current) esRef.current.close();

      esRef.current = eventsAPI.connect(
        chatId,
        lastEventId.current,
        Object.fromEntries(
          Object.keys(handlers).map(event => [
            event,
            (data) => {
              handlersRef.current[event]?.(data);
            },
          ])
        ),
      );

      esRef.current.addEventListener("message", e => {
        // Track last event id for reconnect replay
        if (e.lastEventId) lastEventId.current = e.lastEventId;
      });

      esRef.current.onerror = () => {
        // EventSource auto-reconnects — we just track the last id
      };
    }

    connect();
    return () => { esRef.current?.close(); esRef.current = null; };
  }, [chatId]);

  const enqueue = useCallback((body) => {
    return eventsAPI.enqueue(body);
  }, []);

  return { enqueue };
}