CREATE TABLE "ai_recommendations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "rationale" VARCHAR(2000) NOT NULL,
    "relatedSignalType" VARCHAR(80),
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "action_proposals" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "proposalType" VARCHAR(80) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    "source" VARCHAR(80) NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "action_proposals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_recommendations_organizationId_idx" ON "ai_recommendations"("organizationId");
CREATE INDEX "ai_recommendations_priority_idx" ON "ai_recommendations"("priority");
CREATE INDEX "ai_recommendations_isActive_idx" ON "ai_recommendations"("isActive");
CREATE INDEX "ai_recommendations_relatedSignalType_idx" ON "ai_recommendations"("relatedSignalType");

CREATE INDEX "action_proposals_organizationId_idx" ON "action_proposals"("organizationId");
CREATE INDEX "action_proposals_status_idx" ON "action_proposals"("status");
CREATE INDEX "action_proposals_priority_idx" ON "action_proposals"("priority");

ALTER TABLE "ai_recommendations"
ADD CONSTRAINT "ai_recommendations_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "action_proposals"
ADD CONSTRAINT "action_proposals_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
