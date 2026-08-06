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
`typescript` is installed — do not invent tooling. Deploy is Netlify from `master`; `netlify.toml` sets
the build command, pins `NODE_VERSION=22`, and defines the cache/security headers. `public/_redirects`
holds the 301s (`/story.html` → `/about`, `/articles/*` → `/newsletter/*`).

## Architecture

**`src/data/` is the source of truth for identity.** `identity.ts` holds the person facts, the `sameAs`
array, the organization, `FACTS` (user and Discord counts) and the handles; `schema.ts` builds the
JSON-LD; `faq.ts` holds Q&A rendered both as visible content and as `FAQPage` markup; `milestones.ts`
holds the dated life events; `images.ts` maps routes to the images they render, for the image sitemap.
Everything else imports from these. This exists because the head used to
be hand-duplicated between `index.astro` and `Layout.astro`, and the two copies had drifted into
contradictory Twitter handles, GitHub URLs and `sameAs` sets. **Never hardcode a URL, handle, count or
biographical fact in a page — add it to `identity.ts`.** Several entries there are still marked `TODO:`
pending confirmation from the site owner.

`PERSON.birthDate` drives the age counter and the life grid, so age is always derived — the hardcoded
"17-year-old" in the old copy went stale on its own. Note the deliberate voice split in `identity.ts`:
`PERSON.description` is first person (it ships as the meta description, and the site's body copy is
first person), while `PERSON.longDescription` is third person because it describes the Person entity to
a machine in JSON-LD.

**One head, one canonical.** `src/components/SEO.astro` owns every meta tag, the font `<link>`, and the
JSON-LD script. Canonical and `og:url` are derived from `Astro.url.pathname` via `absoluteUrl()`, never
written by hand — a hardcoded canonical in `Layout.astro` previously made every article declare itself
a duplicate of the homepage. `astro.config.mjs` must keep `site` set, or `Astro.site` is undefined and
both the canonicals and `@astrojs/sitemap` break.

**JSON-LD is a single `@graph` per page**, not separate blocks. Nodes cross-reference by `@id`
(`/#person`, `/#website`, `flashfx.app/#organization`) so they resolve to one entity. Only the homepage
emits `FAQPage` — the same FAQ entity on two indexable URLs is self-competition, which is why `/about`
renders the questions visibly but passes `faq: []` to its schema builder.

**Styling and motion live outside Astro.** `public/Style.css` and `public/motion.js` are served as-is,
never bundled. `Style.css` opens with a numbered table of contents; 01–04 are foundation and 05–18 are
one block per component, each owning its media queries (breakpoints 860px and 520px). All design tokens
— colour, type, spacing, and motion (`--ease`, `--ease-expo`, `--dur`, `--dur-reveal`) — live in the
single `:root` block. Component-scoped `<style>` blocks exist in `Card.astro`, `Faq.astro`,
`LifeSection.astro`, `IssueLayout.astro`, `about.astro`, `newsletter/index.astro` and `404.astro`; the
grids that lay them out stay in `Style.css`.

**The motion layer.** `html.js` is set by an inline head script before first paint, so every
hide-then-reveal rule is gated on it and no-JS visitors see the full page. When adding a section, three
lists must stay in sync: the `REVEAL` array in `motion.js`, and the selector list under "04. MOTION
SYSTEM" in `Style.css` — which is written **twice**, once to hide and once inside
`prefers-reduced-motion`. Miss one and the section is invisible in browsers with JS.

The countdown reads `data-deadline` off `.cd-section` and only ticks while the section is on screen and
the tab is visible — its digit animation forces a synchronous reflow, so running it unconditionally
costs INP. Carousels derive their image count from the DOM; the `1 / 6` in the markup is a placeholder
that gets overwritten. `initAge()` and `initLifeGrid()` only reconcile drift since the last deploy.

**The life section is shared, and deliberately cheap.** `LifeSection.astro` (age count-up, portrait,
About copy, life-in-weeks grid) renders on both `index.astro` and `about.astro`, extracted so the two
cannot drift the way the head once did; the page supplies its own copy via the default slot and toggles
`showLinks`/`aboutHeading`/`eager`. Its profile pills are derived from `SAME_AS` rather than hand-listed,
so every visible link corroborates a schema claim. `LifeGrid.astro` renders 4,680 cells and has two
constraints that are easy to undo by accident: it must **not** declare a scoped `<style>` (Astro would
stamp a `data-astro-cid-*` attribute on every cell — 131 KB of raw HTML, which is why its styles live
under "18. LIFE GRID" in `Style.css`), and cells stay wrapped in 90 row elements so the fill animation
can stagger off one `--r` per row instead of 4,680 inline delays. Both the age and the week count are
computed at build time so there is no layout shift and no-JS visitors get real values.

`milestones.ts` currently **mirrors** the hand-written timeline markup in `index.astro`. Re-date or add
an event in one and you must do it in the other, or the grid highlights the wrong week. Unifying them
would delete ~280 lines from `index.astro` and is worth doing.

**Images go through `astro:assets`.** They live in `src/assets/` (not `public/`) and are imported and
rendered with `<Image>`, which emits WebP plus a `srcset`. Use `<Image>` rather than `<Picture>` inside
carousels — `.carousel-track` is a flexbox and `.carousel-img` must remain its direct flex child, which
a `<picture>` wrapper would break. Article covers go through `image()` in the content schema, so
frontmatter paths are relative, not `/assets/...`.

**Asset filenames are load-bearing.** Astro emits `<source-basename>.<hash>.webp`, so the filename you
choose in `src/assets/` is the filename Google sees — the only keyword signal an image carries besides
its alt text. These were `1.png`, `33.png`, `1010.png`; keep new ones descriptive, and keep the local
import identifier saying the same thing as the file. Note that Astro dedupes on **content**, so two
byte-identical sources collapse into one emitted file under one of the two names — `7.png` and
`111.png` were the same picture, which is why the homepage's "AI features" screenshot and `/about`'s
"Bolt hackathon prototype" still resolve to a single file.

**Image discovery and licensing.** `@astrojs/sitemap` emits page URLs only, so `<image:image>`
declarations live in `src/pages/image-sitemap.xml.ts`, built from the manifest in `src/data/images.ts`
and listed in `robots.txt` alongside `sitemap-index.xml`. The manifest **mirrors** what pages import —
same drift hazard as `milestones.ts` — and each entry's `width` must be the widest value in that page's
`widths` array so `getImage()` regenerates a URL that is really in the page's srcset instead of
emitting an orphan variant. Only `<image:loc>` is emitted; Google ignores `image:title`, `image:caption`
and `image:license` in sitemaps now.

Licensing metadata rides on the ImageObject nodes instead, via `imageObject()` in `schema.ts`, which
stamps `license` and `acquireLicensePage` from `IMAGE_LICENSE` in `identity.ts`. **Both point at
`/license`, and that page existing is a hard dependency** — Google drops the licensable-image
enhancement if either URL 404s. Rename or remove `src/pages/license.astro` and `IMAGE_LICENSE` has to
move with it.

**Pages.** `index.astro` (~1250 lines) renders `Layout.astro` like every other page. Issues go
`newsletter/[...slug].astro` → `IssueLayout.astro` → `Layout.astro`. Also `about.astro` (~440 lines,
the biography, converted from a standalone `public/story.html` that was orphaned and canonicalised to
flashfx.app), `newsletter/index.astro` (the archive), `404.astro`, `license.astro`, `rss.xml.ts` and
`image-sitemap.xml.ts`. The nav and the footer are hand-duplicated across all six page files plus
`IssueLayout` — add a link in one and you have added it in none.

**The newsletter is the only writing surface.** `/articles` was folded into it, on the reasoning that
two thin sections compete for one entity exactly as `story.html` competed with the homepage.
`public/_redirects` 301s both `/articles` and `/articles/*` across; `NEWSLETTER` in `identity.ts` owns
the name, description and Buttondown username.

`src/content.config.ts` defines the `newsletter` collection over `src/content/newsletter/**/*.{md,mdx}`.
`issue` is explicit rather than derived from date order, so back-dating an issue cannot renumber the
ones after it — and both the archive and the feed sort on it, not on `date`. `draft: true` removes an
issue from the homepage, the archive, the sitemap and the feed.

**Issues are `.mdx` so the body can place images properly.** `<Figure>` and `<Pair>` in
`src/components/newsletter/` take a `width` of `column` (680px), `wide` (1040px) or `full`, which maps
to named columns on the `.issue-body` grid in Style.css — that grid is the entire mechanism, and it
only reaches the figures because MDX renders them as **direct children of the slot**. Wrap the slot in
`IssueLayout` and every figure silently snaps back to the text width with nothing failing. Figures
number themselves with a CSS counter, and `<Pair>` increments it once, not twice.

`@astrojs/mdx` is pinned to `^6.0.3`: version 7 peers `astro@^7` and this project is on Astro 6.

## Content state

The first issue, `how-i-built-flashfx.mdx`, is `draft: true`. Its title promises a founder narrative
and its body is still FlashFX export-system documentation. As one post among many that was a title
mismatch; as issue 001 of a publication it would be the flagship, which is why it is held back rather
than shipped. `the-four-rebuilds.mdx` is issue 002 and is real.

The figures that used to contradict each other are now settled in `FACTS` and `ORGANIZATION`, confirmed
2026-07-31: 8,000 users, 3,400 Discord members, FlashFX founded 2024-01-01 (matching the homepage's
"Est. 2024"). Anything quoting a number reads from there. Note that the `/about` narrative separately
dates Vision AI Demo — an earlier, different project — to January 2024; that is not a contradiction.
