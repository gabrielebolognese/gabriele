# Performance, accessibility and best-practice plan

**Target:** `https://gabrielebolognese.blog`
**Measured:** 18 August 2026, against the live production deploy (confirmed current: the YouTube
statistics block is present).
**Status of each item:** nothing below has been implemented. This is the plan, not a changelog.

---

## 0. What was measured, and the one thing that was not

### PageSpeed Insights did not run

The PSI API refused every request:

```
HTTP 429
Quota exceeded for quota metric 'Queries' and limit 'Queries per day' of service
'pagespeedonline.googleapis.com' for consumer 'project_number:583797351490'
```

That is the **shared anonymous project**, which is exhausted globally and cannot be waited out
within a session. Four attempts, all 429. So there are **no Lighthouse scores in this document**,
and any number presented as one would be invented.

**To get them (five minutes, free, no card):**

1. `console.cloud.google.com` → the same project you make the YouTube key in.
2. **APIs & Services → Library** → search **PageSpeed Insights API** → **Enable**.
3. **Credentials → Create credentials → API key**, then restrict it to that API.
4. Run:
   ```
   https://www.googleapis.com/pagespeedonline/v5/runPagespeed
     ?url=https://gabrielebolognese.blog
     &strategy=mobile
     &category=performance&category=accessibility&category=best-practices&category=seo
     &key=YOUR_KEY
   ```
   Twice: `strategy=mobile` and `strategy=desktop`. Mobile is the one that matters; it is the
   scored profile and it throttles CPU 4x.

Alternatively `pagespeed.web.dev` in a browser needs no key at all. Either way, **record the four
scores before touching anything**, or none of the work below can be shown to have helped.

### What WAS measured

Everything in this plan comes from direct measurement of the live site: response headers, real
transfer sizes over Brotli, redirect chains, DOM element counts parsed out of the served HTML, and
the Google Fonts CSS as actually served. Where a claim is a prediction rather than a measurement,
it says so.

### The numbers as they stand

| Measurement | Value |
| :--- | :--- |
| Homepage HTML, Brotli | **50.7 KB** |
| Homepage HTML, uncompressed | **281 KB** (6.8:1 ratio) |
| **DOM elements, homepage** | **7,270** |
| DOM elements, `/about/` | 5,159 |
| DOM elements, `/devlog/` | 970 |
| Images on the homepage | 15 files, **920 KB** total |
| Render-blocking stylesheets | **3** (one of them third-party) |
| Scripts | 2 (`motion.js` deferred, one Astro chunk) |
| TTFB (cached edge hit) | 0.21 s |
| TTFB (cold) | 0.42 to 0.55 s |
| Total images emitted by the build | 9.72 MB across 135 files (5.99 MB webp + 3.73 MB originals) |

### Severity summary

| # | Finding | Severity | Effort |
| :-- | :--- | :--- | :--- |
| 1.1 | Every internal route 301-redirects | High | Low |
| 1.2 | `Style.css` and `motion.js` are served uncacheable | High | Low |
| 2.1 | 7,270 DOM elements (Lighthouse errors above 1,400) | High | Medium |
| 3.1 | ~~Google Fonts is a render-blocking third-party request~~ | **Done** | |
| 3.2 | ~~Four font families, 58 `@font-face` blocks~~ | **Done** | |
| 3.3 | LCP image is not preloaded | Medium | Low |
| 4.1 | 920 KB of images, carousels may defeat lazy-loading | Medium | Medium |
| 4.2 | One emitted image is 832 KB | Medium | Low |
| 4.3 | ~~JSON-LD cites 1.19 MB originals when WebP exists~~ | **Done** | |
| 5.1 | No Content-Security-Policy | Medium | Medium |
| 5.2 | No `X-Frame-Options` / `frame-ancestors` | Low | Low |
| 6.1 | No skip link | Medium | Low |
| 6.2 | Unverifiable a11y items needing a real audit | Unknown | Medium |
| 7.1 | No performance budget, unlike the landing page | Low | Medium |

---

## Phase 1: Free wins

Two configuration lines. No markup changes, no risk to appearance, and both are pure loss today.

### 1.1 Every internal route 301-redirects (High)

**Evidence.** Measured on five routes:

```
/about                         -> 301 -> /about/                  (200)
/devlog                        -> 301 -> /devlog/
/newsletter                    -> 301 -> /newsletter/
/newsletter/a-hundred-commits  -> 301 -> /newsletter/a-hundred-commits/
/license                       -> 301 -> /license/
```

The site's own navigation links to the **non-slash** form (`href="/devlog"`, `href="/newsletter"`,
and the internal links added throughout the story chapters). So **every internal click currently
costs a full extra round trip** before a byte of the destination arrives. On the measured cold TTFB
that is roughly 0.4 to 0.5 s of nothing, on every navigation, for every visitor.

**Why it matters.** It is a direct hit to the LCP of every page except the first one landed on, and
Lighthouse flags it as "Avoid multiple page redirects". It also wastes crawl budget: Googlebot
follows the same 301 on every internal link it discovers.

**Fix.** Pick one canonical form and make links and server agree. Two options:

- **Option A (recommended): emit the trailing slash.** Set `trailingSlash: 'always'` in
  `astro.config.mjs` and update the hand-written `href`s. Astro's own `<a>` output and the sitemap
  follow the config, so this is the form with the least hand-maintenance.
- **Option B: drop the slash.** Set `trailingSlash: 'never'` **and** add a Netlify setting to stop
  it appending one, otherwise Netlify's pretty-URL handling reintroduces the redirect and nothing
  changes.

**Also check** `public/_redirects` afterwards: the existing `/articles/*` and `/story.html` rules
must still land on the new canonical form in one hop, not chain into a second redirect.

**Risk.** Low, but it touches every URL on the site. The canonical tags are derived from
`Astro.url.pathname` in `SEO.astro`, so they follow automatically; verify they do rather than
assuming.

**Verify.** `curl -sI https://gabrielebolognese.blog/devlog` returns `200`, not `301`. Every
internal link in the built HTML resolves in **zero** hops.

---

### 1.2 `Style.css` and `motion.js` are served uncacheable (High)

**Evidence.** Measured response headers:

| Asset | Brotli size | `Cache-Control` |
| :--- | ---: | :--- |
| `/Style.css?v=96a8df1c` | 25.7 KB | `public, max-age=0, must-revalidate` |
| `/motion.js?v=3723a5b9` | 5.9 KB | `public, max-age=0, must-revalidate` |
| `/_astro/faq.*.css` | 1.2 KB | `public, max-age=31536000, immutable` |
| `/_astro/page.*.js` | 1.0 KB | `public, max-age=31536000, immutable` |

**The contradiction.** `netlify.toml` sets `max-age=0` deliberately, and its comment explains why:

> `max-age=3600` meant a style change was invisible for up to an hour after deploy [...] That is an
> hour of looking at a deploy and reporting bugs that were already fixed.

That fear was correct for a stable URL. **It is no longer possible.** `Layout.astro` already
appends a content hash:

```ts
return createHash('sha256').update(bytes).digest('hex').slice(0, 8);
const styleHref = `/Style.css?v=${assetVersion('Style.css')}`;
```

The URL **changes whenever the file changes**. A cached copy can never be stale, because a changed
file is a different URL. The site is paying a revalidation round trip on the largest render-blocking
asset it controls, to solve a problem it already solved a second way.

**Why it matters.** `Style.css` is render-blocking. On every repeat visit and every internal
navigation that is not a cache hit, first paint waits on a conditional request. It is the single
cheapest LCP improvement available.

**Fix.** In `netlify.toml`, change both blocks to
`Cache-Control = "public, max-age=31536000, immutable"`, and **replace the comment** so the next
reader knows the invalidation now comes from the query hash rather than from revalidation. Leaving
the old comment in place is how this gets reverted in six months.

**Risk.** Low, with one real caveat: if anyone ever loads `/Style.css` **without** the `?v=`
parameter, that URL is now cached for a year. Nothing in the site does, but it is worth grepping
for before shipping.

**Verify.** `curl -sI 'https://gabrielebolognese.blog/Style.css?v=...'` shows the year. Deploy a
visible CSS change and confirm it appears immediately, because the hash moved.

---

## Phase 2: DOM size

### 2.1 The homepage serves 7,270 DOM elements (High)

**Evidence.** Parsed from the served HTML:

```
total elements        7,270
  <i>                 4,720     <- the life grid
  <span>                992
  <div>                 360
  <p>                   212
  <li>                  188
```

Lighthouse warns above **800** and reports an error above **1,400**. The homepage is at **5.2x the
error threshold**. `/about/` is at 5,159 for the same reason.

**Composition of the 281 KB:**

| Section | Size | Share |
| :--- | ---: | ---: |
| Statistics | 69 KB | 25% |
| **Life grid** | **65 KB** | **23%** |
| Story | 38 KB | 13% |
| Devlog preview | 35 KB | 12% |
| Timeline | 19 KB | 7% |
| Projects | 13 KB | 5% |

**Get the diagnosis right.** The bytes are **not** the problem. The markup is so repetitive that
Brotli takes 281 KB to 41 KB, a 6.8:1 ratio, and the measured transfer is 50.7 KB. This is not a
bandwidth issue and compressing harder will achieve nothing.

The cost is **parse, layout, style recalculation and memory**, all of which scale with node count,
and all of which land on the main thread of a mid-range phone during the exact window that decides
LCP and INP. It is also why `motion.js` observing this many elements is not free.

**Context, which matters.** `CLAUDE.md` documents the life grid as a considered trade already: no
scoped `<style>` (which would add a `data-astro-cid` attribute to all 4,680 cells, ~131 KB), cells
wrapped in 90 rows so the reveal staggers off one variable per row rather than 4,680 inline delays,
and only ~53 cells carrying a `title` because all of them would be ~145 KB. **Those decisions were
right and none of them should be undone.** They optimised the bytes and the attributes. The
remaining problem is the node count itself, which none of them address.

**Options, cheapest first:**

- **A. Render the grid as one SVG or a single `<canvas>`.** 4,680 cells become one element. This
  is the only change that actually solves it. The event handling in `initGridTitles()` is already a
  single delegated listener, so it would move to hit-testing coordinates instead of reading a
  `title` off a target. Highest effort, highest payoff, and it must preserve the `role="img"` plus
  the visible `<details>` event list that currently carries the meaning for assistive tech and
  crawlers.
- **B. Render the grid only on `/about/`, and put a link on the homepage.** Zero risk, immediate,
  and it costs the homepage a feature.
- **C. CSS `content-visibility: auto` with `contain-intrinsic-size` on the grid rows.** Keeps the
  nodes but lets the browser skip layout and paint for off-screen rows. The landing-page devlog
  records one trap already: `content-visibility` alone collapses the element to zero height and the
  scrollbar jumps, so the intrinsic size is mandatory, not optional.

  **Attempted 20 August 2026 and withdrawn before shipping, for a second trap.**
  `content-visibility: auto` implies `contain: layout style paint`, and **paint containment clips
  to the padding box**. The year markers are `.life-year` elements positioned at `left: 100%` with
  an 11px margin, deliberately sitting in the 40px gutter `.life-grid` reserves for them, which is
  **outside** each row's box. Containing the rows would clip all thirty of them and the grid would
  silently lose its scale.

  Salvageable, but not as a one-line CSS change: the markers would have to move out of the rows
  into a sibling column, which is the arrangement `Style.css` explicitly rejected because a 53rd
  column has to be sized against 52 squares at every breakpoint and the squares stop being square
  the moment it is wrong. Treat C as blocked and go to A.
- **D. Trim what is above the fold.** The statistics block is now 25% of the page and sits high.
  Two 371-cell contribution grids plus a 27-pill stack plus a donut is a lot of nodes for one
  section.

**Recommendation.** C now as a stopgap, then A when there is time. B only if neither is worth it.

**Verify.** `document.querySelectorAll('*').length` under 1,400, or a Lighthouse DOM audit that has
stopped erroring.

---

## Phase 3: The critical path

### 3.1 Google Fonts is a render-blocking third-party request (DONE, 20 Aug 2026)

**Evidence.** The head contains, in this order:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:...">
```

The preconnects are correct and already there. The stylesheet is still **render-blocking, on a
different origin**. The measured chain is: HTML → DNS + TLS to `fonts.googleapis.com` → 23 KB of
CSS → DNS + TLS to `fonts.gstatic.com` → the font files. Nothing paints text in the final face
until that completes. `display=swap` is set, so text does paint in a fallback first, which converts
the problem from invisible text into a layout shift.

**Why it matters.** This is the only third-party dependency on the site. It is two extra
connections on the critical path, it is a privacy consideration in the EU, and it is entirely
avoidable on a static site.

**Fix: self-host.** Download the four families as `.woff2`, serve them from `/fonts/` with the
`immutable` header from 1.2, and replace the third-party `<link>` with a local `@font-face` block.
That removes two origins, two DNS lookups, two TLS handshakes and 23 KB of CSS from the critical
path, and lets the fonts be preloaded properly.

**Then preload only what the first screen needs.** The hero uses Lexend (`--font-display`) and DM
Sans (`--font-body`). Preload those two weights and let the rest load normally.

**Risk.** Medium. Self-hosting means the subsetting is now your job; get it wrong and a character
renders as a box. Keep the Latin and Latin-Extended subsets, since the site carries Italian names
and a `€` sign.

**Verify.** No request to any `fonts.g*` origin in the network panel. First paint shows the final
face. `SEO.astro` is the only file that references the fonts, per `CLAUDE.md`, so there is one
place to change.

**Outcome.** Ten `.woff2` in `public/fonts/`, 433 KB total, declared in section 01 of `Style.css`.
Verified no built file references a `fonts.g*` origin in any rule.

| | Before | After |
| :--- | :--- | :--- |
| Origins on the critical path | 3 | **1** |
| Render-blocking stylesheets | 3, one cross-origin | **2, both local** |
| Third-party font CSS | 23 KB | **0** |
| Bytes preloaded | 0 | 75 KB, the two faces the hero uses |

**Ten files, not thirty**, because all four families are variable: one file per family per subset
covers the whole weight range, Cormorant's italic included. Google's own CSS declares each weight
separately while serving the identical file; those were collapsed into `font-weight: 300 400` style
ranges here.

Only `latin` and `latin-ext` are shipped. `unicode-range` is what makes that safe rather than
reckless: latin-ext downloads only when a glyph actually needs it, and Italian accents and the euro
sign are inside latin. The other 358 KB is therefore not on anyone's critical path.

---

### 3.2 Four families and 58 `@font-face` blocks (DONE, 20 Aug 2026)

**Evidence.** The served CSS is 23,375 bytes with 58 `@font-face` blocks:

| Family | Faces served |
| :--- | ---: |
| Cormorant Garamond | 20 |
| Unbounded | 20 |
| Lexend | 12 |
| DM Sans | 6 |

Most of those are unicode-range subsets the browser will never download, so the wire cost is
smaller than 58 suggests. The real cost is **the number of distinct files a first paint may need**,
and the fact that `Style.css` already warns about this:

> Families in use: Cormorant Garamond, DM Sans, Lexend, Unbounded. If you drop a family or a weight
> from the design, drop it from that `<link>` too, four families at fifteen variants is a lot of
> bytes for one site.

**Fix.** Audit which weights are actually used. `LifeSection.astro` already notes that 500 is the
heaviest Unbounded the link loads, which implies the list was picked before the design settled.
Grep every `font-weight` against the requested variants and delete the rest. Do this **as part of
3.1**, since self-hosting forces the list to be written out explicitly anyway.

**Also reconsider Cormorant Garamond.** It is a serif used for the newsletter standfirst and the
life-chart note. If that is its whole job, it is one family's download for two elements.

**Outcome.** The audit was worth doing on its own: parsing every rule that sets a family and the
weight in the same block gave the real usage, and it found two faces being **synthesised** rather
than loaded.

| Family | Weights actually used | Shipped |
| :--- | :--- | :--- |
| Lexend | 200, 300, 400, 500 | 200-500 |
| DM Sans | 300, 400, **500** | 300-500 |
| Unbounded | 200, 300, 400, 500 | 200-500 |
| Cormorant Garamond | 300, 400 + italic 300, 400 | 300-400, both styles |

**Fixed: `.stack-pill` asked for `font-weight: 600`.** It sets no family, so it inherits DM Sans,
whose range stops at 500. The browser was synthesising a faux bold on 10px uppercase text. Now 500,
which is inside the range and was already being downloaded.

**Not fixed, because it is a design call: Lexend has no italic.** Not in this subset, not on Google
Fonts, not anywhere; Lexend ships a weight axis and nothing else. `.chapter-pull` (the story pull
quotes) and `.issue-body blockquote` both set `--font-display` with `font-style: italic`, so both
have always rendered a browser-synthesised oblique of a geometric sans. Self-hosting neither caused
nor cured it.

Two honest options, and picking between them is a taste question, not a technical one:

- **Point both at `--font-serif`.** Cormorant Garamond italic is the site's real italic, it is
  already loaded at 300 and 400, and it is what `.pull-quote` and `.issue-standfirst` already use.
  This makes the pull quotes match the standfirsts.
- **Drop the italic** and let the pull quotes be upright Lexend, distinguished by the rule and the
  size they already have.

---

### 3.3 The LCP image is not preloaded (Medium)

**Evidence.** The portrait is correctly marked as the priority image:

```html
loading="eager" fetchpriority="high"
src="/_astro/gabriele-bolognese-portrait.BVWsq8Y__oBSwj.webp"
```

but there is **no `<link rel="preload" as="image">`** for it anywhere in the head.

**Why it matters.** `fetchpriority="high"` raises the priority once the preload scanner reaches the
tag. A preload in the head starts the request before the parser gets there, which on a slow
connection is the difference. Note the portrait sits inside the About section, well down the
document, so the parser reaches it late.

**Worth confirming first:** on a 360px-wide phone the actual LCP element may be the **hero
headline** (text, no image) rather than the portrait, in which case preloading the image is wasted
bandwidth and 3.1 matters far more. **Run PSI and read which element it names before doing this
one.**

**Fix, if the portrait is the LCP element.** Emit a `<link rel="preload" as="image" imagesrcset=...
imagesizes=...>` in `SEO.astro`, matching the `srcset` exactly so the preload and the `<img>`
resolve to the same file. A mismatch downloads the image twice.

---

## Phase 4: Payload

### 4.1 920 KB of images on the homepage (Medium)

**Evidence.** 15 images, 920 KB total over the wire. The largest:

```
111 KB  flashfx-animator-keyframe-controls.webp
110 KB  mled-machine-learning-app-interface.webp
 98 KB  flashfx-documentation-site.webp
 90 KB  flashfx-animator-dashboard-projects.webp
 88 KB  flashfx-editor-timeline-multitrack.webp
```

14 of the 15 are `loading="lazy"`, and every one has explicit `width`/`height`, so **there is no
image-driven layout shift** and they do not block LCP. Credit where it is due: that part is already
right.

**The thing to verify.** These sit in carousels. A carousel that positions its slides with
`transform: translateX()` keeps every slide **inside the viewport rectangle** as far as the browser
is concerned, which can make `loading="lazy"` fetch all six immediately. If that is happening, the
homepage downloads ~900 KB of screenshots nobody has scrolled to.

**How to check.** Open the network panel, filter to images, load the homepage without scrolling. If
more than two or three carousel images appear, lazy-loading is being defeated.

**Fix if confirmed.** Load only the active slide plus its immediate neighbour, and set the rest to
`loading="lazy"` with the track clipped by `overflow: hidden` on a wrapper that is genuinely
off-screen, or swap `src` on slide change from a `data-src`.

---

### 4.2 One emitted image is 832 KB (Medium)

**Evidence.** From `dist/_astro`:

```
832 KB  dublin-stephens-green-shopping-centre.DW6WH-4Z_11ScMe.webp
327 KB  dublin-stephens-green-shopping-centre.DW6WH-4Z_1gqJzy.webp
295 KB  dublin-oconnell-bridge-liffey.Iz7z0LR8_Z1tHvFV.webp
262 KB  dublin-spire-oconnell-street.DaZ0sFs8_Z27DgOx.webp
```

Total emitted: **5.99 MB across 125 files.**

These are the newsletter issue 008 photographs, so they are not on the homepage, but an 832 KB WebP
is a very large single asset for any page. The source is a 1,023 KB JPEG.

**Fix.** Cap the widest variant. The issue-cover width is 2,080 px (`COVER` in `images.ts`) and the
`<Pair>` component tops out at 1,360. An 832 KB output suggests a variant is being generated larger
than any layout ever requests, or that the quality setting is too high for a photograph. Set an
explicit `quality` on the photographic images: screenshots need high quality to keep text crisp,
photographs do not.

**Check the whole set** while there: 5.99 MB of emitted images for a site with this many pages is
worth one audit pass.

---

### 4.3 JSON-LD cites the raw originals, not the processed images (DONE, 20 Aug 2026)

**Evidence.** Found by the budget guard from 7.1 on its first run, which is the entire argument for
having one. `dist/_astro` holds **3.73 MB of PNG and JPEG originals** alongside the 5.99 MB of
WebP. All ten are referenced, so none is dead weight that can simply be deleted. Tracing them:

| Reference | File | Verdict |
| :--- | :--- | :--- |
| `og:image`, `twitter:image` | `gabriele-bolognese-og-card.png`, 202 KB | **Correct.** Open Graph consumers do not reliably render WebP. Leave it. |
| JSON-LD `ImageObject.url` and `contentUrl` | `gabriele-bolognese-portrait.png`, **1,192 KB** | **Wrong.** |
| JSON-LD, `/about/` and issue pages | 8 more originals, up to 539 KB each | **Wrong.** |

**Why it matters.** These URLs are never fetched by a visitor, so this is not page weight and no
Core Web Vital moves. It is a Search problem: the structured data hands Google a **1.19 MB PNG** of
the portrait when a ~100 KB WebP of the same picture sits next to it in the same directory.
`imageObject()` in `schema.ts` also stamps `license` and `acquireLicensePage` on these nodes for
the licensable-image feature, so these are exactly the URLs Google Images will fetch and rank.

**Fix.** Resolve the schema's image URLs through `getImage()`, the same way
`image-sitemap.xml.ts` already does for its `<image:loc>` entries, so JSON-LD and the image sitemap
cite the identical processed file. The pattern is already in the codebase; this is making the
schema use it.

**Do not simply delete the originals.** Astro emits them *because* something references them.
Change the reference and the emit follows.

**Risk.** Low, but verify `og:image` keeps pointing at the PNG card afterwards. That one is correct
as it stands and would be easy to sweep up by accident.

**Verify.** No `.png` or `.jpg` under `/_astro` except the OG card. The images budget drops from
9.72 MB to roughly 6.2 MB, and the budget in `check-budgets.mjs` comes down with it.

**Outcome.** Fixed in `schemaImageUrl()` in `images.ts`, used by all six schema call sites. The
portrait in structured data went from **1,192 KB to 13 KB**, and the emitted total from 9.72 MB to
**8.55 MB**. Verified the new URL is one that genuinely appears in the page's `srcset`, so it is
not an orphan variant generated for the schema alone, and that `og:image` still points at the PNG
card.

The nine originals still emitted are now **all** `og:image` targets, which is correct and should
stay: Open Graph consumers do not reliably render WebP. Their combined 2.56 MB is what 4.2 should
look at next, since several are full-size screenshots doing duty as social cards.

---

## Phase 5: Headers and best practices

### 5.1 No Content-Security-Policy (Medium)

**Evidence.** The measured response carries `Strict-Transport-Security`, `X-Content-Type-Options`,
`Referrer-Policy` and `Permissions-Policy`. There is **no `Content-Security-Policy`**.

**Why it matters.** Lighthouse's best-practices category checks for a CSP against XSS. It is also
the single most effective defence for a site that embeds a third-party stylesheet.

**Fix.** Add a CSP to the `/*` header block. It has to account for what the site actually does:
two inline `<script>` blocks (the `html.js` flag and one other), one inline `<style>`, and the
Google Fonts origins until 3.1 lands. Inline scripts need either a hash or a nonce; hashes are the
right answer on a static site, since a nonce needs per-request generation that a static host cannot
do.

**Sequencing note.** Do this **after** 3.1. Self-hosting the fonts removes two origins from the
policy, so writing it first means writing it twice.

**Risk.** Medium and worth respecting. A CSP that is slightly wrong silently breaks the motion
layer or the fonts. Deploy it as `Content-Security-Policy-Report-Only` first, watch for violations,
then switch.

---

### 5.2 No `X-Frame-Options` or `frame-ancestors` (Low)

**Evidence.** Neither header is present, so nothing prevents the site being framed.

**Fix.** `frame-ancestors 'none'` inside the CSP from 5.1 (the modern form), or
`X-Frame-Options = "DENY"` in `netlify.toml` as a one-line stopgap that works today.

---

## Phase 6: Accessibility

### 6.1 No skip link (Medium)

**Evidence.** No skip-to-content link in the first 4 KB of the document. `<main id="main">` exists,
so the target is already there; only the link is missing.

**Why it matters here specifically.** This site has a **sticky nav and 7,270 DOM elements**. A
keyboard or screen-reader user landing on the homepage tabs through the entire navigation on every
single page, and the life grid is 4,680 focusable-adjacent elements in the middle of the document.
A skip link is a handful of markup for a large gain.

**Fix.** A visually-hidden `<a href="#main">` as the first focusable element, revealed on focus.
The `.visually-hidden` utility already exists in `Style.css`.

**Consider a second one** that skips the life grid, for the same reason the story and timeline got
their skip buttons.

---

### 6.2 What static analysis cannot answer (Unknown)

These passed every check that can be run against served HTML:

- `lang` attribute, `<title>`, meta description, canonical, `og:image`, viewport: all present.
- One `<h1>`, and **zero skipped heading levels** across 85 headings.
- Every `<img>` has an `alt`, and no content image has an empty one.
- Zero links without an accessible name.
- **All 41** `target="_blank"` links carry `rel="noopener"`.
- A single JSON-LD `@graph`, as `CLAUDE.md` requires.

That is a genuinely good baseline. What still needs a real audit, because it needs rendering:

1. **Colour contrast.** The donut palette was validated to 4.5:1 and the countdown link to a
   documented ratio, but nothing else has been checked. `--gray-mid` (`#999`) on white is **2.8:1**,
   which **fails** WCAG AA for normal text. It is used for `.stat-note`, `.chapter-year`,
   `.life-caption`, `.contrib-month` and more. **This is the most likely accessibility failure on
   the site and it is worth checking first.**
2. **Focus visibility.** Several components define `:focus-visible` styles; whether every
   interactive element has a visible focus ring has not been verified.
3. **The `<details>` toggles** in the devlog and life events, with a screen reader.
4. **Reduced motion.** The global rule neutralises animation, but the flame keyframes and the skip
   buttons should be confirmed by hand.
5. **The 371-cell contribution grids**, which are `role="img"` with a label. Confirm the label
   conveys enough, since the cells themselves are hidden from assistive tech.

---

## Phase 7: Keep it fixed

### 7.1 Adopt the landing page's budget guard (Low)

The FlashFX landing page already **fails its deploy** rather than warning when a budget is
exceeded, and that guard caught 57 MB of stray archives on its first run. Its devlog entry records
the reasoning, including that the JS budget deliberately measures the gzipped bytes of the chunks
the served HTML actually requests rather than trying to reproduce a framework's own printed number.

This site has no equivalent. Nothing prevents the next section from adding another 2,000 DOM nodes.

**Proposed budgets**, set just above current values so they bite on regression rather than today:

| Metric | Now | Budget |
| :--- | ---: | ---: |
| Homepage DOM elements | 7,270 | 7,500, then lower it after Phase 2 |
| Homepage HTML, Brotli | 50.7 KB | 60 KB |
| Total emitted images | 5.99 MB | 6.5 MB |
| Render-blocking requests | 3 | 2 after Phase 3, then 1 |

Run it as a `postbuild` script. **Note the trap the landing page hit:** npm only fires `postbuild`
for scripts invoked through `npm run`, and `netlify.toml` here already uses `command = "npm run
build"`, so it will fire. Do not change that command to `npx astro build`.

---

## Suggested order

1. **Phase 1 entire.** Two config edits, no visual risk, immediate gain. Do these first so the
   re-baseline in step 2 already includes them.
2. **Run PSI and record all four scores.** Everything after this needs a before-and-after, and
   PSI's own LCP element attribution decides whether 3.3 is worth doing at all.
3. **Phase 3.1 and 3.2** together: self-host the fonts and prune the weights in one pass.
4. **Phase 2, option C** as a stopgap on DOM size.
5. **Phase 6.1 and the contrast check in 6.2.** The `--gray-mid` question in particular, since it
   may affect a lot of copy and is better answered before more of it is written.
6. **Phase 4**, once the carousel lazy-loading question has an answer.
7. **Phase 5**, report-only first.
8. **Phase 2, option A** when there is a clear afternoon for it.
9. **Phase 7**, so none of it comes back.

## Open questions for the site owner

- Is Cormorant Garamond worth a whole family for the two places it is used?
- Is the life grid worth keeping on the homepage as well as `/about/`, given it is 65 % of the
  homepage's DOM?
- Trailing slash or no trailing slash? The choice is arbitrary; only the consistency matters.
- Is `--gray-mid` on white acceptable to you as a deliberate choice, or should it be darkened to
  clear 4.5:1?
