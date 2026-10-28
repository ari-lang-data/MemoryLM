from abc import ABC, abstractmethod

class ChatProvider(ABC):
    @abstractmethod
    async def stream_chat(self, connection, messages, temperature, max_tokens, extra_params=None):
        """Async generator yielding {'delta': str} | {'reasoning_delta': str} | {'done': True} | {'error': str}"""
        ...