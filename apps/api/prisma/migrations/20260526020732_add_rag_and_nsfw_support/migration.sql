-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add NSFW capability flag to llm_models
ALTER TABLE "llm_models" ADD COLUMN "is_nsfw_capable" BOOLEAN NOT NULL DEFAULT false;

-- Add default LLM model to characters
ALTER TABLE "characters" ADD COLUMN "default_llm_model_id" UUID;

-- Add embedding fields to messages
ALTER TABLE "messages" ADD COLUMN "embedding" vector(1536);
ALTER TABLE "messages" ADD COLUMN "embedding_model" TEXT;
ALTER TABLE "messages" ADD COLUMN "embedded_at" TIMESTAMPTZ(6);

-- Create conversation_memories table for RAG
CREATE TABLE "conversation_memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "message_range" JSONB NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conversation_memories_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "characters" ADD CONSTRAINT "characters_default_llm_model_id_fkey"
    FOREIGN KEY ("default_llm_model_id") REFERENCES "llm_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "conversation_memories" ADD CONSTRAINT "conversation_memories_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for NSFW and default model
CREATE INDEX "llm_models_is_nsfw_capable_idx" ON "llm_models"("is_nsfw_capable");
CREATE INDEX "characters_default_llm_model_id_idx" ON "characters"("default_llm_model_id");

-- Create index for message embeddings
CREATE INDEX "messages_room_id_embedded_at_idx" ON "messages"("room_id", "embedded_at" DESC);

-- Create indexes for conversation memories
CREATE INDEX "conversation_memories_room_id_importance_idx" ON "conversation_memories"("room_id", "importance" DESC);
CREATE INDEX "conversation_memories_room_id_created_at_idx" ON "conversation_memories"("room_id", "created_at" DESC);

-- Create HNSW vector indexes for efficient similarity search
-- HNSW parameters: m=16 (connections per layer), ef_construction=64 (build quality)
-- These parameters balance between build time, memory usage, and search quality
CREATE INDEX IF NOT EXISTS "message_embedding_idx"
    ON "messages" USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS "conversation_memory_embedding_idx"
    ON "conversation_memories" USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
