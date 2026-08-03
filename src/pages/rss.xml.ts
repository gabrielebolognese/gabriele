import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { PERSON, SITE } from '../data/identity';

export async function GET(context: APIContext) {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const sorted = articles.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: `${PERSON.name}, Articles`,
    description:
      'My writing on building FlashFX, motion design, and founding a software company on my own.',
    site: context.site ?? SITE.url,
    items: sorted.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.date,
      link: `/articles/${article.id}`,
    })),
    customData: '<language>en</language>',
  });
}
