import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { hashPassword } from "../lib/auth/password";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import type {
  RiskAction,
  RiskTier,
  ReviewStatus,
  ScoringMode,
  TransactionType,
} from "../generated/prisma/client";
import {
  RiskAssessmentOutputSchema,
  TransactionIngestInputSchema,
  requiresReview,
} from "../lib/compliance/schemas";
import { ModelWeightsSchema, RulesPackSchema } from "../lib/engine";
import {
  API_KEY_PREFIX,
  extractKeyPrefix,
  generateApiKey,
  hashApiKey,
} from "../lib/scoring/api-key-format";
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

// Second tenant, rules-only, proving isolation (section 10).
const ACME_SLUG = process.env.SEED_ACME_TENANT_SLUG ?? "acme-test";
const ACME_ADMIN_EMAIL = process.env.SEED_ACME_ADMIN_EMAIL ?? "admin@acme.test";
const ACME_ADMIN_PASSWORD =
  process.env.SEED_ACME_ADMIN_PASSWORD ?? "acme-test-2026";

// The demo tenant is created by the `scoring_core_tenancy` migration; the seed
// resolves it by slug (and can create it if the migration seed was skipped).
const DEMO_TENANT_SLUG = process.env.SEED_DEMO_TENANT_SLUG ?? "fintex-demo";
const DEMO_TENANT_ID = "tenant_fintex_demo";

function loadJson(relative: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")
  );
}

const DEFAULT_PACK = RulesPackSchema.parse(
  loadJson("../fixtures/rules/default-pack.json")
);
const SAMPLE_A = ModelWeightsSchema.parse(
  loadJson("../fixtures/weights/sample-a.json")
);

/** Ensure a tenant's version-1 rules pack conforms to the engine schema. */
async function ensureRulesVersion(tenantId: string, note: string) {
  return prisma.rulesVersion.upsert({
    where: { tenantId_versionNumber: { tenantId, versionNumber: 1 } },
    update: { config: DEFAULT_PACK as unknown as Prisma.InputJsonValue },
    create: {
      tenantId,
      versionNumber: 1,
      config: DEFAULT_PACK as unknown as Prisma.InputJsonValue,
      note,
    },
  });
}

async function ensureModelVersion(tenantId: string) {
  return prisma.modelVersion.upsert({
    where: {
      tenantId_version: { tenantId, version: SAMPLE_A.modelVersion },
    },
    update: { weights: SAMPLE_A as unknown as Prisma.InputJsonValue },
    create: {
      tenantId,
      version: SAMPLE_A.modelVersion,
      weights: SAMPLE_A as unknown as Prisma.InputJsonValue,
      note: "Sample weights (placeholder, not a trained model)",
    },
  });
}

/**
 * Provision a local-only demo bearer key. Uses `SEED_DEMO_API_KEY` when set;
 * otherwise generates one on first run and returns it so the caller can print it
 * once. Never hard-codes a key. Returns null when a key already exists (re-run).
 */
async function ensureDemoApiKey(tenantId: string): Promise<string | null> {
  const envKey = process.env.SEED_DEMO_API_KEY;
  if (envKey) {
    const prefix = extractKeyPrefix(envKey);
    if (!prefix) {
      throw new Error(
        "SEED_DEMO_API_KEY is malformed (expected fxk_<prefix>_<secret>)"
      );
    }
    await prisma.apiKey.upsert({
      where: { prefix },
      update: {
        tenantId,
        name: "demo",
        hash: hashApiKey(envKey),
        revokedAt: null,
      },
      create: {
        tenantId,
        name: "demo",
        prefix,
        hash: hashApiKey(envKey),
      },
    });
    return envKey;
  }

  // Retire any legacy keys whose prefix predates the `fxk_` format — they can no
  // longer be resolved by authenticateApiKey, so keeping them active is a lie.
  const legacy = await prisma.apiKey.findMany({
    where: {
      tenantId,
      revokedAt: null,
      NOT: { prefix: { startsWith: API_KEY_PREFIX } },
    },
  });
  if (legacy.length > 0) {
    await prisma.apiKey.updateMany({
      where: { id: { in: legacy.map((k) => k.id) } },
      data: { revokedAt: new Date() },
    });
  }

  const existing = await prisma.apiKey.findFirst({
    where: {
      tenantId,
      name: "demo",
      revokedAt: null,
      prefix: { startsWith: API_KEY_PREFIX },
    },
  });
  if (existing) return null;

  const generated = generateApiKey();
  await prisma.apiKey.create({
    data: { tenantId, name: "demo", prefix: generated.prefix, hash: generated.hash },
  });
  return generated.key;
}

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

async function seedDemoTenant() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_TENANT_SLUG },
    update: {},
    create: {
      id: DEMO_TENANT_ID,
      slug: DEMO_TENANT_SLUG,
      name: "Fintex Demo",
    },
  });

  const rulesVersion = await ensureRulesVersion(tenant.id, "Default pack");
  const modelVersion = await ensureModelVersion(tenant.id);
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      activeRulesVersionId: rulesVersion.id,
      activeModelVersionId: modelVersion.id,
    },
  });
  const rulesVersionId = rulesVersion.id;

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
      tenantId: tenant.id,
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      firstName: "Fintex",
      lastName: "Admin",
      tenantId: tenant.id,
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
      tenantId: tenant.id,
    },
    create: {
      email: DEMO_EMAIL,
      passwordHash: demoPasswordHash,
      role: "USER",
      firstName: "Amara",
      lastName: "Okonkwo",
      tenantId: tenant.id,
      address: "418 Harborview Lane",
      country: "Ghana",
      postalCode: "GA-123-4567",
      birthDate: new Date("1991-04-17"),
      idNumber: "ID-4820-9931",
    },
  });

  const rows = buildSeedRows();
  validate(rows);

  // Demo reset is scoped to compliance rows created by this seed in the demo
  // tenant; real (or user-submitted) transactions are never touched.
  const removedAssessments = await prisma.riskAssessment.deleteMany({
    where: {
      tenantId: tenant.id,
      transaction: { idempotencyKey: { startsWith: SEED_PREFIX } },
    },
  });
  const removedTransactions = await prisma.transaction.deleteMany({
    where: {
      tenantId: tenant.id,
      idempotencyKey: { startsWith: SEED_PREFIX },
    },
  });

  for (const row of rows) {
    const { tx } = row;
    const txData: Prisma.TransactionUncheckedCreateInput = {
      id: tx.id,
      tenantId: tenant.id,
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
      where: {
        tenantId_idempotencyKey: {
          tenantId: tenant.id,
          idempotencyKey: tx.idempotencyKey,
        },
      },
      update: txData,
      create: txData,
    });

    const a = row.assessment;
    const reviewStatus = (
      requiresReview(a.tier) ? "OPEN" : null
    ) as ReviewStatus | null;
    // Seeded rows are a frozen historical snapshot produced by the legacy
    // heuristic scorer, so they carry no modelVersion link (rules-only, D4/D6).
    // They keep their score for the demo dashboard, matching the migration's
    // backfill of pre-existing rows.
    const assessmentData: Prisma.RiskAssessmentUncheckedCreateInput = {
      tenantId: tenant.id,
      riskScore: a.riskScore,
      tier: a.tier as RiskTier,
      action: a.action as RiskAction,
      tags: a.tags,
      reasons: a.reasons,
      evidence:
        a.evidence === null
          ? Prisma.DbNull
          : (a.evidence as Prisma.InputJsonValue),
      mode: "RULES_ONLY" as ScoringMode,
      modelVersion: a.modelVersion,
      latencyMs: a.latencyMs,
      reviewStatus,
      rulesVersionId,
      transactionId: tx.id,
    };
    await prisma.riskAssessment.upsert({
      where: { transactionId: tx.id },
      update: assessmentData,
      create: { id: `ra_${tx.idempotencyKey}`, ...assessmentData },
    });
  }

  const demoApiKey = await ensureDemoApiKey(tenant.id);

  const byTier = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.assessment.tier] = (acc[row.assessment.tier] ?? 0) + 1;
    return acc;
  }, {});
  const flagged = rows.filter((r) => requiresReview(r.assessment.tier)).length;

  console.log(`  tenant:   ${tenant.slug} (${tenant.id})`);
  console.log(`  admin:    ${admin.email} / ${ADMIN_PASSWORD}`);
  console.log(`  demo:     ${user.email} / ${DEMO_PASSWORD}`);
  console.log(
    `  active:   rules v${rulesVersion.versionNumber} + model ${SAMPLE_A.modelVersion}`
  );
  if (demoApiKey) {
    console.log(`  api key:  ${demoApiKey}   (local-only; shown once)`);
  } else {
    console.log("  api key:  existing (unchanged)");
  }
  console.log(
    `  reset:    removed ${removedAssessments.count} assessments / ${removedTransactions.count} transactions`
  );
  console.log(`  transactions: ${rows.length}`);
  console.log(`  by tier:  ${JSON.stringify(byTier)}`);
  console.log(`  flagged:  ${flagged}`);
}

async function seedAcmeTenant() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: ACME_SLUG },
    update: {},
    create: { slug: ACME_SLUG, name: "Acme Test" },
  });

  const rulesVersion = await ensureRulesVersion(tenant.id, "Default pack");
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { activeRulesVersionId: rulesVersion.id, activeModelVersionId: null },
  });

  const passwordHash = await hashPassword(ACME_ADMIN_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: ACME_ADMIN_EMAIL },
    update: { role: "ADMIN", tenantId: tenant.id, passwordHash },
    create: {
      email: ACME_ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      firstName: "Acme",
      lastName: "Admin",
      tenantId: tenant.id,
    },
  });

  const now = Date.now();
  const txs = [
    { key: "seed_acme_1", amount: "250.00", from: "wlt_acme_a", to: "wlt_acme_b", tier: "LOW" as RiskTier },
    { key: "seed_acme_2", amount: "3120.00", from: "wlt_acme_a", to: "wlt_acme_c", tier: "MEDIUM" as RiskTier },
    { key: "seed_acme_3", amount: "5400.00", from: "wlt_acme_d", to: "wlt_acme_e", tier: "HIGH" as RiskTier },
  ];

  for (const t of txs) {
    const occurredAt = new Date(now - (txs.indexOf(t) + 1) * 3_600_000);
    const txData: Prisma.TransactionUncheckedCreateInput = {
      id: `tx_${t.key}`,
      tenantId: tenant.id,
      idempotencyKey: t.key,
      type: "TRANSFER",
      amount: t.amount,
      currency: "GHS",
      senderWallet: t.from,
      receiverWallet: t.to,
      occurredAt,
    };
    await prisma.transaction.upsert({
      where: {
        tenantId_idempotencyKey: {
          tenantId: tenant.id,
          idempotencyKey: t.key,
        },
      },
      update: txData,
      create: txData,
    });
    const action: RiskAction =
      t.tier === "HIGH"
        ? "HOLD_AND_ALERT"
        : t.tier === "MEDIUM"
          ? "ALLOW_AND_REVIEW"
          : "ALLOW";
    const assessmentData: Prisma.RiskAssessmentUncheckedCreateInput = {
      tenantId: tenant.id,
      riskScore: null,
      tier: t.tier,
      action,
      tags: [],
      reasons: ["Seeded baseline transaction (rules-only)."],
      mode: "RULES_ONLY" as ScoringMode,
      modelVersion: "rules-only",
      reviewStatus: (t.tier === "LOW" ? null : "OPEN") as ReviewStatus | null,
      rulesVersionId: rulesVersion.id,
      transactionId: `tx_${t.key}`,
    };
    await prisma.riskAssessment.upsert({
      where: { transactionId: `tx_${t.key}` },
      update: assessmentData,
      create: { id: `ra_${t.key}`, ...assessmentData },
    });
  }

  console.log(`  tenant:   ${tenant.slug} (${tenant.id})  rules-only`);
  console.log(`  admin:    ${admin.email} / ${ACME_ADMIN_PASSWORD}`);
  console.log(`  transactions: ${txs.length}`);
}

async function main() {
  console.log("Seeding Fintex demo data...\n");
  await seedDemoTenant();
  console.log("");
  await seedAcmeTenant();
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
