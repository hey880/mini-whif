import logging
from fastapi import APIRouter
from ..models.schemas import FeedbackRequest, FeedbackResponse
from ..services.langfuse_service import record_user_feedback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/feedback", tags=["feedback"])


@router.post("")
async def submit_feedback(request: FeedbackRequest) -> FeedbackResponse:
    """
    Submit user feedback (thumbs up/down) for an AI message.

    This endpoint records feedback in Langfuse for observability.

    Args:
        request: Feedback request with message_id and positive flag

    Returns:
        FeedbackResponse indicating success/failure
    """
    try:
        success = record_user_feedback(
            message_id=request.message_id,
            positive=request.positive,
            trace_id=request.trace_id,
        )

        if success:
            message = "Feedback recorded successfully"
        else:
            message = "Langfuse not configured - feedback not recorded"

        return FeedbackResponse(success=success, message=message)

    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        return FeedbackResponse(
            success=False,
            message=f"Error: {str(e)}"
        )
