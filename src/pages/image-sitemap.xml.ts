/* ============================================================================
   /image-sitemap.xml — image discovery, which the main sitemap does not do.

   @astrojs/sitemap generates sitemap-index.xml from the route table but emits
   <url><loc> only. Google's image extension is a separate declaration, and it
   matters here because almost every image on this site is lazy-loaded inside a
   carousel — the case where crawl-time discovery is least reliable.

   Only <image:loc> is emitted. Google deprecated <image:title>, <image:caption>
   and <image:license> in image sitemaps and ignores them now; the licensing
   metadata that DOES get read lives in the ImageObject nodes in schema.ts and
   in each file's IPTC block.

   Listed in robots.txt alongside sitemap-index.xml, since a sitemap only has to
   be declared somewhere to be picked up.
   ========================================================================= */

import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import { PAGE_IMAGES, HOME_CARD, THUMB, COVER } from '../data/images';
import { absoluteUrl } from '../data/identity';

/** Astro's build-time image URLs are plain paths, but the dev server serves
 *  `/_image?href=...&w=...`, and a bare & is not valid XML. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const GET: APIRoute = async ({ site }) => {
  /* Keyed by page URL rather than a flat list: an issue cover appears on three
     different pages at three different sizes, and the same <loc> must not be
     emitted twice in one urlset. */
  const pages = new Map<string, string[]>();

  const add = (page: string, loc: string) => {
    const key = absoluteUrl(page, site);
    const list = pages.get(key) ?? [];
    if (!list.includes(loc)) list.push(loc);
    pages.set(key, list);
  };

  const built = async (src: Parameters<typeof getImage>[0]['src'], width: number) =>
    absoluteUrl((await getImage({ src, width, format: 'webp' })).src, site);

  for (const [path, images] of Object.entries(PAGE_IMAGES)) {
    for (const { src, width } of images) {
      add(path, await built(src, width));
    }
  }

  /* Issue covers are collection data rather than page imports, so they are
     resolved here instead of in the manifest. Drafts are excluded for the same
     reason they are excluded from the sitemap and the feed.

     Each cover is declared at the width the page in question actually renders:
     the hero on the issue itself, the IssueCard cover on the archive, and
     the Card on the homepage grid. */
  const issues = await getCollection('newsletter', ({ data }) => !data.draft && !data.noindex);

  for (const issue of issues) {
    add(`/newsletter/${issue.id}`, await built(issue.data.image, COVER));
    add('/newsletter', await built(issue.data.image, THUMB));
    add('/', await built(issue.data.image, HOME_CARD));
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[...pages]
  .map(
    ([page, images]) => `  <url>
    <loc>${escapeXml(page)}</loc>
${images.map((loc) => `    <image:image><image:loc>${escapeXml(loc)}</image:loc></image:image>`).join('\n')}
  </url>`,
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
