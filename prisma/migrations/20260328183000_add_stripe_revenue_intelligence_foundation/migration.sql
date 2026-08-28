CREATE TABLE IF NOT EXISTS "integration_stripe_accounts" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "stripeAccountId" VARCHAR(120) NOT NULL,
  "accountEmail" VARCHAR(255),
  "accessTokenCipher" TEXT NOT NULL,
  "refreshTokenCipher" TEXT,
  "scope" VARCHAR(255),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disconnectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_stripe_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stripe_charges" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "stripeAccountRefId" UUID NOT NULL,
  "externalChargeId" VARCHAR(120) NOT NULL,
  "paymentIntentId" VARCHAR(120),
  "customerId" VARCHAR(120),
  "amount" DECIMAL(18,4),
  "currency" VARCHAR(12),
  "status" VARCHAR(60),
  "paid" BOOLEAN,
  "refunded" BOOLEAN,
  "disputed" BOOLEAN,
  "createdAtRemote" TIMESTAMP(3),
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stripe_charges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stripe_payment_events" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "stripeAccountRefId" UUID NOT NULL,
  "externalEventId" VARCHAR(120) NOT NULL,
  "type" VARCHAR(120) NOT NULL,
  "createdAtRemote" TIMESTAMP(3),
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stripe_payment_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stripe_sync_runs" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "stripeAccountRefId" UUID NOT NULL,
  "syncType" VARCHAR(80) NOT NULL,
  "status" VARCHAR(40) NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" VARCHAR(1000),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stripe_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_stripe_accounts_organizationId_stripeAccountId_key"
ON "integration_stripe_accounts"("organizationId", "stripeAccountId");
CREATE INDEX IF NOT EXISTS "integration_stripe_accounts_organizationId_idx"
ON "integration_stripe_accounts"("organizationId");
CREATE INDEX IF NOT EXISTS "integration_stripe_accounts_stripeAccountId_idx"
ON "integration_stripe_accounts"("stripeAccountId");

CREATE UNIQUE INDEX IF NOT EXISTS "stripe_charges_stripeAccountRefId_externalChargeId_key"
ON "stripe_charges"("stripeAccountRefId", "externalChargeId");
CREATE INDEX IF NOT EXISTS "stripe_charges_organizationId_idx"
ON "stripe_charges"("organizationId");
CREATE INDEX IF NOT EXISTS "stripe_charges_status_idx"
ON "stripe_charges"("status");
CREATE INDEX IF NOT EXISTS "stripe_charges_createdAtRemote_idx"
ON "stripe_charges"("createdAtRemote");

CREATE UNIQUE INDEX IF NOT EXISTS "stripe_payment_events_stripeAccountRefId_externalEventId_key"
ON "stripe_payment_events"("stripeAccountRefId", "externalEventId");
CREATE INDEX IF NOT EXISTS "stripe_payment_events_organizationId_idx"
ON "stripe_payment_events"("organizationId");
CREATE INDEX IF NOT EXISTS "stripe_payment_events_type_idx"
ON "stripe_payment_events"("type");
CREATE INDEX IF NOT EXISTS "stripe_payment_events_createdAtRemote_idx"
ON "stripe_payment_events"("createdAtRemote");

CREATE INDEX IF NOT EXISTS "stripe_sync_runs_organizationId_idx"
ON "stripe_sync_runs"("organizationId");
CREATE INDEX IF NOT EXISTS "stripe_sync_runs_status_idx"
ON "stripe_sync_runs"("status");
CREATE INDEX IF NOT EXISTS "stripe_sync_runs_syncType_idx"
ON "stripe_sync_runs"("syncType");

DO $$
BEGIN
  ALTER TABLE "integration_stripe_accounts"
    ADD CONSTRAINT "integration_stripe_accounts_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "stripe_charges"
    ADD CONSTRAINT "stripe_charges_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "stripe_charges"
    ADD CONSTRAINT "stripe_charges_stripeAccountRefId_fkey"
    FOREIGN KEY ("stripeAccountRefId") REFERENCES "integration_stripe_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "stripe_payment_events"
    ADD CONSTRAINT "stripe_payment_events_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "stripe_payment_events"
    ADD CONSTRAINT "stripe_payment_events_stripeAccountRefId_fkey"
    FOREIGN KEY ("stripeAccountRefId") REFERENCES "integration_stripe_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "stripe_sync_runs"
    ADD CONSTRAINT "stripe_sync_runs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "stripe_sync_runs"
    ADD CONSTRAINT "stripe_sync_runs_stripeAccountRefId_fkey"
    FOREIGN KEY ("stripeAccountRefId") REFERENCES "integration_stripe_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
