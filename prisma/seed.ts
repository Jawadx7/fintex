import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { hashPassword } from "../lib/auth/password";
import {
  PrismaClient,
  type AccountType,
  type TransactionStatus,
  type TransactionType,
} from "../generated/prisma/client";

const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

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

// Everyday counterparties and merchants, replacing the anime-character
// placeholders that previously lived in public/data/transactions.js.
const COUNTERPARTIES = [
  "Meridian Payroll Services",
  "Halcyon Utilities",
  "Northgate Property Mgmt",
  "Aurora Insurance",
  "Blue Harbor Logistics",
  "Cedarline Media",
  "Quantex Cloud Hosting",
  "Rivet & Co. Legal",
  "Summit Health Partners",
  "Lumen Energy",
  "Kestrel Consulting",
  "Ironwood Maintenance",
];

const MERCHANTS = [
  "Figma",
  "Adobe Creative Cloud",
  "AWS",
  "Spotify",
  "Uber",
  "Trader Joe's",
  "Delta Airlines",
  "Apple",
  "GitHub",
  "Whole Foods",
];

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length] as T;
}

function daysAgo(days: number, hour = 12): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

// Deterministic reference numbers, unique by construction.
function referenceFor(index: number): string {
  return String(100000 + index * 7919).slice(0, 6);
}

async function main() {
  console.log("Seeding Fintex demo data...\n");

  // Upserts keep the seed re-runnable: re-running updates credentials/role in
  // place instead of wiping users who may have signed up meanwhile.
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
      country: "United States",
      postalCode: "94107",
      birthDate: new Date("1991-04-17"),
      idNumber: "ID-4820-9931",
    },
  });

  // Reset the demo user's accounts; transactions cascade off the delete.
  await prisma.account.deleteMany({ where: { userId: user.id } });

  const accountSpecs: Array<{
    name: string;
    type: AccountType;
    balance: number;
  }> = [
    { name: "Everyday Checking", type: "CHECKING", balance: 8420.55 },
    { name: "High-Yield Savings", type: "SAVINGS", balance: 26480.1 },
    { name: "Growth Portfolio", type: "INVESTMENT", balance: 52310.75 },
  ];

  const accounts = [];
  for (const spec of accountSpecs) {
    accounts.push(
      await prisma.account.create({
        data: {
          userId: user.id,
          name: spec.name,
          type: spec.type,
          balance: spec.balance.toFixed(2),
        },
      })
    );
  }

  const statuses: TransactionStatus[] = [
    "SUCCESS",
    "SUCCESS",
    "SUCCESS",
    "SUCCESS",
    "SUCCESS",
    "SUCCESS",
    "SUCCESS",
    "PENDING",
    "FAILED",
  ];

  const types: TransactionType[] = [
    "RECEIVE",
    "SEND",
    "WITHDRAWAL",
    "DEPOSIT",
    "SEND",
    "RECEIVE",
  ];

  let index = 0;
  const rows = [];

  // 46 rows, matching the size of the old placeholder table.
  for (let i = 0; i < 46; i += 1) {
    const account = accounts[i % accounts.length]!;
    const status = statuses[i % statuses.length]!;
    const type = types[i % types.length]!;

    const isCardSpend = type === "SEND" && status === "SUCCESS";
    const counterparty = isCardSpend
      ? pick(MERCHANTS, i)
      : pick(COUNTERPARTIES, i);

    const amount = isCardSpend
      ? Number((4 + ((i * 37) % 240) + 0.99).toFixed(2))
      : Number((75 + ((i * 613) % 4200)).toFixed(2));

    const charges =
      type === "WITHDRAWAL" ? Number((1 + (i % 5) * 0.5).toFixed(2)) : 0;

    rows.push({
      reference: referenceFor(index),
      userId: user.id,
      accountId: account.id,
      name: counterparty,
      type,
      amount: amount.toFixed(2),
      status,
      charges: charges.toFixed(2),
      occurredAt: daysAgo(Math.floor(i / 2), 9 + (i % 10)),
    });

    index += 1;
  }

  await prisma.transaction.createMany({ data: rows });

  console.log(`  admin:    ${admin.email}`);
  console.log(`  admin pw: ${ADMIN_PASSWORD}`);
  console.log(`  demo:     ${user.email}`);
  console.log(`  demo pw:  ${DEMO_PASSWORD}`);
  console.log(`  accounts: ${accounts.length}`);
  console.log(`  transactions: ${rows.length}`);
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
