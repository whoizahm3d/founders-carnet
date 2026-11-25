import { chromium } from '../frontend/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/privacy', { waitUntil: 'networkidle' });
  const rects = await page.evaluate(() => {
    const h1 = document.querySelector('h1').getBoundingClientRect();
    const art = document.querySelector('article').getBoundingClientRect();
    const navCol = document.querySelector('[class*="lg:block"]').getBoundingClientRect();
    return { h1, art, navCol };
  });
  console.log('Rects:', JSON.stringify(rects, null, 2));
  await browser.close();
}
main().catch(console.error);
