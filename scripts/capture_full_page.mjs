import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.resolve(__dirname, '../frontend/screenshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: '1440', width: 1440, defaultHeight: 900 },
    { name: '768', width: 768, defaultHeight: 1024 },
    { name: '390', width: 390, defaultHeight: 844 },
  ];
  const routes = [
    { path: '/', name: 'landing' },
    { path: '/login', name: 'login' },
    { path: '/register', name: 'register' },
  ];

  for (const vp of viewports) {
    for (const r of routes) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.defaultHeight },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const url = `http://127.0.0.1:3000${r.path}`;
      console.log(`Navigating to ${url} at ${vp.name}px...`);
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      // Measure total page height and set viewport height to full page height
      const pageHeight = await page.evaluate(() => {
        return Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight,
          document.body.clientHeight,
          document.documentElement.clientHeight
        );
      });

      console.log(`Setting viewport height to page height: ${pageHeight}px`);
      await page.setViewportSize({ width: vp.width, height: pageHeight });
      await page.waitForTimeout(500);

      const filePath = path.join(outputDir, `${r.name}_${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`Saved screenshot: ${filePath}`);
      await context.close();
    }
  }
  await browser.close();
  console.log('All screenshots completed successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
