import logging
from typing import AsyncGenerator
import httpx
from openai import AsyncOpenAI
from langfuse.decorators import observe, langfuse_context
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
    character_name: str | None = None,
) -> AsyncGenerator[str, None]:
    logger.info(f"stream_chat_completion called - room: {room_id}, model: {model_slug}")
    logger.info(f"Messages count: {len(messages)}, max_tokens: {max_tokens}")

    langfuse_context.update_current_trace(
        user_id=user_id,
        session_id=room_id,
        tags=[model_slug],
        metadata={"character_name": character_name} if character_name else {},
    )

    if not client or not settings.has_openrouter:
        # Mock response when OpenRouter not configured
        logger.warning(f"OpenRouter not configured, returning mock response for room {room_id}")
        mock_response = (
            "This is a mock AI response. "
            "OpenRouter API key is not configured. "
            "Please set OPENROUTER_API_KEY in your environment variables."
        )
        for char in mock_response:
            yield char
        return

    try:
        logger.info(f"Calling OpenRouter API with model: {model_slug}")
        logger.info(f"First message preview: {messages[0] if messages else 'No messages'}")
        logger.info(f"Last message preview: {messages[-1]['content'][:100] if messages else 'No messages'}...")

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
        logger.info("OpenRouter API call successful, starting to stream chunks...")

        chunk_count = 0
        reasoning_chunks = 0
        total_chunks_received = 0
        has_reasoning_model = False

        async for chunk in response:
            total_chunks_received += 1
            if total_chunks_received == 1:
                logger.info(f"First chunk object: {chunk}")

            if chunk.choices:
                if total_chunks_received <= 3:
                    logger.info(f"Chunk {total_chunks_received} - has choices: {len(chunk.choices)}, delta: {chunk.choices[0].delta if chunk.choices else 'None'}")

                delta = chunk.choices[0].delta

                # Detect reasoning model (o1/o3)
                if hasattr(delta, 'reasoning') and delta.reasoning:
                    reasoning_chunks += 1
                    if reasoning_chunks == 1:
                        has_reasoning_model = True
                        logger.warning("⚠️ Reasoning model (o1/o3) detected - these models don't work well with streaming")
                        logger.warning("   Skipping reasoning output, waiting for final content...")
                    # Skip reasoning chunks - don't show internal thinking to user
                    continue

                # Handle content (normal response or final answer from reasoning models)
                if delta.content:
                    chunk_count += 1
                    if chunk_count == 1:
                        logger.info("First content chunk received from OpenRouter")
                    yield delta.content
            else:
                logger.warning(f"Chunk {total_chunks_received} has no choices")

        # Warning if reasoning model returned no content
        if has_reasoning_model and chunk_count == 0:
            logger.error("⚠️ Reasoning model completed but returned no content!")
            logger.error("   Consider using a different model like claude-3.5-sonnet or gpt-4-turbo")
            error_msg = "[시스템 알림] 현재 선택된 AI 모델(reasoning 모델)은 스트리밍과 호환되지 않습니다. LLM 설정에서 다른 모델을 선택해주세요. (권장: Claude 3.5 Sonnet)"
            yield error_msg

        logger.info(f"Streaming completed. Total chunks: {total_chunks_received}, Content: {chunk_count}, Reasoning: {reasoning_chunks}")

    except Exception as e:
        logger.error(f"Error streaming from OpenRouter: {e}", exc_info=True)
        logger.error(f"Model: {model_slug}, User: {user_id}, Room: {room_id}")
        logger.error(f"Message count: {len(messages)}, Max tokens: {max_tokens}")

        # Yield error message
        error_msg = f"Error: {str(e)}"
        for char in error_msg:
            yield char
