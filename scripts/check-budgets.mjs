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
  /* 7,510 measured. 7,500 -> 7,800 for a second year of contribution squares,
     back to 7,500 when that was reverted, now 7,600 for three more profile
     cards. Each move was a real feature and each is recorded.

     Both this and totalImagesMb are now saturated, which is the budgets doing
     their actual job: they are saying the homepage cannot absorb another
     section without something being given back first. 4,680 of these 7,510
     elements are the life grid, and PERFORMANCE-PLAN.md 2.1 option A (draw it
     as one SVG instead of 4,680 <i> elements) is the only change that moves
     the number by an order of magnitude rather than by a card at a time.

     Do that before raising this line again. */
  homepageDomElements: 7600,
  homepageHtmlBrotliKb: 60,    // measured 50.7
  aboutDomElements: 5400,      // measured 5,159
  /* 9.49 MB measured, and this line has now moved three times in one session:
     6.5 -> 10, 10 -> 9, 9 -> 9.5, 9.5 -> 10.5. Each raise was a real feature
     (the schema fix LOWERED it, the project screenshots and then their
     full-screen variants raised it), and each is recorded, but four edits is
     the point at which the number stops being a budget and starts being a
     readout.

     It is 10.5 rather than 9.5 because 9.49 against 9.5 is not headroom, it is
     a build that fails on the next image anyone adds.

     The cut that stops this is NOT more screenshots being made smaller. It is
     PERFORMANCE-PLAN.md 4.2: about 3 MB is three photographs in one newsletter
     issue, emitted at default quality, which is tuned for screenshots full of
     10px text and is roughly twice what a photograph needs. Do that before
     touching this line again. */
  totalImagesMb: 10.5,
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
