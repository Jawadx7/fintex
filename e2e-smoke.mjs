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

// The URL flips before React paints the dashboard, so wait for the private
// shell (logout button) before asserting on rendered content.
const waitForApp = (page, timeout = 45000) =>
  page
    .waitForSelector('button::-p-text(Log out)', { timeout, polling: 300 })
    .catch(() => {});

const typeInto = async (page, name, value) => {
  const sel = `input[name="${name}"]`;
  if (value instanceof Date) return;
  await page.type(sel, value);
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
  await pAnon.goto(`${BASE}/application/transactions`, { waitUntil: "networkidle2" });
  check("private route bounces anonymous user", pAnon.url().includes("/auth/login"),
    `url=${new URL(pAnon.url()).pathname}`);
  check("callbackUrl is preserved in the redirect",
    decodeURIComponent(pAnon.url()).includes("/application/transactions"));

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
  await waitForPath(p1, /^\/application/);
  await waitForApp(p1);
  check("signup redirects into the dashboard", /^\/application/.test(new URL(p1.url()).pathname),
    `url=${new URL(p1.url()).pathname}`);
  check("signup issues a session cookie",
    (await p1.cookies()).some((c) => c.name === "authjs.session-token" && c.value));

  const dashHtml = await p1.content();
  const dashText = await p1.$eval("body", (e) => e.innerText);
  check("dashboard greets the new user by name", /\bRin\b/.test(dashText));
  check("new user shows a zero balance", /\$\s?0\b/.test(dashText));
  check("new user sees no seeded transactions",
    !/Adobe|Cedarline|Meridian|Aurora|Northgate/.test(dashHtml));

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
  await waitForPath(p2, /^\/application/);
  await waitForApp(p2);
  check("login form authenticates and redirects", /^\/application/.test(new URL(p2.url()).pathname),
    `url=${new URL(p2.url()).pathname}`);
  await ctxLogin.close();

  // ---------- 6. callbackUrl round-trip ----------
  console.log("\n=== F. callbackUrl ROUND-TRIP ===");
  const ctx2 = await browser.createBrowserContext();
  const p3 = await ctx2.newPage();
  await p3.goto(`${BASE}/application/transactions`, { waitUntil: "networkidle2" });
  check("deep link redirects to login", p3.url().includes("/auth/login"));
  await p3.type('input[name="email"]', email);
  await p3.type('input[name="password"]', password);
  await p3.click('button[type="submit"]');
  await waitForPath(p3, /^\/application/);
  await waitForApp(p3);
  check("returns user to the originally requested page",
    new URL(p3.url()).pathname === "/application/transactions",
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
  await p3.goto(`${BASE}/application/dashboard`, { waitUntil: "networkidle2" });
  const logoutBtn = await p3.$('button::-p-text(Log out)');
  check("logout button is present", !!logoutBtn);
  await logoutBtn?.click();
  await sleep(4000);
  check("logout clears the session cookie",
    !(await p3.cookies()).some((c) => c.name === "authjs.session-token" && c.value));
  await p3.goto(`${BASE}/application/dashboard`, { waitUntil: "networkidle2" });
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
  await waitForPath(p5, /^\/application/);
  await p5.goto(`${BASE}/auth/login`, { waitUntil: "networkidle2" });
  check("signed-in user is redirected off /auth/login",
    new URL(p5.url()).pathname === "/application/dashboard",
    `url=${new URL(p5.url()).pathname}`);
  await p5.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle2" });
  check("signed-in user is redirected off /auth/signup",
    new URL(p5.url()).pathname === "/application/dashboard",
    `url=${new URL(p5.url()).pathname}`);
  await ctx9.close();

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

