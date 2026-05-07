import logging
from typing import Optional
from langfuse import Langfuse
from ..config.settings import settings

logger = logging.getLogger(__name__)

# Initialize Langfuse client if configured
langfuse_client: Optional[Langfuse] = None

if settings.has_langfuse:
    try:
        langfuse_client = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host
        )
        logger.info("Langfuse observability enabled")
    except Exception as e:
        logger.warning(f"Failed to initialize Langfuse: {e}")
else:
    logger.info("Langfuse not configured - observability disabled")


def record_user_feedback(message_id: str, positive: bool, trace_id: str | None = None) -> bool:
    """
    Record user feedback (thumbs up/down) for a message.

    Args:
        message_id: Message ID
        positive: True for positive feedback, False for negative
        trace_id: Optional Langfuse trace ID

    Returns:
        True if feedback was recorded, False if Langfuse not configured
    """
    if not langfuse_client:
        logger.debug("Langfuse not configured, skipping feedback recording")
        return False

    try:
        langfuse_client.score(
            trace_id=trace_id or message_id,
            name="user_feedback",
            value=1 if positive else 0,
            comment="User reaction: positive" if positive else "User reaction: negative"
        )
        logger.info(f"Recorded feedback for message {message_id}: {'positive' if positive else 'negative'}")
        return True
    except Exception as e:
        logger.error(f"Failed to record feedback: {e}")
        return False
