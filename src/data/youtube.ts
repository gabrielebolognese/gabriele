/* ============================================================================
   youtube.ts: the YouTube numbers, resolved once at build time.

   Same contract as github.ts and leetcode.ts: live-first, snapshot-second, and
   any failure falls back rather than failing the build.

   YOUTUBE_API_KEY is optional. Without it the counts are scraped off the
   channel's /about page, which works today and is the fragile half of this;
   with it they come from the YouTube Data API instead, one quota unit per
   build against a free 10,000/day allowance. The video list comes from the
   public channel feed either way, because that feed hands over view counts
   the API would charge two extra calls for.

   GITHUB_STATS_OFFLINE=1 skips the network here too: one switch for "build
   with no network" beats three.
   ========================================================================= */

import { fetchYoutubeStats } from './youtube-fetch.mjs';
import snapshot from './youtube-stats.json';

/** The @handle, without the @. The channel id is resolved from it at build
 *  time rather than pinned here, so a rename does not silently break the feed
 *  while the page keeps rendering yesterday's numbers. */
export const YOUTUBE_HANDLE = 'gabriele.bolognese';

export interface YoutubeVideo {
  id: string;
  title: string;
  url: string;
  published: string;
  thumbnail: string | null;
  views: number;
  ratings: number;
}

export interface YoutubeStats {
  capturedAt: string;
  handle: string;
  channelId: string;
  profileUrl: string;
  /** 'api' when a key was present, 'public' when the counts were scraped. */
  source: 'api' | 'public';
  /** The rounded string YouTube itself displays, when scraped. */
  subscriberText: string | null;
  /** null when the channel hides its subscriber count. */
  subscribers: number | null;
  videoCount: number | null;
  viewCount: number | null;
  joined: string | null;
  description: string | null;
  /** How many videos the ranking could see. The feed carries 15 at most. */
  rankedFrom: number;
  topVideos: YoutubeVideo[];
  /** True when the numbers came off the network this build. */
  live: boolean;
}

const fallback: YoutubeStats = {
  ...(snapshot as Omit<YoutubeStats, 'live'>),
  live: false,
};

let cached: Promise<YoutubeStats> | null = null;

async function resolve(): Promise<YoutubeStats> {
  if (process.env.GITHUB_STATS_OFFLINE === '1') {
    console.info('[youtube] offline, using the committed snapshot');
    return fallback;
  }

  try {
    const live = await fetchYoutubeStats(YOUTUBE_HANDLE, process.env.YOUTUBE_API_KEY);
    console.info(
      `[youtube] live (${live.source}): ${live.subscribers ?? '?'} subscribers, `
      + `${live.videoCount ?? '?'} videos, ${live.topVideos.length} ranked`,
    );
    return { ...(live as Omit<YoutubeStats, 'live'>), live: true };
  } catch (err) {
    console.warn(
      `[youtube] fetch failed (${err instanceof Error ? err.message : err}), `
      + `falling back to the snapshot of ${fallback.capturedAt}`,
    );
    return fallback;
  }
}

export function getYoutubeStats(): Promise<YoutubeStats> {
  if (!cached) cached = resolve();
  return cached;
}
