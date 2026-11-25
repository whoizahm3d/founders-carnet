import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import sharp from '../frontend/node_modules/sharp/dist/index.mjs';

function srgb(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum([r, g, b]) { return 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255); }
function contrast(c1, c2) {
  const l1 = lum(c1), l2 = lum(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function parseRgb(colorStr) {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [255, 255, 255];
}

async function main() {
  const browser = await chromium.launch();

  async function check(url, sel, label) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle' });
    const info = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      el.style.visibility = 'hidden';
      return {
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        color: style.color,
        fontSize: style.fontSize,
      };
    }, sel);

    if (!info) {
      console.log('Not found:', sel);
      await page.close();
      return;
    }

    const shot = await page.screenshot({ type: 'png' });
    const extractedBuf = await sharp(shot).extract({
      left: Math.max(0, Math.round(info.rect.left)),
      top: Math.max(0, Math.round(info.rect.top)),
      width: Math.max(1, Math.round(info.rect.width)),
      height: Math.max(1, Math.round(info.rect.height))
    }).toBuffer();

    const stats = await sharp(extractedBuf).stats();
    const bg = [Math.round(stats.channels[0].mean), Math.round(stats.channels[1].mean), Math.round(stats.channels[2].mean)];
    const textRgb = parseRgb(info.color);
    const cr = contrast(textRgb, bg);
    console.log(`\n=== ${label} ===`);
    console.log({
      selector: sel,
      textColor: info.color,
      bgRgb: `rgb(${bg.join(', ')})`,
      fontSize: info.fontSize,
      contrast: cr.toFixed(2) + ':1',
      passes3to1: cr >= 3.0,
      passes45to1: cr >= 4.5
    });
    await page.close();
  }

  await check('http://localhost:3000/terms', 'h1 span.font-serif', 'Terms Italic ("service")');
  await check('http://localhost:3000/terms', 'h1', 'Terms Full H1 ("Terms of service")');
  await check('http://localhost:3000/privacy', 'h1 span.font-serif', 'Privacy Italic ("policy")');
  await check('http://localhost:3000/privacy', 'h1', 'Privacy Full H1 ("Privacy policy")');
  await check('http://localhost:3000/', 'section:first-of-type h1', 'Landing Hero Headline');
  await check('http://localhost:3000/', 'section:first-of-type h1 span.font-serif', 'Landing Hero Italic');
  await check('http://localhost:3000/login', 'h2', 'Login Form Card Title ("Welcome back")');
  await check('http://localhost:3000/login', 'section[aria-label="Introduction"] h1', 'Login Left Hero Title');

  await browser.close();
}

main().catch(console.error);
