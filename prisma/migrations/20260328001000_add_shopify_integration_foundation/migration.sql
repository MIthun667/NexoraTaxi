-- CreateTable
CREATE TABLE "integration_shopify_stores" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "shopDomain" VARCHAR(255) NOT NULL,
    "accessTokenCipher" TEXT NOT NULL,
    "scope" TEXT,
    "metadata" JSONB,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_shopify_stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_shopify_stores_organizationId_shopDomain_key"
ON "integration_shopify_stores"("organizationId", "shopDomain");

-- CreateIndex
CREATE INDEX "integration_shopify_stores_organizationId_idx"
ON "integration_shopify_stores"("organizationId");

-- CreateIndex
CREATE INDEX "integration_shopify_stores_shopDomain_idx"
ON "integration_shopify_stores"("shopDomain");

-- AddForeignKey
ALTER TABLE "integration_shopify_stores"
ADD CONSTRAINT "integration_shopify_stores_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
