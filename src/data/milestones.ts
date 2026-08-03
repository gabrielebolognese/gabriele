/* ============================================================================
   milestones.ts — the life events marked on the /about week grid.

   ⚠️  These mirror the timeline in src/pages/index.astro. That timeline is
   hand-written HTML with long descriptions, so the two are not yet a single
   source. If you add, remove or re-date an entry there, mirror it here or the
   grid will highlight the wrong week. (Unifying them is worth doing: it would
   delete ~280 lines of repetitive markup from index.astro.)

   Only a year and month are recorded, matching the timeline's granularity.
   Each is placed on the week containing the 15th — the middle of that month.
   ========================================================================= */

export type MilestoneKind = 'setback' | 'personal' | 'flashfx';

export interface Milestone {
  /** YYYY-MM, as shown on the timeline. */
  month: string;
  label: string;
  kind: MilestoneKind;
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
  { month: '2026-01', kind: 'flashfx',  label: 'Aziz joins as co-founder, Camille hired' },
  { month: '2026-02', kind: 'flashfx',  label: 'FlashFX v1.2, AI animation tier' },
  { month: '2026-04', kind: 'flashfx',  label: 'Y Combinator interview invitation' },
];

/** Week index from `birth` for the middle of a milestone's month. */
export function milestoneWeek(month: string, birth: Date): number {
  const [y, m] = month.split('-').map(Number);
  const mid = new Date(y, m - 1, 15);
  return Math.floor((mid.getTime() - birth.getTime()) / 604_800_000);
}
