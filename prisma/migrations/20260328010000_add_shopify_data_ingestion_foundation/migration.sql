CREATE TABLE IF NOT EXISTS "shopify_orders" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "shopifyStoreId" UUID NOT NULL,
  "externalOrderId" VARCHAR(64) NOT NULL,
  "orderName" VARCHAR(255),
  "financialStatus" VARCHAR(80),
  "fulfillmentStatus" VARCHAR(80),
  "currencyCode" VARCHAR(10),
  "totalPrice" DECIMAL(18,4),
  "subtotalPrice" DECIMAL(18,4),
  "totalTax" DECIMAL(18,4),
  "customerExternalId" VARCHAR(64),
  "placedAt" TIMESTAMP(3),
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shopify_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "shopify_products" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "shopifyStoreId" UUID NOT NULL,
  "externalProductId" VARCHAR(64) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "handle" VARCHAR(255),
  "status" VARCHAR(80),
  "productType" VARCHAR(255),
  "vendor" VARCHAR(255),
  "tags" TEXT,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shopify_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "shopify_customers" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "shopifyStoreId" UUID NOT NULL,
  "externalCustomerId" VARCHAR(64) NOT NULL,
  "email" VARCHAR(320),
  "firstName" VARCHAR(120),
  "lastName" VARCHAR(120),
  "phone" VARCHAR(60),
  "ordersCount" INTEGER,
  "totalSpent" DECIMAL(18,4),
  "state" VARCHAR(80),
  "tags" TEXT,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shopify_customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "shopify_sync_runs" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "shopifyStoreId" UUID NOT NULL,
  "syncType" VARCHAR(80) NOT NULL,
  "status" VARCHAR(40) NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" VARCHAR(1000),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shopify_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shopify_orders_shopifyStoreId_externalOrderId_key"
ON "shopify_orders"("shopifyStoreId", "externalOrderId");

CREATE INDEX IF NOT EXISTS "shopify_orders_organizationId_idx"
ON "shopify_orders"("organizationId");

CREATE INDEX IF NOT EXISTS "shopify_orders_shopifyStoreId_idx"
ON "shopify_orders"("shopifyStoreId");

CREATE INDEX IF NOT EXISTS "shopify_orders_customerExternalId_idx"
ON "shopify_orders"("customerExternalId");

CREATE INDEX IF NOT EXISTS "shopify_orders_placedAt_idx"
ON "shopify_orders"("placedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "shopify_products_shopifyStoreId_externalProductId_key"
ON "shopify_products"("shopifyStoreId", "externalProductId");

CREATE INDEX IF NOT EXISTS "shopify_products_organizationId_idx"
ON "shopify_products"("organizationId");

CREATE INDEX IF NOT EXISTS "shopify_products_shopifyStoreId_idx"
ON "shopify_products"("shopifyStoreId");

CREATE INDEX IF NOT EXISTS "shopify_products_handle_idx"
ON "shopify_products"("handle");

CREATE UNIQUE INDEX IF NOT EXISTS "shopify_customers_shopifyStoreId_externalCustomerId_key"
ON "shopify_customers"("shopifyStoreId", "externalCustomerId");

CREATE INDEX IF NOT EXISTS "shopify_customers_organizationId_idx"
ON "shopify_customers"("organizationId");

CREATE INDEX IF NOT EXISTS "shopify_customers_shopifyStoreId_idx"
ON "shopify_customers"("shopifyStoreId");

CREATE INDEX IF NOT EXISTS "shopify_customers_email_idx"
ON "shopify_customers"("email");

CREATE INDEX IF NOT EXISTS "shopify_sync_runs_organizationId_idx"
ON "shopify_sync_runs"("organizationId");

CREATE INDEX IF NOT EXISTS "shopify_sync_runs_shopifyStoreId_idx"
ON "shopify_sync_runs"("shopifyStoreId");

CREATE INDEX IF NOT EXISTS "shopify_sync_runs_syncType_idx"
ON "shopify_sync_runs"("syncType");

CREATE INDEX IF NOT EXISTS "shopify_sync_runs_status_idx"
ON "shopify_sync_runs"("status");

DO $$
BEGIN
  ALTER TABLE "shopify_orders"
    ADD CONSTRAINT "shopify_orders_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "shopify_orders"
    ADD CONSTRAINT "shopify_orders_shopifyStoreId_fkey"
    FOREIGN KEY ("shopifyStoreId") REFERENCES "integration_shopify_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "shopify_products"
    ADD CONSTRAINT "shopify_products_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "shopify_products"
    ADD CONSTRAINT "shopify_products_shopifyStoreId_fkey"
    FOREIGN KEY ("shopifyStoreId") REFERENCES "integration_shopify_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "shopify_customers"
    ADD CONSTRAINT "shopify_customers_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "shopify_customers"
    ADD CONSTRAINT "shopify_customers_shopifyStoreId_fkey"
    FOREIGN KEY ("shopifyStoreId") REFERENCES "integration_shopify_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "shopify_sync_runs"
    ADD CONSTRAINT "shopify_sync_runs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "shopify_sync_runs"
    ADD CONSTRAINT "shopify_sync_runs_shopifyStoreId_fkey"
    FOREIGN KEY ("shopifyStoreId") REFERENCES "integration_shopify_stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
