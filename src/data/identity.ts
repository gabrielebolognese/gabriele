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

  /** Meta description. First person, like the rest of the site, and kept under
   *  ~155 chars so it is not truncated in the SERP. */
  description:
    'I am Gabriele Bolognese, an Italian founder and developer, and the creator of FlashFX, a browser-based motion graphics and video editing platform.',

  /** JSON-LD only, never rendered. Deliberately third person: this one
   *  describes the Person entity to a machine, and knowledge-graph extraction
   *  expects an entity description rather than a quote from the subject. */
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

/* ── The newsletter ──────────────────────────────────────────────────────────
   Lives at /newsletter on this domain rather than on Substack. A Substack
   author page ranks for "Gabriele Bolognese" and would compete with this site
   for the same entity, which is exactly what story.html did to the homepage
   before it was folded into /about. Sending is Buttondown's job; the archive
   stays here, where every issue is another indexable page on the domain that
   already carries the entity.
   ------------------------------------------------------------------------- */
export const NEWSLETTER = {
  // TODO: name it yourself. "The Rebuild" is a placeholder taken from the four
  // rebuilds in your own story — it reads well and it is yours to overrule.
  name: 'The Rebuild',
  /** Shown on the archive page and used as the Blog description in JSON-LD. */
  description:
    'What I am building, what broke, and what it cost. Written from inside FlashFX, sent when there is something worth saying.',
  /** Short line beside the signup field. */
  promise: 'No schedule, no filler. Unsubscribe in one click.',

  // TODO: your Buttondown username — the form posts to
  // buttondown.email/api/emails/embed-subscribe/<username>. Until this is
  // real the form renders disabled rather than posting into a void.
  buttondownUser: '' as string,
} as const;

/* ── Image licensing ─────────────────────────────────────────────────────────
   Google's licensable-images feature attaches a "Licensable" badge and a link
   in Google Images, and it needs two properties on every ImageObject: `license`
   (the terms) and `acquireLicensePage` (where to ask). BOTH MUST BE LIVE URLS —
   pointing either at a 404 forfeits the enhancement, the same way a dead sameAs
   entry devalues that array. They resolve to src/pages/license.astro.

   No year in the notice on purpose: a hardcoded one goes stale silently, and a
   build-time one changes the markup on every deploy for no benefit.
   ------------------------------------------------------------------------- */
export const IMAGE_LICENSE = {
  terms: `${SITE.url}/license`,
  acquire: `${SITE.url}/license`,
  creditText: PERSON.name,
  copyrightNotice: `© ${PERSON.name}`,
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
