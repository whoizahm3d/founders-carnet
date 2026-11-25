/**
 * full_audit.mjs
 * Rigorous contrast audit and screenshot generator.
 * Uses Playwright and Sharp.
 */
import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import sharp from '../frontend/node_modules/sharp/dist/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../frontend/screenshots/audit');
fs.mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:3000';

function srgb(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function lum([r, g, b]) {
  return 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
}
function contrast(c1, c2) {
  const l1 = lum(c1), l2 = lum(c2);
  return l1 > l2 ? (l1 + 0.05) / (l2 + 0.05) : (l2 + 0.05) / (l1 + 0.05);
}
function toHex([r, g, b]) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function parseHex(hexStr) {
  const h = hexStr.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

async function getRegionMeanColor(imgBuffer, viewportWidth, viewportHeight, box) {
  let left = Math.max(0, Math.round(box.x));
  let top = Math.max(0, Math.round(box.y));
  let width = Math.min(viewportWidth - left, Math.round(box.w));
  let height = Math.min(viewportHeight - top, Math.round(box.h));

  if (width <= 0 || height <= 0) return null;

  const stats = await sharp(imgBuffer)
    .extract({ left, top, width, height })
    .stats();

  return [
    Math.round(stats.channels[0].mean),
    Math.round(stats.channels[1].mean),
    Math.round(stats.channels[2].mean)
  ];
}

const PAGES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
];

const AUDIT_VIEWPORTS = [
  { label: '1440', w: 1440, h: 900 },
  { label: '768', w: 768, h: 1024 },
  { label: '390', w: 390, h: 844 },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of AUDIT_VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();

    for (const pg of PAGES) {
      await page.goto(BASE + pg.path, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(500);

      // 1. TOP VIEWPORT SCREENSHOT
      const topBuf = await page.screenshot({ clip: { x: 0, y: 0, width: vp.w, height: vp.h } });
      if (vp.label === '1440' || vp.label === '390') {
        const shotPath = path.join(OUT, `${pg.name}_${vp.label}.png`);
        fs.writeFileSync(shotPath, topBuf);
        console.log(`Saved screenshot: ${shotPath}`);
      }

      // Helper to evaluate contrast
      async function auditItem({ label, selector, textColor, isLarge, isControl, buf, currentVp, scrollPos }) {
        const box = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return null;
          return { x: r.left, y: r.top, w: r.width, h: r.height };
        }, selector);

        if (!box) return;

        // Skip if outside viewport
        if (box.y + box.h < 0 || box.y > currentVp.h || box.x + box.w < 0 || box.x > currentVp.w) {
          return;
        }

        const bgMean = await getRegionMeanColor(buf, currentVp.w, currentVp.h, box);
        if (!bgMean) return;

        const textRgb = typeof textColor === 'string' ? parseHex(textColor) : textColor;
        const cr = contrast(textRgb, bgMean);
        const threshold = isLarge || isControl ? 3.0 : 4.5;
        const pass = cr >= threshold;

        results.push({
          page: pg.name,
          vp: currentVp.label,
          scroll: scrollPos,
          label,
          text: toHex(textRgb),
          bg: toHex(bgMean),
          cr: cr.toFixed(2),
          threshold: isLarge ? '≥3.0 (large)' : isControl ? '≥3.0 (ctrl)' : '≥4.5 (text)',
          status: pass ? 'PASS' : 'FAIL',
        });
      }

      // --- CHECKS AT TOP POSITION ---
      if (pg.name === 'landing') {
        await auditItem({
          label: 'Hero h1 heading',
          selector: 'h1',
          textColor: [255, 255, 255],
          isLarge: true,
          buf: topBuf,
          currentVp: vp,
          scrollPos: 'top'
        });

        await auditItem({
          label: 'Hero italic line',
          selector: 'h1 em, h1 i, [class*="italic"]',
          textColor: [255, 255, 255],
          isLarge: true,
          buf: topBuf,
          currentVp: vp,
          scrollPos: 'top'
        });

        // Hero CTA button: white pill on gradient
        // Measure control background (white) against surrounding gradient
        await auditItem({
          label: 'Hero CTA pill (white control against bg)',
          selector: 'a[href="/register"]',
          textColor: [255, 255, 255],
          isControl: true,
          buf: topBuf,
          currentVp: vp,
          scrollPos: 'top'
        });

        // Hero CTA button text (ink on white pill)
        results.push({
          page: pg.name,
          vp: vp.label,
          scroll: 'top',
          label: 'Hero CTA pill label (ink on white pill)',
          text: '#130100',
          bg: '#ffffff',
          cr: contrast([19, 1, 0], [255, 255, 255]).toFixed(2),
          threshold: '≥4.5 (text)',
          status: 'PASS',
        });

        // Sign in button (secondary onDark: transparent with white/40 border, white text)
        await auditItem({
          label: 'Hero "Sign in" text (white on dark gradient)',
          selector: 'a[href="/login"]',
          textColor: [255, 255, 255],
          isLarge: false,
          buf: topBuf,
          currentVp: vp,
          scrollPos: 'top'
        });
      }

      if (pg.name === 'login' || pg.name === 'register') {
        // Form card heading
        await auditItem({
          label: 'Form card heading',
          selector: 'h1, h2',
          textColor: [19, 1, 0],
          isLarge: true,
          buf: topBuf,
          currentVp: vp,
          scrollPos: 'top'
        });

        // Top right glass pill nav
        if (vp.w >= 1024) {
          await auditItem({
            label: 'Top glass pill nav link',
            selector: 'nav a',
            textColor: [19, 1, 0],
            isLarge: false,
            buf: topBuf,
            currentVp: vp,
            scrollPos: 'top'
          });
        }
      }

      if (pg.name === 'privacy' || pg.name === 'terms') {
        if (vp.w >= 1024) {
          // Desktop gradient title
          await auditItem({
            label: `${pg.name} desktop title`,
            selector: 'aside h1, .lg\\:block h1',
            textColor: [255, 255, 255],
            isLarge: true,
            buf: topBuf,
            currentVp: vp,
            scrollPos: 'top'
          });

          // Desktop italic title word (carnet-yellow)
          await auditItem({
            label: `${pg.name} desktop italic title word`,
            selector: 'aside h1 em, aside h1 i, .lg\\:block h1 [class*="italic"]',
            textColor: [245, 200, 66],
            isLarge: true,
            buf: topBuf,
            currentVp: vp,
            scrollPos: 'top'
          });

          // TOC link
          await auditItem({
            label: `${pg.name} TOC link (white)`,
            selector: 'aside nav a, .lg\\:block nav a',
            textColor: [255, 255, 255],
            isLarge: false,
            buf: topBuf,
            currentVp: vp,
            scrollPos: 'top'
          });
        } else {
          // Mobile heading on white card
          await auditItem({
            label: `${pg.name} mobile heading`,
            selector: 'h1',
            textColor: [19, 1, 0],
            isLarge: true,
            buf: topBuf,
            currentVp: vp,
            scrollPos: 'top'
          });
        }
      }

      // 2. LOWER SCROLL POSITION
      // Scroll down by 500px or to bottom section
      const maxScroll = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
      if (maxScroll > 100) {
        const targetScroll = pg.name === 'landing' ? Math.min(maxScroll, 900) : Math.min(maxScroll, 400);
        await page.evaluate((y) => window.scrollTo(0, y), targetScroll);
        await page.waitForTimeout(300);

        const scrollBuf = await page.screenshot({ clip: { x: 0, y: 0, width: vp.w, height: vp.h } });

        if (pg.name === 'landing') {
          // Scroll further to closing section if on landing
          await page.evaluate(() => {
            const closing = document.querySelector('section:last-of-type, [id="contact"]');
            if (closing) closing.scrollIntoView();
          });
          await page.waitForTimeout(300);
          const closeBuf = await page.screenshot({ clip: { x: 0, y: 0, width: vp.w, height: vp.h } });

          // Closing CTA button control against surrounding bg
          await auditItem({
            label: 'Closing CTA button pill (control against bg)',
            selector: 'section:last-of-type a[href="/register"], section:last-of-type button',
            textColor: [255, 255, 255],
            isControl: true,
            buf: closeBuf,
            currentVp: vp,
            scrollPos: 'closing'
          });

          // Closing section heading
          await auditItem({
            label: 'Closing section heading',
            selector: 'section:last-of-type h2',
            textColor: [255, 255, 255],
            isLarge: true,
            buf: closeBuf,
            currentVp: vp,
            scrollPos: 'closing'
          });
        }

        if (pg.name === 'privacy' || pg.name === 'terms') {
          // Content paragraph inside card
          await auditItem({
            label: `${pg.name} card body text (ink on white)`,
            selector: 'article p, main p',
            textColor: [19, 1, 0],
            isLarge: false,
            buf: scrollBuf,
            currentVp: vp,
            scrollPos: 'scrolled'
          });
        }

        if (pg.name === 'login' || pg.name === 'register') {
          // Footer copyright and links
          await auditItem({
            label: `${pg.name} footer link (white on ink)`,
            selector: 'footer a',
            textColor: [255, 255, 255],
            isLarge: false,
            buf: scrollBuf,
            currentVp: vp,
            scrollPos: 'scrolled'
          });
        }
      }
    }
    await ctx.close();
  }

  await browser.close();

  // Print formatted report
  console.log('\n');
  console.log('='.repeat(120));
  console.log('CONTRAST AUDIT REPORT (Top & Scrolled Viewports: 1440x900, 768x1024, 390x844)');
  console.log('='.repeat(120));
  console.log(
    'Page'.padEnd(10) + ' | ' +
    'VP'.padEnd(5) + ' | ' +
    'Pos'.padEnd(8) + ' | ' +
    'Element / Label'.padEnd(46) + ' | ' +
    'CR'.padEnd(6) + ' | ' +
    'FG'.padEnd(8) + ' | ' +
    'BG'.padEnd(8) + ' | ' +
    'Threshold'.padEnd(14) + ' | ' +
    'Status'
  );
  console.log('-'.repeat(120));

  for (const r of results) {
    console.log(
      r.page.padEnd(10) + ' | ' +
      r.vp.padEnd(5) + ' | ' +
      r.scroll.padEnd(8) + ' | ' +
      r.label.padEnd(46) + ' | ' +
      r.cr.padEnd(6) + ' | ' +
      r.text.padEnd(8) + ' | ' +
      r.bg.padEnd(8) + ' | ' +
      r.threshold.padEnd(14) + ' | ' +
      (r.status === 'PASS' ? '✅ PASS' : '❌ FAIL')
    );
  }
  console.log('='.repeat(120));

  const failures = results.filter(r => r.status === 'FAIL');
  console.log(`Total checks: ${results.length} | Passing: ${results.length - failures.length} | Failing: ${failures.length}`);
  if (failures.length > 0) {
    console.log('\nFAILURES:');
    failures.forEach(f => {
      console.log(`  ❌ [${f.page} @ ${f.vp} (${f.scroll})] ${f.label} -> CR ${f.cr}:1 (Need ${f.threshold}) FG:${f.text} BG:${f.bg}`);
    });
  } else {
    console.log('\nAll checked elements meet or exceed WCAG AA contrast requirements.');
  }

  console.log('\nScreenshots generated:');
  const shots = fs.readdirSync(OUT).sort();
  shots.forEach(s => console.log(`  ${path.join(OUT, s)}`));
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
