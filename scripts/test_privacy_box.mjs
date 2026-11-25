import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import sharp from '../frontend/node_modules/sharp/dist/index.mjs';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/privacy', { waitUntil: 'networkidle' });

  const info = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1')).map(h => {
      const r = h.getBoundingClientRect();
      return {
        text: h.innerText,
        box: { x: r.left, y: r.top, w: r.width, h: r.height },
        visible: r.width > 0 && r.height > 0 && window.getComputedStyle(h).display !== 'none'
      };
    });
    return headings;
  });
  console.log('Headings:', JSON.stringify(info, null, 2));

  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } });
  for (const h of info) {
    if (h.visible) {
      const stats = await sharp(buf).extract({
        left: Math.round(h.box.x),
        top: Math.round(h.box.y),
        width: Math.round(h.box.w),
        height: Math.round(h.box.h)
      }).stats();
      console.log(h.text, 'BG color:', [stats.channels[0].mean, stats.channels[1].mean, stats.channels[2].mean].map(Math.round));
    }
  }

  await browser.close();
}
test().catch(console.error);
