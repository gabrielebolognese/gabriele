// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
// Newsletter issues are .mdx so they can call <Figure> and <Pair>. Plain
// markdown can only place an image one way, at one width, with no caption.
// Pinned to 6.x: @astrojs/mdx@7 peers astro ^7 and this project is on 6.
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // `site` is the prerequisite for everything SEO: without it `Astro.site` is
  // undefined, canonicals cannot be built from the route, and @astrojs/sitemap
  // refuses to run.
  site: 'https://gabrielebolognese.blog',

  // Netlify's default "Pretty URLs" strips the trailing slash, so canonicals,
  // the sitemap, and the served URL all have to agree on the slash-less form.
  trailingSlash: 'never',

  integrations: [
    mdx(),
    sitemap({
      // Replaces the hand-maintained public/sitemap.xml, which listed two URLs
      // and no articles. This one is generated from the real route table.
      filter: (page) => !page.includes('/404'),
    }),
  ],

  image: {
    // Screenshots are the bulk of the payload; AVIF/WebP are emitted per-image
    // by <Image>/<Picture> and the originals are never shipped.
    responsiveStyles: true,
  },

  build: {
    format: 'directory',
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
