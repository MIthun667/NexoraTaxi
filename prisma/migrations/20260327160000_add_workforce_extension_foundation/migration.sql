DO $$
BEGIN
  CREATE TYPE "WorkforceAuthorizationType" AS ENUM (
    'LICENSE',
    'CERTIFICATION',
    'PERMIT',
    'CLEARANCE',
    'TRAINING_AUTHORIZATION',
    'APPROVAL_AUTHORITY',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "WorkforceAuthorizationStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'EXPIRED',
    'SUSPENDED',
    'REVOKED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "workforce_profile_extensions" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "workforceMemberId" UUID NOT NULL,
  "engagementStartDate" DATE,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workforce_profile_extensions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "workforce_authorizations" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "workforceMemberId" UUID NOT NULL,
  "evidenceDocumentId" UUID,
  "authorizationType" "WorkforceAuthorizationType" NOT NULL,
  "authorityScope" VARCHAR(120),
  "identifierValue" VARCHAR(160),
  "issuingAuthority" VARCHAR(160),
  "issuedAt" DATE,
  "expiresAt" DATE,
  "status" "WorkforceAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workforce_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workforce_profile_extensions_workforceMemberId_key"
ON "workforce_profile_extensions"("workforceMemberId");

CREATE INDEX IF NOT EXISTS "workforce_profile_extensions_organizationId_engagementStartDate_idx"
ON "workforce_profile_extensions"("organizationId", "engagementStartDate");

CREATE INDEX IF NOT EXISTS "workforce_authorizations_organizationId_authorizationType_status_idx"
ON "workforce_authorizations"("organizationId", "authorizationType", "status");

CREATE INDEX IF NOT EXISTS "workforce_authorizations_workforceMemberId_status_expiresAt_idx"
ON "workforce_authorizations"("workforceMemberId", "status", "expiresAt");

CREATE INDEX IF NOT EXISTS "workforce_authorizations_evidenceDocumentId_idx"
ON "workforce_authorizations"("evidenceDocumentId");

DO $$
BEGIN
  ALTER TABLE "workforce_profile_extensions"
    ADD CONSTRAINT "workforce_profile_extensions_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "workforce_profile_extensions"
    ADD CONSTRAINT "workforce_profile_extensions_workforceMemberId_fkey"
    FOREIGN KEY ("workforceMemberId") REFERENCES "workforce_members"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "workforce_authorizations"
    ADD CONSTRAINT "workforce_authorizations_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "workforce_authorizations"
    ADD CONSTRAINT "workforce_authorizations_workforceMemberId_fkey"
    FOREIGN KEY ("workforceMemberId") REFERENCES "workforce_members"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "workforce_authorizations"
    ADD CONSTRAINT "workforce_authorizations_evidenceDocumentId_fkey"
    FOREIGN KEY ("evidenceDocumentId") REFERENCES "credential_documents"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
