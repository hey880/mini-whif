/*
  Warnings:

  - Added the required column `creator_id` to the `universes` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add all new columns as nullable first
ALTER TABLE "universes" ADD COLUMN "creator_id" UUID;
ALTER TABLE "universes" ADD COLUMN "data" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "universes" ADD COLUMN "genre" TEXT;
ALTER TABLE "universes" ADD COLUMN "image_url" TEXT;
ALTER TABLE "universes" ADD COLUMN "lorebook" JSONB;
ALTER TABLE "universes" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "universes" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'public';

-- Step 2: Set creator_id for existing universes to the first available profile
UPDATE "universes"
SET "creator_id" = (SELECT id FROM "profiles" LIMIT 1)
WHERE "creator_id" IS NULL;

-- Step 3: Make creator_id NOT NULL and add foreign key
ALTER TABLE "universes" ALTER COLUMN "creator_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "universes_creator_id_idx" ON "universes"("creator_id");

-- CreateIndex
CREATE INDEX "universes_visibility_idx" ON "universes"("visibility");

-- CreateIndex
CREATE INDEX "universes_tags_idx" ON "universes" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "universes_created_at_idx" ON "universes"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "universes" ADD CONSTRAINT "universes_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
