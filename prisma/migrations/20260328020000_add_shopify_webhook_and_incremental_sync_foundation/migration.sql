CREATE TABLE IF NOT EXISTS "shopify_webhook_deliveries" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "shopifyStoreId" UUID,
  "topic" VARCHAR(120) NOT NULL,
  "shopDomain" VARCHAR(255) NOT NULL,
  "webhookId" VARCHAR(120),
  "eventId" VARCHAR(120),
  "payloadHash" VARCHAR(128),
  "status" VARCHAR(40) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "errorMessage" VARCHAR(1000),
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shopify_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "shopify_sync_cursors" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "shopifyStoreId" UUID NOT NULL,
  "cursorType" VARCHAR(80) NOT NULL,
  "lastSyncedAt" TIMESTAMP(3),
  "cursorValue" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shopify_sync_cursors_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shopify_webhook_deliveries_organizationId_idx"
ON "shopify_webhook_deliveries"("organizationId");

CREATE INDEX IF NOT EXISTS "shopify_webhook_deliveries_shopifyStoreId_idx"
ON "shopify_webhook_deliveries"("shopifyStoreId");

CREATE INDEX IF NOT EXISTS "shopify_webhook_deliveries_shopDomain_idx"
ON "shopify_webhook_deliveries"("shopDomain");

CREATE INDEX IF NOT EXISTS "shopify_webhook_deliveries_topic_idx"
ON "shopify_webhook_deliveries"("topic");

CREATE INDEX IF NOT EXISTS "shopify_webhook_deliveries_status_idx"
ON "shopify_webhook_deliveries"("status");

CREATE INDEX IF NOT EXISTS "shopify_webhook_deliveries_receivedAt_idx"
ON "shopify_webhook_deliveries"("receivedAt");

CREATE INDEX IF NOT EXISTS "shopify_webhook_deliveries_webhookId_idx"
ON "shopify_webhook_deliveries"("webhookId");

CREATE INDEX IF NOT EXISTS "shopify_webhook_deliveries_eventId_idx"
ON "shopify_webhook_deliveries"("eventId");

CREATE UNIQUE INDEX IF NOT EXISTS "shopify_sync_cursors_shopifyStoreId_cursorType_key"
ON "shopify_sync_cursors"("shopifyStoreId", "cursorType");

CREATE INDEX IF NOT EXISTS "shopify_sync_cursors_organizationId_idx"
ON "shopify_sync_cursors"("organizationId");

CREATE INDEX IF NOT EXISTS "shopify_sync_cursors_shopifyStoreId_idx"
ON "shopify_sync_cursors"("shopifyStoreId");

CREATE INDEX IF NOT EXISTS "shopify_sync_cursors_cursorType_idx"
ON "shopify_sync_cursors"("cursorType");

DO $$
BEGIN
  ALTER TABLE "shopify_webhook_deliveries"
    ADD CONSTRAINT "shopify_webhook_deliveries_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "shopify_webhook_deliveries"
    ADD CONSTRAINT "shopify_webhook_deliveries_shopifyStoreId_fkey"
    FOREIGN KEY ("shopifyStoreId") REFERENCES "integration_shopify_stores"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "shopify_sync_cursors"
    ADD CONSTRAINT "shopify_sync_cursors_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "shopify_sync_cursors"
    ADD CONSTRAINT "shopify_sync_cursors_shopifyStoreId_fkey"
    FOREIGN KEY ("shopifyStoreId") REFERENCES "integration_shopify_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
