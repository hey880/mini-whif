from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Individual chat message."""
    role: str = Field(description="Message role: user, assistant, or system")
    content: str = Field(description="Message content")


class ChatRequest(BaseModel):
    """Request to send a chat message."""
    room_id: str = Field(description="Chat room ID")
    user_id: str = Field(description="User ID")
    message: str = Field(description="User message content")
    hint: str | None = Field(default=None, description="Hint for character's next action (auto-continue)")
    model_slug: str = Field(description="LLM model slug")
    max_tokens: int = Field(default=2048, ge=1, le=8192)
    # Character and context data
    character: dict | None = Field(default=None, description="Character context")
    lorebook_entries: list[dict] | None = Field(default=None, description="Lorebook entries")
    situational_triggers: list[dict] | None = Field(default=None, description="Situational image triggers")
    persona_name: str | None = Field(default=None, description="User persona name")


class ChatResponseChunk(BaseModel):
    """Streaming response chunk."""
    event_id: int
    content: str
    is_final_event: bool
    model: str | None = None


class FeedbackRequest(BaseModel):
    """User feedback on AI response."""
    message_id: str = Field(description="Message ID")
    positive: bool = Field(description="Positive (true) or negative (false) feedback")
    trace_id: str | None = Field(default=None, description="Langfuse trace ID")


class FeedbackResponse(BaseModel):
    """Feedback submission result."""
    success: bool
    message: str
