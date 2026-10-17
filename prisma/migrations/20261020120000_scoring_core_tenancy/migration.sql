-- Brief 4.1: scoring core + multi-tenancy.
--
-- Hand-written on top of the Prisma-generated diff so the migration can run
-- against the 52 existing demo rows without failing on the new NOT NULL
-- columns. Strategy: create the new tables, seed the `fintex-demo` tenant and
-- its initial (default) rules version, add the new columns nullable, backfill
-- every existing row to `fintex-demo`, then tighten to NOT NULL.
--
-- No existing tables or columns are renamed, and no rows are deleted.

-- CreateEnum
CREATE TYPE "ScoringMode" AS ENUM ('MODEL_AND_RULES', 'RULES_ONLY');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeModelVersionId" TEXT,
    "activeRulesVersionId" TEXT,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModelVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "note" TEXT,

    CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RulesVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "note" TEXT,

    CONSTRAINT "RulesVersion_pkey" PRIMARY KEY ("id")
);

-- Seed the demo tenant and its initial rules version from the default pack.
-- Ids are fixed so the backfill below can reference them deterministically.
INSERT INTO "Tenant" ("id", "slug", "name")
VALUES ('tenant_fintex_demo', 'fintex-demo', 'Fintex Demo');

INSERT INTO "RulesVersion" ("id", "tenantId", "versionNumber", "config", "note")
VALUES (
    'rv_fintex_demo_1',
    'tenant_fintex_demo',
    1,
    $pack${
  "schemaVersion": 1,
  "name": "default-pack",
  "tierActions": {
    "LOW": "ALLOW",
    "MEDIUM": "ALLOW_AND_REVIEW",
    "HIGH": "HOLD_AND_ALERT"
  },
  "rules": [
    {
      "id": "full_balance_drain_new_recipient",
      "tag": "FULL_BALANCE_DRAIN",
      "label": "Full balance drain",
      "enabled": true,
      "severity": "HIGH",
      "reason": "Sender moved essentially their entire balance to a recipient with no prior history from this wallet.",
      "when": {
        "all": [
          { "field": "type", "op": "in", "value": ["TRANSFER", "CASH_OUT"] },
          { "field": "amount", "op": "gte", "value": 100 },
          {
            "field": "amount",
            "op": "gte",
            "valueRef": { "field": "sender.balanceBefore", "factor": 0.95 }
          },
          {
            "history": { "scope": "pair", "window_minutes": 10080, "metric": "count" },
            "op": "lte",
            "value": 0
          }
        ]
      }
    },
    {
      "id": "full_balance_drain_known_recipient",
      "tag": "FULL_BALANCE_DRAIN",
      "label": "Full balance drain",
      "enabled": true,
      "severity": "MEDIUM",
      "reason": "Sender moved essentially their entire balance in a single outbound transfer.",
      "when": {
        "all": [
          { "field": "type", "op": "in", "value": ["TRANSFER", "CASH_OUT"] },
          { "field": "amount", "op": "gte", "value": 100 },
          {
            "field": "amount",
            "op": "gte",
            "valueRef": { "field": "sender.balanceBefore", "factor": 0.95 }
          }
        ]
      }
    },
    {
      "id": "threshold_skirting",
      "tag": "THRESHOLD_SKIRTING",
      "label": "Threshold skirting",
      "enabled": true,
      "severity": "HIGH",
      "reason": "Several transfers were kept just below the GHS 2,000 reporting threshold within 24 hours.",
      "when": {
        "all": [
          { "field": "amount", "op": "gte", "value": 1800 },
          { "field": "amount", "op": "lt", "value": 2000 },
          {
            "history": {
              "scope": "sender_outgoing",
              "window_minutes": 1440,
              "metric": "count",
              "filter": {
                "types": ["TRANSFER"],
                "amount_gte": 1800,
                "amount_lte": 1999.99
              }
            },
            "op": "gte",
            "value": 2
          }
        ]
      }
    },
    {
      "id": "rapid_sequence",
      "tag": "RAPID_SEQUENCE",
      "label": "Rapid sequence",
      "enabled": true,
      "severity": "MEDIUM",
      "reason": "A burst of outbound transactions from the same wallet within 15 minutes.",
      "when": {
        "all": [
          {
            "history": { "scope": "sender_outgoing", "window_minutes": 15, "metric": "count" },
            "op": "gte",
            "value": 3
          }
        ]
      }
    },
    {
      "id": "pass_through",
      "tag": "PASS_THROUGH",
      "label": "Pass-through",
      "enabled": true,
      "severity": "HIGH",
      "reason": "An inbound transfer was cashed out within an hour for a near-identical amount.",
      "when": {
        "all": [
          { "field": "type", "op": "in", "value": ["TRANSFER", "CASH_OUT"] },
          {
            "history": { "scope": "sender_incoming", "window_minutes": 60, "metric": "sum_amount" },
            "op": "gte",
            "valueRef": { "field": "amount", "factor": 0.9 }
          },
          {
            "history": { "scope": "sender_incoming", "window_minutes": 60, "metric": "sum_amount" },
            "op": "lte",
            "valueRef": { "field": "amount", "factor": 1.1 }
          }
        ]
      }
    }
  ]
}
$pack$::jsonb,
    'Initial default pack (4.1 backfill)'
);

UPDATE "Tenant"
SET "activeRulesVersionId" = 'rv_fintex_demo_1'
WHERE "id" = 'tenant_fintex_demo';

-- AlterTable User: tenantId stays nullable (a USER may be tenant-less), but all
-- existing users belong to the demo tenant.
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;
UPDATE "User" SET "tenantId" = 'tenant_fintex_demo' WHERE "tenantId" IS NULL;

-- AlterTable Transaction: add nullable first, backfill, then NOT NULL.
ALTER TABLE "Transaction"
    ADD COLUMN "attributes" JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN "externalId" TEXT,
    ADD COLUMN "receiverBalanceBefore" DECIMAL(14,2),
    ADD COLUMN "tenantId" TEXT;
UPDATE "Transaction" SET "tenantId" = 'tenant_fintex_demo' WHERE "tenantId" IS NULL;
ALTER TABLE "Transaction" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable RiskAssessment: add nullable first, backfill, then NOT NULL.
ALTER TABLE "RiskAssessment"
    ADD COLUMN "contributions" JSONB,
    ADD COLUMN "historyAvailable" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "historyTruncated" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "imputedFeatures" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "modelVersionId" TEXT,
    ADD COLUMN "mode" "ScoringMode",
    ADD COLUMN "reasonsDetail" JSONB,
    ADD COLUMN "rulesVersionId" TEXT,
    ADD COLUMN "skippedRules" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "tenantId" TEXT;
UPDATE "RiskAssessment"
SET
    "tenantId" = 'tenant_fintex_demo',
    -- Existing seeded assessments came from the heuristic scorer, which had no
    -- model, so they are RULES_ONLY and point at the demo tenant's first pack.
    "mode" = 'RULES_ONLY',
    "rulesVersionId" = 'rv_fintex_demo_1'
WHERE "tenantId" IS NULL OR "mode" IS NULL OR "rulesVersionId" IS NULL;
ALTER TABLE "RiskAssessment"
    ALTER COLUMN "tenantId" SET NOT NULL,
    ALTER COLUMN "mode" SET NOT NULL,
    ALTER COLUMN "rulesVersionId" SET NOT NULL,
    ALTER COLUMN "riskScore" DROP NOT NULL;

-- DropIndex (replaced by tenant-first indexes below)
DROP INDEX "RiskAssessment_reviewStatus_idx";
DROP INDEX "RiskAssessment_tier_createdAt_idx";
DROP INDEX "Transaction_idempotencyKey_key";
DROP INDEX "Transaction_receiverWallet_occurredAt_idx";
DROP INDEX "Transaction_senderWallet_occurredAt_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "Tenant_activeModelVersionId_key" ON "Tenant"("activeModelVersionId");
CREATE UNIQUE INDEX "Tenant_activeRulesVersionId_key" ON "Tenant"("activeRulesVersionId");
CREATE UNIQUE INDEX "ApiKey_prefix_key" ON "ApiKey"("prefix");
CREATE INDEX "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");
CREATE INDEX "ModelVersion_tenantId_createdAt_idx" ON "ModelVersion"("tenantId", "createdAt");
CREATE UNIQUE INDEX "ModelVersion_tenantId_version_key" ON "ModelVersion"("tenantId", "version");
CREATE INDEX "RulesVersion_tenantId_createdAt_idx" ON "RulesVersion"("tenantId", "createdAt");
CREATE UNIQUE INDEX "RulesVersion_tenantId_versionNumber_key" ON "RulesVersion"("tenantId", "versionNumber");
CREATE INDEX "RiskAssessment_tenantId_tier_createdAt_idx" ON "RiskAssessment"("tenantId", "tier", "createdAt");
CREATE INDEX "RiskAssessment_tenantId_reviewStatus_idx" ON "RiskAssessment"("tenantId", "reviewStatus");
CREATE INDEX "RiskAssessment_modelVersionId_idx" ON "RiskAssessment"("modelVersionId");
CREATE INDEX "RiskAssessment_rulesVersionId_idx" ON "RiskAssessment"("rulesVersionId");
CREATE INDEX "Transaction_tenantId_occurredAt_idx" ON "Transaction"("tenantId", "occurredAt");
CREATE INDEX "Transaction_tenantId_senderWallet_occurredAt_idx" ON "Transaction"("tenantId", "senderWallet", "occurredAt");
CREATE INDEX "Transaction_tenantId_receiverWallet_occurredAt_idx" ON "Transaction"("tenantId", "receiverWallet", "occurredAt");
CREATE INDEX "Transaction_tenantId_externalId_idx" ON "Transaction"("tenantId", "externalId");
CREATE UNIQUE INDEX "Transaction_tenantId_idempotencyKey_key" ON "Transaction"("tenantId", "idempotencyKey");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_activeModelVersionId_fkey" FOREIGN KEY ("activeModelVersionId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_activeRulesVersionId_fkey" FOREIGN KEY ("activeRulesVersionId") REFERENCES "RulesVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModelVersion" ADD CONSTRAINT "ModelVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModelVersion" ADD CONSTRAINT "ModelVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RulesVersion" ADD CONSTRAINT "RulesVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RulesVersion" ADD CONSTRAINT "RulesVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_rulesVersionId_fkey" FOREIGN KEY ("rulesVersionId") REFERENCES "RulesVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
