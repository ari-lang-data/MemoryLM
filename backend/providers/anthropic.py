import httpx, json
from .base import ChatProvider

class AnthropicProvider(ChatProvider):
    async def stream_chat(self, connection, messages, temperature, max_tokens, extra_params=None):
        headers = {"x-api-key": connection.api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}

        system_prompt = None
        chat_messages = []
        for m in messages:
            if m["role"] == "system":
                system_prompt = (system_prompt + "\n" + m["content"]) if system_prompt else m["content"]
            else:
                chat_messages.append({"role": m["role"], "content": m["content"]})

        effective_temperature = temperature
        effective_max_tokens = max_tokens or 4096

        payload = {"model": connection.model_name, "messages": chat_messages, "temperature": effective_temperature}
        if system_prompt:
            payload["system"] = system_prompt

        if connection.reasoning_enabled:
            budget = connection.reasoning_budget_tokens or 4096
            # Anthropic requires temperature == 1 and max_tokens > budget_tokens
            # when thinking is on — both enforced here regardless of what the
            # caller asked for, since the API rejects the request otherwise.
            payload["temperature"] = 1
            payload["max_tokens"] = max(effective_max_tokens, budget + 1024)
            payload["thinking"] = {"type": "enabled", "budget_tokens": budget}
        else:
            payload["max_tokens"] = effective_max_tokens

        payload["stream"] = True
        url = connection.base_url.rstrip("/") + "/messages"

        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as resp:
                if resp.status_code != 200:
                    yield {"error": (await resp.aread()).decode(errors="ignore")}
                    return
                async for line in resp.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    try:
                        event = json.loads(line[5:].strip())
                    except json.JSONDecodeError:
                        continue
                    etype = event.get("type")
                    if etype == "content_block_delta":
                        delta = event.get("delta", {})
                        dtype = delta.get("type")
                        if dtype == "text_delta" and delta.get("text"):
                            yield {"delta": delta["text"]}
                        elif dtype == "thinking_delta" and delta.get("thinking"):
                            yield {"reasoning_delta": delta["thinking"]}
                    elif etype == "message_stop":
                        yield {"done": True}
                        return
                    elif etype == "error":
                        yield {"error": event.get("error", {}).get("message", "Anthropic error")}
                        return