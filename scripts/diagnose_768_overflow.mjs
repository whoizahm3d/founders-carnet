import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');

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
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Login
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'founder@carnet.pk');
    await page.fill('#login-password', 'Founder123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/founder/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const result = await page.evaluate(() => {
      const winInnerWidth = window.innerWidth;
      const docScrollWidth = document.documentElement.scrollWidth;
      const allElements = document.querySelectorAll('*');
      const overflowing = [];

      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.right > winInnerWidth + 1) {
          overflowing.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            className: typeof el.className === 'string' ? el.className.slice(0, 100) : '',
            rectRight: Math.round(rect.right),
            rectLeft: Math.round(rect.left),
            rectWidth: Math.round(rect.width),
            text: el.textContent?.trim().slice(0, 40).replace(/\s+/g, ' ') || '',
          });
        }
      }

      return {
        winInnerWidth,
        docScrollWidth,
        overflowCount: overflowing.length,
        overflowing,
      };
    });

    console.log(JSON.stringify(result, null, 2));
    await browser.close();
  } finally {
    server.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
