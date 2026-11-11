# gabrielebolognese.blog

The source of my personal site: a homepage and biography for Gabriele Bolognese, founder of FlashFX,
together with a devlog I add to most days and a newsletter archive for the longer pieces. It is a
static Astro 6 site with no UI framework, built to be read by people and parsed cleanly by search
and answer engines. It is a personal project, published so the code behind the site is readable.

Live at **[gabrielebolognese.blog](https://gabrielebolognese.blog)**.

## Features

**Pages**

- `/` homepage: introduction, life section with the life-in-weeks grid, a countdown, project
  cards, statistics, the story and timeline, the newsletter section, the latest devlog entries
  and an FAQ.
- `/about/`: the long biography, sharing the life section (age counter, portrait, life grid) with
  the homepage through one component.
- `/devlog/`: every devlog entry on a single page, one entry per day, with one column per project
  (FlashFX editor, landing page, this site).
- `/newsletter/` and `/newsletter/<slug>/`: the archive and one page per issue, written in MDX.
- `/license/`: the image licence page that the structured data points at.
- `/404`, `/rss.xml` (newsletter feed), `/image-sitemap.xml` and the generated `sitemap-index.xml`.

**Content model**

- Devlog entries live in one file, `src/content/devlog.yaml`, loaded with Astro's `file()` loader
  and a custom `js-yaml` parser keyed by date. Publishing is adding a block at the top and
  committing. An entry with an image but no alt text fails the build; a `detail` key that is not
  a known project is dropped by the schema, so that column does not render.
- Newsletter issues are a content collection over `src/content/newsletter/**/*.{md,mdx}` with an
  explicit `issue` number, `draft` (excluded from pages, archive, sitemap and feed) and `noindex`
  flags. The `<Figure>` and `<Pair>` components place images at column, wide or full width.
- Projects, identity facts, milestones, FAQ and tech stack are data files in `src/data/`, not
  markup. Pages import from them rather than hardcoding URLs, handles or counts.

**Statistics fetched at build time**

- GitHub (parsed from public HTML), LeetCode (public GraphQL endpoint) and YouTube (channel feed,
  plus either the public channel page or the YouTube Data API when a key is present).
- Each source is live first and falls back to a committed JSON snapshot on any failure, so stale
  numbers are possible but a broken build is not.

**SEO and structured data**

- One `SEO.astro` component owns every meta tag; canonical and `og:url` are derived from the route.
- A single JSON-LD `@graph` per page, built in `src/data/schema.ts`, with `FAQPage` on the homepage
  only and licensing metadata on image objects.
- Sitemap from `@astrojs/sitemap`, a separate image sitemap, an RSS feed, and a `robots.txt` that
  names the major AI crawlers explicitly.

**Performance and security guards**

- `scripts/check-budgets.mjs` runs after every build and fails it if the homepage or `/about` DOM
  element counts, homepage Brotli size, total emitted image weight or render-blocking stylesheet
  count exceed their budgets.
- `scripts/check-csp.mjs` runs after every build and fails it if the inline-script hash in the
  Content-Security-Policy in `netlify.toml` no longer matches the script in the built pages.
- Images go through `astro:assets` (WebP with `srcset`); fonts are self-hosted variable `.woff2`
  files; `Style.css` and `motion.js` are served unbundled with a content hash in the URL.
- `netlify.toml` sets long-lived cache headers, security headers and a report-only CSP.

**Motion layer**

- `public/motion.js` handles scroll reveals, the nav that condenses and retracts on scroll, the
  reading-progress line, the project gallery with its full-screen viewer, the skip controls, the
  countdown, the age counter and the life grid labels. Reveal rules are gated on an `html.js` class set before first paint, so the site is fully
  visible without JavaScript, and reduced-motion preferences are respected.

## Getting started

### Prerequisites

- Node.js 22.12 or newer (`engines` in `package.json`; Netlify is pinned to Node 22).
- npm (the repo ships a `package-lock.json`).

### Download and install

```sh
git clone https://github.com/gabrielebolognese/gabriele.git
cd gabriele
npm install
```

### Configuration

Nothing is required. Two optional environment variables are read at build time:

| Variable | Effect |
| :--- | :--- |
| `YOUTUBE_API_KEY` | Fetch YouTube channel counts from the YouTube Data API instead of the public channel page. |
| `GITHUB_STATS_OFFLINE` | Set to `1` to skip all network fetches (GitHub, LeetCode and YouTube) and build from the committed snapshots. |

The newsletter signup form posts to Buttondown once `NEWSLETTER.buttondownUser` is set in
`src/data/identity.ts`; it is currently empty, so the form renders without an action.

### Run in development

```sh
npm run dev
```

Astro prints the local URL when the server starts (port 4321 by default; the repo does not override it).

## Build and deploy

```sh
npm run build
```

This produces a static site in `./dist`, then automatically runs the budget and CSP checks as the
`postbuild` step. A failed check fails the build. `npm run preview` serves the built `./dist`
locally.

The site deploys to Netlify from the `master` branch. `netlify.toml` sets the build command
(`npm run build`), the publish directory (`dist`), the Node version and all response headers;
`public/_redirects` holds the 301s from the old `/story` and `/articles` URLs. Because the checks
run as an npm `postbuild` hook, the build command must stay `npm run build` for them to fire.

## Usage

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Start the Astro dev server. |
| `npm run build` | Static build to `./dist`, followed by the budget and CSP checks. |
| `npm run preview` | Serve the built `./dist`. |
| `npm run stats:refresh` | Refetch GitHub, LeetCode and YouTube and rewrite the three committed snapshots in `src/data/`. It does not commit. |
| `npm run check:budgets` | Run the size and DOM budgets against an existing `./dist`. |
| `npm run check:csp` | Check the CSP hash in `netlify.toml` against an existing `./dist`. |
| `npm run astro -- <command>` | Run the Astro CLI directly. |

There is no test suite, linter or formatter.

**Publishing a devlog entry:** add a block at the top of `src/content/devlog.yaml` with `date`
(YYYY-MM-DD, one entry per date), a one-sentence `text`, and an optional `detail` keyed by project
(`app`, `landing`, `site`), each value a markdown block. Commit to `master`.

**Publishing a newsletter issue:** add an `.mdx` file to `src/content/newsletter/` with `issue`,
`title`, `date`, `description` and `image` (a path relative to the file, into `src/assets/`) in the
frontmatter. Set `draft: true` to keep it out of the build.

**Changing a fact, handle, link or count:** edit `src/data/identity.ts`; pages and structured data
read from there.

## Project structure

| Path | What it holds |
| :--- | :--- |
| `src/pages/` | Routes: homepage, about, devlog, newsletter archive and issues, licence, 404, RSS and image sitemap. |
| `src/layouts/` | `Layout.astro` (every page) and `IssueLayout.astro` (newsletter issues). |
| `src/components/` | Nav, SEO head, project cards, statistics, life section and grid, devlog timeline, FAQ, subscribe form, newsletter figures. |
| `src/data/` | Source of truth: identity, schema.org builders, projects, milestones, FAQ, stack, image manifest, and the GitHub, LeetCode and YouTube fetchers with their JSON snapshots. |
| `src/content/devlog.yaml` | Every devlog entry, in one file. |
| `src/content/newsletter/` | One `.mdx` file per issue. |
| `src/content.config.ts` | Content collection schemas for the newsletter and the devlog. |
| `src/assets/` | Images and videos, processed by `astro:assets`. |
| `public/Style.css` | The whole stylesheet, numbered by section. |
| `public/motion.js` | The motion layer. |
| `public/fonts/` | Self-hosted variable fonts. |
| `scripts/` | Build guards (`check-budgets`, `check-csp`) and the three stats refreshers. |
| `netlify.toml`, `public/_redirects` | Deploy configuration, headers and redirects. |

## Tech stack

- [Astro](https://astro.build) 6, static output, no UI framework
- `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/rss`
- `sharp` for image processing, `js-yaml` for the devlog parser
- Plain CSS and plain JavaScript, served from `public/`
- Netlify for hosting

## Further documentation

- [CLAUDE.md](CLAUDE.md): a tour of the architecture and the decisions behind it. Parts of it trail
  the code (for example the number of project cards), so where they differ the code is right.
- [PERFORMANCE-PLAN.md](PERFORMANCE-PLAN.md): the performance, accessibility and best-practice plan
  the build budgets refer to.

The section headers inside `Style.css`, `motion.js`, `netlify.toml` and the files in `src/data/`
explain the choices made there.

## Status

A personal site, live and actively maintained. The Content-Security-Policy is still report-only,
the newsletter signup is not yet connected to Buttondown, and several entries in
`src/data/identity.ts` are marked `TODO`. The repository has no licence file; the `/license/` page
covers only how the images on the site may be used.
