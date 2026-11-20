/* ============================================================================
   editing.ts: the pieces on /editing, in display order.

   Adding one is two steps:

     1. Put the master in blogSite/editing-sources/<slug>.<ext> and run
        `node scripts/encode-editing.mjs`. That writes <slug>.mp4,
        <slug>.av1.mp4 and <slug>.jpg into src/assets/editing/ and refreshes
        src/data/editing-media.json.
     2. Add a block to REELS below with the same slug.

   The order of REELS is the order on the page. The files are found by glob,
   but glob order is filesystem order, so it is never used for display; the
   glob is only a lookup table keyed by slug.

   Same rule as projects.ts: every field is written from fact. Titles below
   are the on-screen hook of each piece, which is the one thing visible in the
   footage itself. Client, date and summary are unknown until the site owner
   says otherwise, so they are null and marked TODO rather than guessed. A
   null date also keeps the piece out of the VideoObject schema, because
   Google requires uploadDate there and an invented one is worse than none.
   ========================================================================= */

import type { ImageMetadata } from 'astro';
import media from './editing-media.json';

export interface Reel {
  /** Matches src/assets/editing/<slug>.{mp4,av1.mp4,jpg}. */
  slug: string;
  title: string;
  /** What kind of piece, shown on the card. */
  kind: string;
  /** Who it was made for. null means personal, spec, or not yet confirmed. */
  client: string | null;
  /** 'YYYY-MM-DD' or 'YYYY-MM'. null hides it from the schema (see above). */
  date: string | null;
  /** One or two sentences, first person. Not rendered while null. */
  summary: string | null;
  /** Software used. Not rendered while empty. */
  tools: string[];
}

export const REELS: Reel[] = [
  {
    slug: 'audience-is-the-real-money',
    title: 'The audience is the real money',
    kind: 'Motion graphics explainer',
    client: null, // TODO: client or "spec"
    date: null, // TODO: when it was made
    summary: null, // TODO
    tools: [], // TODO: e.g. After Effects, Premiere Pro
  },
  {
    slug: 'if-someone-offered-you',
    title: 'If someone offered you',
    kind: 'Motion graphics explainer',
    client: null, // TODO
    date: null, // TODO
    summary: null, // TODO
    tools: [], // TODO
  },
  {
    slug: 'coffee-chain-lifestyle',
    title: 'How one coffee chain built a lifestyle',
    kind: 'Brand story',
    client: null, // TODO
    date: null, // TODO
    summary: null, // TODO
    tools: [], // TODO
  },
  {
    slug: 'we-dont-start-with-ads',
    title: 'We don’t start with ads',
    kind: 'Agency explainer',
    client: null, // TODO: the footage carries a placeholder "Agency wordmark"
    date: null, // TODO
    summary: null, // TODO
    tools: [], // TODO
  },
];

/* ── Media lookup ────────────────────────────────────────────────────────────
   Vite resolves each import to a fingerprinted /_astro URL, which netlify.toml
   already caches as immutable. That is the reason these live in src/assets
   and not public/: a public/ file keeps one URL forever, so it either gets no
   long cache or goes stale when a clip is re-encoded. */

const posters = import.meta.glob<ImageMetadata>('../assets/editing/*.jpg', {
  eager: true,
  import: 'default',
});
const videos = import.meta.glob<string>('../assets/editing/*.mp4', {
  eager: true,
  import: 'default',
});

interface MediaEntry {
  width: number;
  height: number;
  duration: number;
  fps: number;
  audio: boolean;
  h264: { bytes: number; codecs: string };
  av1: { bytes: number; codecs: string } | null;
}

export interface ResolvedReel extends Reel {
  poster: ImageMetadata;
  width: number;
  height: number;
  /** Seconds. */
  duration: number;
  audio: boolean;
  /** Best first. Each carries the codecs string, so a browser that cannot
   *  decode AV1 skips that source without downloading a byte of it. */
  sources: Array<{ src: string; type: string }>;
}

const MANIFEST = media as Record<string, MediaEntry>;

/** Fails the build, by design, when a reel has no files: a card with a dead
 *  <video> renders fine and plays nothing, and nobody notices for weeks. */
export function resolveReels(): ResolvedReel[] {
  return REELS.map((reel) => {
    const base = `../assets/editing/${reel.slug}`;
    const poster = posters[`${base}.jpg`];
    const h264 = videos[`${base}.mp4`];
    const av1 = videos[`${base}.av1.mp4`];
    const meta = MANIFEST[reel.slug];

    if (!poster || !h264 || !meta) {
      throw new Error(
        `editing.ts: "${reel.slug}" is missing ${[
          !h264 && `${reel.slug}.mp4`,
          !poster && `${reel.slug}.jpg`,
          !meta && 'its editing-media.json entry',
        ].filter(Boolean).join(', ')}. Run node scripts/encode-editing.mjs.`,
      );
    }

    const sources = [
      ...(av1 && meta.av1 ? [{ src: av1, type: `video/mp4; codecs="${meta.av1.codecs}${meta.audio ? ', mp4a.40.2' : ''}"` }] : []),
      { src: h264, type: `video/mp4; codecs="${meta.h264.codecs}${meta.audio ? ', mp4a.40.2' : ''}"` },
    ];

    return {
      ...reel,
      poster,
      width: meta.width,
      height: meta.height,
      duration: meta.duration,
      audio: meta.audio,
      sources,
    };
  });
}

/** 17.8 -> "0:18". */
export function clock(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 17.8 -> "PT18S", for VideoObject.duration. */
export function isoDuration(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return `PT${m ? `${m}M` : ''}${s % 60}S`;
}
