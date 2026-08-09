# gabrielebolognese.blog

> I am Gabriele Bolognese, a founder from Rovigo, Italy, building FlashFX, browser-native motion
> graphics and video editing used by more than 8,000 people, and I write down how it is actually
> going while it happens.

My personal site: the long version of that sentence, a devlog I add to most days, and a newsletter
I write when something is worth more than a paragraph.

Live at **[gabrielebolognese.blog](https://gabrielebolognese.blog)**.

## Stack

Astro 6, static output, no UI framework. Styling and the motion layer are plain CSS and plain JS
served straight from `public/`, not bundled. Deployed to Netlify from `master`.

Requires Node >= 22.12.

```sh
npm install
npm run dev              # localhost:4321
npm run build            # static build to ./dist
npm run preview          # serve the built ./dist
npm run stats:refresh    # refresh the committed GitHub stats snapshot
```

## What is where

| Path | What it holds |
| :--- | :--- |
| `src/data/` | The source of truth for identity, facts, milestones and schema.org. Nothing is hardcoded in a page. |
| `src/content/devlog.yaml` | Every devlog entry, in one file, so publishing is "add a block at the top and commit". |
| `src/content/newsletter/` | One `.mdx` per issue. |
| `public/Style.css` | The whole stylesheet, numbered by section. |
| `public/motion.js` | Scroll reveals, the countdown, the carousels, the life grid. |

The section headers in those files explain the decisions behind them, including the ones that look
wrong until you know what they are avoiding. [CLAUDE.md](CLAUDE.md) is the tour.

## Notes

The statistics section on the homepage reads GitHub at build time and falls back to a committed
snapshot if the fetch fails, so the numbers can go stale but the build cannot break.

There are no em dashes anywhere in this repo, on purpose.
