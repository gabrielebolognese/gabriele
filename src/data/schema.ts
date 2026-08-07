/* ============================================================================
   schema.ts: JSON-LD builders.

   The site previously emitted three disconnected schema islands on the homepage
   (Person, SoftwareApplication, FAQPage) plus a fourth, contradictory Person on
   every article page. Nothing referenced anything else, so a crawler had no way
   to know they described one entity.

   Everything below is emitted as a single `@graph` with stable `@id`s, so the
   Person, the Organization, the WebSite and the page all cross-reference each
   other and resolve to one entity.
   ========================================================================= */

import {
  SITE,
  PERSON,
  ORGANIZATION,
  SAME_AS,
  SUBJECT_OF,
  IMAGE_LICENSE,
  NEWSLETTER,
  DEVLOG,
  absoluteUrl,
} from './identity';

/* Stable node identifiers, these are what make it a graph rather than a pile. */
export const ID = {
  person: `${SITE.url}/#person`,
  website: `${SITE.url}/#website`,
  org: `${ORGANIZATION.url}/#organization`,
  logo: `${SITE.url}/#logo`,
  /** The newsletter itself. Stable and absolute, so an issue page can declare
   *  isPartOf the same Blog entity the archive page defines, rather than each
   *  page minting a Blog of its own. */
  blog: `${SITE.url}/newsletter#blog`,
} as const;

type Node = Record<string, unknown>;

/** Every real photograph or screenshot on the site goes through here.
 *
 *  `license` + `acquireLicensePage` are what Google's licensable-images feature
 *  reads; `contentUrl` is emitted alongside `url` because the image rich result
 *  documentation names contentUrl specifically. Excludes the FlashFX logo,
 *  which is an Organization.logo and has its own requirements.
 *
 *  `creator` credits the Person. If a photograph is ever shot by someone else,
 *  that image's creator is the photographer, not the subject, pass one in
 *  rather than letting this default stand. */
function imageObject(opts: { url: string; caption: string; id?: string; creator?: Node }): Node {
  return {
    '@type': 'ImageObject',
    ...(opts.id ? { '@id': opts.id } : {}),
    url: opts.url,
    contentUrl: opts.url,
    caption: opts.caption,
    creator: opts.creator ?? { '@id': ID.person },
    creditText: IMAGE_LICENSE.creditText,
    copyrightNotice: IMAGE_LICENSE.copyrightNotice,
    license: IMAGE_LICENSE.terms,
    acquireLicensePage: IMAGE_LICENSE.acquire,
  };
}

function personNode(portraitUrl: string): Node {
  const node: Node = {
    '@type': 'Person',
    '@id': ID.person,
    name: PERSON.name,
    givenName: PERSON.givenName,
    familyName: PERSON.familyName,
    url: SITE.url,
    jobTitle: PERSON.jobTitle,
    description: PERSON.longDescription,
    // Stable @id: the portrait is in every page's graph, so it should resolve
    // to one image entity rather than one anonymous node per route.
    image: imageObject({
      url: portraitUrl,
      caption: `${PERSON.name}, founder of ${ORGANIZATION.name}`,
      id: `${SITE.url}/#portrait`,
    }),
    // `nationality` expects a Country node, not the bare string "Italian" that
    // the old markup used.
    nationality: {
      '@type': 'Country',
      name: PERSON.address.countryName,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: PERSON.address.locality,
      addressRegion: PERSON.address.region,
      addressCountry: PERSON.address.country,
    },
    email: `mailto:${PERSON.email}`,
    knowsAbout: PERSON.knowsAbout,
    worksFor: { '@id': ID.org },
    // The old markup had `founder: { Organization }` on the Person, which reads
    // as "Gabriele's founder is FlashFX". The relation only runs one way:
    // Organization.founder -> Person, mirrored here as foundedOrganization.
    foundedOrganization: { '@id': ID.org },
    sameAs: SAME_AS,
  };

  if (PERSON.birthDate) node.birthDate = PERSON.birthDate;
  if (PERSON.alumniOf) {
    node.alumniOf = { '@type': 'EducationalOrganization', name: PERSON.alumniOf };
  }
  if (SUBJECT_OF.length) {
    node.subjectOf = SUBJECT_OF.map((item) => ({
      '@type': 'CreativeWork',
      name: item.name,
      url: item.url,
      ...(item.publisher ? { publisher: { '@type': 'Organization', name: item.publisher } } : {}),
    }));
  }

  return node;
}

function organizationNode(): Node {
  return {
    '@type': 'Organization',
    '@id': ID.org,
    name: ORGANIZATION.name,
    url: ORGANIZATION.url,
    description: ORGANIZATION.description,
    foundingDate: ORGANIZATION.foundingDate,
    logo: {
      '@type': 'ImageObject',
      '@id': ID.logo,
      url: ORGANIZATION.logo,
    },
    image: { '@id': ID.logo },
    founder: { '@id': ID.person },
    employee: { '@id': ID.person },
    ...(ORGANIZATION.sameAs.length ? { sameAs: ORGANIZATION.sameAs } : {}),
  };
}

function websiteNode(): Node {
  return {
    '@type': 'WebSite',
    '@id': ID.website,
    url: SITE.url,
    name: SITE.name,
    description: PERSON.description,
    inLanguage: 'en',
    publisher: { '@id': ID.person },
    copyrightHolder: { '@id': ID.person },
  };
}

/** Homepage: a ProfilePage about the Person, which is what og:type=profile claims. */
export function homepageSchema(opts: { portraitUrl: string; faq: FaqEntry[]; softwareImage: string }) {
  return graph([
    personNode(opts.portraitUrl),
    organizationNode(),
    websiteNode(),
    {
      '@type': 'ProfilePage',
      '@id': `${SITE.url}/#webpage`,
      url: `${SITE.url}/`,
      name: `${PERSON.name}, ${PERSON.jobTitle}`,
      isPartOf: { '@id': ID.website },
      about: { '@id': ID.person },
      mainEntity: { '@id': ID.person },
      inLanguage: 'en',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${ORGANIZATION.url}/#app`,
      name: ORGANIZATION.name,
      url: ORGANIZATION.url,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web Browser',
      description: ORGANIZATION.description,
      image: imageObject({
        url: opts.softwareImage,
        caption: `The ${ORGANIZATION.name} Animator, timeline and canvas view`,
        id: `${ORGANIZATION.url}/#screenshot`,
      }),
      author: { '@id': ID.person },
      publisher: { '@id': ID.org },
      dateCreated: ORGANIZATION.foundingDate,
      // Google will not surface a SoftwareApplication result without `offers`
      // plus a rating; the old block had neither and was inert.
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/OnlineOnly',
        url: ORGANIZATION.url,
      },
    },
    faqNode(opts.faq),
  ]);
}

/** About page: the biography. */
export function aboutPageSchema(opts: { portraitUrl: string; path: string; faq: FaqEntry[] }) {
  const url = absoluteUrl(opts.path);
  return graph([
    personNode(opts.portraitUrl),
    organizationNode(),
    websiteNode(),
    {
      '@type': 'AboutPage',
      '@id': `${url}#webpage`,
      url,
      name: `Who is ${PERSON.name}?`,
      isPartOf: { '@id': ID.website },
      about: { '@id': ID.person },
      mainEntity: { '@id': ID.person },
      inLanguage: 'en',
      breadcrumb: { '@id': `${url}#breadcrumb` },
    },
    breadcrumbNode(url, [
      { name: 'Home', item: SITE.url },
      { name: 'About', item: url },
    ]),
    faqNode(opts.faq),
  ]);
}

/** One newsletter issue: a real BlogPosting, which the site had no equivalent of.
 *
 *  Stays BlogPosting rather than moving to Periodical/PublicationIssue, which
 *  is semantically closer to a numbered newsletter. Google has no rich result
 *  for those types, so the swap would trade a working enhancement for precision
 *  nothing reads. The issue number rides along as `issueNumber`, which is valid
 *  on the node and ignored harmlessly where it is not understood. */
export function issueSchema(opts: {
  title: string;
  description: string;
  path: string;
  imageUrl: string;
  published: Date;
  modified?: Date;
  wordCount?: number;
  issue?: number;
  portraitUrl: string;
}) {
  const url = absoluteUrl(opts.path);
  // One image node, referenced twice. The BlogPosting and the WebPage used to
  // carry separate anonymous copies of the same cover, which reads as two
  // images rather than one and leaves neither carrying the licence.
  const imageId = `${url}#primaryimage`;
  return graph([
    personNode(opts.portraitUrl),
    organizationNode(),
    websiteNode(),
    imageObject({ url: opts.imageUrl, caption: opts.title, id: imageId }),
    {
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: opts.title,
      description: opts.description,
      url,
      datePublished: opts.published.toISOString(),
      dateModified: (opts.modified ?? opts.published).toISOString(),
      author: { '@id': ID.person },
      publisher: { '@id': ID.person },
      image: { '@id': imageId },
      mainEntityOfPage: { '@id': `${url}#webpage` },
      isPartOf: { '@id': ID.blog },
      inLanguage: 'en',
      ...(opts.issue ? { issueNumber: opts.issue } : {}),
      ...(opts.wordCount ? { wordCount: opts.wordCount } : {}),
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: opts.title,
      isPartOf: { '@id': ID.website },
      primaryImageOfPage: { '@id': imageId },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      inLanguage: 'en',
    },
    breadcrumbNode(url, [
      { name: 'Home', item: SITE.url },
      { name: NEWSLETTER.name, item: absoluteUrl('/newsletter') },
      { name: opts.title, item: url },
    ]),
  ]);
}

/** The archive: a Blog listing every issue. This page DEFINES the Blog entity
 *  that each issue page references by @id, so its identifier is the shared
 *  ID.blog rather than one derived from whatever path it happens to sit at. */
export function newsletterIndexSchema(opts: {
  path: string;
  posts: Array<{
    title: string;
    description: string;
    path: string;
    published: Date;
    issue?: number;
  }>;
  portraitUrl: string;
}) {
  const url = absoluteUrl(opts.path);
  return graph([
    personNode(opts.portraitUrl),
    websiteNode(),
    {
      '@type': 'Blog',
      '@id': ID.blog,
      url,
      name: NEWSLETTER.name,
      description: NEWSLETTER.description,
      author: { '@id': ID.person },
      publisher: { '@id': ID.person },
      isPartOf: { '@id': ID.website },
      inLanguage: 'en',
      blogPost: opts.posts.map((post) => ({
        '@type': 'BlogPosting',
        '@id': `${absoluteUrl(post.path)}#article`,
        headline: post.title,
        description: post.description,
        url: absoluteUrl(post.path),
        datePublished: post.published.toISOString(),
        author: { '@id': ID.person },
        ...(post.issue ? { issueNumber: post.issue } : {}),
      })),
    },
    breadcrumbNode(url, [
      { name: 'Home', item: SITE.url },
      { name: NEWSLETTER.name, item: url },
    ]),
  ]);
}

/** The devlog page.
 *
 *  A Blog whose posts have no URLs of their own, which is exactly what this
 *  is, entries are anchors on one page, not separate documents. Deliberately
 *  not LiveBlogPosting: that type is for live coverage of an event, and Google
 *  has no result for it. Each entry is emitted with its date so the page's
 *  freshness and cadence are legible without inventing 365 fake URLs. */
export function devlogSchema(opts: {
  path: string;
  entries: Array<{ text: string; date: Date }>;
  portraitUrl: string;
}) {
  const url = absoluteUrl(opts.path);
  const dates = opts.entries.map((entry) => entry.date.getTime());
  return graph([
    personNode(opts.portraitUrl),
    websiteNode(),
    {
      '@type': 'Blog',
      '@id': `${url}#devlog`,
      url,
      name: `${DEVLOG.name}, ${PERSON.name}`,
      description: DEVLOG.description,
      author: { '@id': ID.person },
      publisher: { '@id': ID.person },
      isPartOf: { '@id': ID.website },
      inLanguage: 'en',
      ...(dates.length
        ? {
            datePublished: new Date(Math.min(...dates)).toISOString(),
            dateModified: new Date(Math.max(...dates)).toISOString(),
          }
        : {}),
      blogPost: opts.entries.map((entry) => ({
        '@type': 'BlogPosting',
        headline: entry.text,
        datePublished: entry.date.toISOString(),
        author: { '@id': ID.person },
        isPartOf: { '@id': `${url}#devlog` },
      })),
    },
    breadcrumbNode(url, [
      { name: 'Home', item: SITE.url },
      { name: DEVLOG.name, item: url },
    ]),
  ]);
}

/* ── shared nodes ────────────────────────────────────────────────────────── */

export type FaqEntry = { question: string; answer: string };

/** FAQPage is only emitted when there are entries, and callers are expected to
 *  render the same Q&As visibly, schema that describes invisible content is a
 *  structured-data-mismatch manual action waiting to happen. */
function faqNode(faq: FaqEntry[]): Node | null {
  if (!faq.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': `${SITE.url}/#faq`,
    mainEntity: faq.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

function breadcrumbNode(pageUrl: string, crumbs: Array<{ name: string; item: string }>): Node {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}

function graph(nodes: Array<Node | null>) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter((node): node is Node => node !== null),
  };
}
