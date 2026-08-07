import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { load as loadYaml } from 'js-yaml';

/* Was `articles`. Folded into one publication because two thin writing
   surfaces compete with each other, the same mistake story.html made against
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
      /** Renders and is linked, but tells crawlers to stay away. Unlike `draft`
       *  the page still builds, which is the point: layout props can be checked
       *  on the live deploy without putting filler into the index of a site
       *  whose whole purpose is being indexed correctly. */
      noindex: z.boolean().default(false),
    }),
});

/* The devlog. `file()` rather than `glob()`: every entry lives in ONE yaml
   file, so publishing is "add a block at the top and commit", doable from a
   phone in under a minute, which is the only reason a daily log survives.

   The custom parser exists because file() requires an id on every item and
   does NOT derive one from array position. Returning an object rather than an
   array makes its keys the ids, so the yaml stays free of an `id:` line that
   would only ever duplicate `date:`, one less thing to type, and one less
   thing to get wrong, every single day. */
const devlog = defineCollection({
  loader: file('./src/content/devlog.yaml', {
    parser: (text) => {
      const entries = (loadYaml(text) ?? []) as Array<Record<string, unknown>>;
      return Object.fromEntries(
        entries.map((entry) => {
          const raw = entry.date;
          // js-yaml 5 hands back a string here, but older majors resolve the
          // YAML timestamp type to a Date. Normalise either into YYYY-MM-DD.
          const id = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw);
          return [id, entry];
        }),
      );
    },
  }),
  schema: ({ image }) =>
    z.object({
      date: z.coerce.date(),
      /** One sentence. The timeline headline. */
      text: z.string(),
      /** Optional long form, rendered as markdown at build time. */
      detail: z.string().optional(),
      image: image().optional(),
      imageAlt: z.string().optional(),
    })
      // An image with no alt is a bug rather than a style preference, so it
      // fails the build rather than shipping an unlabelled screenshot.
      .refine((entry) => !entry.image || !!entry.imageAlt, {
        message: 'devlog entries with an image must set imageAlt',
        path: ['imageAlt'],
      }),
});

export const collections = { newsletter, devlog };
