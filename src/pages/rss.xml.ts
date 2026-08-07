import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { PERSON, SITE, NEWSLETTER, absoluteUrl } from '../data/identity';

export async function GET(context: APIContext) {
  const issues = await getCollection('newsletter', ({ data }) => !data.draft && !data.noindex);
  /* By issue number, not date: two issues can share a date and the number is
     the canonical order, same rule the archive sorts by. */
  const sorted = issues.sort((a, b) => b.data.issue - a.data.issue);

  return rss({
    title: `${NEWSLETTER.name}, ${PERSON.name}`,
    description: NEWSLETTER.description,
    site: context.site ?? SITE.url,
    items: sorted.map((issue) => ({
      title: `№ ${String(issue.data.issue).padStart(3, '0')}, ${issue.data.title}`,
      description: issue.data.description,
      pubDate: issue.data.date,
      /* Absolutised here rather than left as a path: @astrojs/rss joins a bare
         path onto `site` and appends a trailing slash, which contradicts
         trailingSlash:'never' and makes the feed advertise a different URL than
         the canonical and the sitemap. */
      link: absoluteUrl(`/newsletter/${issue.id}`, context.site),
    })),
    customData: '<language>en</language>',
  });
}
