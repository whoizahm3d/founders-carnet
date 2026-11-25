import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import sharp from '../frontend/node_modules/sharp/dist/index.mjs';

function srgb(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum([r, g, b]) { return 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255); }
function contrast(c1, c2) {
  const l1 = lum(c1), l2 = lum(c2);
  return l1 > l2 ? (l1 + 0.05) / (l2 + 0.05) : (l2 + 0.05) / (l1 + 0.05);
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/privacy', { waitUntil: 'networkidle' });

  const box = await page.evaluate(() => {
    const el = document.querySelector('div[class*="lg:block"] h1');
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });

  // Hide it properly
  await page.evaluate(() => {
    const el = document.querySelector('div[class*="lg:block"] h1');
    el.style.visibility = 'hidden';
  });

  const buf = await page.screenshot();
  const stats = await sharp(buf).extract({
    left: Math.round(box.x),
    top: Math.round(box.y),
    width: Math.round(box.w),
    height: Math.round(box.h)
  }).stats();

  const bg = stats.channels.map(c => Math.round(c.mean));
  console.log('Real background behind privacy h1:', bg, '#' + bg.map(v => v.toString(16).padStart(2,'0')).join(''));
  console.log('Contrast with white (#ffffff):', contrast([255,255,255], bg).toFixed(2));
  console.log('Contrast with carnet-yellow (#f5c842):', contrast([245,200,66], bg).toFixed(2));

  await browser.close();
}
run().catch(console.error);
