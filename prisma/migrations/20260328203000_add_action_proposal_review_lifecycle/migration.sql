-- AlterTable
ALTER TABLE "action_proposals"
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewed_by_user_id" UUID,
ADD COLUMN "latest_decision_note" VARCHAR(2000);

-- CreateTable
CREATE TABLE "action_proposal_reviews" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "action_proposal_id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "decision" VARCHAR(40) NOT NULL,
    "note" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_proposal_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "action_proposal_reviews_organization_id_idx" ON "action_proposal_reviews"("organization_id");
CREATE INDEX "action_proposal_reviews_action_proposal_id_idx" ON "action_proposal_reviews"("action_proposal_id");
CREATE INDEX "action_proposal_reviews_reviewer_user_id_idx" ON "action_proposal_reviews"("reviewer_user_id");

-- AddForeignKey
ALTER TABLE "action_proposal_reviews"
ADD CONSTRAINT "action_proposal_reviews_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "action_proposal_reviews"
ADD CONSTRAINT "action_proposal_reviews_action_proposal_id_fkey"
FOREIGN KEY ("action_proposal_id") REFERENCES "action_proposals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
