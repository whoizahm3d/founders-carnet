import { chromium } from '../frontend/node_modules/playwright/index.mjs';

function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrast(rgb1, rgb2) {
  const l1 = luminance(...rgb1);
  const l2 = luminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Test with Candidate 2 gradient
  const gradient = 'radial-gradient(circle at 85% 15%, #FFF6E2 0%, #F5C842 12%, #FF8A2B 30%, #C4451A 52%, #3A1206 75%, #3A1206 100%)';

  // Check 1: Sample corners and center at 1440x900
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head><style>html, body { margin: 0; padding: 0; width: 1440px; height: 900px; background: ${gradient}; }</style></head>
    <body></body>
    </html>
  `);

  const screenshot = await page.screenshot({ type: 'png' });
  const b64 = screenshot.toString('base64');

  const cornerSamples = await page.evaluate((b64Img) => {
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
          'top-left (0, 0)': [0, 0],
          'top-right (1439, 0)': [w - 1, 0],
          'center (720, 450)': [Math.round(w / 2), Math.round(h / 2)],
          'bottom-left (0, 899)': [0, h - 1],
          'bottom-right (1439, 899)': [w - 1, h - 1],
          'glow-center (85%, 15%)': [Math.round(w * 0.85), Math.round(h * 0.15)],
        };
        const res = {};
        for (const [k, [x, y]] of Object.entries(points)) {
          const p = ctx.getImageData(x, y, 1, 1).data;
          const hex = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
          res[k] = { rgb: [p[0], p[1], p[2]], hex };
        }
        resolve(res);
      };
      img.src = 'data:image/png;base64,' + b64Img;
    });
  }, b64);

  console.log('=== Sampled Corners & Center (1440x900) ===');
  console.log(JSON.stringify(cornerSamples, null, 2));

  await browser.close();
}

run().catch(console.error);
