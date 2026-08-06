/* ============================================================================
   images.ts — the manifest behind /image-sitemap.xml.

   @astrojs/sitemap emits page URLs only; it has no <image:image> support. That
   left every screenshot on this site discoverable only by Googlebot parsing a
   lazy-loaded <img> inside a carousel, which is the weakest discovery path
   there is. This file declares what each static route renders so the image
   sitemap can state it outright.

   ⚠️  This MIRRORS the imports in the pages — the same drift hazard as
   milestones.ts. Add an <Image> to a page and add it here too, or it stays
   undeclared.

   `width` must be the WIDEST entry in that page's `widths` array. getImage()
   in the endpoint regenerates the URL from these options, so matching the page
   means the sitemap points at a URL that is really in that page's srcset
   rather than emitting an extra variant that appears on no page at all.
   ========================================================================= */

import type { ImageMetadata } from 'astro';

import portrait from '../assets/gabriele-bolognese-portrait.png';
import animatorTimeline from '../assets/flashfx-animator-timeline-canvas.png';
import animatorKeyframes from '../assets/flashfx-animator-keyframe-controls.png';
import animatorLayers from '../assets/flashfx-animator-layer-panel-effects.png';
import animator3d from '../assets/flashfx-animator-3d-objects-browser.png';
import animatorAi from '../assets/flashfx-animator-ai-animation-tools.png';
import animatorDashboard from '../assets/flashfx-animator-dashboard-projects.png';
import editorTimeline from '../assets/flashfx-editor-timeline-multitrack.png';
import editor3d from '../assets/flashfx-editor-3d-compositing.png';
import editorColor from '../assets/flashfx-editor-color-grading.png';
import mledApp from '../assets/mled-machine-learning-app-interface.png';
import flashfxDocs from '../assets/flashfx-documentation-site.png';
import flashfxRoadmap from '../assets/flashfx-roadmap-page.png';
import portfolioSite from '../assets/video-editing-portfolio-site.png';
import visionAiDemo from '../assets/vision-ai-demo-video-editor-2024.png';
import earlyMotionDesign from '../assets/flashfx-early-motion-design-interface-2024.png';
import boltPrototype from '../assets/flashfx-bolt-hackathon-prototype.png';

export interface IndexedImage {
  src: ImageMetadata;
  width: number;
}

/** Widest rendered width per context, kept as names so a change to a page's
 *  `widths` array has one obvious place to land here. */
const CAROUSEL = 1440; // index.astro project carousels
const FIGURE = 960; // about.astro bio figures
const PORTRAIT = 640; // LifeSection portrait
export const HOME_CARD = 720; // Card.astro issue covers on the homepage grid
export const THUMB = 400; // IssueRow.astro thumbnails on /newsletter
export const COVER = 2080; // IssueLayout hero cover

/** The portrait renders on both routes through LifeSection. Declared on each,
 *  because <image:image> is scoped to the page it sits under. */
const PORTRAIT_ENTRY: IndexedImage = { src: portrait, width: PORTRAIT };

export const PAGE_IMAGES: Record<string, IndexedImage[]> = {
  '/': [
    PORTRAIT_ENTRY,
    { src: animatorTimeline, width: CAROUSEL },
    { src: animatorKeyframes, width: CAROUSEL },
    { src: animatorLayers, width: CAROUSEL },
    { src: animator3d, width: CAROUSEL },
    { src: animatorAi, width: CAROUSEL },
    { src: animatorDashboard, width: CAROUSEL },
    { src: editorTimeline, width: CAROUSEL },
    { src: editor3d, width: CAROUSEL },
    { src: editorColor, width: CAROUSEL },
    { src: mledApp, width: CAROUSEL },
    { src: flashfxDocs, width: CAROUSEL },
    { src: flashfxRoadmap, width: CAROUSEL },
    { src: portfolioSite, width: CAROUSEL },
  ],
  '/about': [
    PORTRAIT_ENTRY,
    { src: visionAiDemo, width: FIGURE },
    { src: earlyMotionDesign, width: FIGURE },
    { src: boltPrototype, width: FIGURE },
  ],
};
