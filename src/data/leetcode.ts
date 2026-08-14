/* ============================================================================
   leetcode.ts: the LeetCode numbers, resolved once at build time.

   Same contract as github.ts, deliberately: live-first, snapshot-second, and a
   failure of any kind falls back rather than failing the build. See that file
   for the full reasoning. `capturedAt` ships to the page for the same reason
   too, because these are as fresh as the last DEPLOY and saying so is cheaper
   than being wrong.

   GITHUB_STATS_OFFLINE=1 skips this one as well: one switch for "build with no
   network" is easier to remember than two.
   ========================================================================= */

import { fetchLeetcodeStats } from './leetcode-fetch.mjs';
import snapshot from './leetcode-stats.json';

export const LEETCODE_LOGIN = 'gabrielebolognese';

export interface LeetcodeDay {
  date: string;
  count: number;
  level: number;
}

export interface LeetcodeBreakdown {
  difficulty: string;
  solved: number;
  available: number;
}

export interface LeetcodeStats {
  capturedAt: string;
  login: string;
  profileUrl: string;
  totalSolved: number;
  totalAvailable: number;
  breakdown: LeetcodeBreakdown[];
  streak: number;
  activeDays: number;
  firstActive: string | null;
  lastActive: string | null;
  /** null when LeetCode has not placed the account yet. */
  ranking: number | null;
  weeks: (LeetcodeDay | null)[][];
  /** True when the numbers came off the network this build. */
  live: boolean;
}

const fallback: LeetcodeStats = {
  ...(snapshot as Omit<LeetcodeStats, 'live'>),
  live: false,
};

let cached: Promise<LeetcodeStats> | null = null;

async function resolve(): Promise<LeetcodeStats> {
  if (process.env.GITHUB_STATS_OFFLINE === '1') {
    console.info('[leetcode] offline, using the committed snapshot');
    return fallback;
  }

  try {
    const live = await fetchLeetcodeStats(LEETCODE_LOGIN);
    console.info(
      `[leetcode] live: ${live.totalSolved} solved, ${live.activeDays} active days`,
    );
    return { ...(live as Omit<LeetcodeStats, 'live'>), live: true };
  } catch (err) {
    console.warn(
      `[leetcode] fetch failed (${err instanceof Error ? err.message : err}), `
      + `falling back to the snapshot of ${fallback.capturedAt}`,
    );
    return fallback;
  }
}

export function getLeetcodeStats(): Promise<LeetcodeStats> {
  if (!cached) cached = resolve();
  return cached;
}
