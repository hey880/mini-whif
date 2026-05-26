import json
import logging
import asyncio
from typing import Annotated
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from ..models.schemas import ChatRequest, ChatResponseChunk
from ..services.llm_service import stream_chat_completion
from ..services.prompt_builder import PromptBuilder
from ..services.prompt_builder_english import PromptBuilderEnglish

logger = logging.getLogger(__name__)

# 영어 프롬프트가 필요한 모델 리스트 (영어 중심 학습 모델)
ENGLISH_PROMPT_MODELS = [
    'sao10k/l3.3-euryale-70b',
    'sao10k/l3.3-euryale-70b-v2.3',
    'sao10k/l3-euryale-70b',
    # 필요시 추가 가능
]

router = APIRouter(prefix="/v1/chats", tags=["chat"])


@router.post("")
async def send_chat_message(
    request: ChatRequest,
    stream: Annotated[bool, Query(description="Enable streaming response")] = True,
) -> StreamingResponse:
    """
    Send a chat message and receive AI response via SSE.

    This endpoint:
    1. Fetches chat room, character, and persona data
    2. Retrieves recent message history
    3. Builds system prompt from character data
    4. Streams AI response via Server-Sent Events

    Args:
        request: Chat request with room_id, message, model_slug
        stream: Whether to stream the response (default: true)

    Returns:
        StreamingResponse with SSE events
    """
    try:
        logger.info(f"Processing chat request for room {request.room_id}")
        logger.info(f"Request data - user: {request.user_id}, model: {request.model_slug}")
        logger.info(f"Character provided: {bool(request.character)}")
        logger.info(f"Message history provided: {bool(request.message_history)}")

        # Use character and lorebook data from API server
        character_data = request.character
        lorebook_entries = request.lorebook_entries or []
        situational_triggers = request.situational_triggers or []

        # OPTIMIZATION: Use persona_name and message_history from API server (avoid DB queries)
        persona_data = {"persona": request.persona_name} if request.persona_name else None

        # Use message history from API server if provided
        if request.message_history:
            logger.info(f"Message history: {len(request.message_history)} messages")
            message_history = PromptBuilder.format_messages_history(request.message_history)
        else:
            # Fallback: empty history (should not happen with new API)
            logger.warning(f"No message_history provided for room {request.room_id}")
            message_history = []

        # Format example dialogues if they exist in data
        if "exampleDialogues" in character_data and isinstance(character_data["exampleDialogues"], list):
            formatted_examples = []
            for ex in character_data["exampleDialogues"]:
                if isinstance(ex, dict) and "situation" in ex and "response" in ex:
                    formatted_examples.append(f"Situation: {ex['situation']}\nResponse: {ex['response']}")
            if formatted_examples:
                character_data["exampleDialogues"] = formatted_examples

        # Filter lorebook entries by keyword triggers
        # Only include lorebook entries that are triggered by keywords in the conversation
        logger.info(f"📚 Total lorebook entries available: {len(lorebook_entries)}")

        triggered_lorebook_entries = PromptBuilder.filter_triggered_lorebook_entries(
            lorebook_entries=lorebook_entries,
            message_history=message_history,
            new_message=request.message
        )

        logger.info(f"✅ Triggered lorebook entries: {len(triggered_lorebook_entries)}")

        # 모델에 따라 적절한 PromptBuilder 선택
        use_english_prompt = request.model_slug in ENGLISH_PROMPT_MODELS
        builder = PromptBuilderEnglish if use_english_prompt else PromptBuilder

        if use_english_prompt:
            logger.info(f"🌍 Using ENGLISH prompt builder for model: {request.model_slug}")
        else:
            logger.info(f"🇰🇷 Using KOREAN prompt builder for model: {request.model_slug}")

        logger.info("Building system prompt...")
        system_prompt = builder.build_system_prompt(
            character_data=character_data,
            lorebook={"entries": triggered_lorebook_entries} if triggered_lorebook_entries else None,
            user_persona=persona_data.get("persona") if persona_data else None,
            user_note=request.user_note,
            conversation_summary=request.conversation_summary,
            situational_triggers=situational_triggers if situational_triggers else None,
            hint=request.hint,  # Layer 1 enforcement
            relevant_memories=request.relevant_memories,  # RAG: 관련 기억
        )
        logger.info(f"System prompt built: {len(system_prompt)} chars")

        # Proactive diversity check: analyze recent assistant messages BEFORE generation
        recent_assistant_messages = [
            msg["content"]
            for msg in message_history
            if msg.get("role") == "assistant"
        ][-3:]  # Last 3 assistant messages

        needs_diversity, similar_messages = builder.should_add_diversity_prompt(
            recent_assistant_messages, threshold=0.85
        )

        if needs_diversity:
            logger.info(
                f"🎨 Proactive diversity: Detected {len(similar_messages)} similar recent responses "
                f"(threshold: 0.85), adding diversity prompt to prevent repetition"
            )
            diversity_prompt = builder.build_diversity_prompt(similar_messages)
            system_prompt = system_prompt + "\n\n" + diversity_prompt

        # Debug log for hint
        if request.hint:
            logger.info(f"Regenerating with hint: {request.hint}")

        # Build full message array
        logger.info("Building full messages array...")
        messages = builder.build_full_messages(
            system_prompt=system_prompt,
            message_history=message_history,
            new_user_message=request.message,
            hint=request.hint,  # Layers 2 & 3 enforcement
            character_name=character_data.get("name"),  # For assistant prefill
        )
        logger.info(f"Built {len(messages)} messages for LLM")

        # Stream response
        logger.info(f"Starting LLM streaming with model: {request.model_slug}")
        async def sse_generator():
            event_id = 0
            accumulated = ""

            logger.info("Calling stream_chat_completion...")
            async for chunk in stream_chat_completion(
                room_id=request.room_id,
                user_id=request.user_id,
                model_slug=request.model_slug,
                messages=messages,
                max_tokens=request.max_tokens,
                character_name=character_data.get("name"),
            ):
                accumulated += chunk

                # Send incremental update
                chunk_data = ChatResponseChunk(
                    event_id=event_id,
                    content=accumulated,
                    is_final_event=False
                )
                yield f"data: {chunk_data.model_dump_json()}\n\n"

                # CRITICAL: Force immediate flush by yielding control to event loop
                # This prevents buffering and ensures real-time streaming
                await asyncio.sleep(0)

                event_id += 1

            # Send final event
            final_data = ChatResponseChunk(
                event_id=event_id,
                content=accumulated,
                is_final_event=True,
                model=request.model_slug
            )
            yield f"data: {final_data.model_dump_json()}\n\n"

        return StreamingResponse(
            sse_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )

    except Exception as e:
        logger.error(f"Error processing chat request: {e}", exc_info=True)
        error_message = str(e)

        async def error_stream():
            error_data = ChatResponseChunk(
                event_id=0,
                content=f"Error: {error_message}",
                is_final_event=True
            )
            yield f"data: {error_data.model_dump_json()}\n\n"

        return StreamingResponse(
            error_stream(),
            media_type="text/event-stream"
        )
