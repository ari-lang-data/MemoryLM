import httpx, json
from .base import ChatProvider

class OpenAICompatProvider(ChatProvider):
    async def stream_chat(self, connection, messages, temperature, max_tokens, extra_params=None):
        headers = {"Content-Type": "application/json"}
        if connection.api_key:
            headers["Authorization"] = f"Bearer {connection.api_key}"

        payload = {"model": connection.model_name, "messages": messages, "temperature": temperature, "stream": True}
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if extra_params:
            payload.update({k: v for k, v in extra_params.items() if v is not None})

        if connection.reasoning_enabled:
            template_kwargs = payload.get("chat_template_kwargs", {})
            template_kwargs["enable_thinking"] = True
            template_kwargs["reasoning_effort"] = connection.reasoning_effort
            payload["chat_template_kwargs"] = template_kwargs
            # Also tried as a top-level field — some OpenAI-compatible servers
            # (notably those serving gpt-oss) read it from here instead of
            # template kwargs. Harmless no-op on servers that ignore it.
            payload["reasoning_effort"] = connection.reasoning_effort

        url = connection.base_url.rstrip("/") + "/chat/completions"

        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as resp:
                if resp.status_code != 200:
                    yield {"error": (await resp.aread()).decode(errors="ignore")}
                    return
                async for line in resp.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        yield {"done": True}
                        return
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    choice = (chunk.get("choices") or [{}])[0]
                    delta = choice.get("delta", {})
                    if delta.get("content"):
                        yield {"delta": delta["content"]}
                    if delta.get("reasoning_content") or delta.get("reasoning"):
                        yield {"reasoning_delta": delta.get("reasoning_content") or delta.get("reasoning")}
                    if choice.get("finish_reason"):
                        yield {"done": True, "finish_reason": choice["finish_reason"]}