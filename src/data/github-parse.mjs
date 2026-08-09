/* ============================================================================
   github-parse.mjs: GitHub's public HTML, turned into numbers.

   Plain .mjs and not .ts on purpose. This module is imported BOTH by
   src/data/github.ts, which Vite compiles, and by
   scripts/refresh-github-stats.mjs, which node runs directly with no build
   step. A .ts file cannot be both without adding a compiler to the project.

   There is no API call anywhere in here because there is no token anywhere in
   here. The contribution calendar is not in GitHub's REST API at all, and
   pinned repositories are GraphQL-only, so both would need an authenticated
   request and a secret in Netlify. Both are also plain public HTML on
   github.com, which needs neither.

   The cost of that choice is a dependency on markup nobody here controls. So
   every parser below returns an empty result instead of throwing, the caller
   validates what it gets, and a committed snapshot is kept to fall back to.
   A GitHub redesign should make these numbers stale. It must never make the
   build fail.
   ========================================================================= */

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
};

function decode(s) {
  return s.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

function text(html) {
  return decode(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

/* ── Contribution calendar ───────────────────────────────────────────────────
   Two passes, because the count and the date live in different elements. Each
   day is a <td class="ContributionCalendar-day"> carrying data-date and
   data-level (0-4, the shade), and the exact number is only in the <tool-tip>
   that points back at the cell's id: "28 contributions on August 10th." or
   "No contributions on August 11th.".

   data-level alone would be enough to draw the grid but not to count it, and
   the whole point of the section is the count.
   ------------------------------------------------------------------------- */
export function parseContributionDays(html) {
  const counts = new Map();
  const tips = html.matchAll(
    /<tool-tip[^>]*\bfor="(contribution-day-component-[^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g,
  );
  for (const tip of tips) {
    const n = text(tip[2]).match(/^([\d,]+)\s+contribution/i);
    counts.set(tip[1], n ? Number(n[1].replace(/,/g, '')) : 0);
  }

  const days = [];
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const tag = m[0];
    if (!tag.includes('ContributionCalendar-day')) continue;
    const date = (tag.match(/data-date="([^"]+)"/) || [])[1];
    if (!date) continue;
    const id = (tag.match(/\bid="([^"]+)"/) || [])[1];
    days.push({
      date,
      level: Number((tag.match(/data-level="(\d)"/) || [])[1] ?? 0),
      count: counts.get(id) ?? 0,
    });
  }
  return days;
}

/* ── Pinned repositories ─────────────────────────────────────────────────────
   "Main repositories" is a judgement, and the only honest source for it is the
   six slots GitHub already lets you curate by hand. Sorting by stars or by
   push date would be this file deciding what matters instead of you.
   ------------------------------------------------------------------------- */
export function parsePinnedRepos(html) {
  const start = html.indexOf('js-pinned-items-reorder-list');
  if (start === -1) return [];
  const end = html.indexOf('</ol>', start);
  const block = html.slice(start, end === -1 ? undefined : end);

  return block
    .split(/<li\b/)
    .slice(1)
    .map((item) => {
      const link = item.match(/href="(\/[^"]+)"[^>]*>\s*<span class="repo">([^<]+)<\/span>/);
      if (!link) return null;
      const desc = item.match(/class="pinned-item-desc[^"]*"[^>]*>([\s\S]*?)<\/p>/);
      const stars = item.match(/\/stargazers"[\s\S]*?<\/svg>\s*([\d,]+)/);
      return {
        name: decode(link[2]).trim(),
        url: `https://github.com${link[1]}`,
        description: desc && text(desc[1]) ? text(desc[1]) : null,
        language: (item.match(/itemprop="programmingLanguage">([^<]+)</) || [])[1] ?? null,
        languageColor:
          (item.match(/repo-language-color[^>]*background-color:\s*([^;"]+)/) || [])[1]?.trim()
          ?? null,
        stars: stars ? Number(stars[1].replace(/,/g, '')) : 0,
      };
    })
    .filter((r) => r && r.name);
}

/* ── Dates ───────────────────────────────────────────────────────────────────
   Everything is done on YYYY-MM-DD strings in UTC. Date arithmetic on local
   Date objects would put the streak off by one for anyone whose build machine
   is west of UTC, which is every Netlify builder.
   ------------------------------------------------------------------------- */
const DAY_MS = 86_400_000;

export const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
export const fromIso = (iso) => Date.parse(`${iso}T00:00:00Z`);

/* ── The numbers ─────────────────────────────────────────────────────────────
   `days` may be several calendars merged, so it can contain duplicates, gaps
   and, for the current year, dates that have not happened yet. All three are
   handled here rather than by the caller.
   ------------------------------------------------------------------------- */
export function computeStats(days, todayIso) {
  const byDate = new Map();
  for (const d of days) {
    if (d.date > todayIso) continue;                 // future cells in this year's grid
    byDate.set(d.date, Math.max(byDate.get(d.date) ?? 0, d.count));
  }
  if (!byDate.size) {
    return {
      totalContributions: 0,
      currentStreak: { days: 0, from: null, to: null },
      longestStreak: { days: 0, from: null, to: null },
      firstContribution: null,
      activeDays: 0,
    };
  }

  const dates = [...byDate.keys()].sort();
  let total = 0;
  let activeDays = 0;
  let firstContribution = null;
  for (const d of dates) {
    const n = byDate.get(d);
    total += n;
    if (n > 0) {
      activeDays++;
      if (!firstContribution) firstContribution = d;
    }
  }

  /* Walk day by day rather than over the keys: a missing key is a zero day,
     and treating it as adjacent to its neighbours would weld two streaks
     either side of a gap into one. */
  let longest = { days: 0, from: null, to: null };
  let run = 0;
  let runStart = null;
  for (let ms = fromIso(dates[0]); ms <= fromIso(todayIso); ms += DAY_MS) {
    const iso = toIso(ms);
    if ((byDate.get(iso) ?? 0) > 0) {
      run++;
      if (run === 1) runStart = iso;
      if (run > longest.days) longest = { days: run, from: runStart, to: iso };
    } else {
      run = 0;
      runStart = null;
    }
  }

  /* Today counts only once it has something in it. A streak is not broken at
     00:01 by a day you have not worked yet, which is also how GitHub reads it. */
  let cursor = fromIso(todayIso);
  if ((byDate.get(todayIso) ?? 0) === 0) cursor -= DAY_MS;
  let current = 0;
  let currentEnd = null;
  let currentStart = null;
  while ((byDate.get(toIso(cursor)) ?? 0) > 0) {
    if (!currentEnd) currentEnd = toIso(cursor);
    currentStart = toIso(cursor);
    current++;
    cursor -= DAY_MS;
  }

  return {
    totalContributions: total,
    currentStreak: { days: current, from: currentStart, to: currentEnd },
    longestStreak: longest,
    firstContribution,
    activeDays,
  };
}

/* ── The grid ────────────────────────────────────────────────────────────────
   Columns of seven, Sunday first, ending on the column that contains today.
   Cells before the first contribution and after today come back as null so the
   renderer can leave a hole rather than draw a fake empty day.
   ------------------------------------------------------------------------- */
export function buildCalendar(days, todayIso, weekCount = 53) {
  const byDate = new Map(days.map((d) => [d.date, d]));

  const today = fromIso(todayIso);
  const endOfWeek = today + (6 - new Date(today).getUTCDay()) * DAY_MS;
  const start = endOfWeek - (weekCount * 7 - 1) * DAY_MS;

  const weeks = [];
  for (let w = 0; w < weekCount; w++) {
    const column = [];
    for (let d = 0; d < 7; d++) {
      const iso = toIso(start + (w * 7 + d) * DAY_MS);
      if (iso > todayIso) { column.push(null); continue; }
      const hit = byDate.get(iso);
      column.push({ date: iso, count: hit?.count ?? 0, level: hit?.level ?? 0 });
    }
    weeks.push(column);
  }
  return weeks;
}

/** Month labels for the axis: the first column whose Sunday starts a month. */
export function monthLabels(weeks) {
  const out = [];
  let last = null;
  weeks.forEach((column, i) => {
    const first = column.find(Boolean);
    if (!first) return;
    const month = first.date.slice(0, 7);
    if (month === last) return;
    last = month;
    /* A label needs the two columns after it to sit under, or it collides
       with the next one and both become unreadable. */
    if (i > weeks.length - 3) return;
    out.push({
      column: i,
      label: new Date(fromIso(first.date)).toLocaleDateString('en-GB', {
        month: 'short',
        timeZone: 'UTC',
      }),
    });
  });
  return out;
}
