/* ============================================================================
   refresh-youtube-stats.mjs: rewrite the committed YouTube snapshot.

     npm run stats:refresh

   Same job as the GitHub and LeetCode refreshers: the build fetches these
   itself and only reads the snapshot when that fails, so this keeps the
   FALLBACK from rotting rather than being how the site gets its data.

   Honours YOUTUBE_API_KEY if it is set, so the snapshot is written from
   whichever source the build would have used.
   ========================================================================= */

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchYoutubeStats } from '../src/data/youtube-fetch.mjs';

const OUT = fileURLToPath(new URL('../src/data/youtube-stats.json', import.meta.url));
const HANDLE = 'gabriele.bolognese';

const previous = await readFile(OUT, 'utf8').then(JSON.parse).catch(() => null);

const stats = await fetchYoutubeStats(HANDLE, process.env.YOUTUBE_API_KEY);
await writeFile(OUT, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');

const delta = (label, now, before) => {
  const change = before === undefined || before === null || before === now ? '' : `  (was ${before})`;
  console.log(`  ${label.padEnd(22)} ${now}${change}`);
};

console.log(`\nWrote ${OUT}\n`);
delta('source', stats.source, previous?.source);
delta('subscribers', stats.subscribers ?? 'hidden', previous?.subscribers ?? 'hidden');
delta('videos', stats.videoCount, previous?.videoCount);
delta('total views', stats.viewCount, previous?.viewCount);
delta('ranked from', stats.rankedFrom, previous?.rankedFrom);
for (const [i, v] of stats.topVideos.entries()) {
  console.log(`  #${i + 1} ${String(v.views).padStart(6)} views  ${v.title}`);
}
console.log('');
