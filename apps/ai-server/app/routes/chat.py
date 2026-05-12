import json
import logging
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
        # Use character and lorebook data from API server if provided
        # This avoids duplicate DB queries and ensures consistent data
        if request.character and request.lorebook_entries is not None:
            # Use data from API server (preferred)
            character_data = request.character
            lorebook_entries = request.lorebook_entries
            situational_triggers = request.situational_triggers or []

            # Fetch only room and persona data
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
            persona_data = room.get("persona")

        else:
            # Fallback: Fetch everything from DB (legacy behavior)
            room_response = supabase.table("chat_rooms").select(
                """
                *,
                character:characters(
                    id,
                    name,
                    description,
                    tagline,
                    greeting,
                    data,
                    lorebook
                ),
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
            character = room.get("character", {})
            persona_data = room.get("persona")

            # Extract data for legacy path
            character_data = {
                "name": character.get("name"),
                "description": character.get("description"),
                "personality": character.get("tagline"),
                "scenario": character.get("greeting"),
            }

            # Merge character.data if exists
            if character.get("data"):
                char_data_json = character.get("data")
                if isinstance(char_data_json, dict):
                    character_data.update(char_data_json)

            # Extract lorebook
            lorebook = character.get("lorebook") or {}
            lorebook_entries = lorebook.get("entries", []) if isinstance(lorebook, dict) else []

            # Extract situational triggers
            situational_triggers = []
            if "situationalImages" in character_data and isinstance(character_data["situationalImages"], list):
                for img in character_data["situationalImages"]:
                    if isinstance(img, dict) and "triggers" in img:
                        situational_triggers.append({
                            "triggers": img.get("triggers", []),
                            "description": img.get("description", "")
                        })

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
        triggered_lorebook_entries = PromptBuilder.filter_triggered_lorebook_entries(
            lorebook_entries=lorebook_entries,
            message_history=message_history,
            new_message=request.message
        )

        system_prompt = PromptBuilder.build_system_prompt(
            character_data=character_data,
            lorebook={"entries": triggered_lorebook_entries} if triggered_lorebook_entries else None,
            user_persona=persona_data.get("persona") if persona_data else None,
            user_note=room.get("user_note"),
            conversation_summary=room.get("conversation_summary"),
            situational_triggers=situational_triggers if situational_triggers else None,
        )

        # Build full message array
        messages = PromptBuilder.build_full_messages(
            system_prompt=system_prompt,
            message_history=message_history,
            new_user_message=request.message,
            hint=request.hint,
        )

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
            ):
                accumulated += chunk

                # Send incremental update
                chunk_data = ChatResponseChunk(
                    event_id=event_id,
                    content=accumulated,
                    is_final_event=False
                )
                yield f"data: {chunk_data.model_dump_json()}\n\n"
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
