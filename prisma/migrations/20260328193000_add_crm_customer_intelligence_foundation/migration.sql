-- CreateTable
CREATE TABLE "crm_customer_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "external_customer_id" VARCHAR(64) NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "email" VARCHAR(320),
    "first_name" VARCHAR(120),
    "last_name" VARCHAR(120),
    "phone" VARCHAR(60),
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(18,4),
    "average_order_value" DECIMAL(18,4),
    "first_order_at" TIMESTAMP(3),
    "last_order_at" TIMESTAMP(3),
    "is_high_value" BOOLEAN NOT NULL DEFAULT false,
    "is_at_risk" BOOLEAN NOT NULL DEFAULT false,
    "lifecycle_stage" VARCHAR(40),
    "tags" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_customer_segment_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "segment_type" VARCHAR(80) NOT NULL,
    "customer_count" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_customer_segment_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_customer_profiles_organization_id_source_external_customer_id_key" ON "crm_customer_profiles"("organization_id", "source", "external_customer_id");
CREATE INDEX "crm_customer_profiles_organization_id_idx" ON "crm_customer_profiles"("organization_id");
CREATE INDEX "crm_customer_profiles_email_idx" ON "crm_customer_profiles"("email");
CREATE INDEX "crm_customer_profiles_is_high_value_idx" ON "crm_customer_profiles"("is_high_value");
CREATE INDEX "crm_customer_profiles_is_at_risk_idx" ON "crm_customer_profiles"("is_at_risk");

-- CreateIndex
CREATE INDEX "crm_customer_segment_snapshots_organization_id_idx" ON "crm_customer_segment_snapshots"("organization_id");
CREATE INDEX "crm_customer_segment_snapshots_date_idx" ON "crm_customer_segment_snapshots"("date");
CREATE INDEX "crm_customer_segment_snapshots_segment_type_idx" ON "crm_customer_segment_snapshots"("segment_type");

-- AddForeignKey
ALTER TABLE "crm_customer_profiles"
ADD CONSTRAINT "crm_customer_profiles_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_customer_segment_snapshots"
ADD CONSTRAINT "crm_customer_segment_snapshots_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
