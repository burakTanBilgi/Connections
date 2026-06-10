// Screenshot every sketch via system Chromium. Usage: node shoot.js [outdir]
const puppeteer = require("puppeteer-core");
const fs = require("fs");

const OUT = process.argv[2] || "/tmp/connections-shots";
const sketchesSrc = fs.readFileSync(__dirname + "/sketches.js", "utf8");
const ids = [...sketchesSrc.matchAll(/^id: "([^"]+)"/gm)].map(m => m[1]);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  fs.mkdirSync(OUT, { recursive: true });
  for (const id of ids) {
    await page.goto(`http://localhost:8123/index.html?s=${id}&shot=1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction("window.__READY === true", { timeout: 45000 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: `${OUT}/${id}.png` });
    console.log("shot", id);
  }
  await browser.close();
})();
