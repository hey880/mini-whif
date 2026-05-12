-- AlterTable
ALTER TABLE "chat_rooms" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "user_personas" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "source_character_id" UUID;

-- CreateIndex
CREATE INDEX "user_personas_source_character_id_idx" ON "user_personas"("source_character_id");

-- AddForeignKey
ALTER TABLE "user_personas" ADD CONSTRAINT "user_personas_source_character_id_fkey" FOREIGN KEY ("source_character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
