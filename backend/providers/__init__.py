from .openai_compat import OpenAICompatProvider
from .anthropic import AnthropicProvider

_PROVIDERS = {"openai-compatible": OpenAICompatProvider(), "anthropic": AnthropicProvider()}

def get_provider(provider_type: str):
    provider = _PROVIDERS.get(provider_type)
    if not provider:
        raise ValueError(f"Unknown provider type: {provider_type}")
    return provider