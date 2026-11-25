import { chromium } from '../frontend/node_modules/playwright/index.mjs';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const gradientCandidates = [
    {
      name: 'User starting gradient',
      css: 'radial-gradient(circle at 85% 15%, #FFF6E2 0%, #F5C842 12%, #FF8A2B 32%, #C4451A 55%, #3A1206 82%, #3A1206 100%)',
    },
    {
      name: 'Candidate 2 (75% brown)',
      css: 'radial-gradient(circle at 85% 15%, #FFF6E2 0%, #F5C842 12%, #FF8A2B 30%, #C4451A 52%, #3A1206 75%, #3A1206 100%)',
    },
    {
      name: 'Candidate 3 (70% brown)',
      css: 'radial-gradient(circle at 85% 15%, #FFF6E2 0%, #F5C842 10%, #FF8A2B 28%, #C4451A 48%, #3A1206 70%, #3A1206 100%)',
    }
  ];

  for (const cand of gradientCandidates) {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><style>html, body { margin: 0; padding: 0; width: 1440px; height: 900px; background: ${cand.css}; }</style></head>
      <body></body>
      </html>
    `);

    const screenshotBuffer = await page.screenshot({ type: 'png' });
    const b64 = screenshotBuffer.toString('base64');

    const result = await page.evaluate((b64Img) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

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
          resolve(res);
        };
        img.src = 'data:image/png;base64,' + b64Img;
      });
    }, b64);

    console.log(`=== ${cand.name} ===`);
    console.log(cand.css);
    console.log(JSON.stringify(result, null, 2));
  }

  await browser.close();
}

run().catch(console.error);
