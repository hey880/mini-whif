import json
import logging
import asyncio
from typing import Annotated
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from ..models.schemas import ChatRequest, ChatResponseChunk
from ..services.llm_service import stream_chat_completion
from ..services.prompt_builder import PromptBuilder
from ..config.supabase import supabase

logger = logging.getLogger(__name__)

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
        # Use character and lorebook data from API server
        character_data = request.character
        lorebook_entries = request.lorebook_entries or []
        situational_triggers = request.situational_triggers or []

        # OPTIMIZATION: Use persona_name from API server if provided (avoid DB query)
        if request.persona_name:
            # Use pre-loaded persona name
            persona_data = {"persona": request.persona_name}
            # Fetch only room metadata (no joins)
            room_response = supabase.table("chat_rooms").select("*").eq("id", request.room_id).single().execute()
        else:
            # Fallback: fetch room with persona (for backward compatibility)
            room_response = supabase.table("chat_rooms").select(
                """
                *,
                persona:user_personas(
                    persona
                )
                """
            ).eq("id", request.room_id).single().execute()

        if not room_response.data:
            async def error_stream():
                error_data = ChatResponseChunk(
                    event_id=0,
                    content="Error: Chat room not found",
                    is_final_event=True
                )
                yield f"data: {error_data.model_dump_json()}\n\n"

            return StreamingResponse(
                error_stream(),
                media_type="text/event-stream"
            )

        room = room_response.data
        if not request.persona_name:
            persona_data = room.get("persona")

        # Fetch recent messages (last 20)
        messages_response = supabase.table("messages").select(
            "role, content"
        ).eq("room_id", request.room_id).order(
            "created_at", desc=False
        ).limit(20).execute()

        message_history = PromptBuilder.format_messages_history(
            messages_response.data or []
        )

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
        logger.debug(f"📚 Total lorebook entries available: {len(lorebook_entries)}")
        for entry in lorebook_entries:
            logger.debug(f"  - Entry: {entry.get('name', 'Unknown')} | Keywords: {entry.get('keywords', entry.get('triggers', []))} | Source: {entry.get('source', 'unknown')}")

        triggered_lorebook_entries = PromptBuilder.filter_triggered_lorebook_entries(
            lorebook_entries=lorebook_entries,
            message_history=message_history,
            new_message=request.message
        )

        logger.debug(f"✅ Triggered lorebook entries: {len(triggered_lorebook_entries)}")
        for entry in triggered_lorebook_entries:
            logger.debug(f"  - Triggered: {entry.get('name', 'Unknown')} | Keywords: {entry.get('keywords', entry.get('triggers', []))}")

        system_prompt = PromptBuilder.build_system_prompt(
            character_data=character_data,
            lorebook={"entries": triggered_lorebook_entries} if triggered_lorebook_entries else None,
            user_persona=persona_data.get("persona") if persona_data else None,
            user_note=request.user_note or room.get("user_note"),
            conversation_summary=request.conversation_summary or room.get("conversation_summary"),
            situational_triggers=situational_triggers if situational_triggers else None,
            hint=request.hint,  # Layer 1 enforcement
        )

        # Proactive diversity check: analyze recent assistant messages BEFORE generation
        recent_assistant_messages = [
            msg["content"]
            for msg in message_history
            if msg.get("role") == "assistant"
        ][-3:]  # Last 3 assistant messages

        needs_diversity, similar_messages = PromptBuilder.should_add_diversity_prompt(
            recent_assistant_messages, threshold=0.85
        )

        if needs_diversity:
            logger.info(
                f"🎨 Proactive diversity: Detected {len(similar_messages)} similar recent responses "
                f"(threshold: 0.85), adding diversity prompt to prevent repetition"
            )
            diversity_prompt = PromptBuilder.build_diversity_prompt(similar_messages)
            system_prompt = system_prompt + "\n\n" + diversity_prompt

        # Debug log for hint
        if request.hint:
            logger.info(f"Regenerating with hint: {request.hint}")

        # Build full message array
        messages = PromptBuilder.build_full_messages(
            system_prompt=system_prompt,
            message_history=message_history,
            new_user_message=request.message,
            hint=request.hint,  # Layers 2 & 3 enforcement
            character_name=character_data.get("name"),  # For assistant prefill
        )

        # Debug log for messages
        if request.hint:
            logger.info(f"Total messages in prompt: {len(messages)}")
            for i, msg in enumerate(messages):
                if "힌트" in msg.get("content", ""):
                    logger.info(f"Hint message at index {i}: {msg['content'][:200]}...")

        # Stream response
        async def sse_generator():
            event_id = 0
            accumulated = ""

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
        logger.error(f"Error processing chat request: {e}")

        async def error_stream():
            error_data = ChatResponseChunk(
                event_id=0,
                content=f"Error: {str(e)}",
                is_final_event=True
            )
            yield f"data: {error_data.model_dump_json()}\n\n"

        return StreamingResponse(
            error_stream(),
            media_type="text/event-stream"
        )
