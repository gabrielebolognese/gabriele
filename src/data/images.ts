/* ============================================================================
   images.ts: the manifest behind /image-sitemap.xml.

   @astrojs/sitemap emits page URLs only; it has no <image:image> support. That
   left every screenshot on this site discoverable only by Googlebot parsing a
   lazy-loaded <img> inside a carousel, which is the weakest discovery path
   there is. This file declares what each static route renders so the image
   sitemap can state it outright.

   ⚠️  This MIRRORS the imports in the pages, the same drift hazard as
   milestones.ts. Add an <Image> to a page and add it here too, or it stays
   undeclared.

   `width` must be the WIDEST entry in that page's `widths` array. getImage()
   in the endpoint regenerates the URL from these options, so matching the page
   means the sitemap points at a URL that is really in that page's srcset
   rather than emitting an extra variant that appears on no page at all.
   ========================================================================= */

import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { absoluteUrl } from './identity';
import { PROJECTS } from './projects';

import portrait from '../assets/gabriele-bolognese-portrait.png';
import visionAiDemo from '../assets/vision-ai-demo-video-editor-2024.png';
import earlyMotionDesign from '../assets/flashfx-early-motion-design-interface-2024.png';
import boltPrototype from '../assets/flashfx-bolt-hackathon-prototype.png';
import gni from '../assets/gara-nazionale-informatica-2026-logo.jpg';

export interface IndexedImage {
  src: ImageMetadata;
  width: number;
}

/** Widest rendered width per context, kept as names so a change to a page's
 *  `widths` array has one obvious place to land here. */
export const PROJECT = 840; // index.astro project cards, widest of widths={[420, 840]}
const FIGURE = 960; // about.astro bio figures
export const PORTRAIT = 640; // LifeSection portrait
const AWARD = 560; // index.astro award banner logo
// No card width of any kind: both the archive and the homepage newsletter
// section render IssueCard, which carries no image (see IssueCard.astro).
export const COVER = 2080; // IssueLayout hero cover

/** The portrait renders on both routes through LifeSection. Declared on each,
 *  because <image:image> is scoped to the page it sits under. */
const PORTRAIT_ENTRY: IndexedImage = { src: portrait, width: PORTRAIT };

export const PAGE_IMAGES: Record<string, IndexedImage[]> = {
  '/': [
    PORTRAIT_ENTRY,
    { src: gni, width: AWARD },
    /* Derived from PROJECTS rather than listed, so a project swapping its
       screenshots cannot leave this file pointing at an image no page renders.
       That is exactly what happened to the twelve carousel entries this
       replaced: the carousels were deleted and the manifest kept declaring
       them. Flattened, because a project now carries a set of shots, and
       deduped in case two ever share one. */
    ...[...new Set(PROJECTS.flatMap((project) => project.images))]
      .map((src) => ({ src, width: PROJECT })),
  ],
  '/about': [
    PORTRAIT_ENTRY,
    { src: visionAiDemo, width: FIGURE },
    { src: earlyMotionDesign, width: FIGURE },
    { src: boltPrototype, width: FIGURE },
  ],
};


/* ── Schema image URLs ───────────────────────────────────────────────────────
   JSON-LD used to cite `image.src` straight off the import, which for a PNG
   source is the ORIGINAL: the portrait went into structured data at 1,192 KB
   while a ~100 KB WebP of the same picture sat beside it in _astro. Nobody
   loads those URLs in a browser, so no Core Web Vital ever noticed, but
   imageObject() stamps `license` and `acquireLicensePage` on exactly these
   nodes for the licensable-image feature, which makes them the URLs Google
   Images fetches. It also forced Astro to emit 3.7 MB of originals that no
   page renders.

   Same treatment the image sitemap already gives its <image:loc> entries, and
   for the same reason: pass the width the page really renders, so the URL is
   one that is genuinely in that page's srcset rather than an orphan variant
   generated for the schema alone.
   ------------------------------------------------------------------------- */
export async function schemaImageUrl(
  src: ImageMetadata,
  width: number,
  site?: URL,
): Promise<string> {
  const processed = await getImage({ src, width, format: 'webp' });
  return absoluteUrl(processed.src, site);
}
