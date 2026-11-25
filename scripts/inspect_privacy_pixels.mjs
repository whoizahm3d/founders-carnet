import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import sharp from '../frontend/node_modules/sharp/dist/index.mjs';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/privacy', { waitUntil: 'networkidle' });
  const buf = await page.screenshot();
  const img = sharp(buf);
  const metadata = await img.metadata();
  console.log('Image dimensions:', metadata.width, metadata.height);

  const points = [
    { name: 'Top-left (0,0)', x: 0, y: 0 },
    { name: 'Left title area (144, 134)', x: 144, y: 134 },
    { name: 'Center (720, 450)', x: 720, y: 450 },
    { name: 'Top-right glow (1200, 100)', x: 1200, y: 100 },
    { name: 'Bottom-left (50, 850)', x: 50, y: 850 },
  ];

  for (const pt of points) {
    const p = await sharp(buf).extract({ left: pt.x, top: pt.y, width: 1, height: 1 }).raw().toBuffer();
    console.log(pt.name, '->', '#' + [p[0], p[1], p[2]].map(x => x.toString(16).padStart(2, '0')).join(''), `rgb(${p[0]}, ${p[1]}, ${p[2]})`);
  }

  await browser.close();
}
run().catch(console.error);
