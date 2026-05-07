# Persona Chat AI Server

FastAPI service for streaming AI responses with OpenRouter and Langfuse observability.

## Features

- **Streaming AI Responses**: Server-Sent Events (SSE) for real-time streaming
- **Multi-Model Support**: OpenRouter integration for Claude, GPT, Gemini
- **Observability**: Langfuse automatic tracing with `@observe()` decorator
- **Graceful Degradation**: Mock responses when API keys not configured

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Or with uv (faster):

```bash
uv pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

Optional (graceful degradation):
- `OPENROUTER_API_KEY`
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`

### 3. Run Development Server

```bash
# Using FastAPI CLI (recommended)
fastapi dev

# Or using uvicorn directly
uvicorn app.main:app --reload --port 8000
```

### 4. Run Production Server

```bash
fastapi run
```

## API Endpoints

### POST /v1/chats

Stream AI chat completion via SSE.

**Request**:
```json
{
  "room_id": "room-uuid",
  "user_id": "user-uuid",
  "message": "Hello!",
  "model_slug": "anthropic/claude-sonnet-4-5",
  "max_tokens": 2048
}
```

**Response** (SSE stream):
```
data: {"event_id": 0, "content": "Hi", "is_final_event": false}

data: {"event_id": 1, "content": "Hi there", "is_final_event": false}

data: {"event_id": 2, "content": "Hi there!", "is_final_event": true, "model": "anthropic/claude-sonnet-4-5"}
```

### POST /v1/feedback

Submit user feedback (thumbs up/down).

**Request**:
```json
{
  "message_id": "message-uuid",
  "positive": true,
  "trace_id": "optional-langfuse-trace-id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Feedback recorded successfully"
}
```

### GET /health

Health check with configuration status.

**Response**:
```json
{
  "status": "ok",
  "openrouter": "configured",
  "langfuse": "configured"
}
```

## Architecture

### Services

- **llm_service.py**: OpenRouter integration with streaming
- **prompt_builder.py**: System prompt construction from character data
- **langfuse_service.py**: Observability and feedback recording

### Routes

- **chat.py**: SSE streaming endpoint
- **feedback.py**: Feedback submission

### Models

- **schemas.py**: Pydantic models for request/response validation

## Langfuse Observability

The `@observe()` decorator automatically traces AI calls:

```python
@observe()
async def stream_chat_completion(...):
    # Automatically captured:
    # - Input messages
    # - Output content
    # - Latency
    # - Token usage
    # - Costs
```

View traces at https://cloud.langfuse.com

## Error Handling

- **Missing OpenRouter key**: Returns mock response
- **Missing Langfuse key**: Disables tracing silently
- **Chat room not found**: Returns error via SSE
- **Model errors**: Yields error message in stream

## Testing

```bash
# Test streaming endpoint
curl -N http://localhost:8000/v1/chats \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "test",
    "user_id": "test",
    "message": "Hello",
    "model_slug": "anthropic/claude-sonnet-4-5"
  }'
```

## Docker

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

CMD ["fastapi", "run"]
```

Build and run:

```bash
docker build -t persona-chat-ai-server .
docker run -p 8000:8000 --env-file .env persona-chat-ai-server
```
