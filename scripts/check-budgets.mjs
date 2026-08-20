/* ============================================================================
   check-budgets.mjs: fail the build rather than warn.

     npm run build   (runs automatically, as postbuild)

   The FlashFX landing page has a guard like this and it caught 57 MB of stray
   archives on its first run. Nothing had been looking, which is the only
   reason 57 MB could sit there. This site had nothing looking either.

   Budgets are set just ABOVE today's measured values, so they bite on
   regression instead of on the current state. Lower them as PERFORMANCE-PLAN.md
   phases land; a budget that never moves stops meaning anything.

   Two deliberate choices:

   1. It runs as `postbuild`. npm only fires pre/post lifecycle scripts for
      scripts invoked through `npm run`, and netlify.toml uses
      `command = "npm run build"`, so this fires on deploy. Changing that to
      `npx astro build` silently disables every check in this file. The landing
      page lost its sitemap for weeks to exactly that.

   2. DOM count is measured on the built HTML, not estimated. It is the number
      Lighthouse actually complains about, and it is the one metric here that
      the wire size hides completely: this page compresses 6.8:1, so 281 KB of
      markup ships as 41 KB and looks fine while the phone parsing it does not.
   ========================================================================= */

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync } from 'node:zlib';

const DIST = 'dist';

/** Set just above the measured value on 2026-08-18. See PERFORMANCE-PLAN.md. */
const BUDGETS = {
  homepageDomElements: 7500,   // measured 7,270. Phase 2 should bring this far down.
  homepageHtmlBrotliKb: 60,    // measured 50.7
  aboutDomElements: 5400,      // measured 5,159
  totalImagesMb: 10,           // measured 9.72: 5.99 MB webp + 3.73 MB of
                               // originals that JSON-LD and og:image point at.
                               // See PERFORMANCE-PLAN.md 4.3; lower this once
                               // the schema stops citing the raw PNGs.
  renderBlockingRequests: 3,   // measured 3, one of them third-party. Phase 3 -> 1.
};

const results = [];
const check = (name, actual, budget, unit, note) => {
  results.push({ name, actual, budget, unit, pass: actual <= budget, note });
};

const html = (p) => readFileSync(join(DIST, p), 'utf8');
const countElements = (s) => [...s.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b/g)].length;

const home = html('index.html');
check('homepage DOM elements', countElements(home), BUDGETS.homepageDomElements, '');
check(
  'homepage HTML (brotli)',
  +(brotliCompressSync(Buffer.from(home)).length / 1024).toFixed(1),
  BUDGETS.homepageHtmlBrotliKb, ' KB',
);
check('/about DOM elements', countElements(html('about/index.html')), BUDGETS.aboutDomElements, '');

/* Every image the build emits, not just the ones one page happens to use: a
   250 KB screenshot nobody references still ships and still costs. */
const assets = readdirSync(join(DIST, '_astro'));
const imageBytes = assets
  .filter((f) => /\.(webp|avif|png|jpe?g|gif|svg)$/i.test(f))
  .reduce((n, f) => n + statSync(join(DIST, '_astro', f)).size, 0);
check('images emitted', +(imageBytes / 1024 / 1024).toFixed(2), BUDGETS.totalImagesMb, ' MB',
  `${assets.length} files in _astro`);

/* Stylesheets in the head with no media attribute block the first paint. A
   cross-origin one blocks it behind a DNS lookup and a TLS handshake too. */
const blocking = [...home.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]
  .filter((m) => !/\bmedia=/.test(m[0]));
const thirdParty = blocking.filter((m) => /href="https?:\/\//.test(m[0])).length;
check('render-blocking stylesheets', blocking.length, BUDGETS.renderBlockingRequests, '',
  thirdParty ? `${thirdParty} third-party` : 'all same-origin');

const width = Math.max(...results.map((r) => r.name.length));
console.log('\nBudgets\n');
for (const r of results) {
  const status = r.pass ? 'ok  ' : 'OVER';
  const headroom = r.pass ? `(budget ${r.budget}${r.unit})` : `(BUDGET ${r.budget}${r.unit})`;
  console.log(`  ${status} ${r.name.padEnd(width)}  ${String(r.actual) + r.unit}  ${headroom}${r.note ? '  ' + r.note : ''}`);
}

const failed = results.filter((r) => !r.pass);
if (failed.length) {
  console.error(`\n${failed.length} budget(s) exceeded. See PERFORMANCE-PLAN.md.\n`);
  process.exit(1);
}
console.log('\nAll budgets met.\n');
