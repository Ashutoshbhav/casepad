// Real-browser diagnostic: launches Chromium against the live site and
// verifies the click-passthrough fix actually works. No MCP shim, no
// hand-waving — fires real DOM events and reports what happens.
//
// Run: node scripts/diagnose-clicks.mjs

import { chromium } from 'playwright';

const URL = process.env.URL || 'https://casepad.vercel.app/auth/signin';
const out = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const consoleErrors = [];
const consoleWarnings = [];
page.on('console', (msg) => {
  const t = msg.type();
  if (t === 'error') consoleErrors.push(msg.text());
  if (t === 'warning') consoleWarnings.push(msg.text());
});
page.on('pageerror', (err) => {
  consoleErrors.push(`[pageerror] ${err.message}`);
});

out('--- DIAGNOSTIC: live click-passthrough verification ---');
out('Target:', URL);

await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500); // let WebGL canvas mount

// --- 1. Hydration check
const reactReady = await page.evaluate(() => {
  return Boolean(document.querySelector('[data-app="casepad"]'));
});
out('\n1. SSR rendered (has data-app="casepad"):', reactReady);

// --- 2. Pointer-events on canvas
const canvasInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { found: false };
  const cs = getComputedStyle(canvas);
  const wrapper = canvas.closest('[aria-hidden="true"]');
  const wrapperCs = wrapper ? getComputedStyle(wrapper) : null;
  return {
    found: true,
    canvasPointerEvents: cs.pointerEvents,
    canvasPosition: cs.position,
    canvasZIndex: cs.zIndex,
    canvasInlinePointerEvents: canvas.style.pointerEvents,
    wrapperPointerEvents: wrapperCs?.pointerEvents ?? 'no-wrapper',
    wrapperZIndex: wrapperCs?.zIndex ?? 'no-wrapper',
  };
});
out('\n2. Canvas state:');
out('   inner canvas pointer-events:', canvasInfo.canvasPointerEvents);
out('   inner canvas inline style:', canvasInfo.canvasInlinePointerEvents);
out('   wrapper pointer-events:    ', canvasInfo.wrapperPointerEvents);
const canvasFix = canvasInfo.canvasPointerEvents === 'none';
out('   FIX VERIFIED:', canvasFix ? '✅ canvas does NOT eat clicks' : '❌ canvas STILL eats clicks');

// --- 3. Try clicking elements that should be clickable
const clickProbe = await page.evaluate(() => {
  // Find the email input on signin
  const input = document.querySelector('input[type=email], input[name=email]');
  const submitBtn = document.querySelector('button[type=submit]');
  return {
    emailInputFound: !!input,
    submitBtnFound: !!submitBtn,
    submitBtnText: submitBtn?.textContent?.trim(),
  };
});
out('\n3. Form probe:');
out('   email input present:', clickProbe.emailInputFound);
out('   submit button present:', clickProbe.submitBtnFound, '(text:', JSON.stringify(clickProbe.submitBtnText) + ')');

// --- 4. ACTUALLY click + type
let clickWorked = false;
try {
  if (clickProbe.emailInputFound) {
    await page.click('input[type=email]', { timeout: 3000 });
    await page.fill('input[type=email]', 'test@test.com');
    const filled = await page.inputValue('input[type=email]');
    clickWorked = filled === 'test@test.com';
    out('\n4. Click + type test:', clickWorked ? '✅ input received focus + value' : '❌ value never set');
  }
} catch (e) {
  out('\n4. Click + type test: ❌ FAILED —', e.message);
}

// --- 5. Try the click coords trick — fire a click at the center of the viewport
//        and see if elementFromPoint returns the canvas (bug) or something else (fixed)
const eFromPoint = await page.evaluate(() => {
  const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  return {
    tagName: el?.tagName,
    className: el?.className?.toString?.()?.slice?.(0, 120),
    hasCanvas: el?.tagName === 'CANVAS' || !!el?.closest('canvas'),
  };
});
out('\n5. Center-of-viewport elementFromPoint:');
out('   tag:', eFromPoint.tagName);
out('   class:', eFromPoint.className);
out('   ↳ is this the canvas (bug)?', eFromPoint.hasCanvas ? '❌ YES — clicks die here' : '✅ NO — clicks pass through');

// --- 6. Console errors collected during the run
out('\n6. Console errors (count):', consoleErrors.length);
consoleErrors.slice(0, 5).forEach((e, i) => out(`   [${i}]`, e.slice(0, 200)));
out('   Console warnings (count):', consoleWarnings.length);
consoleWarnings.slice(0, 3).forEach((w, i) => out(`   [w${i}]`, w.slice(0, 150)));

// --- 7. Take a screenshot for visual sanity
await page.screenshot({ path: 'diagnose-clicks.png', fullPage: false });
out('\n7. Screenshot saved → diagnose-clicks.png');

await browser.close();

// --- VERDICT
const allPass = canvasFix && clickWorked && !eFromPoint.hasCanvas && consoleErrors.length === 0;
out('\n============================================================');
out(allPass ? '✅ ALL CHECKS PASS — click-passthrough fix is live and working.' : '❌ SOMETHING IS STILL BROKEN — see above.');
out('============================================================');
process.exit(allPass ? 0 : 1);
