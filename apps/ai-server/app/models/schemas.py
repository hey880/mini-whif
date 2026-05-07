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
    model_slug: str = Field(description="LLM model slug")
    max_tokens: int = Field(default=2048, ge=1, le=8192)


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
