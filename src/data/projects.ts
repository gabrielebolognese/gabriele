/* ============================================================================
   projects.ts: the four things worth showing, as data.

   The section used to be 211 lines of hand-written markup per card, with a
   six-image carousel inside the first one. Four cards written out four times
   is four chances to drift, and it had already drifted: one card was headed
   "FlashFX blog" with an `aria-label="MLed project"` and a body describing a
   machine-learning course. Nobody spots that in 211 lines of JSX. Here it
   would be one obviously wrong line.

   Every summary is now written from what the site owner said the product is,
   condensed to the one or two lines the card has room for. The fuller version
   sits in a comment above each, so what was cut is visible and nothing has to
   be remembered. `since` is the repository's creation year and `stack` is the
   language GitHub reports; both come from the API rather than being guessed.

   Ordered by maturity, not by preference: live, then in development, then
   concept. The status badge then agrees with the reading order instead of
   fighting it, and 01 is always something that exists.

   ⚠️  The IMAGES are placeholders on four of the six: old FlashFX screenshots
   standing in for products that look nothing like it. FlashFX and FlashFX
   Roadmap use their own. `site` is unset wherever the repository declares no
   homepage, so that button renders disabled rather than pointing somewhere
   wrong.
   ========================================================================= */

import type { ImageMetadata } from 'astro';

import animatorTimeline from '../assets/flashfx-animator-timeline-canvas.png';
import flashfxRoadmap from '../assets/flashfx-roadmap-page.png';
import flashfxDocs from '../assets/flashfx-documentation-site.png';
import editorTimeline from '../assets/flashfx-editor-timeline-multitrack.png';
import animator3d from '../assets/flashfx-animator-3d-objects-browser.png';
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
    /* editor.flashfx.app, not flashfx.app. They are two different sites and
       the landing page is now its own card below; pointing both at the same
       URL would have made one of the two cards a lie. This one is the product:
       "FlashFX - WebGPU Motion Graphics & Video Editor". */
    site: 'https://editor.flashfx.app',
    repo: 'https://github.com/gabrielebolognese/FlashFX-v2',
    image: animatorTimeline,
    imageAlt: 'The FlashFX Animator, timeline and canvas view',
  },
  {
    name: 'FlashFX Roadmap',
    status: 'live',
    since: '2026',        // repo created 2026-06-29
    /* Kept general on purpose: the page is a client-rendered app, so its
       contents were not read here and this describes what a roadmap is for
       rather than claiming what is currently on it. */
    summary: 'The public roadmap for FlashFX. What has shipped, what is being built, and what is queued behind that, on one page.',
    stack: [],            // GitHub reports no language on the repo.
    site: 'https://roadmap.flashfx.app',
    repo: 'https://github.com/gabrielebolognese/FFXroadmap',
    image: flashfxRoadmap,
    imageAlt: 'The FlashFX roadmap page',
  },
  {
    name: 'FlashFX landing page',
    status: 'live',
    since: '2026',        // repo created 2026-08-04
    /* Its own meta description reads "FlashFX is a free motion graphics and
       video editor that runs in your browser", which describes the product
       rather than the page, so the line here describes the page's job. */
    summary: 'The front door for FlashFX. What it is, who it is for, and the argument for using it instead of the desktop tools.',
    stack: ['TypeScript'],
    site: 'https://flashfx.app',
    repo: 'https://github.com/gabrielebolognese/FlashFX-landing-page',
    image: editorTimeline,  // TODO: placeholder, wants a shot of flashfx.app itself.
    imageAlt: 'Placeholder screenshot, to be replaced with the FlashFX landing page',
  },
  {
    name: 'FlashFX documentation',
    status: 'live',
    since: '2026',        // repo created 2026-06-29
    /* The site describes itself as "FlashFX Official Product Documentation,
       Alpha Release", and the alpha part is worth keeping: it sets the
       expectation that it is incomplete. */
    summary: 'The official product documentation for FlashFX. Still in alpha, and filling in as fast as the editor itself does.',
    stack: ['TypeScript'],
    site: 'https://documentation.flashfx.app',
    repo: 'https://github.com/gabrielebolognese/FFXdocumentation',
    image: flashfxDocs,
    imageAlt: 'The FlashFX documentation site',
  },
  {
    name: 'FlashCC',
    status: 'building',
    since: '2026',
    /* Full version: like FlashFX but for fast carousels. Creates them
       procedurally rather than with AI, and keeps full customisation. Newly
       created. The no-AI part is the differentiator, so it stays in the line. */
    summary: 'FlashFX for carousels. Built procedurally rather than generated, fast, fully editable, with no AI anywhere in it.',
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
    /* Full version: a board of tiles you buy to feature a personal brand, X,
       Instagram, YouTube or all of them. $2 a square, up to 20x20, resets every
       month, marketed on X. The price and the reset are the two facts that
       explain the whole thing, so they are what the line keeps. */
    summary: 'A board where you buy a square to feature your X, Instagram or YouTube. $2 each, up to 20 by 20, cleared every month.',
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
    /* Full version: the biggest hurdle for a creator is monetization, and not
       knowing when it comes or what to do to get there. Threshold reads your
       profile with AI, builds a dynamic plan, then holds you to it with
       reminders, progress and inspiration boards. The line leads on the
       problem, because the product only makes sense once that is stated.
       "monetization" is the site owner's own spelling. */
    summary: 'Creators rarely know when monetization comes or what to do next. Threshold reads your profile and builds a plan that answers both.',
    stack: [],            // GitHub reports no language on the repo yet.
    // TODO: no homepage is set on the repo, so the site button is disabled.
    // Note the repository is spelled "threashold"; the product is "Threshold".
    repo: 'https://github.com/gabrielebolognese/threashold',
    image: mledApp,       // TODO: placeholder, an old MLed screenshot.
    imageAlt: 'Placeholder screenshot, to be replaced with Threshold',
  },
  {
    name: 'Flash3D',
    /* 'concept', not 'building': there is no repository on the account and no
       site, so there is nothing to point either button at. The badge says that
       rather than the two dead buttons having to imply it. */
    status: 'concept',
    since: '2026',        // TODO: confirm, nothing to derive it from yet.
    /* Stated as intent, not as features. Nothing is built, so "the same
       timeline and compositing stack" would be describing software that does
       not exist. The 2.5D camera it contrasts with is real and in the devlog. */
    summary: 'FlashFX aimed at 3D motion graphics rather than 2D, with depth as a first-class axis instead of a 2.5D camera bolted on.',
    stack: [],
    // TODO: no repository and no site yet, so both buttons render disabled.
    image: animator3d,    // TODO: placeholder, a FlashFX screenshot.
    imageAlt: 'Placeholder screenshot, to be replaced with Flash3D',
  },
];
