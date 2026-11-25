import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import sharp from '../frontend/node_modules/sharp/dist/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../frontend/screenshots');

function srgb(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function lum([r, g, b]) {
  return 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
}

function contrast(c1, c2) {
  const l1 = lum(c1);
  const l2 = lum(c2);
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

async function measureElementContrast(page, selector, name) {
  // Get element details
  const details = await page.evaluate(({ sel, elName }) => {
    const el = document.querySelector(sel);
    if (!el) return { error: `Element not found: ${sel}` };
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight) || 400;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
    return {
      name: elName,
      color: style.color,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      fontSize,
      fontWeight,
      isLarge,
    };
  }, { sel: selector, elName: name });

  if (details.error) {
    return details;
  }

  // Hide element to sample pure background pixels directly behind it
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.style.visibility = 'hidden';
  }, selector);

  const shot = await page.screenshot({ type: 'png' });

  // Restore visibility
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.style.visibility = '';
  }, selector);

  // Extract region with sharp and calculate mean color
  const vp = page.viewportSize();
  const left = Math.max(0, Math.min(vp.width - 1, Math.round(details.rect.left)));
  const top = Math.max(0, Math.min(vp.height - 1, Math.round(details.rect.top)));
  const width = Math.max(1, Math.min(vp.width - left, Math.round(details.rect.width)));
  const height = Math.max(1, Math.min(vp.height - top, Math.round(details.rect.height)));

  const stats = await sharp(shot)
    .extract({ left, top, width, height })
    .stats();

  const bgRgb = [
    Math.round(stats.channels[0].mean),
    Math.round(stats.channels[1].mean),
    Math.round(stats.channels[2].mean)
  ];

  const textRgb = parseRgb(details.color);
  const ratio = contrast(textRgb, bgRgb);
  const required = details.isLarge ? 3.0 : 4.5;

  return {
    name: details.name,
    textColor: details.color,
    bgRgb: `rgb(${bgRgb.join(', ')})`,
    fontSize: `${details.fontSize}px`,
    isLarge: details.isLarge,
    required: `${required}:1`,
    ratio: ratio.toFixed(2) + ':1',
    passes: ratio >= required,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  console.log('=== PART 1: Button Rest, Hover, Focus on /login (1440x900) ===');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const buttonSelector = 'button[type="submit"]';
    await page.waitForSelector(buttonSelector);

    // 1. Rest state
    await page.screenshot({ path: path.join(outDir, 'login_button_rest_1440.png') });
    console.log('Saved: login_button_rest_1440.png');

    // 2. Hover state
    await page.hover(buttonSelector);
    await page.waitForTimeout(400); // wait for 300ms transition
    await page.screenshot({ path: path.join(outDir, 'login_button_hover_1440.png') });
    console.log('Saved: login_button_hover_1440.png');

    // 3. Move mouse away, then Focus-visible state
    await page.mouse.move(0, 0);
    await page.waitForTimeout(350);
    await page.focus(buttonSelector);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, 'login_button_focus_1440.png') });
    console.log('Saved: login_button_focus_1440.png');

    await page.close();
  }

  console.log('\n=== PART 2: Contrast Measurements (1440x900) ===');
  {
    // Terms: "service"
    const termsPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await termsPage.goto('http://localhost:3000/terms', { waitUntil: 'networkidle' });
    await termsPage.waitForTimeout(500);

    // Terms "service" is h1 span or h1
    const termsService = await measureElementContrast(termsPage, 'h1', 'Terms Title ("Terms of service")');
    const termsItalic = await measureElementContrast(termsPage, 'h1 span span, h1 em, h1 span', 'Terms Italic ("service")');
    console.log('Terms measurements:');
    console.table([termsService, termsItalic]);
    await termsPage.close();

    // Landing: Hero Headline
    const landingPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await landingPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await landingPage.waitForTimeout(500);

    const heroHeadline = await measureElementContrast(landingPage, 'section:first-of-type h1', 'Landing Hero Headline');
    const heroItalic = await measureElementContrast(landingPage, 'section:first-of-type h1 span', 'Landing Hero Italic');
    console.log('Landing Hero measurements:');
    console.table([heroHeadline, heroItalic]);
    await landingPage.close();

    // Login: Title
    const loginPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await loginPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await loginPage.waitForTimeout(500);

    const loginTitle = await measureElementContrast(loginPage, 'h2', 'Login Title ("Welcome back")');
    const loginHeroTitle = await measureElementContrast(loginPage, 'section[aria-label="Introduction"] h1', 'Login Left Hero Title');
    console.log('Login measurements:');
    console.table([loginTitle, loginHeroTitle]);
    await loginPage.close();

    // Privacy: Title
    const privacyPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await privacyPage.goto('http://localhost:3000/privacy', { waitUntil: 'networkidle' });
    await privacyPage.waitForTimeout(500);

    const privacyTitle = await measureElementContrast(privacyPage, 'h1', 'Privacy Title ("Privacy policy")');
    const privacyItalic = await measureElementContrast(privacyPage, 'h1 span span, h1 em, h1 span', 'Privacy Italic ("policy")');
    console.log('Privacy measurements:');
    console.table([privacyTitle, privacyItalic]);
    await privacyPage.close();
  }

  console.log('\n=== PART 3: Full-Page Captures (1440, 768, 390) ===');
  {
    const viewports = [
      { name: '1440', width: 1440, defaultHeight: 900 },
      { name: '768', width: 768, defaultHeight: 1024 },
      { name: '390', width: 390, defaultHeight: 844 },
    ];
    const routes = [
      { path: '/', name: 'landing' },
      { path: '/login', name: 'login' },
      { path: '/register', name: 'register' },
      { path: '/privacy', name: 'privacy' },
      { path: '/terms', name: 'terms' },
    ];

    for (const vp of viewports) {
      for (const r of routes) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.defaultHeight },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        const url = `http://localhost:3000${r.path}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);

        const pageHeight = await page.evaluate(() => {
          return Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight,
            document.body.clientHeight,
            document.documentElement.clientHeight
          );
        });

        await page.setViewportSize({ width: vp.width, height: pageHeight });
        await page.waitForTimeout(300);

        const filePath = path.join(outDir, `${r.name}_${vp.name}.png`);
        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`Saved screenshot: ${filePath} (${vp.width}x${pageHeight})`);
        await context.close();
      }
    }
  }

  await browser.close();
  console.log('\nAll tasks finished successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
