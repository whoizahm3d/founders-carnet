import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import sharp from '../frontend/node_modules/sharp/dist/index.mjs';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  const btnBox = await page.evaluate(() => {
    const el = document.querySelector('section.bg-hero-gradient a[href="/register"] button');
    if (!el) return { error: 'not found' };
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, bg: window.getComputedStyle(el).backgroundColor };
  });
  console.log('Hero Button Box:', btnBox);

  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } });
  const stats = await sharp(shot).extract({
    left: Math.round(btnBox.x + 10),
    top: Math.round(btnBox.y + 10),
    width: Math.round(btnBox.w - 20),
    height: Math.round(btnBox.h - 20)
  }).stats();
  console.log('Button Fill RGB:', stats.channels.map(c => Math.round(c.mean)));

  // Adjacent background 20px above button
  const bgStats = await sharp(shot).extract({
    left: Math.round(btnBox.x),
    top: Math.round(btnBox.y - 25),
    width: Math.round(btnBox.w),
    height: 20
  }).stats();
  console.log('Adjacent BG RGB:', bgStats.channels.map(c => Math.round(c.mean)));

  await browser.close();
}
test().catch(console.error);
