# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal site/blog for Gabriele Bolognese (gabrielebolognese.blog), built with Astro 6, no UI framework
integrations. Package name is `orbital-osiris` (leftover from the Astro minimal starter). The git repo
root is this `gabriele/` directory, nested one level inside the `blogSite/` working directory, run all
commands from here.

## Commands

```sh
npm run dev              # dev server at localhost:4321
npm run build            # static build to ./dist
npm run preview          # serve the built ./dist
npm run astro -- check   # diagnostics, prompts to install @astrojs/check + typescript first
```

Requires Node >= 22.12. There is no test suite, linter, or formatter, and neither `@astrojs/check` nor
`typescript` is installed, do not invent tooling. Deploy is Netlify from `master`; `netlify.toml` sets
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
biographical fact in a page, add it to `identity.ts`.** Several entries there are still marked `TODO:`
pending confirmation from the site owner.

`PERSON.birthDate` drives the age counter and the life grid, so age is always derived, the hardcoded
"17-year-old" in the old copy went stale on its own. Note the deliberate voice split in `identity.ts`:
`PERSON.description` is first person (it ships as the meta description, and the site's body copy is
first person), while `PERSON.longDescription` is third person because it describes the Person entity to
a machine in JSON-LD.

**One head, one canonical.** `src/components/SEO.astro` owns every meta tag, the font preloads, and the
JSON-LD script. Canonical and `og:url` are derived from `Astro.url.pathname` via `absoluteUrl()`, never
written by hand, a hardcoded canonical in `Layout.astro` previously made every article declare itself
a duplicate of the homepage. `astro.config.mjs` must keep `site` set, or `Astro.site` is undefined and
both the canonicals and `@astrojs/sitemap` break.

**JSON-LD is a single `@graph` per page**, not separate blocks. Nodes cross-reference by `@id`
(`/#person`, `/#website`, `flashfx.app/#organization`) so they resolve to one entity. Only the homepage
emits `FAQPage`, the same FAQ entity on two indexable URLs is self-competition, which is why `/about`
renders the questions visibly but passes `faq: []` to its schema builder.

**Styling and motion live outside Astro.** `public/Style.css` and `public/motion.js` are served as-is,
never bundled. `Style.css` opens with a numbered table of contents; 01–04 are foundation and 05–18 are
one block per component, each owning its media queries (breakpoints 860px and 520px). All design tokens
(colour, type, spacing, and motion: `--ease`, `--ease-expo`, `--dur`, `--dur-reveal`) live in the
single `:root` block. Component-scoped `<style>` blocks exist in `Faq.astro`, `LifeSection.astro`,
`IssueLayout.astro`, `about.astro`, `newsletter/index.astro` and `404.astro`; the grids that lay them
out stay in `Style.css`.

**The motion layer.** `html.js` is set by an inline head script before first paint, so every
hide-then-reveal rule is gated on it and no-JS visitors see the full page. When adding a section, three
lists must stay in sync: the `REVEAL` array in `motion.js`, and the selector list under "04. MOTION
SYSTEM" in `Style.css`, which is written **twice**, once to hide and once inside
`prefers-reduced-motion`. Miss one and the section is invisible in browsers with JS.

The countdown reads `data-deadline` off `.cd-section` and only ticks while the section is on screen and
the tab is visible, its digit animation forces a synchronous reflow, so running it unconditionally
costs INP. Carousels derive their image count from the DOM; the `1 / 6` in the markup is a placeholder
that gets overwritten. `initAge()` and `initLifeGrid()` only reconcile drift since the last deploy.

**The life section is shared, and deliberately cheap.** `LifeSection.astro` (age count-up, portrait,
About copy, life-in-weeks grid) renders on both `index.astro` and `about.astro`, extracted so the two
cannot drift the way the head once did; the page supplies its own copy via the default slot and toggles
`showLinks`/`aboutHeading`/`eager`. Its profile pills are derived from `SAME_AS` rather than hand-listed,
so every visible link corroborates a schema claim. `LifeGrid.astro` renders 4,680 cells and has two
constraints that are easy to undo by accident: it must **not** declare a scoped `<style>` (Astro would
stamp a `data-astro-cid-*` attribute on every cell, 131 KB of raw HTML, which is why its styles live
under "18. LIFE GRID" in `Style.css`), and cells stay wrapped in 90 row elements so the fill animation
can stagger off one `--r` per row instead of 4,680 inline delays. A third of the same kind: **every
square has a hover label but only the ~50 marked ones carry a `title` from the build** — all 4,680
would be ~145 KB of HTML, so `initGridTitles()` in `motion.js` labels the rest on first hover through
one delegated listener. Both the age and the week count are computed at build time so there is no
layout shift and no-JS visitors get real values.

Birthdays are derived in `LifeGrid.astro`, not listed in `milestones.ts`, and only the lived ones are
marked: the weeks ahead are a flat grey field on purpose and seventy-odd future rings would make the
half that has not happened the busiest half. The colour splits at 13 (`BIRTHDAY_SPLIT`), which is when
the site owner started working online. Year markers sit in a 40px right padding on `.life-grid` rather
than a 53rd column, counted back from the row being lived now in steps of `YEAR_EVERY` so the current
year is always labelled, and never on rows ahead.

`milestones.ts` currently **mirrors** the hand-written timeline markup in `index.astro`. Re-date or add
an event in one and you must do it in the other, or the grid highlights the wrong week. Unifying them
would delete ~280 lines from `index.astro` and is worth doing.

**Images go through `astro:assets`.** They live in `src/assets/` (not `public/`) and are imported and
rendered with `<Image>`, which emits WebP plus a `srcset`. Use `<Image>` rather than `<Picture>` inside
carousels, `.carousel-track` is a flexbox and `.carousel-img` must remain its direct flex child, which
a `<picture>` wrapper would break. Article covers go through `image()` in the content schema, so
frontmatter paths are relative, not `/assets/...`.

**Asset filenames are load-bearing.** Astro emits `<source-basename>.<hash>.webp`, so the filename you
choose in `src/assets/` is the filename Google sees, the only keyword signal an image carries besides
its alt text. These were `1.png`, `33.png`, `1010.png`; keep new ones descriptive, and keep the local
import identifier saying the same thing as the file. Note that Astro dedupes on **content**, so two
byte-identical sources collapse into one emitted file under one of the two names, `7.png` and
`111.png` were the same picture, which is why the homepage's "AI features" screenshot and `/about`'s
"Bolt hackathon prototype" still resolve to a single file.

**Phone photos need their rotation baked in before they land here.** Astro's sharp service does not
auto-orient, so a JPEG with EXIF `Orientation: 6`, every portrait shot from a phone, ships on its
side, with `width`/`height` attributes describing an aspect ratio the picture does not have. Rotate
with `sharp().rotate()` (no argument applies the tag), re-encode, and drop the tag. Issue covers want
the same treatment for a second reason: `.issue-cover` is `aspect-ratio: 16/9; object-fit: cover` and
the file is also the `og:image`, so a portrait cover pays for rows the layout discards and hands
social cards a crop nobody chose. Crop covers to 16:9 at the source.

**Image discovery and licensing.** `@astrojs/sitemap` emits page URLs only, so `<image:image>`
declarations live in `src/pages/image-sitemap.xml.ts`, built from the manifest in `src/data/images.ts`
and listed in `robots.txt` alongside `sitemap-index.xml`. The manifest **mirrors** what pages import,
same drift hazard as `milestones.ts`, and each entry's `width` must be the widest value in that page's
`widths` array so `getImage()` regenerates a URL that is really in the page's srcset instead of
emitting an orphan variant. Only `<image:loc>` is emitted; Google ignores `image:title`, `image:caption`
and `image:license` in sitemaps now.

Licensing metadata rides on the ImageObject nodes instead, via `imageObject()` in `schema.ts`, which
stamps `license` and `acquireLicensePage` from `IMAGE_LICENSE` in `identity.ts`. **Both point at
`/license`, and that page existing is a hard dependency**, Google drops the licensable-image
enhancement if either URL 404s. Rename or remove `src/pages/license.astro` and `IMAGE_LICENSE` has to
move with it.

**Pages.** `index.astro` (~1250 lines) renders `Layout.astro` like every other page. Issues go
`newsletter/[...slug].astro` → `IssueLayout.astro` → `Layout.astro`. Also `about.astro` (~440 lines,
the biography, converted from a standalone `public/story.html` that was orphaned and canonicalised to
flashfx.app), `newsletter/index.astro` (the archive), `404.astro`, `license.astro`, `rss.xml.ts` and
`image-sitemap.xml.ts`. The nav is `src/components/Nav.astro`, used by every page; it used to be
hand-copied into seven files and had already drifted (Story and Timeline existed on the homepage and
nowhere else) before it was extracted. The footer is still duplicated.

**One card component, two places.** `newsletter/IssueCard.astro` renders both the archive and the
homepage newsletter section, so the two cannot drift. It takes no image; the homepage passes
`ctaLabel`/`ctaHref` so every button there reads "Go to newsletter" and points at `/newsletter`
rather than at its own issue, while the titles still link to the issues. `Card.astro` was deleted
with that change, and so was the homepage cover declaration in `image-sitemap.xml.ts`: no page
renders an issue cover except the issue itself, and declaring one anywhere else would point the
sitemap at a URL that appears on no page.

**Fonts are self-hosted, and all four are variable.** `public/fonts/` holds ten `.woff2` files and
section 01 of `Style.css` declares them. They came from fonts.googleapis.com until 20 August 2026,
which put a render-blocking stylesheet on a third-party origin in the critical path: two extra DNS
lookups and TLS handshakes plus 23 KB of CSS before any text could reach its final face, on a site
with no other third-party request.

Three things there are easy to break. **Ten files, not thirty**, because one variable file per family
per subset spans the whole weight range; Google's CSS declares each weight separately while serving
the identical file, and those were collapsed into ranges. **Only latin and latin-ext** are shipped,
which `unicode-range` makes safe: latin-ext downloads solely when a glyph needs it, and Italian
accents and the euro sign are inside latin. And **a weight outside a declared range is synthesised,
not loaded**: `.stack-pill` asked DM Sans for 600 against a 300-500 range and got a faux bold at
10px uppercase.

Only two faces are preloaded, in `SEO.astro`: Lexend and DM Sans latin, the two the first screen
needs. `crossorigin` on those preloads is mandatory even though they are same-origin, because fonts
are fetched in CORS mode and a preload without it is a second request rather than a warm cache
entry.

**Lexend has no italic**, on Google Fonts or anywhere. `.chapter-pull` and `.issue-body blockquote`
set `--font-display` with `font-style: italic`, so both have always rendered a browser-synthesised
oblique and still do. Self-hosting did not change that either way. The real fix is a design call:
point those two at `--font-serif`, which is the site's actual italic and is loaded, or drop the
italic. See PERFORMANCE-PLAN.md 3.2.

**The CSP lives in `netlify.toml` and `scripts/check-csp.mjs` keeps it true.** The policy hashes the
one executable inline script on the site, `classList.add('js')`, which never changes, so a static
hash is stable. What is not stable is somebody editing that script by a character: the hash stops
matching, the browser refuses to run it, and **nothing fails**. The header is still valid, the page
still renders, and the only symptom is that the reveal rules never engage so everything just stays
visible. It looks fine. The guard runs on every build and fails it instead.

JSON-LD blocks are deliberately **not** hashed: `type="application/ld+json"` is never executed, so
`script-src` does not gate it. Hashing them would mean a new hash on every content edit for no gain.

It is **report-only**. To enforce: rename the key to `Content-Security-Policy` and delete the
`X-Frame-Options` line, which `frame-ancestors 'none'` supersedes, after loading the deploy once
with the console open.

Two rules there are easy to undo. `style-src` is `'unsafe-inline'` with **no hash**, because 242
load-bearing inline `style=""` attributes ship (`--brand`, `--pill`, `--r`) and adding any style
hash makes browsers ignore `'unsafe-inline'` and break all of them. And **no inline event handler
may be added anywhere**: one forces `script-src-attr 'unsafe-inline'` and gives away most of what
the policy is for, which is why `SubscribeForm`'s `onsubmit` was removed rather than allowed.

**No em dashes.** Every one on the site, and in this repo, was replaced with a colon, semicolon,
comma or bracket pair. If you write one, you are reintroducing something that was deliberately swept.
En dashes in numeric ranges (`€150–400`, `01–04`) are untouched and fine.

**The statistics section reads two accounts, and keeps them apart.** `src/data/github.ts` and
`src/data/leetcode.ts` are the same contract: fetch live at build, fall back to a committed snapshot on
any failure, and never fail the build. GitHub has no API for what is needed (contributions are not in
REST, pinned repos are GraphQL-only), so it parses public HTML; LeetCode has a real unauthenticated
GraphQL endpoint, so it queries that. Both refresh with `npm run stats:refresh`, and
`GITHUB_STATS_OFFLINE=1` skips the network for both.

Two accounts on one page is a presentation problem as much as a data one: one has two years of history
and the other is days old, so they get separate headed blocks with a 2px rule between them rather than
one run of figures where the full account flatters the empty one. The LeetCode copy calls the account
new and derives its age from `firstActive`, so the sentence cannot go stale, and LeetCode’s sentinel
rank for unplaced accounts (5,000,001) is mapped to null rather than printed as a number.

**The difficulty donut does not use LeetCode’s own colours.** #00b8a3 / #ffc01e / #ef4743 separate
well for colour-blind readers but the amber is 1.6:1 against a white page, and darkening it collapses
the amber-to-red pair to a deutan separation of 3.5, under the floor of 8. #00947f / #c97a00 / #c2255c
was stepped until all six checks pass on a light surface. Every arc is directly labelled and the same
numbers are a real `<table>` underneath, so identity never rests on colour alone. The submission grid
keeps GitHub’s greens, because it answers the same question the grid above it answers.

**The devlog is one page, never one page per entry.** `/devlog` holds every entry; a daily log split
across separate URLs is 365 pages of two sentences a year, which is thin content on a site whose whole
purpose is being read as one credible entity. `DevlogTimeline.astro` renders both the full page and the
truncated homepage section, so the two cannot drift.

**A day is one entry, and projects are columns inside it.** Since 2026-08-06 the log covers the
FlashFX editor, the FlashFX landing page and this site, so `detail` is keyed by project rather than
being one string: each key renders as a column under the shared headline. It was briefly one entry per
project instead, which put two "Day 6" rails one above the other and read as a duplicate rather than as
two projects. `src/data/devlog-projects.ts` holds the keys, the column labels and the left-to-right
order, and the schema builds its shape from `DEVLOG_PROJECT_KEYS`, so an unknown key fails the build.

Two things there are easy to get wrong. The detail schema is **not** `z.record(z.enum(...))`: a record
keyed by an enum is exhaustive in zod, so it demands every project on every day and any single-project
entry fails to parse. And the columns are `repeat(2, 1fr)`, not `auto-fit`, because with `auto-fit` a
one-project day would stretch to full width while a two-project day sat at half, and the same prose
would change measure between adjacent entries.

Every entry lives in `src/content/devlog.yaml`, one file, loaded with `file()` rather than `glob()`,
because publishing has to be "add a block at the top and commit" or a daily log dies in week two. The
custom parser in `content.config.ts` returns an **object** rather than an array so its keys become the
ids: `file()` requires an id per item and will not derive one from array position, and keying by date
keeps an `id:` line out of the yaml that would only duplicate `date:`. `js-yaml` is a direct dependency
for that parser, imported as `{ load }`, the v5 ESM build has no default export.

Each entry is a one-sentence `text` plus an optional markdown `detail`, rendered at build time with
`createMarkdownProcessor` from `@astrojs/markdown-remark` (already an Astro dependency, so no new
package). The headline is what makes a hundred entries scannable; the detail is the substance worth
indexing, and it ships in the HTML inside a `<details>`, collapsed content is still indexed, same
trade as `.life-events` on `/about`.

**The newsletter is the only long-form writing surface.** `/articles` was folded into it, on the reasoning that
two thin sections compete for one entity exactly as `story.html` competed with the homepage.
`public/_redirects` 301s both `/articles` and `/articles/*` across; `NEWSLETTER` in `identity.ts` owns
the name, description and Buttondown username.

`src/content.config.ts` defines the `newsletter` collection over `src/content/newsletter/**/*.{md,mdx}`.
`issue` is explicit rather than derived from date order, so back-dating an issue cannot renumber the
ones after it, and both the archive and the feed sort on it, not on `date`. `draft: true` removes an
issue from the homepage, the archive, the sitemap and the feed.

**Issues are `.mdx` so the body can place images properly.** `<Figure>` and `<Pair>` in
`src/components/newsletter/` take a `width` of `column` (680px), `wide` (1040px) or `full`, which maps
to named columns on the `.issue-body` grid in Style.css: that grid is the entire mechanism, and it
only reaches the figures because MDX renders them as **direct children of the slot**. Wrap the slot in
`IssueLayout` and every figure silently snaps back to the text width with nothing failing. Figures
number themselves with a CSS counter, and `<Pair>` increments it once, not twice.

`@astrojs/mdx` is pinned to `^6.0.3`: version 7 peers `astro@^7` and this project is on Astro 6.

## Content state

The first issue, `how-i-built-flashfx.mdx`, is `draft: true`. Its title promises a founder narrative
and its body is still FlashFX export-system documentation. As one post among many that was a title
mismatch; as issue 001 of a publication it would be the flagship, which is why it is held back rather
than shipped. `the-four-rebuilds.mdx` is issue 002 and is real.

`launch-day.mdx` is issue 009 and is a **scaffold, not a draft of anything**, headings and a note,
written for the site owner to fill in after launch happens. It is `draft: true`, so no page is built
for it at all (`[...slug].astro` filters drafts out of `getStaticPaths`, unlike `noindex`, which still
builds). Issue 008, `my-worst-setback.mdx`, is live and is the one it continues from.

The figures that used to contradict each other are now settled in `FACTS` and `ORGANIZATION`, confirmed
2026-07-31: 8,000 users, 3,400 Discord members, FlashFX founded 2024-01-01 (matching the homepage's
"Est. 2024"). Anything quoting a number reads from there. Note that the `/about` narrative separately
dates Vision AI Demo, an earlier, different project, to January 2024; that is not a contradiction.
