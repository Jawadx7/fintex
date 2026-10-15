import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { hashPassword } from "../lib/auth/password";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import type {
  RiskAction,
  RiskTier,
  ReviewStatus,
  TransactionType,
} from "../generated/prisma/client";
import {
  RiskAssessmentOutputSchema,
  TransactionIngestInputSchema,
  requiresReview,
} from "../lib/compliance/schemas";
import {
  buildSeedRows,
  SEED_PREFIX,
  type SeedRow,
} from "../lib/compliance/seed-data";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env before seeding.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// Overridable so local/CI environments don't rely on baked-in credentials.
const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? "demo@fintex.app";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "fintex-demo-2026";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@fintex.app";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "fintex-admin-2026";

/** Validate every row against the scoring-engine output/input contracts. */
function validate(rows: SeedRow[]): void {
  rows.forEach((row) => {
    TransactionIngestInputSchema.parse({
      idempotencyKey: row.tx.idempotencyKey,
      type: row.tx.type,
      amount: row.tx.amount,
      currency: row.tx.currency,
      senderWallet: row.tx.senderWallet,
      receiverWallet: row.tx.receiverWallet,
      senderBalanceBefore: row.tx.senderBalanceBefore,
      occurredAt: row.tx.occurredAt,
    });
    RiskAssessmentOutputSchema.parse({
      riskScore: row.assessment.riskScore,
      tier: row.assessment.tier,
      action: row.assessment.action,
      tags: row.assessment.tags,
      reasons: row.assessment.reasons,
      evidence: row.assessment.evidence,
      modelVersion: row.assessment.modelVersion,
      latencyMs: row.assessment.latencyMs,
    });
  });
}

async function main() {
  console.log("Seeding Fintex demo data...\n");

  // Upserts keep the seed re-runnable: re-running updates credentials/role in
  // place instead of wiping users who may have signed up meanwhile. The seed
  // never deletes User rows.
  const adminPasswordHash = await hashPassword(ADMIN_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      firstName: "Fintex",
      lastName: "Admin",
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      firstName: "Fintex",
      lastName: "Admin",
    },
  });

  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      passwordHash: demoPasswordHash,
      role: "USER",
      firstName: "Amara",
      lastName: "Okonkwo",
    },
    create: {
      email: DEMO_EMAIL,
      passwordHash: demoPasswordHash,
      role: "USER",
      firstName: "Amara",
      lastName: "Okonkwo",
      address: "418 Harborview Lane",
      country: "Ghana",
      postalCode: "GA-123-4567",
      birthDate: new Date("1991-04-17"),
      idNumber: "ID-4820-9931",
    },
  });

  const rows = buildSeedRows();
  validate(rows);

  // Demo reset is scoped to compliance rows created by this seed; real (or
  // user-submitted) transactions are never touched.
  const removedAssessments = await prisma.riskAssessment.deleteMany({
    where: { transaction: { idempotencyKey: { startsWith: SEED_PREFIX } } },
  });
  const removedTransactions = await prisma.transaction.deleteMany({
    where: { idempotencyKey: { startsWith: SEED_PREFIX } },
  });

  for (const row of rows) {
    const { tx } = row;
    const txData: Prisma.TransactionUncheckedCreateInput = {
      id: tx.id,
      idempotencyKey: tx.idempotencyKey,
      type: tx.type as TransactionType,
      amount: tx.amount,
      currency: tx.currency,
      senderWallet: tx.senderWallet,
      receiverWallet: tx.receiverWallet,
      senderBalanceBefore: tx.senderBalanceBefore,
      occurredAt: tx.occurredAt,
    };
    await prisma.transaction.upsert({
      where: { idempotencyKey: tx.idempotencyKey },
      update: txData,
      create: txData,
    });

    const a = row.assessment;
    const reviewStatus = (
      requiresReview(a.tier) ? "OPEN" : null
    ) as ReviewStatus | null;
    const assessmentData: Prisma.RiskAssessmentUncheckedCreateInput = {
      riskScore: a.riskScore,
      tier: a.tier as RiskTier,
      action: a.action as RiskAction,
      tags: a.tags,
      reasons: a.reasons,
      evidence:
        a.evidence === null
          ? Prisma.DbNull
          : (a.evidence as Prisma.InputJsonValue),
      modelVersion: a.modelVersion,
      latencyMs: a.latencyMs,
      reviewStatus,
      transactionId: tx.id,
    };
    await prisma.riskAssessment.upsert({
      where: { transactionId: tx.id },
      update: assessmentData,
      create: { id: `ra_${tx.idempotencyKey}`, ...assessmentData },
    });
  }

  const byTier = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.assessment.tier] = (acc[row.assessment.tier] ?? 0) + 1;
    return acc;
  }, {});
  const flagged = rows.filter((r) => requiresReview(r.assessment.tier)).length;

  console.log(`  admin:    ${admin.email}`);
  console.log(`  admin pw: ${ADMIN_PASSWORD}`);
  console.log(`  demo:     ${user.email}`);
  console.log(`  demo pw:  ${DEMO_PASSWORD}`);
  console.log(
    `  reset:    removed ${removedAssessments.count} assessments / ${removedTransactions.count} transactions`
  );
  console.log(`  transactions: ${rows.length}`);
  console.log(`  by tier:  ${JSON.stringify(byTier)}`);
  console.log(`  flagged:  ${flagged}`);
  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
