/* ============================================================================
   github.ts: the GitHub numbers, resolved once at build time.

   Live-first, snapshot-second. The build tries GitHub, and falls back to
   src/data/github-stats.json if anything at all goes wrong: a timeout, a 429,
   a markup change that makes the parsers return nothing, a machine with no
   network. The site is static and deploys from a builder we do not control, so
   the one outcome that is not allowed is a failed build.

   That means these numbers are as fresh as the last DEPLOY, not as fresh as
   the last commit. `capturedAt` ships to the page and is printed under the
   grid, because a stale statistic presented as live is worse than a dated one.

   Set GITHUB_STATS_OFFLINE=1 to skip the network entirely and build from the
   snapshot. Useful on a plane, and it makes a build byte-reproducible.
   ========================================================================= */

import { fetchGithubStats } from './github-fetch.mjs';
import snapshot from './github-stats.json';

/** The account. Not in identity.ts because SAME_AS holds profile URLs for
 *  schema.org, and this needs the bare login for API-ish paths. */
export const GITHUB_LOGIN = 'gabrielebolognese';

/** First year to ask for. The account dates from November 2024; asking earlier
 *  is a wasted request per year, asking later silently truncates the totals. */
const START_YEAR = 2024;

export interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

export interface Streak {
  days: number;
  from: string | null;
  to: string | null;
}

export interface PinnedRepo {
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number;
}

export interface GithubStats {
  capturedAt: string;
  login: string;
  profileUrl: string;
  totalContributions: number;
  currentStreak: Streak;
  longestStreak: Streak;
  firstContribution: string | null;
  activeDays: number;
  /** 53 columns of 7. `null` is a day outside the account's life or in the
   *  future, which is drawn as a hole rather than as an empty day. */
  weeks: (ContributionDay | null)[][];
  months: { column: number; label: string }[];
  pinned: PinnedRepo[];
  /** True when the numbers came off the network this build. */
  live: boolean;
}

const fallback: GithubStats = { ...(snapshot as Omit<GithubStats, 'live'>), live: false };

let cached: Promise<GithubStats> | null = null;

async function resolve(): Promise<GithubStats> {
  if (process.env.GITHUB_STATS_OFFLINE === '1') {
    console.info('[github] GITHUB_STATS_OFFLINE=1, using the committed snapshot');
    return fallback;
  }

  try {
    const live = await fetchGithubStats(GITHUB_LOGIN, START_YEAR);
    console.info(
      `[github] live: ${live.totalContributions} contributions, `
      + `${live.currentStreak.days} day current streak, ${live.pinned.length} pinned`,
    );
    return { ...(live as Omit<GithubStats, 'live'>), live: true };
  } catch (err) {
    /* Deliberately a warning and not a throw. See the header. */
    console.warn(
      `[github] fetch failed (${err instanceof Error ? err.message : err}), `
      + `falling back to the snapshot of ${fallback.capturedAt}`,
    );
    return fallback;
  }
}

/** Memoised: the homepage is one page, but a second caller must not re-fetch. */
export function getGithubStats(): Promise<GithubStats> {
  if (!cached) cached = resolve();
  return cached;
}
