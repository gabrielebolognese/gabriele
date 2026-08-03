/* ============================================================================
   identity.ts — the single source of truth for who this site is about.

   Every meta tag, every JSON-LD block, and every social link on the site reads
   from this file. Before it existed, index.astro, Layout.astro and story.html
   each carried their own copy and they had drifted into four contradictory
   sets — two different GitHub accounts, three spellings of the LinkedIn URL,
   and three different X handles. `sameAs` is the primary signal Google and the
   answer engines use to reconcile a person entity, so contradictions there
   don't just waste the signal, they actively suppress it.

   ⚠️  EVERY LINE MARKED `TODO:` IS UNVERIFIED — it is the best guess taken from
   the old markup. A `sameAs` URL that 404s devalues the whole array, so please
   confirm or correct each one, then delete the TODO comment.
   ========================================================================= */

export const SITE = {
  url: 'https://gabrielebolognese.blog',
  name: 'Gabriele Bolognese',
  locale: 'en_US',
  themeColor: '#0a0a0a',
} as const;

export const PERSON = {
  name: 'Gabriele Bolognese',
  givenName: 'Gabriele',
  familyName: 'Bolognese',
  jobTitle: 'Founder & Developer',

  /** Kept under ~155 chars so it is not truncated in the SERP. */
  description:
    'Gabriele Bolognese is an Italian founder and developer, creator of FlashFX, a browser-based motion graphics and video editing platform.',

  /** Longer form, used for JSON-LD where there is no length pressure. */
  longDescription:
    'Gabriele Bolognese is an Italian founder and self-taught developer, and the creator of FlashFX, a browser-based motion graphics and video editing platform used by more than 8,000 people. He built it solo across four complete rebuilds.',

  /** Confirmed 2026-07-31. Also drives the live age counter and the life grid
   *  on /about, so the age is derived everywhere rather than asserted — the
   *  hardcoded "17-year-old" in the old copy went stale on its own. */
  birthDate: '2008-12-06' as string | null,
  /** Local midnight, for the counter. No birth time on record. */
  birthDateTime: '2008-12-06T00:00:00',

  // TODO: confirm — the footer says Rovigo, Italy.
  address: {
    locality: 'Rovigo',
    region: 'Veneto',
    country: 'IT',
    countryName: 'Italy',
  },

  // TODO: confirm this is the address you want crawlable and public.
  email: 'the.real.gabryy@gmail.com',

  // TODO: add your school here if you want it public, or leave null.
  alumniOf: null as string | null,

  /** Topics to be known for. Feeds Person.knowsAbout. */
  knowsAbout: [
    'Motion graphics',
    'Video editing software',
    'Browser-based creative tools',
    'TypeScript',
    'Web application development',
    'Startup founding',
  ],

  /** Handles WITHOUT the @, used for twitter:creator and profile meta.
   *  There is no separate personal X account, so the FlashFX account stands in
   *  for both twitter:site and twitter:creator. */
  handles: {
    x: 'FlashFXeditor',
    instagram: 'logs.of.gabry',
    youtube: 'gabriele.bolognese',
  },
} as const;

export const ORGANIZATION = {
  name: 'FlashFX',
  url: 'https://flashfx.app',
  description:
    'FlashFX is a browser-based motion graphics and video editing platform, offering an alternative to After Effects and Premiere Pro.',
  /** Confirmed 2026-07-31: the idea was formed and formalised on day one of
   *  2024. Note the /about narrative separately dates Vision AI Demo — a
   *  different, earlier project — to 3 January 2024. */
  foundingDate: '2024-01-01',
  // TODO: a real logo URL. Organization.logo is required for the logo rich result.
  logo: 'https://flashfx.app/logo.png',
  xHandle: 'FlashFXeditor',
  sameAs: [
    // The X account is the company's, not a personal profile, so it belongs to
    // the Organization entity rather than the Person one.
    'https://x.com/FlashFXeditor',
    // TODO: add FlashFX's Product Hunt / LinkedIn company page here if they exist.
  ] as string[],
} as const;

/* ── sameAs — the entity reconciliation array ────────────────────────────────
   Order matters a little (strongest identity signals first), accuracy matters
   enormously. Use the exact URL as it appears in your browser address bar:
   www vs no-www and trailing slashes count as different strings.

   Anything you cannot confirm is live should be DELETED, not left in.
   ------------------------------------------------------------------------- */
export const SAME_AS: string[] = [
  // Confirmed exact, 2026-07-31. Three variants existed in the old markup;
  // this is the one that matches the address bar. Do not "tidy" the www or the
  // trailing slash — sameAs matching is string-exact.
  'https://www.linkedin.com/in/gabriele-bolognese/',

  'https://github.com/gabrielebolognese',
  'https://www.youtube.com/@gabriele.bolognese',
  'https://www.instagram.com/logs.of.gabry/',
  'https://www.producthunt.com/@gabrielebolognese',
  'https://peerlist.io/gabrielebologne',
  'https://www.connectively.us/p/gabriele-bolognese',

  // Deliberately absent:
  //   x.com/FlashFXeditor        — company account, lives on ORGANIZATION.sameAs
  //   crunchbase.com/person/...  — was in the old schema, unconfirmed, removed
  //   dev.to/gabrielebolognese   — was in the old schema, unconfirmed, removed
  //   youtube.com/@playmoj_      — the hijacked 2022 channel, not an asset
  //   youtube.com/@emeralsrp     — a former client's channel, not yours
  //
  // Worth adding when they exist, roughly in order of weight:
  //   Wikidata item (by far the strongest), Wellfound/AngelList, F6S,
  //   Y Combinator profile, Mastodon, Bluesky, Threads, TikTok, Medium,
  //   Substack, Stack Overflow, Behance, Vimeo, Gravatar, about.me, ORCID.
];

/** Press, interviews, podcasts. These are `subjectOf`, NOT `sameAs` — they are
 *  pages ABOUT you rather than profiles OWNED by you, and mixing the two
 *  weakens both. */
export const SUBJECT_OF: Array<{ name: string; url: string; publisher?: string }> = [
  // TODO: add any coverage here.
];

/* ── Verified facts ──────────────────────────────────────────────────────────
   These previously appeared in three different forms across meta, schema and
   body copy (15,200 / 15,000+ / 15k+ users; 3,600 / 3,400 Discord members).
   Inconsistent self-reported figures read as unreliability, and the user counts
   were overstated. Confirmed 2026-07-31: 8,000 users, 3,400 Discord members.
   Anything quoting these must read from here, not hardcode a number.
   ------------------------------------------------------------------------- */
export const FACTS = {
  users: 8000,
  /** For prose: "more than {usersLabel} people". */
  usersLabel: '8,000',
  /** For compact contexts like project cards. */
  usersShort: '8k+',
  discordMembers: 3400,
  discordLabel: '3,400',
} as const;

/** Absolute URL helper — every canonical/OG URL on the site goes through this.
 *  Normalises to the slash-less form (matching `trailingSlash: 'never'` and
 *  Netlify's Pretty URLs), except for the root, which keeps its slash. */
export function absoluteUrl(path: string, site?: URL): string {
  const base = site ?? new URL(SITE.url);
  const url = new URL(path, base);
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.href;
}
