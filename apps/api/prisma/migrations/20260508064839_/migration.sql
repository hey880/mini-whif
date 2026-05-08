-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "chosen_llm_model_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "context_window" INTEGER NOT NULL,
    "max_output_tokens" INTEGER NOT NULL,
    "gem_cost_per_message" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "llm_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gem_wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "paid_gem_amount" INTEGER NOT NULL DEFAULT 0,
    "free_daily_gem_amount" INTEGER NOT NULL DEFAULT 200,
    "free_promo_gem_amount" INTEGER NOT NULL DEFAULT 0,
    "free_daily_gem_last_refill_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "gem_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gem_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "gem_type" TEXT NOT NULL,
    "log_type" TEXT NOT NULL,
    "related_order_id" UUID,
    "related_message_id" UUID,
    "memo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "gem_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gem_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "product_id" TEXT NOT NULL,
    "gem_amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "price_amount" INTEGER NOT NULL,
    "payment_status" TEXT NOT NULL,
    "payment_method" TEXT,
    "payment_transaction_id" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "gem_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "universes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "greeting" TEXT,
    "image_url" TEXT,
    "banner_image_url" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "is_nsfw" BOOLEAN NOT NULL DEFAULT false,
    "creator_id" UUID NOT NULL,
    "universe_id" UUID,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "data" JSONB NOT NULL DEFAULT '{}',
    "lorebook" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_personas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "persona_id" UUID,
    "user_note" TEXT,
    "conversation_summary" TEXT,
    "last_message_at" TIMESTAMPTZ(6),
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model_slug" TEXT,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "parent_message_id" UUID,
    "positive_reaction_count" INTEGER NOT NULL DEFAULT 0,
    "negative_reaction_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "model_slug" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "reaction_type" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "keyword" TEXT NOT NULL,
    "category" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_email_idx" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "llm_models_slug_key" ON "llm_models"("slug");

-- CreateIndex
CREATE INDEX "llm_models_is_active_idx" ON "llm_models"("is_active");

-- CreateIndex
CREATE INDEX "llm_models_slug_idx" ON "llm_models"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "gem_wallets_user_id_key" ON "gem_wallets"("user_id");

-- CreateIndex
CREATE INDEX "gem_wallets_user_id_idx" ON "gem_wallets"("user_id");

-- CreateIndex
CREATE INDEX "gem_logs_user_id_created_at_idx" ON "gem_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "gem_logs_log_type_idx" ON "gem_logs"("log_type");

-- CreateIndex
CREATE INDEX "gem_logs_related_order_id_idx" ON "gem_logs"("related_order_id");

-- CreateIndex
CREATE INDEX "gem_logs_related_message_id_idx" ON "gem_logs"("related_message_id");

-- CreateIndex
CREATE INDEX "gem_orders_user_id_created_at_idx" ON "gem_orders"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "gem_orders_payment_status_idx" ON "gem_orders"("payment_status");

-- CreateIndex
CREATE INDEX "gem_orders_payment_transaction_id_idx" ON "gem_orders"("payment_transaction_id");

-- CreateIndex
CREATE INDEX "characters_keywords_idx" ON "characters" USING GIN ("keywords");

-- CreateIndex
CREATE INDEX "characters_creator_id_idx" ON "characters"("creator_id");

-- CreateIndex
CREATE INDEX "characters_visibility_is_nsfw_idx" ON "characters"("visibility", "is_nsfw");

-- CreateIndex
CREATE INDEX "characters_universe_id_idx" ON "characters"("universe_id");

-- CreateIndex
CREATE INDEX "characters_created_at_idx" ON "characters"("created_at" DESC);

-- CreateIndex
CREATE INDEX "user_personas_user_id_idx" ON "user_personas"("user_id");

-- CreateIndex
CREATE INDEX "user_personas_user_id_is_default_idx" ON "user_personas"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "chat_rooms_user_id_last_message_at_idx" ON "chat_rooms"("user_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "chat_rooms_user_id_is_pinned_idx" ON "chat_rooms"("user_id", "is_pinned");

-- CreateIndex
CREATE INDEX "chat_rooms_character_id_idx" ON "chat_rooms"("character_id");

-- CreateIndex
CREATE INDEX "chat_rooms_persona_id_idx" ON "chat_rooms"("persona_id");

-- CreateIndex
CREATE INDEX "messages_room_id_created_at_idx" ON "messages"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_parent_message_id_idx" ON "messages"("parent_message_id");

-- CreateIndex
CREATE INDEX "message_versions_message_id_idx" ON "message_versions"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_versions_message_id_version_number_key" ON "message_versions"("message_id", "version_number");

-- CreateIndex
CREATE INDEX "user_reactions_message_id_idx" ON "user_reactions"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_reactions_user_id_message_id_key" ON "user_reactions"("user_id", "message_id");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_keyword_key" ON "keywords"("keyword");

-- CreateIndex
CREATE INDEX "keywords_usage_count_idx" ON "keywords"("usage_count" DESC);

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_chosen_llm_model_id_fkey" FOREIGN KEY ("chosen_llm_model_id") REFERENCES "llm_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gem_wallets" ADD CONSTRAINT "gem_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gem_logs" ADD CONSTRAINT "gem_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gem_logs" ADD CONSTRAINT "gem_logs_related_order_id_fkey" FOREIGN KEY ("related_order_id") REFERENCES "gem_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gem_logs" ADD CONSTRAINT "gem_logs_related_message_id_fkey" FOREIGN KEY ("related_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gem_orders" ADD CONSTRAINT "gem_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_universe_id_fkey" FOREIGN KEY ("universe_id") REFERENCES "universes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_personas" ADD CONSTRAINT "user_personas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "user_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_versions" ADD CONSTRAINT "message_versions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reactions" ADD CONSTRAINT "user_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reactions" ADD CONSTRAINT "user_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
