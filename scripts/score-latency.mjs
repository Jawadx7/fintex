// Latency probe for the public scoring API. Fetch-only: it holds no DB
// connection of its own, so the numbers reflect the server's own work.
//
//   set DEMO_KEY=fxk_...  &&  node scripts/score-latency.mjs
//
// Sends 10 warm-up requests, then 200 sequential scored requests with unique
// idempotency keys, and reports p50/p95 of the round-trip and of the
// server-reported `latencyMs`.

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const KEY = process.env.DEMO_KEY;
const N = Number(process.env.N ?? "200");

if (!KEY) throw new Error("Set DEMO_KEY (an fxk_ key) before running.");

const runId = Date.now().toString(36);

function body(sender, receiver) {
  return JSON.stringify({
    transaction: {
      type: "TRANSFER",
      amount: "123.45",
      currency: "GHS",
      occurredAt: new Date().toISOString(),
      sender: { walletId: sender },
      receiver: { walletId: receiver },
    },
  });
}

async function score(i, { warm = false } = {}) {
  const sender = `wlt_lat_${runId}_s_${i}`;
  const receiver = `wlt_lat_${runId}_r_${i}`;
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/v1/score`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${KEY}`,
      "idempotency-key": `${warm ? "warm" : "lat"}-${runId}-${i}`,
    },
    body: body(sender, receiver),
  });
  const json = await res.json().catch(() => ({}));
  return {
    status: res.status,
    roundTrip: Date.now() - t0,
    server: typeof json.latencyMs === "number" ? json.latencyMs : null,
  };
}

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

const mean = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

async function main() {
  console.log(`Latency probe: ${N} sequential requests against ${BASE}\n`);

  // Wake the compute and prime the pool via the unauthenticated health probe.
  try {
    await fetch(`${BASE}/api/v1/health`);
    console.log("health warm-up complete");
  } catch {
    /* health is best-effort */
  }

  for (let i = 0; i < 10; i++) await score(i, { warm: true });
  console.log("warm-up complete\n");

  const rt = [];
  const srv = [];
  const failed = [];
  for (let i = 0; i < N; i++) {
    const r = await score(i);
    if (r.status !== 200) {
      failed.push({ i, status: r.status });
      console.log(`  #${i} status=${r.status} roundTrip=${r.roundTrip}ms`);
      continue;
    }
    rt.push(r.roundTrip);
    if (r.server !== null) srv.push(r.server);
    console.log(
      `  #${i} status=200 roundTrip=${r.roundTrip}ms server=${r.server}ms`
    );
  }

  console.log(`successful: ${rt.length}/${N}`);
  if (failed.length) console.log(`failures: ${JSON.stringify(failed)}`);
  console.log(
    `round-trip ms: p50=${pct(rt, 50)} p95=${pct(rt, 95)} mean=${mean(rt)} max=${Math.max(...rt)}`
  );
  console.log(
    `server     ms: p50=${pct(srv, 50)} p95=${pct(srv, 95)} mean=${mean(srv)} max=${Math.max(...srv)}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
