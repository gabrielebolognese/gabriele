/* ============================================================================
   editing.ts: the pieces on /editing, and the process copy beside them.

   Adding a piece is two steps:

     1. Add it to scripts/editing-clips.json (slug + path to the master) and
        run `node scripts/encode-editing.mjs`. That writes <slug>.mp4,
        <slug>.av1.mp4 and <slug>.jpg into src/assets/editing/ and refreshes
        src/data/editing-media.json.
     2. Add a block to REELS below with the same slug.

   Display order is the order of REELS within each category, and categories
   appear in the order of SHORT_CATEGORIES. The files are found by glob, but
   glob order is filesystem order, so it is never used for display; the glob
   is only a lookup table keyed by slug.

   Same rule as projects.ts: every field is written from fact. Titles are the
   on-screen hook or title card of each piece, the one thing visible in the
   footage itself, and no streamer is named in them even where the captions
   do: this is a portfolio of the edit, not a claim about who is in it. Client,
   date and summary are unknown until the site owner says otherwise, so they
   are null and marked TODO rather than guessed. A null date also keeps the
   piece out of the VideoObject schema, because Google requires uploadDate
   there and an invented one is worse than none.
   ========================================================================= */

import type { ImageMetadata } from 'astro';
import media from './editing-media.json';

export type Category = 'motion' | 'gaming' | 'animation' | 'business';

export const CATEGORY_LABEL: Record<Category, string> = {
  motion: 'Motion graphics',
  gaming: 'Gaming',
  animation: 'Animations',
  business: 'Business',
};

/** The rows of the short-form section, top to bottom. */
export const SHORT_CATEGORIES: Category[] = ['motion', 'gaming', 'animation'];

export interface Reel {
  /** Matches src/assets/editing/<slug>.{mp4,av1.mp4,jpg}. */
  slug: string;
  title: string;
  format: 'short' | 'long';
  category: Category;
  /** What kind of piece, shown on the card. */
  kind: string;
  /** The channel it was made for or published on. null when not confirmed. */
  channel: string | null;
  /** Who it was made for. null means personal, spec, or not yet confirmed. */
  client: string | null;
  /** 'YYYY-MM-DD' or 'YYYY-MM'. null hides it from the schema (see above). */
  date: string | null;
  /** A line under the meta, for context the numbers cannot give. An excerpt
   *  gets one automatically from editing-media.json; this is for the rest. */
  note: string | null;
  /** One or two sentences, first person. Not rendered while null. */
  summary: string | null;
  /** Software used. Not rendered while empty. */
  tools: string[];
}

const UNCONFIRMED = { client: null, date: null, summary: null, tools: [] as string[] }; // TODO: per piece

export const REELS: Reel[] = [
  /* ── Short form: motion graphics ────────────────────────────────────── */
  {
    slug: 'audience-is-the-real-money',
    title: 'The audience is the real money',
    format: 'short', category: 'motion', kind: 'Motion graphics explainer',
    channel: null, note: null, ...UNCONFIRMED,
  },
  {
    slug: 'if-someone-offered-you',
    title: 'If someone offered you',
    format: 'short', category: 'motion', kind: 'Motion graphics explainer',
    channel: null, note: null, ...UNCONFIRMED,
  },
  {
    slug: 'coffee-chain-lifestyle',
    title: 'How one coffee chain built a lifestyle',
    format: 'short', category: 'motion', kind: 'Brand story',
    channel: null, note: null, ...UNCONFIRMED,
  },
  {
    slug: 'we-dont-start-with-ads',
    title: 'We don’t start with ads',
    format: 'short', category: 'motion', kind: 'Agency explainer',
    // The footage carries a placeholder "Agency wordmark", so likely a spec piece.
    channel: null, note: null, ...UNCONFIRMED,
  },

  /* ── Short form: gaming ─────────────────────────────────────────────────
     Stream clips: facecam over GTA 6 gameplay, captioned word by word. The
     masters are ch5-*, so all five are from the same channel. */
  {
    slug: 'gta-6-short-chat-roasted-his-aim',
    title: 'Chat roasted his aim',
    format: 'short', category: 'gaming', kind: 'Stream clip',
    channel: null, note: null, ...UNCONFIRMED, // TODO: channel name
  },
  {
    slug: 'gta-6-short-he-came-to-fix-the-alarm',
    title: 'He came to fix the alarm',
    format: 'short', category: 'gaming', kind: 'Stream clip',
    channel: null, note: null, ...UNCONFIRMED,
  },
  {
    slug: 'gta-6-short-she-called-for-help',
    title: 'She called for help',
    format: 'short', category: 'gaming', kind: 'Stream clip',
    channel: null, note: null, ...UNCONFIRMED,
  },
  {
    slug: 'gta-6-short-chat-will-never-forgive-him',
    title: 'Chat will never forgive him',
    format: 'short', category: 'gaming', kind: 'Stream clip',
    channel: null, note: null, ...UNCONFIRMED,
  },
  {
    slug: 'gta-6-short-furries-are-loaded',
    title: 'Furries are loaded',
    format: 'short', category: 'gaming', kind: 'Stream clip',
    channel: null, note: null, ...UNCONFIRMED,
  },

  /* ── Short form: animations ─────────────────────────────────────────────
     The Scenarios channel. Titles are each video's own title card. */
  {
    slug: 'scenarios-until-sunday',
    title: 'Until Sunday',
    format: 'short', category: 'animation', kind: 'Animated story',
    channel: 'Scenarios', note: null, ...UNCONFIRMED,
  },
  {
    slug: 'scenarios-30-dollars-for-a-63-dollar-job',
    title: '$30 for a $63 job',
    format: 'short', category: 'animation', kind: 'Animated story',
    channel: 'Scenarios', note: null, ...UNCONFIRMED,
  },
  {
    slug: 'scenarios-no-car-14-orders',
    title: 'No car, 14 orders',
    format: 'short', category: 'animation', kind: 'Animated story',
    channel: 'Scenarios', note: null, ...UNCONFIRMED,
  },
  {
    slug: 'scenarios-a-warning-dated-tomorrow',
    title: 'A warning dated tomorrow',
    format: 'short', category: 'animation', kind: 'Animated story',
    channel: 'Scenarios', note: null, ...UNCONFIRMED,
  },

  /* ── Long form ───────────────────────────────────────────────────────── */
  {
    slug: 'gta-6-launch-business-video-hook',
    title: 'Just hours after the GTA 6 launch',
    format: 'long', category: 'business', kind: 'Business explainer',
    channel: null,
    // The master is the 15-second opening, exported as a sample on its own.
    note: 'The opening hook of a long-form video.',
    ...UNCONFIRMED,
  },
  {
    slug: 'gta-6-stream-highlights-long-form',
    title: 'GTA 6 stream highlights', // TODO: the video's real title
    format: 'long', category: 'gaming', kind: 'Stream highlights',
    channel: null, note: null, ...UNCONFIRMED,
  },
];

/** How a video gets made, in order. The site owner's own seven steps; the
 *  one-line descriptions only spell out what each step names. */
export const PROCESS: Array<{ title: string; text: string }> = [
  {
    title: 'Understand the requirements',
    text: 'What the video is for, who it is for, and where it will be posted.',
  },
  {
    title: 'Gather the footage',
    text: 'Collect the raw clips, recordings and brand assets the edit is built from.',
  },
  {
    title: 'Study what is going viral',
    text: 'Watch and break down viral videos in the same style: the hooks, the pacing, the captions, the sound.',
  },
  {
    title: 'Replicate the hooks, add your touch',
    text: 'Rebuild the hooks that work, then make them yours with the brand’s or the creator’s identity.',
  },
  {
    title: 'Edit in that style',
    text: 'Cut the full video in the style the research pointed to.',
  },
  {
    title: 'Export for review',
    text: 'You get a draft to watch and leave notes on.',
  },
  {
    title: 'Review and fix',
    text: 'Your notes go back into the edit before the final export.',
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
  sourceDuration?: number;
  fps: number;
  audio: boolean;
  h264: { bytes: number; codecs: string };
  av1: { bytes: number; codecs: string } | null;
}

export interface ResolvedReel extends Reel {
  poster: ImageMetadata;
  width: number;
  height: number;
  landscape: boolean;
  /** Seconds of what is published. */
  duration: number;
  /** Seconds of the whole piece; longer than `duration` for an excerpt. */
  sourceDuration: number;
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
        ].filter(Boolean).join(', ')}. Add it to scripts/editing-clips.json and run node scripts/encode-editing.mjs.`,
      );
    }

    const audio = meta.audio ? ', mp4a.40.2' : '';
    const sources = [
      ...(av1 && meta.av1 ? [{ src: av1, type: `video/mp4; codecs="${meta.av1.codecs}${audio}"` }] : []),
      { src: h264, type: `video/mp4; codecs="${meta.h264.codecs}${audio}"` },
    ];

    return {
      ...reel,
      poster,
      width: meta.width,
      height: meta.height,
      landscape: meta.width > meta.height,
      duration: meta.duration,
      sourceDuration: Math.max(meta.duration, meta.sourceDuration ?? meta.duration),
      audio: meta.audio,
      sources,
    };
  });
}

/** True when what is published is a cut-down of a longer master. */
export const isExcerpt = (reel: ResolvedReel) => reel.sourceDuration - reel.duration > 1;

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
