import puppeteer from "puppeteer-core";

// puppeteer-core ships no browser, so point at an existing Chrome/Edge install.
// Override with CHROME_PATH when it lives somewhere unusual.
const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@fintex.app";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "fintex-admin-2026";
const results = [];

const check = (name, pass, extra = "") => {
  results.push({ name, pass });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Auth.js hashing + Prisma round-trips mean the action can take several
// seconds; poll the URL instead of guessing with a fixed sleep.
const waitForPath = (page, re, timeout = 45000) =>
  page.waitForFunction(
    (src) => new RegExp(src).test(location.pathname),
    { timeout, polling: 300 },
    re.source,
  );

// The URL flips before React paints the account page, so wait for the account
// header (sign-out button) before asserting on rendered content.
const waitForApp = (page, timeout = 45000) =>
  page
    .waitForSelector('button::-p-text(Sign out)', { timeout, polling: 300 })
    .catch(() => {});

const typeInto = async (page, name, value) => {
  const sel = `input[name="${name}"]`;
  if (value instanceof Date) return;
  await page.type(sel, value);
};

// Logs a page in through the real form and waits for the post-login landing.
const logIn = async (page, email, password, expected = /^\/(account|admin)/) => {
  await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await waitForPath(page, expected);
};

// Signup is a two-step form: step 1 creates the account, step 2 collects the
// profile. `address` only exists on step 2, so its appearance is the signal
// that step 1 was accepted.
const fillSignupStep1 = async (page, fields) => {
  for (const [k, v] of Object.entries(fields)) await typeInto(page, k, v);
  await page.click('button[type="submit"]');
  await page.waitForSelector('input[name="address"]', {
    timeout: 45000,
    polling: 300,
  });
};

const fillSignupStep2 = async (page, fields) => {
  for (const [k, v] of Object.entries(fields)) await typeInto(page, k, v);
  // type="date" segment order is locale-dependent, so set it natively.
  await setNativeValue(page, 'input[name="birthDate"]', fields.birthDate);
  await page.click('button[type="submit"]');
};

const fillSignup = async (page, step1, step2) => {
  await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle2" });
  await fillSignupStep1(page, step1);
  await fillSignupStep2(page, step2);
};

const setNativeValue = (page, sel, value) =>
  page.$eval(
    sel,
    (el, val) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    value,
  );

const { existsSync } = await import("node:fs");
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error(
    "No Chrome/Edge build found. Set CHROME_PATH to a Chrome or Edge binary.",
  );
  process.exit(2);
}
console.log(`browser: ${executablePath}\ntarget:  ${BASE}\n`);

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

let createdEmail = "";

try {
  const email = `smoke-${Date.now()}@fintex.app`;
  createdEmail = email;
  const password = "Str0ngPass!2026";

  // ---------- 1. anonymous deep link is protected ----------
  console.log("=== A. ANONYMOUS ACCESS (isolated context) ===");
  const anon = await browser.createBrowserContext();
  const pAnon = await anon.newPage();
  await pAnon.goto(`${BASE}/account`, { waitUntil: "networkidle2" });
  check("private route bounces anonymous user", pAnon.url().includes("/auth/login"),
    `url=${new URL(pAnon.url()).pathname}`);
  check("callbackUrl is preserved in the redirect",
    decodeURIComponent(pAnon.url()).includes("/account"));

  // Anonymous visitors must not reach the staff area either.
  await pAnon.goto(`${BASE}/admin/compliance`, { waitUntil: "networkidle2" });
  check("admin route bounces anonymous user", pAnon.url().includes("/auth/login"),
    `url=${new URL(pAnon.url()).pathname}`);
  check("admin callbackUrl is preserved in the redirect",
    decodeURIComponent(pAnon.url()).includes("/admin/compliance"));

  // The proxy also matches the auth routes now; a signed-out visitor must be
  // able to load the forms without bouncing in a redirect loop.
  for (const route of ["/auth/login", "/auth/signup"]) {
    let hops = 0;
    let res = await pAnon.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
    while (res && res.status() >= 300 && res.status() < 400 && hops < 6) {
      hops++;
      res = await pAnon.goto(res.headers().location
        ? new URL(res.headers().location, BASE).toString()
        : `${BASE}${route}`, { waitUntil: "networkidle2" });
    }
    check(`signed-out visitor can load ${route}`, new URL(pAnon.url()).pathname === route,
      `url=${new URL(pAnon.url()).pathname} hops=${hops}`);
  }
  await anon.close();

  // ---------- 2. signup validation ----------
  console.log("\n=== B. SIGNUP VALIDATION ===");
  const p1 = await browser.newPage();
  const pageErrors = [];
  p1.on("pageerror", (e) => pageErrors.push(String(e)));
  await p1.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle2" });
  await p1.type('input[name="email"]', "not-an-email");
  await p1.type('input[name="password"]', "abc");
  await p1.click('button[type="submit"]');
  await sleep(3000);
  const alert1 = await p1.$eval('[role="alert"]', (el) => el.textContent.trim()).catch(() => "");
  check("invalid signup is rejected with a field error",
    /required|invalid|email|password/i.test(alert1), `alert="${alert1.slice(0, 60)}"`);
  check("invalid signup stays on the form", new URL(p1.url()).pathname === "/auth/signup");
  check("invalid signup issues no session",
    !(await p1.cookies()).some((c) => c.name === "authjs.session-token" && c.value));
  check("invalid step 1 does not advance to step 2",
    !(await p1.$('input[name="address"]')));

  // ---------- 3. real signup ----------
  console.log("\n=== C. REAL SIGNUP (TWO-STEP) ===");
  await fillSignup(
    p1,
    { firstName: "Rin", lastName: "Sato", email, password, confirmPassword: password },
    {
      address: "12 Otemachi",
      country: "Japan",
      postalCode: "100-0001",
      birthDate: "1993-05-14",
      idNumber: "ID-9911-2233",
    },
  );
  await waitForPath(p1, /^\/account/);
  await waitForApp(p1);
  check("signup redirects into the account home", /^\/account/.test(new URL(p1.url()).pathname),
    `url=${new URL(p1.url()).pathname}`);
  check("signup issues a session cookie",
    (await p1.cookies()).some((c) => c.name === "authjs.session-token" && c.value));

  const accountText = await p1.$eval("body", (e) => e.innerText);
  check("account home greets the new user by name", /\bRin\b/.test(accountText));
  check("account home states the dashboard is a later release",
    /later release/i.test(accountText));

  // ---------- 4. password validation ----------
  console.log("\n=== D. PASSWORD RULES ===");
  // Isolated context: this page must not inherit the session cookie that the
  // successful signup above installed in the default context.
  const ctxShort = await browser.createBrowserContext();
  const pShort = await ctxShort.newPage();
  // Step 1 only: a weak password must be rejected before any account exists.
  await pShort.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle2" });
  for (const [k, v] of Object.entries({
    firstName: "Ann", lastName: "Lee", email: `short-${Date.now()}@fintex.app`,
    password: "weak", confirmPassword: "weak",
  })) await pShort.type(`input[name="${k}"]`, v);
  await pShort.click('button[type="submit"]');
  await sleep(3000);
  const shortAlert = await pShort.$eval('[role="alert"]', (el) => el.textContent.trim()).catch(() => "");
  check("weak password rejected", /password/i.test(shortAlert), `alert="${shortAlert.slice(0, 60)}"`);
  check("weak password issues no session",
    !(await pShort.cookies()).some((c) => c.name === "authjs.session-token" && c.value));
  check("weak password never reaches step 2",
    !(await pShort.$('input[name="address"]')));
  await ctxShort.close();

  // ---------- 5. real login ----------
  console.log("\n=== E. REAL LOGIN ===");
  // Own context: the proxy bounces signed-in users off /auth/login, and the
  // default context already holds the session created in section C.
  const ctxLogin = await browser.createBrowserContext();
  const p2 = await ctxLogin.newPage();
  await p2.goto(`${BASE}/auth/login`, { waitUntil: "networkidle2" });
  await p2.type('input[name="email"]', email);
  await p2.type('input[name="password"]', password);
  await p2.click('button[type="submit"]');
  await waitForPath(p2, /^\/account/);
  await waitForApp(p2);
  check("login form authenticates and redirects", /^\/account/.test(new URL(p2.url()).pathname),
    `url=${new URL(p2.url()).pathname}`);
  await ctxLogin.close();

  // ---------- 6. callbackUrl round-trip ----------
  console.log("\n=== F. callbackUrl ROUND-TRIP ===");
  const ctx2 = await browser.createBrowserContext();
  const p3 = await ctx2.newPage();
  await p3.goto(`${BASE}/account`, { waitUntil: "networkidle2" });
  check("deep link redirects to login", p3.url().includes("/auth/login"));
  await p3.type('input[name="email"]', email);
  await p3.type('input[name="password"]', password);
  await p3.click('button[type="submit"]');
  await waitForPath(p3, /^\/account/);
  await waitForApp(p3);
  check("returns user to the originally requested page",
    new URL(p3.url()).pathname === "/account",
    `url=${new URL(p3.url()).pathname}`);

  // ---------- 7. wrong password through the real form ----------
  console.log("\n=== G. WRONG PASSWORD (real form) ===");
  const ctx3 = await browser.createBrowserContext();
  const p4 = await ctx3.newPage();
  await p4.goto(`${BASE}/auth/login`, { waitUntil: "networkidle2" });
  await p4.type('input[name="email"]', email);
  await p4.type('input[name="password"]', "definitely-wrong");
  await p4.click('button[type="submit"]');
  await sleep(6000);
  const badAlert = await p4.$eval('[role="alert"]', (el) => el.textContent.trim()).catch(() => "");
  check("wrong password shows an error", /invalid|incorrect|password/i.test(badAlert),
    `alert="${badAlert.slice(0, 60)}"`);
  check("wrong password issues no session",
    !(await p4.cookies()).some((c) => c.name === "authjs.session-token" && c.value));
  check("wrong password stays on login", new URL(p4.url()).pathname === "/auth/login");
  await ctx3.close();

  // ---------- 8. logout ----------
  console.log("\n=== H. LOGOUT ===");
  await p3.goto(`${BASE}/account`, { waitUntil: "networkidle2" });
  const logoutBtn = await p3.$('button::-p-text(Sign out)');
  check("sign-out button is present", !!logoutBtn);
  await logoutBtn?.click();
  await sleep(4000);
  check("sign-out clears the session cookie",
    !(await p3.cookies()).some((c) => c.name === "authjs.session-token" && c.value));
  await p3.goto(`${BASE}/account`, { waitUntil: "networkidle2" });
  check("logged-out user is bounced back to login", p3.url().includes("/auth/login"));
  check("signed-out visitor can still load the login form",
    new URL(p3.url()).pathname === "/auth/login", `url=${new URL(p3.url()).pathname}`);
  await ctx2.close();

  // ---------- 9. signed-in users are bounced off the auth pages ----------
  console.log("\n=== I. AUTH PAGES FOR SIGNED-IN USERS ===");
  const ctx9 = await browser.createBrowserContext();
  const p5 = await ctx9.newPage();
  await p5.goto(`${BASE}/auth/login`, { waitUntil: "networkidle2" });
  await p5.type('input[name="email"]', email);
  await p5.type('input[name="password"]', password);
  await p5.click('button[type="submit"]');
  await waitForPath(p5, /^\/account/);
  await p5.goto(`${BASE}/auth/login`, { waitUntil: "networkidle2" });
  check("signed-in user is redirected off /auth/login",
    new URL(p5.url()).pathname === "/account",
    `url=${new URL(p5.url()).pathname}`);
  await p5.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle2" });
  check("signed-in user is redirected off /auth/signup",
    new URL(p5.url()).pathname === "/account",
    `url=${new URL(p5.url()).pathname}`);
  await ctx9.close();

  // ---------- 10. role-based routing & admin area ----------
  console.log("\n=== J. ROLES & ADMIN AREA ===");

  // Non-admin (the signup user from section C) is kept out of /admin.
  const ctxUser = await browser.createBrowserContext();
  const pUser = await ctxUser.newPage();
  await logIn(pUser, email, password);
  check("non-admin lands on /account after login",
    new URL(pUser.url()).pathname === "/account",
    `url=${new URL(pUser.url()).pathname}`);
  await pUser.goto(`${BASE}/admin/compliance`, { waitUntil: "networkidle2" });
  check("non-admin is redirected away from /admin",
    new URL(pUser.url()).pathname === "/account",
    `url=${new URL(pUser.url()).pathname}`);
  const userMe = await pUser.evaluate(async () => {
    const res = await fetch("/api/admin/me");
    return { status: res.status, body: await res.json().catch(() => null) };
  });
  check("non-admin API /api/admin/me is 403", userMe.status === 403,
    `status=${userMe.status}`);
  await ctxUser.close();

  // Admin lands on the compliance dashboard and the API reports the role.
  const ctxAdmin = await browser.createBrowserContext();
  const pAdmin = await ctxAdmin.newPage();
  await logIn(pAdmin, ADMIN_EMAIL, ADMIN_PASSWORD, /^\/admin/);
  check("admin lands on /admin/compliance after login",
    new URL(pAdmin.url()).pathname === "/admin/compliance",
    `url=${new URL(pAdmin.url()).pathname}`);
  const adminBody = await pAdmin.$eval("body", (e) => e.innerText);
  check("admin shell shows the compliance page", /compliance/i.test(adminBody));
  check("admin shell marks data as synthetic", /synthetic demo data/i.test(adminBody));
  const adminMe = await pAdmin.evaluate(async () => {
    const res = await fetch("/api/admin/me");
    return { status: res.status, body: await res.json().catch(() => null) };
  });
  check("admin API /api/admin/me is 200 with role ADMIN",
    adminMe.status === 200 && adminMe.body?.role === "ADMIN",
    `status=${adminMe.status} role=${adminMe.body?.role}`);

  // Signed-in admin visiting an auth page is bounced to the admin home.
  await pAdmin.goto(`${BASE}/auth/login`, { waitUntil: "networkidle2" });
  check("signed-in admin is bounced off /auth/login to /admin/compliance",
    new URL(pAdmin.url()).pathname === "/admin/compliance",
    `url=${new URL(pAdmin.url()).pathname}`);
  await ctxAdmin.close();

  const ctxEvil = await browser.createBrowserContext();
  const pEvil = await ctxEvil.newPage();
  await logIn(pEvil, email, password);
  // /auth/continue is where callbackUrl is resolved; a protocol-relative or
  // absolute URL must be rejected in favour of the role default.
  await pEvil.goto(
    `${BASE}/auth/continue?callbackUrl=${encodeURIComponent("//example.com/evil")}`,
    { waitUntil: "networkidle2" },
  );
  check("protocol-relative callbackUrl is not followed",
    new URL(pEvil.url()).host === new URL(BASE).host &&
      new URL(pEvil.url()).pathname === "/account",
    `url=${pEvil.url()}`);
  await pEvil.goto(
    `${BASE}/auth/continue?callbackUrl=${encodeURIComponent("https://example.com/evil")}`,
    { waitUntil: "networkidle2" },
  );
  check("absolute callbackUrl is not followed",
    new URL(pEvil.url()).host === new URL(BASE).host &&
      new URL(pEvil.url()).pathname === "/account",
    `url=${pEvil.url()}`);
  await ctxEvil.close();

  // Anonymous API access is unauthorized.
  const ctxAnonApi = await browser.createBrowserContext();
  const pAnonApi = await ctxAnonApi.newPage();
  await pAnonApi.goto(`${BASE}/auth/login`, { waitUntil: "networkidle2" });
  const anonMe = await pAnonApi.evaluate(async () => {
    const res = await fetch("/api/admin/me");
    return res.status;
  });
  check("anonymous API /api/admin/me is 401", anonMe === 401, `status=${anonMe}`);
  await ctxAnonApi.close();

  // ---------- 11. compliance alerts API, dashboard & review (3.3) ----------
  console.log("\n=== K. COMPLIANCE ALERTS API & DASHBOARD ===");

  // Anonymous callers are unauthorized.
  const ctxK1 = await browser.createBrowserContext();
  const pK1 = await ctxK1.newPage();
  await pK1.goto(`${BASE}/auth/login`, { waitUntil: "networkidle2" });
  const anonAlerts = await pK1.evaluate(() => fetch("/api/admin/alerts").then((r) => r.status));
  check("anonymous API /api/admin/alerts is 401", anonAlerts === 401, `status=${anonAlerts}`);
  await ctxK1.close();

  // Non-admins are forbidden.
  const ctxK2 = await browser.createBrowserContext();
  const pK2 = await ctxK2.newPage();
  await logIn(pK2, email, password);
  const userAlerts = await pK2.evaluate(() => fetch("/api/admin/alerts").then((r) => r.status));
  check("non-admin API /api/admin/alerts is 403", userAlerts === 403, `status=${userAlerts}`);
  await ctxK2.close();

  const ctxK3 = await browser.createBrowserContext();
  const pK3 = await ctxK3.newPage();
  const complianceErrors = [];
  pK3.on("pageerror", (e) => complianceErrors.push(String(e)));
  await logIn(pK3, ADMIN_EMAIL, ADMIN_PASSWORD, /^\/admin/);

  const alerts = await pK3.evaluate(async () => {
    const res = await fetch("/api/admin/alerts");
    return { status: res.status, body: await res.json() };
  });
  check("admin API /api/admin/alerts is 200", alerts.status === 200, `status=${alerts.status}`);
  check("default page returns the pagination envelope",
    alerts.body.page === 1 && alerts.body.pageSize === 10 &&
      typeof alerts.body.total === "number" &&
      typeof alerts.body.totalPages === "number",
    `page=${alerts.body.page} size=${alerts.body.pageSize} total=${alerts.body.total} pages=${alerts.body.totalPages}`);
  check("flagged list is non-empty and excludes LOW",
    Array.isArray(alerts.body.items) && alerts.body.items.length > 0 &&
      alerts.body.items.every((i) => i.tier !== "LOW") &&
      alerts.body.items.length <= alerts.body.pageSize,
    `count=${alerts.body.items?.length}`);
  check("money is serialized as a string",
    typeof alerts.body.items?.[0]?.amount === "string",
    `amount=${alerts.body.items?.[0]?.amount}`);

  const flaggedTotal = alerts.body.total;
  const flaggedPages = alerts.body.totalPages;

  // The last page holds the remainder (derived from the response, not a magic
  // number), so a partial final page is exercised whenever the seed is longer
  // than one page.
  const last = await pK3.evaluate(
    (page) => fetch(`/api/admin/alerts?page=${page}`).then((r) => r.json()),
    flaggedPages,
  );
  const expectedRemainder = flaggedTotal - (flaggedPages - 1) * 10;
  check("last page returns the remainder",
    last.items.length === expectedRemainder && expectedRemainder > 0,
    `rows=${last.items.length} expected=${expectedRemainder}`);

  // Out-of-range pages clamp instead of erroring.
  const clamp = await pK3.evaluate(async () => {
    const res = await fetch("/api/admin/alerts?page=999");
    return { status: res.status, body: await res.json() };
  });
  check("out-of-range page clamps to the last page",
    clamp.status === 200 && clamp.body.page === clamp.body.totalPages,
    `status=${clamp.status} page=${clamp.body.page} pages=${clamp.body.totalPages}`);

  // pageSize is capped at the documented maximum.
  const capped = await pK3.evaluate(() =>
    fetch("/api/admin/alerts?pageSize=999").then((r) => r.json()));
  check("pageSize above the maximum is capped at 50",
    capped.pageSize === 50, `pageSize=${capped.pageSize}`);

  const cleared = await pK3.evaluate(() =>
    fetch("/api/admin/alerts?includeCleared=true&pageSize=50").then((r) => r.json()));
  check("includeCleared=true returns a larger total",
    cleared.total > flaggedTotal,
    `cleared=${cleared.total} flagged=${flaggedTotal}`);

  const highOnly = await pK3.evaluate(() =>
    fetch("/api/admin/alerts?tier=HIGH&pageSize=50").then((r) => r.json()));
  check("tier=HIGH filter returns only HIGH",
    highOnly.items.length > 0 && highOnly.items.every((i) => i.tier === "HIGH"),
    `count=${highOnly.items.length}`);
  check("tier=HIGH changes the reported total",
    highOnly.total < flaggedTotal,
    `high=${highOnly.total} flagged=${flaggedTotal}`);

  const badQuery = await pK3.evaluate(() =>
    fetch("/api/admin/alerts?tier=NOPE").then((r) => r.status));
  check("invalid query is rejected with 400", badQuery === 400, `status=${badQuery}`);

  const summary = await pK3.evaluate(() =>
    fetch("/api/admin/alerts/summary?range=all").then((r) => r.json()));
  check("summary reports flagged and high totals",
    summary.totals?.flagged > 0 && summary.totals.high > 0,
    `flagged=${summary.totals?.flagged} high=${summary.totals?.high}`);
  check("summary includes per-tag aggregates",
    Array.isArray(summary.byTag) && summary.byTag.length > 0,
    `tags=${summary.byTag?.length}`);

  // Detail endpoint + review persistence.
  const firstId = alerts.body.items[0].id;
  const detail = await pK3.evaluate(async (id) => {
    const res = await fetch(`/api/admin/alerts/${id}`);
    return { status: res.status, body: await res.json() };
  }, firstId);
  check("detail endpoint returns 200", detail.status === 200, `status=${detail.status}`);
  check("detail includes reasons and sender history",
    Array.isArray(detail.body.reasons) && detail.body.reasons.length > 0 &&
      Array.isArray(detail.body.senderHistory),
    `reasons=${detail.body.reasons?.length} history=${detail.body.senderHistory?.length}`);

  const notFound = await pK3.evaluate(() =>
    fetch("/api/admin/alerts/does-not-exist").then((r) => r.status));
  check("unknown alert id is 404", notFound === 404, `status=${notFound}`);

  const nextStatus = detail.body.reviewStatus === "CONFIRMED" ? "OPEN" : "CONFIRMED";
  const patched = await pK3.evaluate(async ({ id, status }) => {
    const res = await fetch(`/api/admin/alerts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, note: "e2e review" }),
    });
    return { status: res.status, body: await res.json() };
  }, { id: firstId, status: nextStatus });
  check("review PATCH returns 200 with the new status",
    patched.status === 200 && patched.body.reviewStatus === nextStatus,
    `status=${patched.status} review=${patched.body.reviewStatus}`);

  const reread = await pK3.evaluate((id) =>
    fetch(`/api/admin/alerts/${id}`).then((r) => r.json()).then((b) => b.reviewStatus), firstId);
  check("review status persists across reads", reread === nextStatus, `status=${reread}`);

  const badPatch = await pK3.evaluate((id) =>
    fetch(`/api/admin/alerts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "NOT_A_STATUS" }),
    }).then((r) => r.status), firstId);
  check("invalid review body is rejected with 400", badPatch === 400, `status=${badPatch}`);

  // LOW assessments never require review. Fetch one directly so the guard is
  // exercised regardless of where LOW rows fall in the page ordering.
  const lowOnly = await pK3.evaluate(() =>
    fetch("/api/admin/alerts?tier=LOW&pageSize=1").then((r) => r.json()));
  check("LOW assessments are reachable via tier=LOW", lowOnly.total > 0,
    `total=${lowOnly.total}`);
  const lowItem = lowOnly.items?.[0];
  if (lowItem) {
    const lowPatch = await pK3.evaluate((id) =>
      fetch(`/api/admin/alerts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      }).then((r) => r.status), lowItem.id);
    check("PATCH on a non-reviewable alert is 409", lowPatch === 409, `status=${lowPatch}`);
  }

  // Dashboard renders the table and honours the tier filter from the URL.
  await pK3.goto(`${BASE}/admin/compliance?tier=HIGH`, { waitUntil: "networkidle2" });
  await pK3.waitForSelector("table tbody tr", { timeout: 25000 }).catch(() => {});
  const highRowCount = await pK3.$$eval("table tbody tr", (rows) => rows.length).catch(() => 0);
  const dashBody = await pK3.$eval("body", (e) => e.innerText);
  check("dashboard renders alert rows from the tier filter", highRowCount > 0, `rows=${highRowCount}`);
  check("dashboard shows summary totals", /flagged/i.test(dashBody));
  check("dashboard marks the environment as synthetic", /synthetic demo data/i.test(dashBody));
  check("dashboard shows the showing-range label",
    /Showing \d+\u2013\d+ of \d+/.test(dashBody));
  check("dashboard renders numbered pagination",
    !!(await pK3.$('nav[aria-label="pagination"]')));

  // Page lives in the URL and changes the visible window.
  await pK3.goto(`${BASE}/admin/compliance?tier=HIGH&page=2`, { waitUntil: "networkidle2" });
  await pK3.waitForSelector("table tbody tr", { timeout: 25000 }).catch(() => {});
  const page2Body = await pK3.$eval("body", (e) => e.innerText);
  check("page=2 is kept in the URL",
    new URL(pK3.url()).searchParams.get("page") === "2");
  check("page 2 shows the next window of rows",
    /Showing 11\u2013\d+ of \d+/.test(page2Body));

  // Back from detail returns to the same page + filters.
  await pK3.click("table tbody tr");
  await pK3
    .waitForFunction(() => /Why this was flagged/.test(document.body.innerText), { timeout: 25000 })
    .catch(() => {});
  const detailUrl = new URL(pK3.url());
  const fromParam = detailUrl.searchParams.get("from") || "";
  check("detail URL carries the list state via ?from=", detailUrl.searchParams.has("from"));
  check("?from preserves page and filters",
    fromParam.includes("page=2") && fromParam.includes("tier=HIGH"),
    `from=${fromParam}`);

  await pK3.click('a::-p-text(Back to alerts)');
  await pK3.waitForSelector("table tbody tr", { timeout: 25000 }).catch(() => {});
  const backUrl = new URL(pK3.url());
  check("back returns to the same page + filters",
    backUrl.pathname === "/admin/compliance" &&
      backUrl.searchParams.get("page") === "2" &&
      backUrl.searchParams.get("tier") === "HIGH",
    `url=${backUrl.pathname}${backUrl.search}`);

  // Detail page renders the analyst view.
  await pK3.goto(`${BASE}/admin/compliance/${firstId}`, { waitUntil: "networkidle2" });
  await pK3.waitForFunction(() => /Why this was flagged/.test(document.body.innerText), { timeout: 25000 })
    .catch(() => {});
  const detailBody = await pK3.$eval("body", (e) => e.innerText);
  check("detail page renders the flagged reasons", /why this was flagged/i.test(detailBody));
  check("detail page renders the sender timeline", /sender timeline/i.test(detailBody));
  check("detail page renders the review panel", /decision/i.test(detailBody) && /save review/i.test(detailBody));

  check("no uncaught errors on the compliance dashboard", complianceErrors.length === 0,
    complianceErrors[0] || "");

  // ---------- 12. theme scoping & app shell (3.4) ----------
  console.log("\n=== L. THEME SCOPE & APP SHELL ===");

  // Simulate an OS dark preference with no stored choice.
  await pK3.evaluate(() => {
    try {
      localStorage.removeItem("fintex-theme");
    } catch {}
  });
  await pK3.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);

  // App area -> dark.
  await pK3.goto(`${BASE}/admin/compliance`, { waitUntil: "networkidle2" });
  await pK3
    .waitForSelector("table tbody tr", { timeout: 25000 })
    .catch(() => {});
  const adminDark = await pK3.evaluate(() =>
    document.documentElement.classList.contains("dark"));
  check("admin area honours the dark preference", adminDark === true, `dark=${adminDark}`);

  // Shell structure.
  check("app shell renders the sidebar",
    !!(await pK3.$('[data-sidebar="sidebar"]')));
  const shellBody = await pK3.$eval("body", (e) => e.innerText);
  check("app shell renders the collapse control", /collapse menu/i.test(shellBody));
  check("app shell shows the synthetic-data badge", /synthetic demo data/i.test(shellBody));
  const activeNav = await pK3
    .$eval('a[aria-current="page"]', (el) => el.getAttribute("href"))
    .catch(() => null);
  check("active nav item is marked aria-current=page",
    activeNav === "/admin/compliance", `href=${activeNav}`);

  // Account area -> dark too.
  await pK3.goto(`${BASE}/account`, { waitUntil: "networkidle2" });
  const accountDark = await pK3.evaluate(() =>
    document.documentElement.classList.contains("dark"));
  check("account area honours the dark preference", accountDark === true, `dark=${accountDark}`);

  // Public routes stay light under the same dark preference.
  for (const route of ["/", "/auth/login", "/auth/signup"]) {
    await pK3.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
    const dark = await pK3.evaluate(() =>
      document.documentElement.classList.contains("dark"));
    check(`${route} stays light for a dark-preferring visitor`, dark === false, `dark=${dark}`);
  }

  // Toggling inside the app stores an explicit light preference.
  await pK3.goto(`${BASE}/admin/compliance`, { waitUntil: "networkidle2" });
  await pK3
    .waitForSelector('button[aria-label^="Switch to"]', { timeout: 25000 })
    .catch(() => {});
  const toggled = await pK3.evaluate(() => {
    const btn = document.querySelector('button[aria-label^="Switch to"]');
    if (!btn) return null;
    btn.click();
    return {
      dark: document.documentElement.classList.contains("dark"),
      stored: localStorage.getItem("fintex-theme"),
    };
  });
  check("theme toggle stores the light preference and clears dark",
    toggled !== null && toggled.dark === false && toggled.stored === "light",
    `dark=${toggled?.dark} stored=${toggled?.stored}`);

  await pK3.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await ctxK3.close();

  check("no uncaught page errors", pageErrors.length === 0, pageErrors[0] || "");
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
console.log(`Test account: ${createdEmail}`);
if (failed.length) {
  console.log("FAILED:");
  failed.forEach((f) => console.log("  - " + f.name));
  process.exit(1);
}

