/* ============================================================================
   check-csp.mjs: the CSP and the pages have to agree.

     npm run build   (runs as part of postbuild)

   A Content-Security-Policy that hashes an inline script is only correct until
   somebody edits that script by one character. Then the hash no longer matches,
   the browser refuses to run it, and nothing in the build fails: the header is
   still syntactically valid and the page still renders. On this site the
   failure is quiet in the worst way, because a blocked `classList.add('js')`
   means the reveal rules never engage and everything just stays visible. It
   looks fine. It is not fine, and nobody would find it for months.

   So the hash is checked against the real script, in the real output, on every
   build. Same idea as the budgets: the guard exists because the failure is
   invisible, not because it is likely.

   It also refuses to let a policy claim protection it does not have: an
   enforcing CSP with 'unsafe-inline' in script-src is worth almost nothing,
   and is easy to reach for the first time something breaks.
   ========================================================================= */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const DIST = 'dist';
const problems = [];
const notes = [];

const toml = readFileSync('netlify.toml', 'utf8');
const cspLine = toml.match(/Content-Security-Policy(-Report-Only)?\s*=\s*"([^"]+)"/);

if (!cspLine) {
  console.log('\nCSP: no policy set in netlify.toml, nothing to check.\n');
  process.exit(0);
}

const reportOnly = Boolean(cspLine[1]);
const policy = cspLine[2];
/* Split on ';' and compare the first token, rather than building a regex from
   an interpolated name. The regex version of this shipped broken: `\s` inside a
   template literal is an escape that collapses to a plain `s`, so the pattern
   silently became `(?:^|;)s*script-srcs+(...)` and matched nothing. Every
   directive read as empty and the guard reported a correct policy as broken.
   No escaping here, so there is nothing to get wrong. */
const directive = (name) => {
  for (const part of policy.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens[0] === name) return tokens.slice(1);
  }
  return [];
};

/* ── Every executable inline script in the build must be hashed ──────────── */
const pages = [];
const walk = (d) => readdirSync(d).forEach((e) => {
  const p = join(d, e);
  if (statSync(p).isDirectory()) walk(p);
  else if (e.endsWith('.html')) pages.push(p);
});
walk(DIST);

const inlineScripts = new Map();
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const [, attrs, body] = m;
    if (/\ssrc=/.test(attrs)) continue;
    /* type="application/ld+json" and friends are data blocks, never executed,
       and script-src does not apply to them. Only real JS needs a hash. */
    const type = (attrs.match(/type="([^"]+)"/) || [])[1];
    if (type && type !== 'module' && type !== 'text/javascript') continue;
    if (!body.trim()) continue;
    if (!inlineScripts.has(body)) inlineScripts.set(body, new Set());
    inlineScripts.get(body).add(page);
  }
}

const scriptSrc = directive('script-src');
for (const [body, on] of inlineScripts) {
  const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
  if (!scriptSrc.includes(hash)) {
    problems.push(
      `an inline script on ${on.size} page(s) is not in script-src.\n`
      + `      add ${hash} to the policy in netlify.toml\n`
      + `      script: ${body.trim().replace(/\s+/g, ' ').slice(0, 90)}`,
    );
  } else {
    notes.push(`inline script hashed and allowed, on ${on.size} page(s)`);
  }
}

/* Hashes in the policy that no longer match anything are the other half of the
   same drift: harmless, but they mean the policy is describing a page that no
   longer exists. */
const liveHashes = new Set(
  [...inlineScripts.keys()].map((b) => `'sha256-${createHash('sha256').update(b, 'utf8').digest('base64')}'`),
);
for (const token of scriptSrc.filter((t) => t.startsWith("'sha256-"))) {
  if (!liveHashes.has(token)) problems.push(`script-src has a hash matching no script in the build: ${token}`);
}

/* ── A policy must not claim more than it delivers ───────────────────────── */
if (!reportOnly && scriptSrc.includes("'unsafe-inline'")) {
  problems.push("script-src has 'unsafe-inline' while ENFORCING: that policy stops almost nothing.");
}
if (!reportOnly && !directive('object-src').includes("'none'")) {
  problems.push("an enforcing policy should set object-src 'none'.");
}

/* ── Resources the build actually uses, against what the policy allows ───── */
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
if (/<iframe/i.test(home) && directive('frame-src').includes("'none'")) {
  problems.push("frame-src is 'none' but the build contains an <iframe>.");
}
if (/src="data:/.test(home) && !directive('img-src').includes('data:')) {
  problems.push('the build uses data: URIs but img-src does not allow them.');
}

console.log(`\nCSP (${reportOnly ? 'report-only' : 'ENFORCING'})\n`);
for (const n of notes) console.log(`  ok   ${n}`);
console.log(`  ok   ${pages.length} pages scanned, ${inlineScripts.size} distinct inline script(s)`);
if (reportOnly) {
  console.log('\n  note this policy enforces NOTHING. Rename the key in netlify.toml to');
  console.log('       Content-Security-Policy once the console shows no violations.');
}
if (problems.length) {
  console.error('\n' + problems.map((p) => `  FAIL ${p}`).join('\n') + '\n');
  process.exit(1);
}
console.log('');
