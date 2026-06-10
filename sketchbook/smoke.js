// End-to-end smoke test for the phase-1 app. Usage: node smoke.js [baseUrl]
const puppeteer = require("puppeteer-core");

const BASE = process.argv[2] || "http://localhost:5199";
const SHOT = "/tmp/connections-shots/smoke.png";

async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle((sel, t) => {
    return [...document.querySelectorAll(sel)].find(el => el.textContent.includes(t)) || null;
  }, selector, text);
  if (!handle || (await handle.evaluate(el => el === null).catch(() => true))) {
    throw new Error(`not found: ${selector} containing "${text}"`);
  }
  await handle.asElement().click();
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));

  // 1. Home loads
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.waitForSelector(".new-graph", { timeout: 10000 });
  console.log("ok: home renders");

  // 2. Template modal opens, create from Friend web
  await page.click(".new-graph");
  await page.waitForSelector(".modal");
  await clickByText(page, ".template-card", "Friend web");
  await page.type(".modal input", "smoke web");
  await clickByText(page, ".modal button", "Create");
  await page.waitForSelector(".graph-screen", { timeout: 10000 });
  console.log("ok: graph created from template modal");

  // 3. Add a node via toolbar
  await clickByText(page, ".toolbar button", "+ Node");
  await page.waitForFunction(
    () => document.body.innerText.includes("new person"),
    { timeout: 5000 }
  );
  console.log("ok: node added (template default type = person)");

  // 4. Node panel opened for the new node (auto-selected)
  await page.waitForSelector(".node-panel", { timeout: 5000 });
  console.log("ok: node panel opens on selection");

  // 5. Reload → home → reopen graph → node persisted via IndexedDB
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".graph-row", { timeout: 10000 });
  await clickByText(page, ".graph-row", "smoke web");
  await page.waitForSelector(".graph-screen", { timeout: 10000 });
  await page.waitForFunction(
    () => document.body.innerText.includes("new person"),
    { timeout: 5000 }
  );
  console.log("ok: graph + node persisted across reload");

  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: SHOT });
  console.log("screenshot:", SHOT);

  if (errors.length) {
    console.log("PAGE ERRORS:", errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("SMOKE PASS");
  }
  await browser.close();
})();
