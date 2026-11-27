/**
 * capture_admin_dashboard.mjs
 *
 * Starts the Next.js production server on port 3000, captures screenshots of
 * /admin/dashboard at multiple breakpoints and dialog states, then stops the server.
 *
 * Requires a production build already in frontend/.next:
 *   cd frontend
 *   npm run build
 *
 * Run from the repo root:
 *   node scripts/capture_admin_dashboard.mjs
 *
 * Outputs to frontend/screenshots/ (all deviceScaleFactor 2):
 *   admin_dashboard_1440.png        viewport 1440x900
 *   admin_dashboard_bottom_1440.png viewport 1440x900 scrolled to bottom
 *   admin_dashboard_full_1440.png   viewport height set to document scrollHeight at 1440 wide
 *   admin_inspect_dialog_1440.png   Inspect details dialog open, viewport 1440x1200
 *   admin_confirm_dialog_1440.png   Confirm decision dialog open, viewport 1440x1200
 *   admin_appeals_1440.png          Appeals review view full height, viewport 1440x900
 *   admin_dashboard_390_top.png     viewport 390x844, top of page
 *   admin_dashboard_768_top.png     viewport 768x1024, top of page
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
const EMAIL = 'admin@carnet.pk';
const PASSWORD = 'Admin123';

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

/** Sign in with the admin account and return a Playwright { context, page, errors } */
async function signInAsAdmin(browser, viewportWidth, viewportHeight) {
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    deviceScaleFactor: 2,
  });
  const errors = [];
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: ['stub', 'test-token-admin'].join('-'), token_type: 'bearer' }),
    });
  });
  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 5, email: 'admin@carnet.pk', full_name: 'Maryam Siddiqui', role: 'admin' }),
    });
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('#login-email', EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/admin/dashboard`, { timeout: 15000 });
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
  console.log('\n=== capture_admin_dashboard.mjs ===');
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
    console.log('Evaluating pre-capture guards on /admin/dashboard...');
    {
      const { context, page } = await signInAsAdmin(browser, 1440, 900);
      const bodyText = await page.locator('body').innerText();
      const bodyContent = (await page.locator('body').textContent()) || '';
      const normalizedBody = bodyText.replace(/\s+/g, ' ');
      const normalizedContent = bodyContent.replace(/\s+/g, ' ');

      // Required text checks
      if (!/Welcome back, Maryam/i.test(normalizedBody) && !normalizedContent.includes('Welcome back, Maryam')) {
        await context.close();
        throw new Error('Guard failed: page does not contain "Welcome back, Maryam"');
      }
      if (!/Active human escalations/i.test(normalizedBody) && !normalizedContent.includes('Active human escalations')) {
        await context.close();
        throw new Error('Guard failed: page does not contain "Active human escalations"');
      }
      if (!/Admin activity/i.test(normalizedBody) && !normalizedContent.includes('Admin activity')) {
        await context.close();
        throw new Error('Guard failed: page does not contain "Admin activity"');
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
      if (/syndicate/i.test(normalizedBody) || /syndicate/i.test(normalizedContent)) {
        await context.close();
        throw new Error('Guard failed: page contains forbidden word "syndicate"');
      }

      console.log('  All pre-capture guards PASSED successfully:');
      console.log('    - Present: "Welcome back, Maryam"');
      console.log('    - Present: "Active human escalations"');
      console.log('    - Present: "Admin activity"');
      console.log('    - Present: "Written by a language model simulation"');
      console.log('    - Absent : "Hub", "Sovereign", "Atelier", "Cohort 2026", "Vetted", "office hours", "syndicate"');
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 1. admin_dashboard_1440.png  -- viewport 1440x900
    // ---------------------------------------------------------------- //
    console.log('\n[1/7] admin_dashboard_1440.png  (viewport 1440x900, deviceScaleFactor 2)');
    {
      const { context, page, errors } = await signInAsAdmin(browser, 1440, 900);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['admin_dashboard_1440.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'admin_dashboard_1440.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: admin_dashboard_1440.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 2. admin_dashboard_bottom_1440.png  -- viewport 1440x900 scrolled to bottom
    // ---------------------------------------------------------------- //
    console.log('[2/7] admin_dashboard_bottom_1440.png  (viewport 1440x900 scrolled to bottom)');
    {
      const { context, page, errors } = await signInAsAdmin(browser, 1440, 900);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['admin_dashboard_bottom_1440.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'admin_dashboard_bottom_1440.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: admin_dashboard_bottom_1440.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 3. admin_dashboard_full_1440.png  -- full document scrollHeight
    // ---------------------------------------------------------------- //
    console.log('[3/7] admin_dashboard_full_1440.png  (full height at 1440 wide)');
    {
      const { context, page, errors } = await signInAsAdmin(browser, 1440, 900);
      const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: 1440, height: docHeight });
      await page.waitForTimeout(500);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['admin_dashboard_full_1440.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  docHeight=${docHeight}  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'admin_dashboard_full_1440.png');
      await page.screenshot({ path: fp, fullPage: true });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: admin_dashboard_full_1440.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 4. admin_inspect_dialog_1440.png  -- Inspect details dialog open
    // ---------------------------------------------------------------- //
    console.log('[4/7] admin_inspect_dialog_1440.png  (Inspect details dialog open, 1440x1200)');
    {
      const { context, page, errors } = await signInAsAdmin(browser, 1440, 1200);

      const inspectBtn = page.locator('button:has-text("Inspect details")').first();
      await inspectBtn.waitFor({ state: 'visible', timeout: 8000 });
      await inspectBtn.click();
      await page.waitForTimeout(600);

      const dialogVisible = await page.locator('[role="dialog"]').isVisible();
      console.log(`  Dialog opened: ${dialogVisible}`);

      const fp = path.join(OUT_DIR, 'admin_inspect_dialog_1440.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: admin_inspect_dialog_1440.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 5. admin_confirm_dialog_1440.png  -- Confirm decision dialog open
    // ---------------------------------------------------------------- //
    console.log('[5/8] admin_confirm_dialog_1440.png  (Confirm decision dialog open, 1440x1200)');
    {
      const { context, page, errors } = await signInAsAdmin(browser, 1440, 1200);

      const reasonInput = page.locator('textarea').first();
      await reasonInput.waitFor({ state: 'visible', timeout: 8000 });
      await reasonInput.fill('Manual verification check completed');

      const rejectBtn = page.locator('button:has-text("Reject")').first();
      await rejectBtn.waitFor({ state: 'visible', timeout: 8000 });
      await rejectBtn.click();
      await page.waitForTimeout(600);

      const dialogVisible = await page.locator('[role="dialog"]').isVisible();
      console.log(`  Dialog opened: ${dialogVisible}`);

      const fp = path.join(OUT_DIR, 'admin_confirm_dialog_1440.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: admin_confirm_dialog_1440.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 6. admin_appeals_1440.png  -- Appeals review tab clicked, viewport 1440x900 full height
    // ---------------------------------------------------------------- //
    console.log('[6/8] admin_appeals_1440.png  (Appeals review view, viewport 1440x900, full height)');
    {
      const { context, page, errors } = await signInAsAdmin(browser, 1440, 900);
      const appealsTab = page.locator('button:has-text("Appeals review")').first();
      await appealsTab.waitFor({ state: 'visible', timeout: 8000 });
      await appealsTab.click();
      await page.waitForTimeout(600);

      const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: 1440, height: docHeight });
      await page.waitForTimeout(500);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['admin_appeals_1440.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  docHeight=${docHeight}  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'admin_appeals_1440.png');
      await page.screenshot({ path: fp, fullPage: true });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: admin_appeals_1440.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 7. admin_dashboard_390_top.png  -- viewport 390x844
    // ---------------------------------------------------------------- //
    console.log('[7/8] admin_dashboard_390_top.png  (viewport 390x844, deviceScaleFactor 2)');
    {
      const { context, page, errors } = await signInAsAdmin(browser, 390, 844);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['admin_dashboard_390_top.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'admin_dashboard_390_top.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: admin_dashboard_390_top.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // ---------------------------------------------------------------- //
    // 8. admin_dashboard_768_top.png  -- viewport 768x1024
    // ---------------------------------------------------------------- //
    console.log('[8/8] admin_dashboard_768_top.png  (viewport 768x1024, deviceScaleFactor 2)');
    {
      const { context, page, errors } = await signInAsAdmin(browser, 768, 1024);

      const scroll = await measureScroll(page);
      const isOverflow = scroll.scrollWidth > scroll.innerWidth;
      overflowResults['admin_dashboard_768_top.png'] = { ...scroll, overflow: isOverflow };
      console.log(`  scrollWidth=${scroll.scrollWidth}  innerWidth=${scroll.innerWidth}  overflow=${isOverflow}`);

      const fp = path.join(OUT_DIR, 'admin_dashboard_768_top.png');
      await page.screenshot({ path: fp, fullPage: false });
      const { w, h } = pngDims(fp);
      console.log(`  Saved: admin_dashboard_768_top.png  (${w}x${h} px)`);
      if (errors.length) console.warn(`  Console errors: ${errors.join(' | ')}`);
      await context.close();
    }

  } finally {
    await browser.close();
    console.log('\nStopping Next.js production server...');
    server.kill('SIGINT');
  }

  // ------------------------------------------------------------------ //
  // Summary
  // ------------------------------------------------------------------ //
  console.log('\n======================================================');
  console.log('SUMMARY: capture_admin_dashboard.mjs');
  console.log('======================================================');
  let anyOverflow = false;
  for (const [name, res] of Object.entries(overflowResults)) {
    const status = res.overflow ? 'OVERFLOW FAIL' : 'PASS';
    if (res.overflow) anyOverflow = true;
    console.log(`  ${name.padEnd(36)}: ${status} (scrollWidth=${res.scrollWidth}, innerWidth=${res.innerWidth})`);
  }
  if (anyOverflow) {
    console.error('\nFAIL: One or more viewports had horizontal overflow.');
    process.exit(1);
  } else {
    console.log('\nAll viewports passed horizontal overflow checks (scrollWidth <= innerWidth).');
  }
}

run().catch((err) => {
  console.error('\nERROR during screenshot capture:', err);
  process.exit(1);
});
