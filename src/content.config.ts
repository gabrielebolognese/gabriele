import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // Coerced to a real Date so it can be emitted as an ISO 8601 string for
      // article:published_time and BlogPosting.datePublished. It used to be a
      // bare string, which meant neither was possible without reparsing.
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      description: z.string(),
      // image() runs the cover through astro:assets, so article covers get the
      // same AVIF/WebP + srcset treatment as everything else.
      image: image(),
      imageAlt: z.string().optional(),
      /** Set true to keep a post out of the sitemap, the index and the RSS feed. */
      draft: z.boolean().default(false),
    }),
});

export const collections = { articles };
