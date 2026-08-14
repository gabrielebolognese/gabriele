/* ============================================================================
   refresh-leetcode-stats.mjs: rewrite the committed LeetCode snapshot.

     npm run stats:refresh        (runs this and the GitHub one)

   Same job as refresh-github-stats.mjs: the build fetches these numbers itself
   and only reads the snapshot when that fails, so this is not how the site
   gets its data. It is how the FALLBACK is kept from rotting.
   ========================================================================= */

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchLeetcodeStats } from '../src/data/leetcode-fetch.mjs';

const OUT = fileURLToPath(new URL('../src/data/leetcode-stats.json', import.meta.url));
const LOGIN = 'gabrielebolognese';

const previous = await readFile(OUT, 'utf8').then(JSON.parse).catch(() => null);

const stats = await fetchLeetcodeStats(LOGIN);
await writeFile(OUT, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');

const delta = (label, now, before) => {
  const change = before === undefined || before === null || before === now ? '' : `  (was ${before})`;
  console.log(`  ${label.padEnd(22)} ${now}${change}`);
};

console.log(`\nWrote ${OUT}\n`);
delta('problems solved', stats.totalSolved, previous?.totalSolved);
for (const row of stats.breakdown) {
  delta(`  ${row.difficulty.toLowerCase()}`, row.solved,
    previous?.breakdown?.find((r) => r.difficulty === row.difficulty)?.solved);
}
delta('active days', stats.activeDays, previous?.activeDays);
delta('current streak', stats.streak, previous?.streak);
delta('ranking', stats.ranking ?? 'unranked', previous?.ranking ?? 'unranked');
console.log('');
