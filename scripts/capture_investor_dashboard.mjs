/**
 * capture_investor_dashboard.mjs
 *
 * Starts the Next.js production server on port 3000, captures screenshots of
 * /investor/dashboard at multiple breakpoints and dialog states, then stops the server.
 *
 * Requires a production build already in frontend/.next:
 *   cd frontend
 *   NEXT_PUBLIC_USE_MOCK=true NEXT_PUBLIC_HIDE_MOCK_BANNER=true npm run build
 *
 * Run from the repo root:
 *   node scripts/capture_investor_dashboard.mjs
 *
 * Outputs to frontend/screenshots/ (all deviceScaleFactor 2):
 *   investor_dashboard_1440.png        viewport 1440x900
 *   investor_dashboard_bottom_1440.png viewport 1440x900 scrolled to bottom
 *   investor_dashboard_full_1440.png   viewport height set to document scrollHeight at 1440 wide
 *   investor_request_dialog_1440.png   request Details dialog open, viewport 1440x1400
 *   investor_founder_dialog_1440.png   View founder carnet dialog open, viewport 1440x1400
 *   investor_dashboard_390_top.png     viewport 390x844, top of page
 *   investor_dashboard_768_top.png     viewport 768x1024, top of page
 */

import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(REPO_ROOT, 'frontend');
const OUT_DIR = path.join(FRONTEND_DIR, 'screenshots');
const BASE = 'http://localhost:3000';
const EMAIL = 'investor@carnet.pk';
const PASSWORD = 'Investor123';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

/** Check that frontend/.next exists as stale-build guard */
const NEXT_DIR = path.join(FRONTEND_DIR, '.next');
if (!fs.existsSync(NEXT_DIR)) {
  console.error('ERROR: frontend/.next directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

/** Wait until port 3000 accepts connections, up to timeoutMs */
function waitForPort(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function attempt() {
      const req = http.get(BASE, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server on port 3000 did not become ready within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 500);
        }
      });
      req.setTimeout(1000, () => { req.destroy(); });
    }
    attempt();
  });
}

/** Read pixel dimensions from a PNG file (IHDR chunk at bytes 16-24) */
function pngDims(filePath) {
  const buf = fs.readFileSync(filePath);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { w, h };
}

/** Sign in with the investor account and return a Playwright { context, page, errors } */
async function signInAsInvestor(browser, viewportWidth, viewportHeight) {
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    deviceScaleFactor: 2,
  });
  const errors = [];
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('#login-email', EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/investor/dashboard`, { timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  // Extra wait for fonts and layout to settle
  await page.waitForTimeout(1500);
  return { context, page, errors };
}

/** Measure horizontal scroll vs viewport width */
async function measureScroll(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
}

async function run() {
  console.log('\n=== capture_investor_dashboard.mjs ===');
  console.log(`Repo root : ${REPO_ROOT}`);
  console.log(`Frontend  : ${FRONTEND_DIR}`);
  console.log(`Output    : ${OUT_DIR}\n`);

  // ------------------------------------------------------------------ //
  // Start the production server
  // ------------------------------------------------------------------ //
  console.log('Starting Next.js production server on port 3000...');

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
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let serverOut = '';
  server.stdout.on('data', (d) => { serverOut += d.toString(); });
  server.stderr.on('data', (d) => { serverOut += d.toString(); });
  server.on('error', (err) => { console.error('Server process error:', err); });

  await waitForPort(40000);
  console.log('Server ready.\n');

  // ------------------------------------------------------------------ //
  // Launch Playwright
  // ------------------------------------------------------------------ //
  const browser = await chromium.launch({ headless: true });
  const overflowResults = {};

  try {
    // ---------------------------------------------------------------- //
    // Initial load & Guards check before any shot is captured
    // ---------------------------------------------------------------- //
    console.log('Evaluating pre-capture guards on /investor/dashboard...');
    {
      const { context, page } = await signInAsInvestor(browser, 1440, 900);
      const bodyText = await page.locator('body').innerText();
      const bodyContent = (await page.locator('body').textContent()) || '';
      const normalizedBody = bodyText.replace(/\s+/g, ' ');
      const normalizedContent = bodyContent.replace(/\s+/g, ' ');

      // Required text checks
      if (!/Welcome back, Sana/i.test(normalizedBody) && !normalizedContent.includes('Welcome back, Sana')) {
        await context.close();
        throw new Error('Guard failed: page does not contain "Welcome back, Sana"');
      }
      if (!/Recommended founders/i.test(normalizedBody) && !normalizedContent.includes('Recommended founders')) {
        await context.close();
        throw new Error('Guard failed: page does not contain "Recommended founders"');
      }
      if (!/Investor activity/i.test(normalizedBody) && !normalizedContent.includes('Investor activity')) {
        await context.close();
        throw new Error('Guard failed: page does not contain "Investor activity"');
      }
      if (
        !/Written by a language model simulation/i.test(normalizedBody) &&
        !normalizedContent.includes('Written by a language model simulation')
      ) {
        await context.close();
        throw new Error('Guard failed: page does not contain "Written by a language model simulation"');
      }

      // Forbidden text checks (case-insensitive)
      if (/\bhub\b/i.test(normalizedBody) || /\bhub\b/i.test(normalizedContent)) {
        await context.close();
        throw new Error('Guard failed: page contains the forbidden word "Hub"');
      }
      if (/sovereign/i.test(normalizedBody) || /sovereign/i.test(normalizedContent)) {
        await context.close();
        throw new Error('Guard failed: page contains forbidden word "Sovereign"');
      }
      if (/atelier/i.test(normalizedBody) || /atelier/i.test(normalizedContent)) {
        await context.close();
        throw new Error('Guard failed: page contains forbidden word "Atelier"');
      }
      if (/cohort 2026/i.test(normalizedBody) || /cohort 2026/i.test(normalizedContent)) {
        await context.close();
        throw new Error('Guard failed: page contains forbidden phrase "Cohort 2026"');
      }
      if (/vetted/i.test(normalizedBody) || /vetted/i.test(normalizedContent)) {
        await context.close();
        throw new Error('Guard failed: page contains forbidden word "Vetted"');
      }
      if (/office hours/i.test(normalizedBody) || /office hours/i.test(normalizedContent)) {
        await context.close();
        throw new Error('Guard failed: page contains forbidden phrase "office hours"');
      }
      if (/readiness/i.test(normalizedBody) || /readiness/i.test(normalizedContent)) {
        await context.close();
        throw new Error('Guard failed: page contains forbidden word "Readiness"');
      }

      console.log('  All pre-capture guards PASSED successfully:');
      console.log('    - Present: "Welcome back, Sana"');
      console.log('    - Present: "Recommended founders"');
      console.log('    - Present: "Investor activity"');
      console.log('    - Present: "Written by a language model simulation"');
      console.log('    - Absent : word "Hub", "Sovereign", "Atelier", "Cohort 2026", "Vetted", "office hours", "Readiness"');
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 1. investor_dashboard_1440.png  -- viewport 1440x900
    // ---------------------------------------------------------------- //
    console.log('\n[1/7] investor_dashboard_1440.png  (viewport 1440x900, deviceScaleFactor 2)');
    {
      const { context, page, errors } = await signInAsInvestor(browser, 1440, 900);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['investor_dashboard_1440.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'investor_dashboard_1440.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: investor_dashboard_1440.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 2. investor_dashboard_bottom_1440.png  -- viewport 1440x900 scrolled to bottom
    // ---------------------------------------------------------------- //
    console.log('[2/7] investor_dashboard_bottom_1440.png  (viewport 1440x900 scrolled to bottom)');
    {
      const { context, page, errors } = await signInAsInvestor(browser, 1440, 900);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['investor_dashboard_bottom_1440.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'investor_dashboard_bottom_1440.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: investor_dashboard_bottom_1440.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 3. investor_dashboard_full_1440.png  -- viewport height set to document scrollHeight
    // ---------------------------------------------------------------- //
    console.log('[3/7] investor_dashboard_full_1440.png  (viewport height set to document scrollHeight at 1440 wide)');
    {
      const { context, page, errors } = await signInAsInvestor(browser, 1440, 900);

      const fullHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
      await page.setViewportSize({ width: 1440, height: fullHeight });
      await page.waitForTimeout(500);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['investor_dashboard_full_1440.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'investor_dashboard_full_1440.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: investor_dashboard_full_1440.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 4. investor_request_dialog_1440.png  -- request Details dialog open, viewport 1440x1400
    // ---------------------------------------------------------------- //
    console.log('[4/7] investor_request_dialog_1440.png  (request Details dialog open, viewport 1440x1400)');
    {
      const { context, page, errors } = await signInAsInvestor(browser, 1440, 1400);

      // Click the request Details button
      await page.getByRole('button', { name: /(details|view details)/i }).first().click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(500);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['investor_request_dialog_1440.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'investor_request_dialog_1440.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: investor_request_dialog_1440.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 5. investor_founder_dialog_1440.png  -- View founder carnet dialog open, viewport 1440x1400
    // ---------------------------------------------------------------- //
    console.log('[5/7] investor_founder_dialog_1440.png  (View founder carnet dialog open, viewport 1440x1400)');
    {
      const { context, page, errors } = await signInAsInvestor(browser, 1440, 1400);

      // Click the "View founder carnet" button
      await page.getByRole('button', { name: /view founder carnet/i }).first().click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(500);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['investor_founder_dialog_1440.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'investor_founder_dialog_1440.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: investor_founder_dialog_1440.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 6. investor_dashboard_390_top.png  -- viewport 390x844, top of page
    // ---------------------------------------------------------------- //
    console.log('[6/7] investor_dashboard_390_top.png  (viewport 390x844, top of page)');
    {
      const { context, page, errors } = await signInAsInvestor(browser, 390, 844);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['investor_dashboard_390_top.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'investor_dashboard_390_top.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: investor_dashboard_390_top.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 7. investor_dashboard_768_top.png  -- viewport 768x1024, top of page
    // ---------------------------------------------------------------- //
    console.log('[7/7] investor_dashboard_768_top.png  (viewport 768x1024, top of page)');
    {
      const { context, page, errors } = await signInAsInvestor(browser, 768, 1024);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['investor_dashboard_768_top.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'investor_dashboard_768_top.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: investor_dashboard_768_top.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

  } finally {
    await browser.close();

    // ---------------------------------------------------------------- //
    // Stop the production server
    // ---------------------------------------------------------------- //
    console.log('\nStopping production server (PID ' + server.pid + ')...');
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', server.pid.toString(), '/f', '/t']);
      } else {
        server.kill('SIGTERM');
      }
    } catch {
      server.kill('SIGTERM');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('Server stopped.');
  }

  // ------------------------------------------------------------------ //
  // Summary
  // ------------------------------------------------------------------ //
  console.log('\n=== Saved files ===');
  const targets = [
    'investor_dashboard_1440.png',
    'investor_dashboard_bottom_1440.png',
    'investor_dashboard_full_1440.png',
    'investor_request_dialog_1440.png',
    'investor_founder_dialog_1440.png',
    'investor_dashboard_390_top.png',
    'investor_dashboard_768_top.png',
  ];
  for (const name of targets) {
    const fp = path.join(OUT_DIR, name);
    if (fs.existsSync(fp)) {
      const { w, h } = pngDims(fp);
      const stat = fs.statSync(fp);
      const kb = Math.round(stat.size / 1024);
      const ofInfo = overflowResults[name] ? `overflow=${overflowResults[name].overflow} (scrollWidth=${overflowResults[name].scrollWidth}, innerWidth=${overflowResults[name].innerWidth})` : '';
      console.log(`  ${name}: ${w}x${h} px, ${kb} KB, LastWriteTime: ${stat.mtime.toISOString()} | ${ofInfo}`);
    } else {
      console.error(`  MISSING: ${name}`);
    }
  }

  console.log('\n=== Server output (last 10 lines) ===');
  const lines = serverOut.trim().split('\n');
  lines.slice(-10).forEach((l) => console.log(' ', l));

  console.log('\nDone.\n');
}

run().catch((err) => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
