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
import { PAGE_IMAGES, CARD, COVER } from '../data/images';
import { absoluteUrl } from '../data/identity';

interface Entry {
  page: string;
  images: string[];
}

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
  const entries: Entry[] = [];

  for (const [path, images] of Object.entries(PAGE_IMAGES)) {
    const locs = await Promise.all(
      images.map(async ({ src, width }) => {
        const built = await getImage({ src, width, format: 'webp' });
        return absoluteUrl(built.src, site);
      }),
    );
    entries.push({ page: absoluteUrl(path, site), images: locs });
  }

  /* Article covers are collection data rather than page imports, so they are
     resolved here instead of in the manifest. Drafts are excluded for the same
     reason they are excluded from the sitemap and the feed. */
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const cards: string[] = [];

  for (const article of articles) {
    const cover = await getImage({ src: article.data.image, width: COVER, format: 'webp' });
    entries.push({
      page: absoluteUrl(`/articles/${article.id}`, site),
      images: [absoluteUrl(cover.src, site)],
    });

    // The same cover, at the size Card.astro renders it on the archive hub.
    const card = await getImage({ src: article.data.image, width: CARD, format: 'webp' });
    cards.push(absoluteUrl(card.src, site));
  }

  if (cards.length) {
    entries.push({ page: absoluteUrl('/articles', site), images: cards });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.page)}</loc>
${entry.images.map((loc) => `    <image:image><image:loc>${escapeXml(loc)}</image:loc></image:image>`).join('\n')}
  </url>`,
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
