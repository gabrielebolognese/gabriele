/* ============================================================================
   devlog-projects.ts: the things a day's work can be in.

   One entry per DAY, with a column per project inside it. Not one entry per
   project: a day is the unit a devlog is read in, and two entries dated the
   same day produced two "Day 6" rails one above the other, which reads as a
   duplicate rather than as two projects.

   `order` is the left-to-right order of the columns. The editor leads because
   it is the product; the landing page points at it; this site is neither.

   Adding a project is a key here plus a key under `detail:` in the yaml. The
   schema reads KEYS, so a typo fails the build rather than silently dropping a
   column nobody notices is missing.
   ========================================================================= */

export interface DevlogProject {
  /** Column heading. Short: it sits above a wall of prose. */
  label: string;
  /** Column order, left to right, lowest first. */
  order: number;
  /** Where the work happened, for the column heading's title attribute. */
  repo: string;
}

export const DEVLOG_PROJECTS = {
  app: {
    label: 'FlashFX',
    order: 0,
    repo: 'The FlashFX editor',
  },
  landing: {
    label: 'Landing page',
    order: 1,
    repo: 'gabrielebolognese/FlashFX-landing-page',
  },
  site: {
    label: 'This site',
    order: 2,
    repo: 'gabrielebolognese.blog',
  },
} as const satisfies Record<string, DevlogProject>;

export type DevlogProjectKey = keyof typeof DEVLOG_PROJECTS;

/** A tuple, because z.enum() needs literals rather than a string[]. */
export const DEVLOG_PROJECT_KEYS = ['app', 'landing', 'site'] as const;

/** Column order for a day, given the projects it actually carries. */
export function orderedProjects(keys: string[]): DevlogProjectKey[] {
  return (keys as DevlogProjectKey[])
    .filter((k) => k in DEVLOG_PROJECTS)
    .sort((a, b) => DEVLOG_PROJECTS[a].order - DEVLOG_PROJECTS[b].order);
}
