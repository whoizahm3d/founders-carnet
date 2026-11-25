/**
 * capture_landing_preview.mjs
 *
 * Starts Next.js production server on port 3000, runs extensive guards on the
 * Product preview section (#preview), captures screenshots into frontend/screenshots/,
 * and cleanly shuts down the server.
 *
 * Run from repo root:
 *   node scripts/capture_landing_preview.mjs
 */

import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import { spawn, execSync } from 'child_process';
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

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const NEXT_DIR = path.join(FRONTEND_DIR, '.next');
if (!fs.existsSync(NEXT_DIR)) {
  console.error('ERROR: frontend/.next directory does not exist. Run npm run build first.');
  process.exit(1);
}

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

function pngDims(filePath) {
  const buf = fs.readFileSync(filePath);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { w, h };
}

function killProcessOnPort3000() {
  try {
    const stdout = execSync('netstat -ano | findstr ":3000" | findstr "LISTENING"', { encoding: 'utf8' });
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid) && parseInt(pid, 10) > 0) {
        try {
          execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
        } catch {}
      }
    }
  } catch {}
}

async function run() {
  console.log('\n=== capture_landing_preview.mjs ===');
  console.log(`Repo root : ${REPO_ROOT}`);
  console.log(`Frontend  : ${FRONTEND_DIR}`);
  console.log(`Output    : ${OUT_DIR}\n`);

  killProcessOnPort3000();

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

  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});

  await waitForPort(30000);
  console.log('Server ready.\n');

  const browser = await chromium.launch({ headless: true });
  const guardResults = [];
  const savedFiles = [];
  let anyGuardFailed = false;

  function recordGuard(name, passed, detail) {
    guardResults.push({ name, passed, detail });
    const mark = passed ? 'PASS' : 'FAIL';
    console.log(`  [${mark}] ${name}${detail ? ` - ${detail}` : ''}`);
    if (!passed) {
      anyGuardFailed = true;
    }
  }

  try {
    console.log('Evaluating guards on landing page Product preview section (#preview)...');
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const previewSection = page.locator('#preview');
    await previewSection.waitFor({ state: 'visible', timeout: 10000 });

    // Guard 1: Heading "A look inside the workspace."
    const heading = previewSection.locator('#product-preview-heading');
    const headingText = (await heading.innerText()).replace(/\s+/g, ' ').trim();
    recordGuard(
      'Heading check',
      headingText.includes('A look inside the workspace.'),
      `Heading text: "${headingText}"`
    );

    // Guard 2: 5 tabs with role=tab, exactly one aria-selected=true
    const tabs = previewSection.locator('button[role="tab"]');
    const tabCount = await tabs.count();
    recordGuard('Tab count', tabCount === 5, `Found ${tabCount} tabs (expected 5)`);

    const selectedCount = await previewSection.locator('button[role="tab"][aria-selected="true"]').count();
    recordGuard('Initial single aria-selected=true', selectedCount === 1, `Found ${selectedCount} active tab(s)`);

    // Guard 3: Keyboard navigation: ArrowRight, Home, End
    const firstTab = tabs.nth(0);
    await firstTab.focus();
    let focusedId = await page.evaluate(() => document.activeElement?.id);
    recordGuard('Initial focus on Founders tab', focusedId === 'preview-tab-founder', `Focused: ${focusedId}`);

    // Press ArrowRight -> should move selection to Talent (index 1)
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    focusedId = await page.evaluate(() => document.activeElement?.id);
    let selectedId = await previewSection.locator('button[role="tab"][aria-selected="true"]').getAttribute('id');
    const arrowRightPass = focusedId === 'preview-tab-talent' && selectedId === 'preview-tab-talent';
    recordGuard(
      'ArrowRight moves to Talent tab',
      arrowRightPass,
      `Focused: ${focusedId}, Selected: ${selectedId}`
    );

    // Press End -> should move to Admin (index 4)
    await page.keyboard.press('End');
    await page.waitForTimeout(150);
    focusedId = await page.evaluate(() => document.activeElement?.id);
    selectedId = await previewSection.locator('button[role="tab"][aria-selected="true"]').getAttribute('id');
    const endPass = focusedId === 'preview-tab-admin' && selectedId === 'preview-tab-admin';
    recordGuard(
      'End key moves to Admin tab',
      endPass,
      `Focused: ${focusedId}, Selected: ${selectedId}`
    );

    // Press Home -> should move to Founders (index 0)
    await page.keyboard.press('Home');
    await page.waitForTimeout(150);
    focusedId = await page.evaluate(() => document.activeElement?.id);
    selectedId = await previewSection.locator('button[role="tab"][aria-selected="true"]').getAttribute('id');
    const homePass = focusedId === 'preview-tab-founder' && selectedId === 'preview-tab-founder';
    recordGuard(
      'Home key moves to Founders tab',
      homePass,
      `Focused: ${focusedId}, Selected: ${selectedId}`
    );

    // Guard 4: Caption "Screens show sample data." present
    const sectionText = await previewSection.innerText();
    const sectionContent = (await previewSection.textContent()) || '';
    const hasSampleData =
      /screens show sample data\./i.test(sectionText) ||
      sectionContent.includes('Screens show sample data.');
    recordGuard('Sample data notice present', hasSampleData, '"Screens show sample data." found');

    // Guard 5: Banned words and em/en dashes
    const bannedWords = [
      'Hub',
      'Sovereign',
      'Atelier',
      'Cohort 2026',
      'Vetted',
      'office hours',
      'syndicate',
      'telemetry',
      'dossier',
    ];
    let foundBanned = [];
    for (const word of bannedWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(sectionText) || regex.test(sectionContent)) {
        foundBanned.push(word);
      }
    }
    const hasEmDash = sectionText.includes('—') || sectionContent.includes('—');
    const hasEnDash = sectionText.includes('–') || sectionContent.includes('–');
    if (hasEmDash) foundBanned.push('em dash (—)');
    if (hasEnDash) foundBanned.push('en dash (–)');

    recordGuard(
      'Banned words & dashes check',
      foundBanned.length === 0,
      foundBanned.length === 0 ? 'None present' : `Found: ${foundBanned.join(', ')}`
    );

    // Guard 6: Image loading & non-empty alt for each tab
    const roleKeys = ['founder', 'talent', 'mentor', 'investor', 'admin'];
    for (let i = 0; i < roleKeys.length; i++) {
      const roleTab = previewSection.locator(`#preview-tab-${roleKeys[i]}`);
      await roleTab.click();
      await page.waitForTimeout(300);

      const imgLocator = previewSection.locator('img');
      const imgInfo = await imgLocator.evaluate((img) => ({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        alt: img.alt,
        complete: img.complete,
      }));

      recordGuard(
        `Image loaded for ${roleKeys[i]} tab`,
        imgInfo.naturalWidth > 0 && imgInfo.alt && imgInfo.alt.trim().length > 0,
        `naturalWidth=${imgInfo.naturalWidth}, alt="${imgInfo.alt}"`
      );
    }

    // Reset back to Founders tab for default 1440 shots
    await previewSection.locator('#preview-tab-founder').click();
    await page.waitForTimeout(300);

    // Guard 7: Horizontal overflow checks at 1440, 768, 390
    const viewports = [
      { width: 1440, height: 900, name: '1440' },
      { width: 768, height: 1024, name: '768' },
      { width: 390, height: 844, name: '390' },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);
      const scroll = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        innerWidth: window.innerWidth,
      }));
      const overflow = scroll.scrollWidth > scroll.innerWidth;
      recordGuard(
        `No horizontal overflow at ${vp.name}`,
        !overflow,
        `scrollWidth=${scroll.scrollWidth}, innerWidth=${scroll.innerWidth}`
      );
    }

    // Guard 8: Tab buttons at least 44px tall at 390
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const tabHeights = [];
    let allHeightsValid = true;
    for (let i = 0; i < 5; i++) {
      const box = await tabs.nth(i).boundingBox();
      tabHeights.push(box.height);
      if (box.height < 44) {
        allHeightsValid = false;
      }
    }
    recordGuard(
      'Tab buttons >= 44px tall at 390',
      allHeightsValid,
      `Heights: [${tabHeights.map((h) => Math.round(h) + 'px').join(', ')}]`
    );

    // ------------------------------------------------------------------ //
    // Captures
    // ------------------------------------------------------------------ //
    console.log('\nCapturing screenshots into frontend/screenshots/...\n');

    async function captureElement(locator, filename) {
      const filePath = path.join(OUT_DIR, filename);
      await locator.screenshot({ path: filePath });
      const dims = pngDims(filePath);
      const stat = fs.statSync(filePath);
      const kb = Math.round(stat.size / 1024);
      savedFiles.push({ name: filename, ...dims, kb, time: stat.mtime.toISOString() });
      console.log(`  Saved: ${filename.padEnd(36)} (${dims.w}x${dims.h} px, ${kb} KB)`);
    }

    async function captureFullPage(pageInstance, filename) {
      const filePath = path.join(OUT_DIR, filename);
      await pageInstance.screenshot({ path: filePath, fullPage: true });
      const dims = pngDims(filePath);
      const stat = fs.statSync(filePath);
      const kb = Math.round(stat.size / 1024);
      savedFiles.push({ name: filename, ...dims, kb, time: stat.mtime.toISOString() });
      console.log(`  Saved: ${filename.padEnd(36)} (${dims.w}x${dims.h} px, ${kb} KB)`);
    }

    // 1. 1440: landing_preview_founders_1440.png and each other tab
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);

    const tabsToCapture1440 = [
      { id: 'founder', file: 'landing_preview_founders_1440.png' },
      { id: 'talent', file: 'landing_preview_talent_1440.png' },
      { id: 'mentor', file: 'landing_preview_mentors_1440.png' },
      { id: 'investor', file: 'landing_preview_investors_1440.png' },
      { id: 'admin', file: 'landing_preview_admin_1440.png' },
    ];

    for (const item of tabsToCapture1440) {
      await previewSection.locator(`#preview-tab-${item.id}`).click();
      await page.waitForTimeout(300);
      await captureElement(previewSection, item.file);
    }

    // 2. 768: Founders tab active and Admin tab active
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);

    await previewSection.locator('#preview-tab-founder').click();
    await page.waitForTimeout(300);
    await captureElement(previewSection, 'landing_preview_founders_768.png');

    await previewSection.locator('#preview-tab-admin').click();
    await page.waitForTimeout(300);
    await captureElement(previewSection, 'landing_preview_admin_768.png');

    // 390: Founders tab active and Admin tab active
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    await previewSection.locator('#preview-tab-founder').click();
    await page.waitForTimeout(300);
    await captureElement(previewSection, 'landing_preview_founders_390.png');

    await previewSection.locator('#preview-tab-admin').click();
    await page.waitForTimeout(300);
    await captureElement(previewSection, 'landing_preview_admin_390.png');

    // 3. Full page shot at 1440: landing_preview_full_1440.png
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await previewSection.locator('#preview-tab-founder').click();
    await page.waitForTimeout(300);
    await captureFullPage(page, 'landing_preview_full_1440.png');

    // 4. Focus shot at 1440: landing_preview_focus_1440.png
    // Navigate via Tab key from the top of the page until the active role tab is focused
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Scroll to preview section first so it is in view
    await page.locator('#preview').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Click on document body above preview section, then Tab into the preview tabs
    await page.evaluate(() => {
      window.scrollTo(0, document.getElementById('roles')?.offsetTop || 1500);
    });
    await page.waitForTimeout(300);

    let maxTabs = 30;
    let tabTargetReached = false;
    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');
      const currentActiveId = await page.evaluate(() => document.activeElement?.id);
      if (currentActiveId === 'preview-tab-founder') {
        tabTargetReached = true;
        break;
      }
    }

    if (!tabTargetReached) {
      await page.locator('#preview-tab-founder').focus();
    }

    await page.waitForTimeout(300);
    await captureElement(page.locator('#preview'), 'landing_preview_focus_1440.png');

    await page.close();
  } finally {
    await browser.close();
    console.log('\nStopping Next.js production server...');
    server.kill('SIGTERM');
    killProcessOnPort3000();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Server stopped.');
  }

  console.log('\n======================================================');
  console.log('SUMMARY: capture_landing_preview.mjs');
  console.log('======================================================');
  console.log('\nGuards:');
  for (const g of guardResults) {
    console.log(`  [${g.passed ? 'PASS' : 'FAIL'}] ${g.name} (${g.detail})`);
  }

  console.log('\nSaved Screenshots:');
  for (const f of savedFiles) {
    console.log(`  ${f.name.padEnd(36)}: ${f.w}x${f.h} px, ${f.kb} KB, LastWriteTime: ${f.time}`);
  }

  if (anyGuardFailed) {
    console.error('\nFAIL: One or more guards failed.');
    process.exit(1);
  } else {
    console.log('\nAll guards PASSED and all captures completed successfully.');
  }
}

run().catch((err) => {
  console.error('\nERROR during landing preview capture:', err);
  killProcessOnPort3000();
  process.exit(1);
});
