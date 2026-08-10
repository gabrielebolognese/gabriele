/* ============================================================================
   devlog-projects.ts: the things the devlog is a log OF.

   Until 2026-08-06 there was one project and no need to say which, so entries
   carried no project at all. `app` is therefore the default, and it keeps the
   bare date anchor (/devlog#2026-08-06) that every entry written before this
   existed was already linkable by. Anything else takes a suffixed anchor. No
   link that worked yesterday stops working.

   `order` decides which entry sits first when a day carries more than one.
   The app leads because it is the product; the site is what points at it.

   Adding a project is: a key here, then `project: <key>` on the entries. The
   schema in content.config.ts reads KEYS, so an unknown value fails the build
   rather than rendering an unlabelled entry.
   ========================================================================= */

export interface DevlogProject {
  /** Shown as a chip on the entry. Short: it sits next to a date. */
  label: string;
  /** Sort position within a single day, lowest first. */
  order: number;
  /** Where the work happened, for the title attribute on the chip. */
  repo: string;
}

export const DEVLOG_PROJECTS = {
  app: {
    label: 'App',
    order: 0,
    repo: 'The FlashFX editor',
  },
  landing: {
    label: 'Landing page',
    order: 1,
    repo: 'gabrielebolognese/FlashFX-landing-page',
  },
} as const satisfies Record<string, DevlogProject>;

export type DevlogProjectKey = keyof typeof DEVLOG_PROJECTS;

/** A tuple, because z.enum() needs literals rather than a string[]. */
export const DEVLOG_PROJECT_KEYS = ['app', 'landing'] as const;

/** The project every entry written before the split belongs to. */
export const DEFAULT_PROJECT: DevlogProjectKey = 'app';
