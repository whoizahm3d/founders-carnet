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

function parseRgb(colorStr) {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
  return [255, 255, 255];
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  const tests = [
    {
      pageName: 'Landing (/)',
      url: 'http://localhost:3000/',
      elements: [
        { name: 'Hero Headline ("Introductions for")', selector: 'section:first-of-type h1' },
        { name: 'Hero Italic ("Pakistan\'s startup ecosystem.")', selector: 'section:first-of-type h1 span' },
        { name: 'Hero Subline', selector: 'section:first-of-type p' },
        { name: 'Hero Button 1 ("Create account" ink pill text)', selector: 'section:first-of-type a[href="/register"] button' },
        { name: 'Hero Button 2 ("Sign in" card pill text)', selector: 'section:first-of-type a[href="/login"] button' },
        { name: 'Closing Headline ("Ready for an introduction?")', selector: 'section[class*="bg-hero-gradient"]:last-of-type h2' },
        { name: 'Closing Button ("Create account" ink pill text)', selector: 'section[class*="bg-hero-gradient"]:last-of-type a[href="/register"] button' },
      ],
    },
    {
      pageName: 'Privacy (/privacy)',
      url: 'http://localhost:3000/privacy',
      elements: [
        { name: 'Desktop Title ("Privacy")', selector: 'h1' },
        { name: 'Desktop Title Italic ("policy")', selector: 'h1 span span' },
        { name: 'Timestamp ("Last updated")', selector: 'p[class*="font-mono text-xs"]' },
        { name: 'TOC Link (First item)', selector: 'nav[aria-label="On this page"] a' },
      ],
    },
    {
      pageName: 'Terms (/terms)',
      url: 'http://localhost:3000/terms',
      elements: [
        { name: 'Desktop Title ("Terms of")', selector: 'h1' },
        { name: 'Desktop Title Italic ("service")', selector: 'h1 span span' },
        { name: 'Timestamp ("Last updated")', selector: 'p[class*="font-mono text-xs"]' },
        { name: 'TOC Link (First item)', selector: 'nav[aria-label="On this page"] a' },
      ],
    },
  ];

  for (const t of tests) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Hide text and capture screenshot of background behind each element
    const results = [];
    for (const el of t.elements) {
      const info = await page.evaluate(async ({ selector, name }) => {
        const target = document.querySelector(selector);
        if (!target) return { name, error: 'Element not found' };

        const rect = target.getBoundingClientRect();
        const computed = window.getComputedStyle(target);
        const textColor = computed.color;
        const fontSize = parseFloat(computed.fontSize);
        const fontWeight = parseInt(computed.fontWeight) || 400;
        const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);

        // Center of the element
        const cx = Math.round(rect.left + rect.width / 2);
        const cy = Math.round(rect.top + rect.height / 2);

        return {
          name,
          textColor,
          fontSize,
          fontWeight,
          isLarge,
          cx,
          cy,
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
        };
      }, el);

      if (info.error) {
        results.push(info);
        continue;
      }

      // Sample pixel color from screenshot
      const buffer = await page.screenshot({ type: 'png' });
      // We can inspect the pixel at cx, cy or background color
      const sampled = await page.evaluate(({ cx, cy, rect, b64 }) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Sample background slightly above or next to text to avoid glyph pixels
            const sampleX = Math.max(0, Math.min(img.width - 1, Math.round(rect.left + 5)));
            const sampleY = Math.max(0, Math.min(img.height - 1, Math.round(rect.top - 5)));
            const p = ctx.getImageData(sampleX, sampleY, 1, 1).data;
            resolve([p[0], p[1], p[2]]);
          };
          img.src = 'data:image/png;base64,' + b64;
        });
      }, { ...info, b64: buffer.toString('base64') });

      const textRgb = parseRgb(info.textColor);
      const ratio = contrast(textRgb, sampled);
      const required = info.isLarge ? 3.0 : 4.5;
      const passes = ratio >= required;

      results.push({
        name: info.name,
        textColor: info.textColor,
        bgSampled: `rgb(${sampled.join(', ')})`,
        isLarge: info.isLarge,
        requiredRatio: `${required}:1`,
        actualRatio: `${ratio.toFixed(2)}:1`,
        passes,
      });
    }

    console.log(`\n=== Contrast Report for ${t.pageName} (1440px) ===`);
    console.table(results);
    await page.close();
  }

  await browser.close();
}

run().catch(console.error);
