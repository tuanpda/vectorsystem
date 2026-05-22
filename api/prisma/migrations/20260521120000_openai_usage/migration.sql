-- OpenAI usage tracking (index / RAG embedding)
ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "index_prompt_tokens" INTEGER,
  ADD COLUMN IF NOT EXISTS "index_estimated_usd" DECIMAL(12, 6);

CREATE TABLE IF NOT EXISTS "openai_usage_logs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL DEFAULT 'default',
  "document_id" TEXT,
  "operation" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "prompt_tokens" INTEGER NOT NULL,
  "total_tokens" INTEGER NOT NULL,
  "estimated_usd" DECIMAL(12, 6) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "openai_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "openai_usage_logs_tenant_id_created_at_idx"
  ON "openai_usage_logs"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "openai_usage_logs_document_id_idx"
  ON "openai_usage_logs"("document_id");

ALTER TABLE "openai_usage_logs"
  ADD CONSTRAINT "openai_usage_logs_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
