import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const imgPath = path.resolve(__dirname, '../frontend/design_reference/sign_in_and_register_2/screen.png');
  const imgBase64 = fs.readFileSync(imgPath).toString('base64');

  await page.setContent(`
    <!DOCTYPE html>
    <html><body>
      <canvas id="c"></canvas>
      <script>
        const img = new Image();
        img.onload = () => {
          const c = document.getElementById('c');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          window.__ready = true;
          window.__dims = { w: img.width, h: img.height };
        };
        img.src = 'data:image/png;base64,${imgBase64}';
      </script>
    </body></html>
  `);

  await page.waitForFunction(() => window.__ready);
  const dims = await page.evaluate(() => window.__dims);
  console.log('Reference Image Dimensions:', dims);

  const samples = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const w = c.width;
    const h = c.height;
    const points = {
      'top-left (5%, 5%)': [Math.round(w * 0.05), Math.round(h * 0.05)],
      'top-right (95%, 5%)': [Math.round(w * 0.95), Math.round(h * 0.05)],
      'center (50%, 50%)': [Math.round(w * 0.50), Math.round(h * 0.50)],
      'bottom-left (5%, 95%)': [Math.round(w * 0.05), Math.round(h * 0.95)],
      'bottom-right (95%, 95%)': [Math.round(w * 0.95), Math.round(h * 0.95)],
      'glow-center (85%, 15%)': [Math.round(w * 0.85), Math.round(h * 0.15)],
      'mid-left (10%, 50%)': [Math.round(w * 0.10), Math.round(h * 0.50)],
    };
    const res = {};
    for (const [name, [x, y]] of Object.entries(points)) {
      const p = ctx.getImageData(x, y, 1, 1).data;
      const hex = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      res[name] = { rgb: [p[0], p[1], p[2]], hex };
    }
    return res;
  });

  console.log('Reference Image Samples:');
  console.log(JSON.stringify(samples, null, 2));

  await browser.close();
}

run().catch(console.error);
