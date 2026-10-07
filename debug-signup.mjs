import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const setNativeValue = (page, sel, value) =>
  page.$eval(sel, (el, val) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    setter.call(el, val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [console.error]", m.text());
});
page.on("pageerror", (e) => console.log("  [pageerror]", String(e)));

await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle2" });

for (const [k, v] of Object.entries({
  firstName: "Rin",
  lastName: "Sato",
  email: `dbg-${Date.now()}@fintex.app`,
  password: "Str0ngPass!2026",
  confirmPassword: "Str0ngPass!2026",
})) {
  await page.type(`input[name="${k}"]`, v);
}

await page.click('button[type="submit"]');
await page.waitForSelector('input[name="address"]', { timeout: 45000 });
console.log("step 1 OK -> step 2 visible");

for (const [k, v] of Object.entries({
  address: "12 Otemachi",
  country: "Japan",
  postalCode: "100-0001",
  idNumber: "ID-9911-2233",
})) {
  await page.type(`input[name="${k}"]`, v);
}

await setNativeValue(page, 'input[name="birthDate"]', "1993-05-14");
console.log(
  "  birthDate DOM value =",
  await page.$eval('input[name="birthDate"]', (e) => e.value)
);

await page.click('button[type="submit"]');
await sleep(9000);

console.log("  url after step2 submit =", page.url());
const alert = await page
  .$eval('[role="alert"]', (e) => e.textContent.trim())
  .catch(() => "<no alert>");
console.log("  alert =", alert);
console.log(
  "  inputs on page =",
  await page.$$eval("input", (els) =>
    els.map((e) => `${e.name}="${e.value}"`).join(" | ")
  )
);

await browser.close();