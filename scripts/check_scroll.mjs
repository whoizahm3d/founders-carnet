import { chromium } from '../frontend/node_modules/playwright/index.mjs';

async function check() {
  const browser = await chromium.launch({ headless: true });
  for (const width of [390, 768]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
    
    const measurements = await page.evaluate(() => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const winInnerWidth = window.innerWidth;

      // Find any elements whose right edge exceeds window.innerWidth
      const overflowingElements = [];
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.right > winInnerWidth + 0.5) {
          overflowingElements.push({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            rectRight: rect.right,
            rectWidth: rect.width,
            rectLeft: rect.left,
            text: el.textContent?.slice(0, 30),
          });
        }
      }

      const nav = document.querySelector('header nav');
      const navRect = nav ? nav.getBoundingClientRect() : null;
      const header = document.querySelector('header');
      const headerRect = header ? header.getBoundingClientRect() : null;

      return {
        winInnerWidth,
        docScrollWidth,
        bodyScrollWidth,
        headerRect,
        navRect,
        overflowingCount: overflowingElements.length,
        overflowingSample: overflowingElements.slice(0, 10),
      };
    });

    console.log(`=== Viewport: ${width}px ===`);
    console.log(`window.innerWidth: ${measurements.winInnerWidth}`);
    console.log(`document.documentElement.scrollWidth: ${measurements.docScrollWidth}`);
    console.log(`document.body.scrollWidth: ${measurements.bodyScrollWidth}`);
    console.log(`Header rect:`, measurements.headerRect);
    console.log(`Nav rect:`, measurements.navRect);
    console.log(`Overflowing elements (${measurements.overflowingCount}):`, measurements.overflowingSample);
  }
  await browser.close();
}

check().catch(console.error);
