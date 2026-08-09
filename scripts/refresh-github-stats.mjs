/* ============================================================================
   refresh-github-stats.mjs: rewrite the committed snapshot.

     npm run stats:refresh

   The build already fetches these numbers itself and only reads the snapshot
   when the fetch fails. So this script is not how the site gets its data, it is
   how the FALLBACK is kept from rotting: if GitHub changes its markup a year
   from now, whatever is in this file is what the site will show until someone
   notices. Run it when you touch the parsers, and occasionally otherwise.

   It writes the file and prints what changed. It does not commit.
   ========================================================================= */

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchGithubStats } from '../src/data/github-fetch.mjs';

const OUT = fileURLToPath(new URL('../src/data/github-stats.json', import.meta.url));
const LOGIN = 'gabrielebolognese';
const START_YEAR = 2024; // the account was created in November 2024

const previous = await readFile(OUT, 'utf8').then(JSON.parse).catch(() => null);

const stats = await fetchGithubStats(LOGIN, START_YEAR);
await writeFile(OUT, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');

const delta = (label, now, before) => {
  const change = before === undefined || before === now ? '' : `  (was ${before})`;
  console.log(`  ${label.padEnd(22)} ${now}${change}`);
};

console.log(`\nWrote ${OUT}\n`);
delta('total contributions', stats.totalContributions, previous?.totalContributions);
delta('current streak', `${stats.currentStreak.days} days`, previous && `${previous.currentStreak.days} days`);
delta('longest streak', `${stats.longestStreak.days} days`, previous && `${previous.longestStreak.days} days`);
delta('active days', stats.activeDays, previous?.activeDays);
delta('pinned repos', stats.pinned.length, previous?.pinned.length);
console.log('');
