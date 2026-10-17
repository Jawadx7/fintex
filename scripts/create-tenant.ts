import "dotenv/config";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../lib/auth/password";
import { ModelWeightsSchema, RulesPackSchema } from "../lib/engine";

// Usage:
//   npm run tenant:create -- --slug fintex-demo --name "Fintex Demo" \
//     --admin-email admin@fintex.app [--model]
//
// Creates (or updates) a tenant, its initial rules version from the default
// pack, an optional ADMIN user, and — with --model — activates the sample
// weights file. Idempotent: safe to re-run.

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env first.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function loadJson(relative: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")
  );
}

async function main() {
  const slug = readFlag("slug");
  if (!slug) {
    throw new Error(
      'Missing --slug. Example: --slug fintex-demo --name "Fintex Demo" --admin-email admin@fintex.app'
    );
  }
  const name = readFlag("name") ?? slug;
  const adminEmail = readFlag("admin-email");

  const rulesPack = RulesPackSchema.parse(
    loadJson("../fixtures/rules/default-pack.json")
  );

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: { name },
    create: { slug, name },
  });

  const existingRules = await prisma.rulesVersion.findUnique({
    where: { tenantId_versionNumber: { tenantId: tenant.id, versionNumber: 1 } },
  });
  const rulesVersion =
    existingRules ??
    (await prisma.rulesVersion.create({
      data: {
        tenantId: tenant.id,
        versionNumber: 1,
        config: rulesPack as unknown as Prisma.InputJsonValue,
        note: "Initial default pack",
      },
    }));

  if (adminEmail) {
    const password =
      process.env.TENANT_ADMIN_PASSWORD ?? "fintex-admin-2026";
    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN", tenantId: tenant.id, passwordHash },
      create: {
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        firstName: name,
        lastName: "Admin",
        tenantId: tenant.id,
      },
    });
    console.log(`  admin:    ${adminEmail}`);
    console.log(`  admin pw: ${password}`);
  }

  let modelVersionId: string | null = null;
  if (hasFlag("model")) {
    const weights = ModelWeightsSchema.parse(
      loadJson("../fixtures/weights/sample-a.json")
    );
    const existingModel = await prisma.modelVersion.findUnique({
      where: {
        tenantId_version: { tenantId: tenant.id, version: weights.modelVersion },
      },
    });
    const model =
      existingModel ??
      (await prisma.modelVersion.create({
        data: {
          tenantId: tenant.id,
          version: weights.modelVersion,
          weights: weights as unknown as Prisma.InputJsonValue,
          note: "Sample weights",
        },
      }));
    modelVersionId = model.id;
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      activeRulesVersionId: rulesVersion.id,
      activeModelVersionId: modelVersionId,
    },
  });

  console.log(`Tenant ready: ${tenant.slug} (${tenant.id})`);
  console.log(`  active rules version: v${rulesVersion.versionNumber}`);
  console.log(
    `  active model version: ${modelVersionId ? "sample-a" : "none (rules-only)"}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
