-- Brief 3.3: replace the legacy banking Account/Transaction model with the
-- wallet-based compliance model.
--
-- Hand-written because Prisma's generated diff would ALTER the existing
-- "Transaction" table (add NOT NULL columns, drop columns) which fails against
-- the rows already in it. Instead we drop the old objects first, then create
-- the new ones. The prior schema is preserved in git (tag `legacy-user-dashboard`,
-- commit 26b9a8b). Data discarded here is demo/seed-only.

-- Drop old tables first: this removes their foreign keys, indexes and plans.
DROP TABLE IF EXISTS "Transaction";
DROP TABLE IF EXISTS "Account";

-- Drop enums that are no longer used. TransactionType is recreated below with a
-- new value set (Postgres cannot mutate enum values in place).
DROP TYPE IF EXISTS "AccountType";
DROP TYPE IF EXISTS "TransactionStatus";
DROP TYPE IF EXISTS "TransactionType";

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TRANSFER', 'CASH_OUT');
CREATE TYPE "RiskTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "RiskAction" AS ENUM ('ALLOW', 'ALLOW_AND_REVIEW', 'HOLD_AND_ALERT');
CREATE TYPE "ReviewStatus" AS ENUM ('OPEN', 'ESCALATED', 'DISMISSED', 'CONFIRMED');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "senderWallet" TEXT NOT NULL,
    "receiverWallet" TEXT NOT NULL,
    "senderBalanceBefore" DECIMAL(14,2),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "tier" "RiskTier" NOT NULL,
    "action" "RiskAction" NOT NULL,
    "tags" TEXT[],
    "reasons" TEXT[],
    "evidence" JSONB,
    "modelVersion" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewStatus" "ReviewStatus",
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");
CREATE INDEX "Transaction_senderWallet_occurredAt_idx" ON "Transaction"("senderWallet", "occurredAt");
CREATE INDEX "Transaction_receiverWallet_occurredAt_idx" ON "Transaction"("receiverWallet", "occurredAt");

CREATE UNIQUE INDEX "RiskAssessment_transactionId_key" ON "RiskAssessment"("transactionId");
CREATE INDEX "RiskAssessment_tier_createdAt_idx" ON "RiskAssessment"("tier", "createdAt");
CREATE INDEX "RiskAssessment_reviewStatus_idx" ON "RiskAssessment"("reviewStatus");

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
