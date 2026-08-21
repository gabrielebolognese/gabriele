/* ============================================================================
   generate-csp.mjs: build the Content-Security-Policy from what shipped.

     npm run build   (postbuild, before the budget check)

   The policy is GENERATED rather than written by hand because it carries a
   sha256 for every inline <script> in the output, and the biggest of those are
   the JSON-LD blocks, which change whenever any content on the page changes. A
   hand-written hash in netlify.toml would be correct for exactly one deploy
   and then silently wrong, which for a CSP means silently broken.

   Written to dist/_headers rather than netlify.toml for the same reason:
   netlify.toml is committed and static, this has to be computed from dist/.
   Netlify merges the two, so the headers in netlify.toml still apply.

   ── Why the JSON-LD blocks are hashed ───────────────────────────────────────
   A <script type="application/ld+json"> is not executed, so by the letter of
   the spec script-src should not gate it, and in practice browsers do not
   block it. Hashing it anyway costs about 60 bytes per page in a header and
   removes the only outcome that would be genuinely bad and completely silent:
   a browser that does enforce it drops every structured-data block on a site
   whose entire purpose is being resolved as one entity. The cheap insurance
   wins.

   ── Why style-src is 'unsafe-inline' ────────────────────────────────────────
   242 inline style="" attributes ship in the HTML, and they are load-bearing:
   --brand per social card, --pill per stack pill, --r per life-grid row,
   --col per contribution month, --mid on the life note. Hashes do not cover
   style ATTRIBUTES, only style elements, so the choice is 'unsafe-inline' or
   rewriting all 242 as classes. Note that mixing a hash into style-src would
   make browsers IGNORE 'unsafe-inline' and break every one of them, which is
   why there are no style hashes here at all. Injected CSS is a far smaller
   problem than injected script, and script-src stays strict.
   ========================================================================= */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

/** Report-only until the deployed site has been checked with the console open.
 *  Flip to false to enforce; that is the whole switch. */
const REPORT_ONLY = true;

const pages = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) pages.push(p);
  }
})(DIST);

/* Every inline <script>, executable or not. The regex deliberately excludes
   anything with a src attribute, which is covered by 'self'. */
const hashes = new Set();
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    hashes.add(`'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  }
}

const policy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  /* Supersedes the X-Frame-Options in netlify.toml, which stays for the
     browsers that predate frame-ancestors. */
  "frame-ancestors 'none'",
  /* buttondown.email is listed before the form exists. SubscribeForm renders
     disabled until NEWSLETTER.buttondownUser is set, and the day it is set the
     form posts cross-origin; without this it would fail on that deploy and the
     cause would be in a header nobody was looking at. */
  "form-action 'self' https://buttondown.email",
  "img-src 'self' data:",
  /* Self-hosted since 20 August 2026. This line being 'self' is the whole
     point of that work. */
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' ${[...hashes].sort().join(' ')}`,
  "connect-src 'self'",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const header = REPORT_ONLY ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

/* Preserve anything already in dist/_headers rather than clobbering it. */
const existing = existsSync(join(DIST, '_headers'))
  ? readFileSync(join(DIST, '_headers'), 'utf8').replace(/\n*\/\*\n  Content-Security-Policy[^\n]*\n/g, '')
  : '';

writeFileSync(join(DIST, '_headers'), `${existing.trim()}\n\n/*\n  ${header}: ${policy}\n`.trimStart());

console.log(`\nCSP (${REPORT_ONLY ? 'report-only' : 'ENFORCING'})`);
console.log(`  ${pages.length} pages scanned, ${hashes.size} inline script hashes`);
console.log(`  header is ${Buffer.byteLength(policy)} bytes`);
if (REPORT_ONLY) {
  console.log('  report-only: violations appear in the browser console and block nothing.');
  console.log('  Flip REPORT_ONLY in scripts/generate-csp.mjs once the deploy is clean.');
}
