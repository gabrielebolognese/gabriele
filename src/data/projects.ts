/* ============================================================================
   projects.ts: the four things worth showing, as data.

   The section used to be 211 lines of hand-written markup per card, with a
   six-image carousel inside the first one. Four cards written out four times
   is four chances to drift, and it had already drifted: one card was headed
   "FlashFX blog" with an `aria-label="MLed project"` and a body describing a
   machine-learning course. Nobody spots that in 211 lines of JSX. Here it
   would be one obviously wrong line.

   The three summaries that are not FlashFX are YOUR OWN GitHub repository
   descriptions, lifted on 2026-08-24 rather than invented here, with obvious
   typos fixed and a capital on the front. Each one records what it was taken
   from, so you can see exactly what was changed. `since` is the repository's
   creation year, and `stack` is the language GitHub reports.

   ⚠️  The IMAGES are still placeholders: old FlashFX screenshots standing in
   for three products that look nothing like it. `site` is unset on those three
   because none of the repositories declares a homepage, so their "Go to site"
   button renders disabled rather than pointing somewhere wrong.
   ========================================================================= */

import type { ImageMetadata } from 'astro';

import animatorTimeline from '../assets/flashfx-animator-timeline-canvas.png';
import editorColor from '../assets/flashfx-editor-color-grading.png';
import animatorLayers from '../assets/flashfx-animator-layer-panel-effects.png';
import mledApp from '../assets/mled-machine-learning-app-interface.png';

/** Drives the badge. Kept to three, because a status nobody can define is a
 *  status nobody reads. */
export type ProjectStatus = 'live' | 'building' | 'concept';

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  live: 'Live',
  building: 'In development',
  concept: 'Concept',
};

export interface Project {
  name: string;
  status: ProjectStatus;
  /** When work started. Shown beside the status. */
  since: string;
  /** Two lines at most. Null still renders the block, with a visibly
   *  provisional line in it: the card design requires a description, and an
   *  empty slot would collapse the card while an invented one would be a claim
   *  about a real product that nobody has made. */
  summary: string | null;
  /** Three at most: past three it is a list, not a signal. */
  stack: string[];
  /** The two buttons at the foot of the card. A missing URL renders the button
   *  disabled rather than hiding it: the four cards keep the same shape, and a
   *  greyed "Go to repository" is an honest "there is not one yet" where a
   *  missing button just looks like an oversight. */
  site?: string;
  repo?: string;
  image: ImageMetadata;
  imageAlt: string;
}

export const PROJECTS: Project[] = [
  {
    name: 'FlashFX',
    status: 'live',
    since: '2024',
    summary:
      'A browser-native motion graphics and video editor. The After Effects workflow, with nothing to install and no licence.',
    stack: ['TypeScript', 'WebGPU', 'WebCodecs'],
    site: 'https://flashfx.app',
    repo: 'https://github.com/gabrielebolognese/FlashFX-v2',
    image: animatorTimeline,
    imageAlt: 'The FlashFX Animator, timeline and canvas view',
  },
  {
    name: 'FlashCC',
    status: 'building',
    since: '2026',
    // GitHub: "fast and easy carousel creator website."
    summary: 'A fast, easy carousel creator that runs in the browser.',
    stack: ['TypeScript'],
    // TODO: no homepage is set on the repo, so the site button is disabled.
    repo: 'https://github.com/gabrielebolognese/FlashCC',
    image: editorColor,   // TODO: placeholder, a FlashFX screenshot.
    imageAlt: 'Placeholder screenshot, to be replaced with FlashCC',
  },
  {
    name: 'BrandBoard',
    status: 'building',
    since: '2026',
    // GitHub: "Buyable board for personal brands to feature it on your grid and
    // get more clicks"
    summary: 'A buyable board for personal brands: feature it on your grid and get more clicks.',
    stack: ['TypeScript'],
    // TODO: no homepage is set on the repo, so the site button is disabled.
    repo: 'https://github.com/gabrielebolognese/BrandBoard',
    image: animatorLayers, // TODO: placeholder, a FlashFX screenshot.
    imageAlt: 'Placeholder screenshot, to be replaced with BrandBoard',
  },
  {
    name: 'Threshold',
    status: 'building',
    since: '2026',
    // GitHub: "pp to reach monetization plan". Read as a truncated "App"; if
    // that is wrong, this line is the one to correct.
    summary: 'An app for reaching a monetization plan.',
    stack: [],            // GitHub reports no language on the repo yet.
    // TODO: no homepage is set on the repo, so the site button is disabled.
    // Note the repository is spelled "threashold"; the product is "Threshold".
    repo: 'https://github.com/gabrielebolognese/threashold',
    image: mledApp,       // TODO: placeholder, an old MLed screenshot.
    imageAlt: 'Placeholder screenshot, to be replaced with Threshold',
  },
];
