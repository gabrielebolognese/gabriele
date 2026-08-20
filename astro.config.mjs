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

  // 'always', because that is what the host actually serves. This said 'never'
  // on the belief that Netlify strips the trailing slash; measured against
  // production it does the opposite, 301ing /about to /about/. The result was
  // that every canonical on the site pointed at a URL that redirected, and
  // every internal click paid a round trip before a byte of the destination
  // arrived. build.format is 'directory', so /about/ is the file that exists;
  // the slash-less form was never the real URL.
  trailingSlash: 'always',

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
