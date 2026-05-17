import logging
from typing import AsyncGenerator
import httpx
from openai import AsyncOpenAI
from langfuse.decorators import observe
from ..config.settings import settings

logger = logging.getLogger(__name__)

# Initialize OpenAI client configured for OpenRouter
client: AsyncOpenAI | None = None

if settings.has_openrouter:
    # OPTIMIZATION: add timeout settings for stability
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.openrouter_api_key,
        timeout=httpx.Timeout(30.0, connect=5.0),  # 30s total, 5s connect
        max_retries=1,  # 1 retry on failure
    )
    logger.info("OpenRouter client initialized with timeout settings")
else:
    logger.warning("OpenRouter API key not configured - will use mock responses")


@observe()
async def stream_chat_completion(
    room_id: str,
    user_id: str,
    model_slug: str,
    messages: list[dict[str, str]],
    max_tokens: int = 2048,
) -> AsyncGenerator[str, None]:
    """
    Stream chat completion from OpenRouter.

    Args:
        room_id: Chat room ID
        user_id: User ID
        model_slug: Model identifier (e.g., "anthropic/claude-sonnet-4-5")
        messages: Message history in OpenAI format
        max_tokens: Maximum tokens to generate

    Yields:
        Content chunks as they're generated

    Note:
        @observe() decorator automatically traces this function in Langfuse
    """
    if not client or not settings.has_openrouter:
        # Mock response when OpenRouter not configured
        logger.warning(f"OpenRouter not configured, returning mock response for room {room_id}")
        mock_response = (
            "This is a mock AI response. "
            "OpenRouter API key is not configured. "
            "Please set OPENROUTER_API_KEY in your environment variables."
        )
        for i, char in enumerate(mock_response):
            yield char
        return

    try:
        response = await client.chat.completions.create(
            model=model_slug,
            messages=messages,
            max_tokens=max_tokens,
            stream=True,
            extra_headers={
                "HTTP-Referer": "https://persona-chat.dev",
                "X-Title": "Persona Chat",
            },
        )

        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    except Exception as e:
        logger.error(f"Error streaming from OpenRouter: {e}")
        # Yield error message
        error_msg = f"Error: {str(e)}"
        for char in error_msg:
            yield char
