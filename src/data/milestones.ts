/* ============================================================================
   milestones.ts: the life events marked on the /about week grid.

   ⚠️  These mirror the timeline in src/pages/index.astro. That timeline is
   hand-written HTML with long descriptions, so the two are not yet a single
   source. If you add, remove or re-date an entry there, mirror it here or the
   grid will highlight the wrong week. (Unifying them is worth doing: it would
   delete ~280 lines of repetitive markup from index.astro.)

   Most entries record only a year and month, matching the timeline's usual
   granularity, and land on the week containing the 15th, the middle of that
   month. An entry may instead give a full YYYY-MM-DD when the exact week
   matters: two events in the same month would otherwise collide on one square
   and the later one would silently win, and a late-month event would be pushed
   two weeks back to mid-month. Both apply to July 2026.
   ========================================================================= */

export type MilestoneKind = 'setback' | 'personal' | 'flashfx';

export interface Milestone {
  /** YYYY-MM as shown on the timeline, or YYYY-MM-DD when the day matters. */
  month: string;
  label: string;
  kind: MilestoneKind;
  /**
   * How many consecutive squares this covers, starting with the week that
   * contains `month`. Defaults to 1. A stretch that lasted a month is one
   * entry with a span, not five entries, otherwise the event list below the
   * grid fills up with five rows that all say the same thing.
   */
  weeks?: number;
}

export const MILESTONE_KINDS: Record<MilestoneKind, string> = {
  personal: 'Milestone',
  setback: 'Setback',
  flashfx: 'FlashFX',
};

export const MILESTONES: Milestone[] = [
  { month: '2020-01', kind: 'personal', label: 'YouTube channel started, first edits in Shotcut' },
  { month: '2021-06', kind: 'personal', label: 'YouTube channel peak, 350 videos' },
  { month: '2022-01', kind: 'setback',  label: 'Channel hacked, 600+ videos deleted overnight' },
  { month: '2022-11', kind: 'personal', label: 'First Fiverr account, freelance career begins' },
  { month: '2022-12', kind: 'personal', label: 'First client, Emerals, $5 a video' },
  { month: '2023-04', kind: 'personal', label: 'First payment card' },
  { month: '2023-06', kind: 'setback',  label: 'Emerals client lost, income gone again' },
  { month: '2023-08', kind: 'personal', label: 'HowToAI discovery, automation era begins' },
  { month: '2023-12', kind: 'setback',  label: 'YouTube automation fails completely' },
  { month: '2024-01', kind: 'personal', label: 'First line of code ever, Vision AI Demo begins' },
  { month: '2024-02', kind: 'personal', label: 'Italian mathematics nationals, champion category' },
  { month: '2024-03', kind: 'setback',  label: 'Vision AI Demo crashes, first real debt' },
  { month: '2024-08', kind: 'setback',  label: 'Second €200 loan' },
  { month: '2024-09', kind: 'personal', label: 'National coding competition, top placement' },
  { month: '2025-01', kind: 'flashfx',  label: 'FlashFX named, TypeScript and motion design' },
  { month: '2025-02', kind: 'flashfx',  label: 'TypeScript solo grind, building alone' },
  { month: '2025-04', kind: 'personal', label: 'New editing client, $250 a month' },
  { month: '2025-06', kind: 'flashfx',  label: 'Bolt hackathon, final submission' },
  { month: '2025-07', kind: 'setback',  label: 'Bolt hackathon, defeat' },
  { month: '2025-09', kind: 'flashfx',  label: '3,400 Discord members' },
  { month: '2025-11', kind: 'flashfx',  label: 'FlashFX v1.0, public launch' },
  { month: '2025-12', kind: 'flashfx',  label: 'FlashFX reaches 5,000 users · turned 17' },
  { month: '2026-01', kind: 'flashfx',  label: 'Co-founder joins, Camille hired' },
  { month: '2026-02', kind: 'flashfx',  label: 'FlashFX v1.2, AI animation tier' },
  { month: '2026-04',    kind: 'flashfx',  label: 'Y Combinator interview invitation' },

  /* Grid weeks run Saturday to Friday from the birth date, so these anchors
     are chosen against those boundaries rather than against calendar months:
     30 May–10 July as one unbroken setback, the trip sitting exactly on its
     two full weeks, then the week back. The week of 1 August is left alone,
     it is both the recovery week and the current one, and an event square
     loses the "this week" ring. */
  { month: '2026-06-01', weeks: 6, kind: 'setback',  label: 'Co-founder left, and the whole of June went with him' },
  { month: '2026-07-11', weeks: 2, kind: 'personal', label: 'Two weeks in Dublin, first English-speaking country' },
  { month: '2026-07-25',            kind: 'setback',  label: 'Back from Dublin, the worst possible week to lose' },
  { month: '2026-08-07',            kind: 'flashfx',  label: 'Launch day, and FlashFX becomes a company' },
];

/** Splits either granularity. `d` is null for a month-only entry. */
function parts(month: string): { y: number; m: number; d: number | null } {
  const [y, m, d] = month.split('-').map(Number);
  return { y, m: m - 1, d: Number.isFinite(d) ? d : null };
}

/**
 * Week index from `birth`. Month-only entries land mid-month.
 *
 * Counted in whole calendar days rather than by dividing milliseconds. Local
 * midnight in July is an hour off local midnight in December, so a millisecond
 * division comes up one hour short of a whole number of weeks all summer, and
 * an anchor dated to the exact Saturday a week begins floors to the week
 * before. That is not theoretical: it put the Dublin trip on the week it was
 * supposed to be marking the end of.
 */
export function milestoneWeek(month: string, birth: Date): number {
  const { y, m, d } = parts(month);
  const from = Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate());
  const to = Date.UTC(y, m, d ?? 15);
  return Math.floor(Math.round((to - from) / 86_400_000) / 7);
}

/** "2024-03" -> "March 2024". "2026-07-10" -> "10 July 2026". */
export function milestoneLabel(month: string): string {
  const { y, m, d } = parts(month);
  return new Date(y, m, d ?? 1).toLocaleDateString(
    'en-GB',
    d === null
      ? { month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'long', year: 'numeric' },
  );
}
