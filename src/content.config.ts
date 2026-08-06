import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* Was `articles`. Folded into one publication because two thin writing
   surfaces compete with each other — the same mistake story.html made against
   the homepage. Issues are .mdx so the body can call <Figure> and <Pair>;
   plain .md still loads, it just cannot place an image more than one way. */
const newsletter = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/newsletter' }),
  schema: ({ image }) =>
    z.object({
      /** Explicit, never derived from date order: back-dating an issue must not
       *  silently renumber every issue published after it. */
      issue: z.number().int().positive(),
      title: z.string(),
      // Coerced to a real Date so it can be emitted as an ISO 8601 string for
      // article:published_time and BlogPosting.datePublished. It used to be a
      // bare string, which meant neither was possible without reparsing.
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      description: z.string(),
      /** Optional serif standfirst under the title. Falls back to description. */
      standfirst: z.string().optional(),
      // image() runs the cover through astro:assets, so issue covers get the
      // same AVIF/WebP + srcset treatment as everything else.
      image: image(),
      imageAlt: z.string().optional(),
      /** Set true to keep an issue out of the sitemap, the archive and the feed. */
      draft: z.boolean().default(false),
    }),
});

export const collections = { newsletter };
