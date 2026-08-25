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
  /* 7,744 measured. Raised from 7,500 on 2026-08-25 for a REQUESTED feature,
     a second year of contribution squares, which is 371 more cells: the guard
     caught it and this is the deliberate answer, not the number being nudged
     until it stopped complaining. Do not raise it again without a reason worth
     writing down here. Phase 2 of PERFORMANCE-PLAN.md should bring it far
     below this; the life grid is still 4,680 of the total. */
  homepageDomElements: 7800,
  homepageHtmlBrotliKb: 60,    // measured 50.7
  aboutDomElements: 5400,      // measured 5,159
  /* 7.47 MB measured, down from 8.55 because the project carousels went and
     took their 1440px variants with them. Lowered to lock that in. What is
     left is 5 MB of webp plus og:image cards, which are correctly PNG because
     Open Graph consumers do not reliably render webp. */
  totalImagesMb: 8,
  renderBlockingRequests: 2,   // was 3 with a third-party Google Fonts sheet.
                               // Now 2, both same-origin: Style.css and one
                               // scoped component sheet.
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
