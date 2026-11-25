import { chromium } from '../frontend/node_modules/playwright/index.mjs';

async function testMoreCenters() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const centers = [
    'circle at 140% -20%',
    'circle at 160% -20%',
    'circle at 180% -20%',
    'circle at 200% -20%',
    'circle at 150% 0%',
    'circle at 160% 0%',
    'circle at 180% 0%',
    'circle at 200% 0%',
  ];

  for (const center of centers) {
    const gradient = `radial-gradient(${center}, #FFF6E2 0%, #F5C842 12%, #FF8A2B 30%, #C4451A 46%, #3A1206 60%, #130100 78%, #130100 100%)`;
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><style>html, body { margin: 0; padding: 0; width: 390px; height: 844px; background: ${gradient}; }</style></head>
      <body></body>
      </html>
    `);

    const screenshot = await page.screenshot({ type: 'png' });
    const b64 = screenshot.toString('base64');

    const samples = await page.evaluate((b64Img) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const pts = {
            'Headline (24, 140)': [24, 140],
            'Italic (24, 200)': [24, 200],
            'Subline (24, 280)': [24, 280],
            'Button (24, 360)': [24, 360],
            'Top-Right (370, 20)': [370, 20],
          };
          const res = {};
          for (const [k, [x, y]] of Object.entries(pts)) {
            const p = ctx.getImageData(x, y, 1, 1).data;
            const hex = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
            res[k] = hex;
          }
          resolve(res);
        };
        img.src = 'data:image/png;base64,' + b64Img;
      });
    }, b64);

    console.log(`=== Center: ${center} ===`);
    console.log(JSON.stringify(samples, null, 2));
  }

  await browser.close();
}

testMoreCenters().catch(console.error);
