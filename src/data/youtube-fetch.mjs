/* ============================================================================
   youtube-fetch.mjs: the YouTube half of the statistics section.

   Two sources, because YouTube splits the data across them:

   1. The channel feed at /feeds/videos.xml?channel_id=... No key, no auth, and
      it has been at that URL for over a decade. It carries every video's id,
      title, publish date, description, thumbnail AND its view count, in
      <media:statistics views="N">. That last one is the surprise: it means
      "most watched" can be ranked without an API key at all.

   2. The channel's /about page, for subscriber, video and total view counts,
      which are not in the feed. This is a scrape of ytInitialData and it is
      the fragile half. Note the /about path specifically: the plain channel
      URL serves a payload with no counts in it whatsoever.

   Set YOUTUBE_API_KEY and (2) is replaced by the official Data API, which is
   the same numbers under a supported contract. See getChannelStats() below.
   The feed is used either way; the API's per-video statistics would cost two
   extra calls to get a number the feed already gives away.
   ========================================================================= */

const TIMEOUT_MS = 8000;

/** YouTube serves a different, count-free page to a client with no UA, and a
 *  consent interstitial to some regions. ucbcb=1 is what the "reject all" link
 *  sets, so asking for it directly skips the wall without accepting anything. */
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function get(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

const DECODE = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const decode = (s) => s.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => DECODE[m] ?? m);

/* ── The channel id ──────────────────────────────────────────────────────────
   The feed is keyed by channel id, not by handle, and the two are unrelated
   strings. The id is on the handle page as externalId, so it is resolved once
   here rather than pasted into config where it would be a second thing to keep
   true if the channel ever moved.
   ------------------------------------------------------------------------- */
export function parseChannelId(html) {
  return (html.match(/"externalId":"(UC[\w-]+)"/) || [])[1] ?? null;
}

/* ── Channel counts, scraped ─────────────────────────────────────────────────
   ytInitialData carries these as display strings ("9 subscribers", "1.2K
   subscribers"), not as integers, so the number has to be read back out of the
   text. YouTube rounds anything above 1,000 to three significant figures on
   the page itself, which is why the API path is worth having: it returns the
   same rounding for subscribers but exact video and view counts.
   ------------------------------------------------------------------------- */
export function parseChannelStats(html) {
  const grab = (re) => (html.match(re) || [])[1] ?? null;

  const subsText = grab(/"subscriberCountText":"([^"]+)"/);
  const videosText = grab(/"videoCountText":"([^"]+)"/);
  const viewsText = grab(/"viewCountText":"([^"]+)"/);

  return {
    subscriberText: subsText,
    subscribers: parseCompact(subsText),
    videoCount: parseCompact(videosText),
    viewCount: parseCompact(viewsText),
    joined: grab(/"joinedDateText":\{"content":"Joined ([^"]+)"/),
    /* Lifted out of a JSON string inside the HTML, so its escapes are still
       literal two-character sequences: \n arrives as a backslash and an n. */
    description: unescapeJson(grab(/"description":"([^"]{0,600}?)"/)),
  };
}

function unescapeJson(s) {
  if (!s) return null;
  try {
    return JSON.parse(`"${s.replace(/"/g, '\\"')}"`);
  } catch {
    return s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
}

/** "9 subscribers" -> 9. "1.2K subscribers" -> 1200. "3.4M views" -> 3400000. */
export function parseCompact(text) {
  if (!text) return null;
  const m = text.replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  const scale = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] ?? '').toLowerCase()] ?? 1;
  return Math.round(Number(m[1]) * scale);
}

/* ── Videos, from the feed ───────────────────────────────────────────────── */
export function parseFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => {
    const grab = (re) => (entry.match(re) || [])[1] ?? null;
    return {
      id: grab(/<yt:videoId>([^<]+)</),
      title: decode(grab(/<title>([^<]*)</) ?? ''),
      url: grab(/<link rel="alternate" href="([^"]+)"/),
      published: grab(/<published>([^<]+)</),
      thumbnail: grab(/<media:thumbnail url="([^"]+)"/),
      views: Number(grab(/<media:statistics views="(\d+)"/) ?? 0),
      ratings: Number(grab(/<media:starRating count="(\d+)"/) ?? 0),
    };
  }).filter((v) => v.id);
}

/* ── The official API, used only when a key exists ───────────────────────────
   One call, one quota unit against a free 10,000/day allowance. Returns the
   same three counts as the scrape, under a contract that does not move when
   YouTube reorganises its markup.
   ------------------------------------------------------------------------- */
async function getChannelStats(channelId, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/channels`
    + `?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from the YouTube Data API`);

  const item = (await res.json()).items?.[0];
  if (!item) throw new Error(`no YouTube channel ${channelId}`);

  const n = (v) => (v === undefined || v === null ? null : Number(v));
  return {
    subscriberText: null,
    subscribers: item.statistics.hiddenSubscriberCount ? null : n(item.statistics.subscriberCount),
    videoCount: n(item.statistics.videoCount),
    viewCount: n(item.statistics.viewCount),
    joined: item.snippet.publishedAt
      ? new Date(item.snippet.publishedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
      })
      : null,
    description: item.snippet.description ?? null,
  };
}

/**
 * @param handle  the @name, without the @
 * @param apiKey  optional. With it the counts come from the Data API; without
 *                it they are scraped. The video list is the feed either way.
 */
export async function fetchYoutubeStats(handle, apiKey) {
  const base = `https://www.youtube.com/@${handle}`;
  const about = await get(`${base}/about?ucbcb=1`);

  const channelId = parseChannelId(about);
  if (!channelId) throw new Error(`could not resolve a channel id for @${handle}`);

  const stats = apiKey
    ? await getChannelStats(channelId, apiKey)
    : parseChannelStats(about);

  const feed = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  const videos = parseFeed(feed);

  /* Most watched first. The feed is in publish order, and "top" on a channel
     means watched, not newest: a channel's best video is rarely its last. */
  const top = [...videos].sort((a, b) => b.views - a.views).slice(0, 3);

  if (stats.subscribers === null && stats.videoCount === null && !videos.length) {
    throw new Error('parsed nothing usable from YouTube');
  }

  return {
    capturedAt: new Date().toISOString(),
    handle,
    channelId,
    profileUrl: base,
    source: apiKey ? 'api' : 'public',
    ...stats,
    /* The feed only ever carries the 15 most recent uploads, so this is a
       count of what could be ranked, not of what exists. Worth keeping so the
       page never implies it picked the best of everything. */
    rankedFrom: videos.length,
    topVideos: top,
  };
}
