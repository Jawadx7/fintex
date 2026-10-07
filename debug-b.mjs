import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle2" });
await page.type('input[name="email"]', "not-an-email");
await page.type('input[name="password"]', "abc");
await page.click('button[type="submit"]');
await sleep(3000);
const alert = await page.$eval('[role="alert"]', (el) => el.textContent.trim()).catch(() => "<no alert>");
console.log("alert=", alert);
const hasAddress = await page.$('input[name="address"]');
console.log("has address input:", !!hasAddress);
await browser.close();