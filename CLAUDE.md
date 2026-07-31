# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal site/blog for Gabriele Bolognese (gabrielebolognese.blog), built with Astro 6, no UI framework
integrations. Package name is `orbital-osiris` (leftover from the Astro minimal starter). The git repo
root is this `gabriele/` directory, nested one level inside the `blogSite/` working directory — run all
commands from here.

## Commands

```sh
npm run dev              # dev server at localhost:4321
npm run build            # static build to ./dist
npm run preview          # serve the built ./dist
npm run astro -- check   # diagnostics — prompts to install @astrojs/check + typescript first
```

Requires Node >= 22.12. There is no test suite, linter, or formatter, and neither `@astrojs/check` nor
`typescript` is installed — do not invent tooling. Deploy is Netlify, pushed from `master`.

## Architecture

**`src/data/` is the source of truth for identity.** `identity.ts` holds the person facts, the `sameAs`
array, the organization, and the handles; `schema.ts` builds the JSON-LD; `faq.ts` holds Q&A rendered
both as visible content and as `FAQPage` markup. Everything else imports from these. This exists
because the head used to be hand-duplicated between `index.astro` and `Layout.astro`, and the two
copies had drifted into contradictory Twitter handles, GitHub URLs and `sameAs` sets. **Never hardcode
a URL, handle or biographical fact in a page — add it to `identity.ts`.** Several entries there are
still marked `TODO:` pending confirmation from the site owner.

**One head, one canonical.** `src/components/SEO.astro` owns every meta tag and the JSON-LD script.
Canonical and `og:url` are derived from `Astro.url.pathname` via `absoluteUrl()`, never written by
hand — a hardcoded canonical in `Layout.astro` previously made every article declare itself a duplicate
of the homepage. `astro.config.mjs` must keep `site` set, or `Astro.site` is undefined and both the
canonicals and `@astrojs/sitemap` break.

**JSON-LD is a single `@graph` per page**, not separate blocks. Nodes cross-reference by `@id`
(`/#person`, `/#website`, `flashfx.app/#organization`) so they resolve to one entity. Only the homepage
emits `FAQPage` — the same FAQ entity on two indexable URLs is self-competition, which is why `/about`
renders the questions visibly but passes `faq: []` to its schema builder.

**Styling and motion live outside Astro.** `public/Style.css` and `public/motion.js` are served as-is,
never bundled. `Style.css` opens with a numbered table of contents; 01–04 are foundation and 05+ are
one block per component, each owning its media queries (breakpoints 860px and 520px). All design tokens
— colour, type, spacing, and motion (`--ease`, `--ease-expo`, `--dur`, `--dur-reveal`) — live in the
single `:root` block. Component-scoped `<style>` blocks exist in `Card.astro`, `Faq.astro`,
`about.astro`, `articles/index.astro` and `404.astro`; the grids that lay them out stay in `Style.css`.

**The motion layer.** `html.js` is set by an inline head script before first paint, so every
hide-then-reveal rule is gated on it and no-JS visitors see the full page. When adding a section, three
lists must stay in sync: the `REVEAL` array in `motion.js`, and the selector list under "04. MOTION
SYSTEM" in `Style.css` — which is written **twice**, once to hide and once inside
`prefers-reduced-motion`. Miss one and the section is invisible in browsers with JS.

The countdown reads `data-deadline` off `.cd-section` and only ticks while the section is on screen and
the tab is visible — its digit animation forces a synchronous reflow, so running it unconditionally
costs INP. Carousels derive their image count from the DOM; the `1 / 6` in the markup is a placeholder
that gets overwritten.

**Images go through `astro:assets`.** They live in `src/assets/` (not `public/`) and are imported and
rendered with `<Image>`, which emits WebP plus a `srcset`. Use `<Image>` rather than `<Picture>` inside
carousels — `.carousel-track` is a flexbox and `.carousel-img` must remain its direct flex child, which
a `<picture>` wrapper would break. Article covers go through `image()` in the content schema, so
frontmatter paths are relative (`../../assets/1.png`), not `/assets/...`.

**Pages.** `index.astro` (~1240 lines) renders `Layout.astro` like every other page. Articles go
`articles/[...slug].astro` → `ArticleLayout.astro` → `Layout.astro`. Also `about.astro` (the biography,
converted from a standalone `public/story.html` that was orphaned and canonicalised to flashfx.app),
`articles/index.astro` (the archive hub), `404.astro`, and `rss.xml.ts`.

`src/content.config.ts` defines the `articles` collection over `src/content/articles/**/*.md`. `date`
is `z.coerce.date()` — a real Date, so it can be emitted as ISO 8601 for `article:published_time` and
`datePublished`. `draft: true` removes a post from the homepage, the hub, the sitemap and the feed.
A new post is just a new `.md` file; the sitemap is generated from the route table.

## Content state

The single article, `how-i-built-flashfx.md`, is titled "How I Built FlashFX From Zero" but its body is
FlashFX export-system documentation — placeholder text awaiting the real post. The title/description
promise a founder narrative the body does not deliver, which is a live title-mismatch risk now that
articles are actually indexable. It is still published; setting `draft: true` is the one-line fix.

Several self-reported figures disagree across the site (users: 15,200 vs 15,000+ vs 15k+; Discord:
3,600 vs 3,400) and `/about` says FlashFX was founded in 2025 while the homepage says "Est. 2024".
`FACTS` in `identity.ts` is where these should be unified once confirmed.
