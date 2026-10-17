import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";
import { generateApiKey } from "../lib/scoring/api-key-format";

// Usage:
//   npm run key:create -- --tenant fintex-demo --name "local"
//
// Issues a new API key for a tenant and prints the secret ONCE. Only its prefix
// and SHA-256 hash are stored.

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

async function main() {
  const tenantSlug = readFlag("tenant");
  const name = readFlag("name") ?? "default";
  if (!tenantSlug) {
    throw new Error('Missing --tenant. Example: --tenant fintex-demo --name "local"');
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    throw new Error(
      `Unknown tenant "${tenantSlug}". Create it first with: npm run tenant:create`
    );
  }

  const { key, prefix, hash } = generateApiKey();
  await prisma.apiKey.create({
    data: { tenantId: tenant.id, name, prefix, hash },
  });

  console.log(`API key created for ${tenant.slug}:`);
  console.log("");
  console.log(`  ${key}`);
  console.log("");
  console.log("Store it now — it will not be shown again.");
  console.log(`  prefix: ${prefix}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
