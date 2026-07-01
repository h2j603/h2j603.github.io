/**
 * Build-time web-work screenshots.
 *
 * Web works used to embed a LIVE cross-origin <iframe> of the external site —
 * preview-only (pointer-events:none) but slow: every visit re-loaded the whole
 * third-party page. Since it's just a picture, we capture it once at build time
 * with headless Chromium and serve a local, optimised image through Astro's
 * pipeline (WebP + responsive srcset + skeleton). No runtime remote call.
 *
 * Files land in `src/assets/works/<slug>/screenshot.jpg` and are skip-cached by
 * existence (like downloadFile), so unchanged works aren't re-captured. Capture
 * runs on the deploy runner (open internet); the dev sandbox's egress policy may
 * block external hosts, in which case the page falls back to the live iframe.
 *
 * Env knobs (both optional — unset on the CI runner, where defaults work):
 *   PLAYWRIGHT_CHROMIUM_PATH  explicit chromium binary (version-mismatch envs)
 *   HTTPS_PROXY               routed through as the browser proxy if present
 */
import { chromium, type Browser } from 'playwright';
import { mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { ASSETS_WORKS_DIR } from './config.js';

// 1280×832 = 100:65 — .iframe-wrap의 padding-top:65%와 같은 비율(왜곡 없음).
const VIEWPORT = { width: 1280, height: 832 };

let browserPromise: Promise<Browser> | null = null;
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const proxy = process.env.HTTPS_PROXY;
    browserPromise = chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
      proxy: proxy ? { server: proxy } : undefined,
      args: ['--no-sandbox'],
    });
  }
  return browserPromise;
}

/** 캡처가 끝난 뒤 브라우저를 닫는다 (build-data가 buildWorks 후 호출). */
export async function closeScreenshotBrowser(): Promise<void> {
  if (!browserPromise) return;
  const b = await browserPromise.catch(() => null);
  browserPromise = null;
  if (b) await b.close().catch(() => {});
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * `url`의 데스크탑 뷰포트(윗부분)를 캡처해 `src/assets/works/<slug>/screenshot.jpg`로
 * 저장한다. 이미 있으면 재촬영하지 않는다(skip-cache). 로컬 경로
 * (`works/<slug>/screenshot.jpg`)를 돌려주고, 실패하면 null(페이지가 iframe으로 폴백).
 */
export async function captureScreenshot(slug: string, url: string): Promise<string | null> {
  const dir = join(ASSETS_WORKS_DIR, slug);
  const filePath = join(dir, 'screenshot.jpg');
  const localPath = `works/${slug}/screenshot.jpg`;
  if (await exists(filePath)) return localPath; // 캐시 hit — 재촬영 안 함
  await mkdir(dir, { recursive: true });
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: 2, // 레티나 선명도 — Astro가 반응형으로 다시 줄인다
      ignoreHTTPSErrors: true,
    });
    await page.goto(url, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(800); // 폰트·above-the-fold 요소 안착 잠깐 대기
    await page.screenshot({ path: filePath, type: 'jpeg', quality: 82 });
    return localPath;
  } catch (err: any) {
    console.warn(`  ⚠ screenshot ${url} → ${localPath} failed: ${err.message}`);
    return null;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
