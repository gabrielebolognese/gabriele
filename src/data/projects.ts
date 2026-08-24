/* ============================================================================
   projects.ts: the four things worth showing, as data.

   The section used to be 211 lines of hand-written markup per card, with a
   six-image carousel inside the first one. Four cards written out four times
   is four chances to drift, and it had already drifted: one card was headed
   "FlashFX blog" with an `aria-label="MLed project"` and a body describing a
   machine-learning course. Nobody spots that in 211 lines of JSX. Here it
   would be one obviously wrong line.

   ⚠️  ONLY FlashFX IS WRITTEN FROM FACT. The other three are structure with
   placeholder text, marked `summary: null`, which renders a visibly
   provisional line rather than inventing a description of a real product. The
   images are deliberately the old FlashFX screenshots, standing in until the
   real ones exist. Every field below marked `TODO:` needs your answer.
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
    // TODO: the FlashFX repo, if there is a public one. Left out so the button
    // renders disabled rather than pointing somewhere wrong.
    repo: undefined,
    image: animatorTimeline,
    imageAlt: 'The FlashFX Animator, timeline and canvas view',
  },
  {
    name: 'FlashCC',
    // TODO: site and repo URLs. Both buttons render disabled until they exist.
    // TODO: what FlashCC is, in one line. Left null on purpose rather than
    // guessed at from the name.
    status: 'building',   // TODO: confirm. 'building' is the safe default, not a fact.
    since: '2026',        // TODO: confirm.
    summary: null,
    stack: [],
    image: editorColor,   // TODO: placeholder, a FlashFX screenshot.
    imageAlt: 'Placeholder screenshot, to be replaced with FlashCC',
  },
  {
    name: 'BrandBoard',
    // TODO: site and repo URLs. Both buttons render disabled until they exist.
    status: 'building',   // TODO: confirm.
    since: '2026',        // TODO: confirm.
    summary: null,        // TODO: one line on what BrandBoard is.
    stack: [],
    image: animatorLayers, // TODO: placeholder, a FlashFX screenshot.
    imageAlt: 'Placeholder screenshot, to be replaced with BrandBoard',
  },
  {
    name: 'Threshold',
    // TODO: site and repo URLs. Both buttons render disabled until they exist.
    status: 'building',   // TODO: confirm.
    since: '2026',        // TODO: confirm.
    summary: null,        // TODO: one line on what Threshold is.
    stack: [],
    image: mledApp,       // TODO: placeholder, an old MLed screenshot.
    imageAlt: 'Placeholder screenshot, to be replaced with Threshold',
  },
];
