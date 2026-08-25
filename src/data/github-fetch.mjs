/* ============================================================================
   github-fetch.mjs: the network half, kept apart from the parsing half.

   Shared by the build (src/data/github.ts) and by the refresh script, so the
   snapshot on disk and the live numbers can never be produced by two different
   code paths that drift.
   ========================================================================= */

import {
  parseContributionDays,
  parsePinnedRepos,
  computeStats,
  buildCalendar,
  monthLabels,
} from './github-parse.mjs';

const BASE = 'https://github.com';
const TIMEOUT_MS = 8000;

/** GitHub serves the calendar to anyone, but it serves a bot check to a client
 *  with no User-Agent, and Netlify's builder is exactly that client. */
const HEADERS = {
  'User-Agent': 'gabrielebolognese.blog build (+https://gabrielebolognese.blog)',
  'Accept': 'text/html',
};

async function get(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

/**
 * Every calendar from `startYear` to now, plus the rolling last-365-days view.
 *
 * The year-ranged endpoint returns whole weeks, so consecutive years overlap by
 * a few days at each boundary, and the rolling view overlaps the current year
 * almost entirely. That is deliberate: overlapping requests cover the seams,
 * and computeStats() dedupes by date. Asking for exact calendar years instead
 * would leave a two-or-three-day hole every New Year, which is precisely where
 * a long streak would be silently cut in half.
 */
export async function fetchGithubStats(login, startYear) {
  const thisYear = new Date().getUTCFullYear();
  const urls = [`${BASE}/users/${login}/contributions`];
  for (let y = startYear; y <= thisYear; y++) {
    urls.push(`${BASE}/users/${login}/contributions?from=${y}-01-01&to=${y}-12-31`);
  }

  const pages = await Promise.all(urls.map(get));
  const days = pages.flatMap(parseContributionDays);
  if (days.length < 300) throw new Error(`only ${days.length} day cells parsed`);

  const profile = await get(`${BASE}/${login}`);
  const pinned = parsePinnedRepos(profile);

  const today = new Date().toISOString().slice(0, 10);
  const stats = computeStats(days, today);
  if (stats.totalContributions <= 0) throw new Error('parsed zero contributions');

  const weeks = buildCalendar(days, today);

  return {
    capturedAt: new Date().toISOString(),
    login,
    profileUrl: `${BASE}/${login}`,
    ...stats,
    /* Only the rendered window is stored. Keeping every day since 2024 would
       triple the file for rows no page draws; the totals above are already
       computed over the full history. */
    weeks,
    months: monthLabels(weeks),
    pinned,
  };
}
