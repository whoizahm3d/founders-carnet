import { chromium } from '../frontend/node_modules/playwright/index.mjs';

async function testMeasurements() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });

  const data = await page.evaluate(() => {
    const logoMark = document.querySelector('header svg');
    const wordmark = document.querySelector('header nav span');
    const btn = document.querySelector('header nav a[href="/register"] button');
    const menuBtn = document.querySelector('header nav button[aria-label="Open menu"]');
    const nav = document.querySelector('header nav');

    return {
      nav: nav ? nav.getBoundingClientRect() : null,
      logoMark: logoMark ? logoMark.getBoundingClientRect() : null,
      wordmark: wordmark ? { text: wordmark.textContent, rect: wordmark.getBoundingClientRect() } : null,
      btn: btn ? { text: btn.textContent, rect: btn.getBoundingClientRect() } : null,
      menuBtn: menuBtn ? menuBtn.getBoundingClientRect() : null,
    };
  });

  console.log('Current rendered sizes at 390px:');
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
}

testMeasurements().catch(console.error);
