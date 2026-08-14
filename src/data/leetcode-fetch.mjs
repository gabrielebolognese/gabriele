/* ============================================================================
   leetcode-fetch.mjs: the LeetCode half of the statistics section.

   Plain .mjs for the same reason as github-parse.mjs: imported both by
   src/data/leetcode.ts, which Vite compiles, and by the refresh script, which
   node runs directly with no build step.

   Unlike GitHub, this one is a real API. LeetCode has no REST but it does have
   a public GraphQL endpoint, unauthenticated, which serves the same data its
   own profile page renders. So there is nothing to scrape and no markup to
   depend on: only a query that could change shape, which is a far smaller
   surface. Every parser below still returns something usable rather than
   throwing, and the caller keeps a committed snapshot to fall back to.
   ========================================================================= */

const ENDPOINT = 'https://leetcode.com/graphql';
const TIMEOUT_MS = 8000;

/** LeetCode 403s a request with no User-Agent, and the Referer is what its
 *  own profile page sends. Netlify's builder is otherwise exactly the client
 *  it refuses. */
const headers = (login) => ({
  'Content-Type': 'application/json',
  'User-Agent': 'gabrielebolognese.blog build (+https://gabrielebolognese.blog)',
  Referer: `https://leetcode.com/${login}/`,
});

const QUERY = `query profile($u: String!) {
  allQuestionsCount { difficulty count }
  matchedUser(username: $u) {
    username
    profile { ranking realName }
    submitStatsGlobal { acSubmissionNum { difficulty count submissions } }
    userCalendar { streak totalActiveDays activeYears submissionCalendar }
  }
}`;

const DAY_MS = 86_400_000;
const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
const fromIso = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** Easy, Medium, Hard. "All" is a total the API returns alongside them and is
 *  deliberately not a difficulty: folding it in would double every count. */
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const byDifficulty = (rows) =>
  Object.fromEntries((rows ?? []).map((r) => [r.difficulty, r.count]));

/**
 * The submission calendar arrives as a JSON STRING of unix-second keys, not an
 * object, so it is parsed twice on purpose. Keys are UTC midnights.
 */
function parseCalendar(raw) {
  let map = {};
  try {
    map = JSON.parse(raw ?? '{}') ?? {};
  } catch {
    return new Map();
  }
  return new Map(
    Object.entries(map).map(([seconds, count]) => [toIso(Number(seconds) * 1000), Number(count)]),
  );
}

/** 0-4, matching the shape of the GitHub grid beside it so the two read the
 *  same way. Thresholds are low because a day with four submissions on this
 *  account is a busy one. */
function level(count) {
  if (!count) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

/** Columns of seven, Sunday first, ending on the column containing today. */
function buildCalendar(byDate, todayIso, weekCount = 53) {
  const today = fromIso(todayIso);
  const endOfWeek = today + (6 - new Date(today).getUTCDay()) * DAY_MS;
  const start = endOfWeek - (weekCount * 7 - 1) * DAY_MS;

  const weeks = [];
  for (let w = 0; w < weekCount; w++) {
    const column = [];
    for (let d = 0; d < 7; d++) {
      const iso = toIso(start + (w * 7 + d) * DAY_MS);
      if (iso > todayIso) { column.push(null); continue; }
      const count = byDate.get(iso) ?? 0;
      column.push({ date: iso, count, level: level(count) });
    }
    weeks.push(column);
  }
  return weeks;
}

export async function fetchLeetcodeStats(login) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers(login),
    body: JSON.stringify({ query: QUERY, variables: { u: login } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from the LeetCode API`);

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));

  const user = json.data?.matchedUser;
  if (!user) throw new Error(`no LeetCode user "${login}"`);

  const solved = byDifficulty(user.submitStatsGlobal?.acSubmissionNum);
  const available = byDifficulty(json.data?.allQuestionsCount);
  const total = solved.All ?? 0;

  const byDate = parseCalendar(user.userCalendar?.submissionCalendar);
  const activeDates = [...byDate.keys()].sort();
  const today = new Date().toISOString().slice(0, 10);

  return {
    capturedAt: new Date().toISOString(),
    login,
    profileUrl: `https://leetcode.com/u/${login}/`,
    totalSolved: total,
    totalAvailable: available.All ?? 0,
    /** One row per difficulty, in order, with what is available to solve. */
    breakdown: DIFFICULTIES.map((difficulty) => ({
      difficulty,
      solved: solved[difficulty] ?? 0,
      available: available[difficulty] ?? 0,
    })),
    streak: user.userCalendar?.streak ?? 0,
    activeDays: user.userCalendar?.totalActiveDays ?? 0,
    /* Derived, never asserted: the copy calls the account new, and this is what
       makes that a fact on the page rather than a sentence that goes stale the
       month it stops being true. */
    firstActive: activeDates[0] ?? null,
    lastActive: activeDates[activeDates.length - 1] ?? null,
    /* LeetCode returns a sentinel rank for accounts with too little activity to
       place, rather than null. Printing 5,000,001 as a rank would be a lie of
       formatting. */
    ranking: (user.profile?.ranking ?? 0) >= 5_000_000 ? null : user.profile.ranking,
    weeks: buildCalendar(byDate, today),
  };
}
