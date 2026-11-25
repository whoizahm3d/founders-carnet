import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import sharp from '../frontend/node_modules/sharp/dist/index.mjs';
import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');

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

function waitForPort(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function attempt() {
      const req = http.get('http://localhost:3000', (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server not ready within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 500);
        }
      });
      req.setTimeout(1000, () => req.destroy());
    }
    attempt();
  });
}

async function injectFounderAuth(context) {
  await context.addInitScript(() => {
    window.localStorage.setItem('carnet_token', 'mock-token-founder-test');
    window.localStorage.setItem(
      'carnet_user',
      JSON.stringify({
        id: 'mock-founder-bilal',
        email: 'founder@carnet.pk',
        role: 'founder',
        fullName: 'Bilal Ahmed',
        isVerified: true,
        createdAt: new Date().toISOString(),
      })
    );
  });
}

async function run() {
  const nextBin = path.join(FRONTEND_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
  const server = spawn(
    'node',
    [nextBin, 'start', '--port', '3000'],
    {
      cwd: FRONTEND_DIR,
      env: {
        ...process.env,
        NEXT_PUBLIC_USE_MOCK: 'true',
        NEXT_PUBLIC_HIDE_MOCK_BANNER: 'true',
        NODE_ENV: 'production',
      },
      stdio: 'ignore',
    }
  );

  try {
    await waitForPort(30000);
    const browser = await chromium.launch({ headless: true });

    // 1. Check scrollWidth <= innerWidth & nav items wrapping across 390, 768, 1024, 1280, 1440
    console.log('=== Viewport Overflow & Nav Wrapping Checks ===');
    for (const [w, h] of [[390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900]]) {
      const context = await browser.newContext({ viewport: { width: w, height: h } });
      await injectFounderAuth(context);
      const page = await context.newPage();

      await page.goto('http://localhost:3000/founder/dashboard', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const navInfo = await page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const winInnerWidth = window.innerWidth;
        const navPills = Array.from(document.querySelectorAll('header nav a'));
        const navPillInfo = navPills.map(p => {
          const r = p.getBoundingClientRect();
          return { text: p.textContent?.trim(), height: r.height, top: r.top };
        });
        const wrappedPills = navPillInfo.filter(p => p.height > 35);
        return {
          winInnerWidth,
          docScrollWidth,
          overflow: docScrollWidth > winInnerWidth,
          navPillsCount: navPills.length,
          wrappedPillsCount: wrappedPills.length,
        };
      });

      console.log(`[Width ${w}px] innerWidth: ${navInfo.winInnerWidth}, scrollWidth: ${navInfo.docScrollWidth}, overflow: ${navInfo.overflow}, desktopNavPills: ${navInfo.navPillsCount}, wrappedPills: ${navInfo.wrappedPillsCount}`);
      await context.close();
    }

    // 2. Contrast measurements at 1440x900, 768x1024, and 390x844
    console.log('\n=== Contrast Measurements ===');
    for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
      console.log(`\n--- Viewport: ${w}x${h} ---`);
      const context = await browser.newContext({ viewport: { width: w, height: h } });
      await injectFounderAuth(context);
      const page = await context.newPage();

      await page.goto('http://localhost:3000/founder/dashboard', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const selectors = [
        { label: 'Breadcrumb Founder label', sel: 'div.inline-flex.items-center.gap-2.px-3\\.5.py-1\\.5 span.font-mono:first-of-type' },
        { label: 'Breadcrumb Dashboard label', sel: 'div.inline-flex.items-center.gap-2.px-3\\.5.py-1\\.5 span.font-mono:last-of-type' },
        { label: 'View mode label', sel: '[aria-label="Dashboard view mode"] > span:first-child' },
        { label: 'Active dashboard button', sel: '[aria-label="Dashboard view mode"] button:first-of-type' },
        { label: 'Verification badge text', sel: 'span.font-mono.text-accent-deep' },
      ];

      if (w >= 1280) {
        selectors.push(
          { label: 'Nav label Dashboard', sel: 'header nav a[href="/founder/dashboard"]' },
          { label: 'Nav label Profile', sel: 'header nav a[href="/founder/profile"]' },
          { label: 'Nav label Pitch practice', sel: 'header nav a[href="/founder/pitch"]' }
        );
      }

      for (const item of selectors) {
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
        }, item.sel);

        if (!info || info.rect.width === 0 || info.rect.height === 0) {
          console.log(`  ${item.label}: not visible or not found`);
          continue;
        }

        const shot = await page.screenshot({ type: 'png' });
        const left = Math.max(0, Math.floor(info.rect.left));
        const top = Math.max(0, Math.floor(info.rect.top));
        const width = Math.max(1, Math.min(Math.ceil(info.rect.width), w - left));
        const height = Math.max(1, Math.min(Math.ceil(info.rect.height), h - top));

        const extractedBuf = await sharp(shot).extract({ left, top, width, height }).toBuffer();
        const stats = await sharp(extractedBuf).stats();
        const bg = [Math.round(stats.channels[0].mean), Math.round(stats.channels[1].mean), Math.round(stats.channels[2].mean)];
        const textRgb = parseRgb(info.color);
        const cr = contrast(textRgb, bg);

        console.log(`  ${item.label}: text=${info.color} bg=rgb(${bg.join(',')}) font=${info.fontSize} contrast=${cr.toFixed(2)}:1 pass4.5=${cr >= 4.5}`);

        await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (el) el.style.visibility = 'visible';
        }, item.sel);
      }

      await context.close();
    }

    await browser.close();
  } finally {
    server.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
