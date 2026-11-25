import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../frontend/screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const targets = [
  { url: 'http://localhost:3000/privacy', name: 'privacy', widths: [1440, 768, 390] },
  { url: 'http://localhost:3000/terms', name: 'terms', widths: [1440, 768, 390] },
  { url: 'http://localhost:3000/', name: 'landing', widths: [768, 390] },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  
  for (const target of targets) {
    for (const width of target.widths) {
      const height = width === 390 ? 844 : width === 768 ? 1024 : 900;
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);

      const measurements = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      });

      console.log(`[${target.name} @ ${width}px] innerWidth: ${measurements.innerWidth}, scrollWidth: ${measurements.scrollWidth}`);

      const filename = path.join(outDir, `${target.name}_${width}.png`);
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`Saved screenshot: ${filename}`);

      await context.close();
    }
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
