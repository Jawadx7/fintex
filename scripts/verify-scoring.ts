import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

// Live verification of the public scoring API against a running dev server.
// Run:  npx tsx scripts/verify-scoring.ts
// Requires DEMO_KEY and ACME_KEY in the environment (fxk_ keys for the
// fintex-demo and acme-test tenants).

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DEMO_KEY = process.env.DEMO_KEY;
const ACME_KEY = process.env.ACME_KEY;

if (!DEMO_KEY || !ACME_KEY) {
  throw new Error("Set DEMO_KEY and ACME_KEY before running verify-scoring.");
}

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const RUN = Date.now().toString(36);
const results: Array<{ name: string; pass: boolean }> = [];
const check = (name: string, pass: boolean, extra = "") => {
  results.push({ name, pass });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
};

interface TxInput {
  type?: "TRANSFER" | "CASH_OUT";
  amount?: string;
  currency?: string;
  occurredAt?: string;
  sender: string;
  receiver: string;
  attributes?: Record<string, string | number | boolean>;
  senderBalanceBefore?: string;
}

function toBody(tx: TxInput) {
  return {
    transaction: {
      type: tx.type ?? "TRANSFER",
      amount: tx.amount ?? "150.00",
      currency: tx.currency ?? "GHS",
      occurredAt: tx.occurredAt ?? new Date().toISOString(),
      sender: { walletId: tx.sender, balanceBefore: tx.senderBalanceBefore },
      receiver: { walletId: tx.receiver },
      attributes: tx.attributes,
    },
  };
}

async function postScore(
  key: string | null,
  idem: string | null,
  body: unknown
) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) headers.authorization = `Bearer ${key}`;
  if (idem) headers["idempotency-key"] = idem;
  const res = await fetch(`${BASE}/api/v1/score`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  return {
    status: res.status,
    replayed: res.headers.get("idempotent-replayed") === "true",
    body: json,
  };
}

async function main() {
  const demo = await prisma.tenant.findUniqueOrThrow({
    where: { slug: "fintex-demo" },
  });
  const acme = await prisma.tenant.findUniqueOrThrow({
    where: { slug: "acme-test" },
  });

  console.log(`\n=== SCORING API VERIFICATION (base ${BASE}) ===\n`);

  // A. success, MODEL_AND_RULES
  console.log("A. SUCCESS (demo, MODEL_AND_RULES)");
  const sA = await postScore(DEMO_KEY!, `verify-a-${RUN}`, toBody({
    sender: `wlt_verify_a_s_${RUN}`,
    receiver: `wlt_verify_a_r_${RUN}`,
  }));
  check("200", sA.status === 200, `status=${sA.status}`);
  check("mode MODEL_AND_RULES", sA.body?.mode === "MODEL_AND_RULES");
  check("riskScore is a number", typeof sA.body?.riskScore === "number");
  check("modelVersion is a string", typeof sA.body?.modelVersion === "string");
  check("rulesVersion is a number", typeof sA.body?.rulesVersion === "number");
  check("latencyMs is a number", typeof sA.body?.latencyMs === "number");
  const persisted = sA.body?.transactionId
    ? await prisma.transaction.findUnique({
        where: { id: sA.body.transactionId },
        include: { assessment: true },
      })
    : null;
  check("persisted transaction + assessment", !!persisted?.assessment);

  // B. missing idempotency key
  console.log("\nB. MISSING IDEMPOTENCY KEY");
  const sB = await postScore(DEMO_KEY!, null, toBody({
    sender: `wlt_verify_b_s_${RUN}`,
    receiver: `wlt_verify_b_r_${RUN}`,
  }));
  check("400 missing_idempotency_key",
    sB.status === 400 && sB.body?.error?.code === "missing_idempotency_key",
    `status=${sB.status} code=${sB.body?.error?.code}`);

  // C. validation error
  console.log("\nC. VALIDATION ERROR (amount 0)");
  const sC = await postScore(DEMO_KEY!, `verify-c-${RUN}`, toBody({
    amount: "0.00",
    sender: `wlt_verify_c_s_${RUN}`,
    receiver: `wlt_verify_c_r_${RUN}`,
  }));
  check("400 validation_error with details",
    sC.status === 400 && sC.body?.error?.code === "validation_error" &&
      Array.isArray(sC.body?.error?.details) && sC.body.error.details.length > 0,
    `status=${sC.status} code=${sC.body?.error?.code}`);

  // D. bad key
  console.log("\nD. INVALID KEY");
  const sD = await postScore("fxk_notreal_secret", `verify-d-${RUN}`, toBody({
    sender: `wlt_verify_d_s_${RUN}`,
    receiver: `wlt_verify_d_r_${RUN}`,
  }));
  check("401 invalid_api_key",
    sD.status === 401 && sD.body?.error?.code === "invalid_api_key",
    `status=${sD.status}`);

  // E. replay
  console.log("\nE. IDEMPOTENT REPLAY");
  const eBody = toBody({
    sender: `wlt_verify_e_s_${RUN}`,
    receiver: `wlt_verify_e_r_${RUN}`,
  });
  const e1 = await postScore(DEMO_KEY!, `verify-e-${RUN}`, eBody);
  const e2 = await postScore(DEMO_KEY!, `verify-e-${RUN}`, eBody);
  check("replay returns 200 + Idempotent-Replayed",
    e1.status === 200 && e2.status === 200 && e2.replayed === true,
    `replayed=${e2.replayed}`);
  check("replay returns the same transactionId",
    e1.body?.transactionId === e2.body?.transactionId);
  const eRows = await prisma.transaction.count({
    where: { tenantId: demo.id, idempotencyKey: `verify-e-${RUN}` },
  });
  check("exactly one stored row for the key", eRows === 1, `rows=${eRows}`);

  // F. same key, different payload
  console.log("\nF. SAME KEY, DIFFERENT PAYLOAD");
  await postScore(DEMO_KEY!, `verify-f-${RUN}`, toBody({
    amount: "150.00",
    sender: `wlt_verify_f_s_${RUN}`,
    receiver: `wlt_verify_f_r_${RUN}`,
  }));
  const f2 = await postScore(DEMO_KEY!, `verify-f-${RUN}`, toBody({
    amount: "151.00",
    sender: `wlt_verify_f_s_${RUN}`,
    receiver: `wlt_verify_f_r_${RUN}`,
  }));
  check("409 idempotency_key_reuse",
    f2.status === 409 && f2.body?.error?.code === "idempotency_key_reuse",
    `status=${f2.status} code=${f2.body?.error?.code}`);

  // G. RULES_ONLY (acme-test has no model)
  console.log("\nG. RULES_ONLY (acme-test)");
  const sG = await postScore(ACME_KEY!, `verify-g-${RUN}`, toBody({
    sender: `wlt_verify_g_s_${RUN}`,
    receiver: `wlt_verify_g_r_${RUN}`,
  }));
  check("200, mode RULES_ONLY", sG.status === 200 && sG.body?.mode === "RULES_ONLY");
  check("riskScore null, modelVersion null, contributions []",
    sG.body?.riskScore === null && sG.body?.modelVersion === null &&
      Array.isArray(sG.body?.contributions) && sG.body.contributions.length === 0);

  // H. history-dependent rule fires with history
  console.log("\nH. HISTORY-DEPENDENT RULE");
  const histSender = `wlt_verify_hist_${RUN}`;
  const histReceiver = `wlt_verify_hist_r_${RUN}`;
  let lastHist: any = null;
  for (let i = 0; i < 4; i++) {
    lastHist = await postScore(DEMO_KEY!, `verify-h-${RUN}-${i}`, toBody({
      amount: "50.00",
      sender: histSender,
      receiver: histReceiver,
    }));
  }
  check("4th outbound fires RAPID_SEQUENCE",
    lastHist.status === 200 && Array.isArray(lastHist.body?.tags) &&
      lastHist.body.tags.includes("RAPID_SEQUENCE"),
    `tags=${JSON.stringify(lastHist.body?.tags)}`);

  // I. tenant isolation
  console.log("\nI. TENANT ISOLATION");
  const acmeSeesDemoHistory = await postScore(ACME_KEY!, `verify-i-${RUN}`, toBody({
    amount: "50.00",
    sender: histSender,
    receiver: histReceiver,
  }));
  check("acme does not see demo history (no RAPID_SEQUENCE)",
    !acmeSeesDemoHistory.body?.tags?.includes("RAPID_SEQUENCE"),
    `tags=${JSON.stringify(acmeSeesDemoHistory.body?.tags)}`);

  const crossBody = toBody({
    sender: `wlt_verify_cross_s_${RUN}`,
    receiver: `wlt_verify_cross_r_${RUN}`,
  });
  const cross1 = await postScore(DEMO_KEY!, `verify-cross-${RUN}`, crossBody);
  const cross2 = await postScore(ACME_KEY!, `verify-cross-${RUN}`, crossBody);
  check("same Idempotency-Key is independent per tenant",
    cross1.status === 200 && cross2.status === 200 &&
      cross1.body?.transactionId !== cross2.body?.transactionId,
    `demo=${cross1.status} acme=${cross2.status}`);

  // J. concurrency: exactly one winner
  console.log("\nJ. CONCURRENT SAME-KEY");
  const cKey = `verify-j-${RUN}`;
  const cBody = toBody({
    sender: `wlt_verify_j_s_${RUN}`,
    receiver: `wlt_verify_j_r_${RUN}`,
  });
  const concurrent = await Promise.all(
    Array.from({ length: 5 }, () => postScore(DEMO_KEY!, cKey, cBody))
  );
  const allOk = concurrent.every((r) => r.status === 200);
  const ids = new Set(concurrent.map((r) => r.body?.transactionId));
  const cRows = await prisma.transaction.count({
    where: { tenantId: demo.id, idempotencyKey: cKey },
  });
  check("all 5 return 200", allOk,
    `statuses=${JSON.stringify(concurrent.map((r) => r.status))}`);
  check("exactly one distinct transactionId", ids.size === 1, `distinct=${ids.size}`);
  check("exactly one stored row", cRows === 1, `rows=${cRows}`);

  // K. history truncation (501 rows in one scope)
  console.log("\nK. HISTORY TRUNCATION");
  const truncSender = `wlt_verify_trunc_${RUN}`;
  const now = Date.now();
  await prisma.transaction.createMany({
    data: Array.from({ length: 501 }, (_, i) => ({
      tenantId: demo.id,
      idempotencyKey: `verify-k-${RUN}-${i}`,
      type: "TRANSFER" as const,
      amount: "10.00",
      currency: "GHS",
      senderWallet: truncSender,
      receiverWallet: `wlt_verify_trunc_r_${RUN}`,
      occurredAt: new Date(now - (i % 9 + 1) * 60_000),
    })),
  });
  const sK = await postScore(DEMO_KEY!, `verify-k-final-${RUN}`, toBody({
    amount: "10.00",
    sender: truncSender,
    receiver: `wlt_verify_trunc_out_${RUN}`,
  }));
  check("historyTruncated true when a scope hits the 500 cap",
    sK.status === 200 && sK.body?.historyTruncated === true,
    `truncated=${sK.body?.historyTruncated}`);

  // (Latency is measured separately by scripts/score-latency.mjs so this
  // script's own DB connection does not contend with the server.)

  // L. history availability: false when there is no prior transaction at all.
  console.log("\nL. HISTORY AVAILABILITY");
  const haNew = await postScore(DEMO_KEY!, `verify-l-new-${RUN}`, toBody({
    sender: `wlt_verify_lnew_s_${RUN}`,
    receiver: `wlt_verify_lnew_r_${RUN}`,
  }));
  check("first-ever transaction on a new wallet -> historyAvailable false",
    haNew.status === 200 && haNew.body?.historyAvailable === false,
    `status=${haNew.status} historyAvailable=${haNew.body?.historyAvailable}`);

  // A sender with one prior transaction now has history.
  const haSender = `wlt_verify_lhist_s_${RUN}`;
  const haReceiver = `wlt_verify_lhist_r_${RUN}`;
  await postScore(DEMO_KEY!, `verify-l-prior-${RUN}`, toBody({
    amount: "10.00",
    sender: haSender,
    receiver: haReceiver,
  }));
  const haWith = await postScore(DEMO_KEY!, `verify-l-with-${RUN}`, toBody({
    amount: "10.00",
    sender: haSender,
    receiver: haReceiver,
  }));
  check("a sender with prior history -> historyAvailable true",
    haWith.status === 200 && haWith.body?.historyAvailable === true,
    `status=${haWith.status} historyAvailable=${haWith.body?.historyAvailable}`);

  // Cleanup: remove everything this script created.
  const cleaned = await prisma.transaction.deleteMany({
    where: {
      tenantId: { in: [demo.id, acme.id] },
      OR: [
        { senderWallet: { startsWith: "wlt_verify_" } },
        { receiverWallet: { startsWith: "wlt_verify_" } },
      ],
    },
  });
  console.log(`\n  cleanup: removed ${cleaned.count} verification rows`);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) {
    console.log("FAILED:");
    failed.forEach((f) => console.log("  - " + f.name));
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
