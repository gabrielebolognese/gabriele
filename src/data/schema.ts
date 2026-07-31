/* ============================================================================
   schema.ts — JSON-LD builders.

   The site previously emitted three disconnected schema islands on the homepage
   (Person, SoftwareApplication, FAQPage) plus a fourth, contradictory Person on
   every article page. Nothing referenced anything else, so a crawler had no way
   to know they described one entity.

   Everything below is emitted as a single `@graph` with stable `@id`s, so the
   Person, the Organization, the WebSite and the page all cross-reference each
   other and resolve to one entity.
   ========================================================================= */

import { SITE, PERSON, ORGANIZATION, SAME_AS, SUBJECT_OF, absoluteUrl } from './identity';

/* Stable node identifiers — these are what make it a graph rather than a pile. */
export const ID = {
  person: `${SITE.url}/#person`,
  website: `${SITE.url}/#website`,
  org: `${ORGANIZATION.url}/#organization`,
  logo: `${SITE.url}/#logo`,
} as const;

type Node = Record<string, unknown>;

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
    image: {
      '@type': 'ImageObject',
      url: portraitUrl,
      caption: `${PERSON.name}, founder of ${ORGANIZATION.name}`,
    },
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
      name: `${PERSON.name} — ${PERSON.jobTitle}`,
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
      image: opts.softwareImage,
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

/** Article page: a real BlogPosting, which the site had no equivalent of. */
export function articleSchema(opts: {
  title: string;
  description: string;
  path: string;
  imageUrl: string;
  published: Date;
  modified?: Date;
  wordCount?: number;
  portraitUrl: string;
}) {
  const url = absoluteUrl(opts.path);
  return graph([
    personNode(opts.portraitUrl),
    organizationNode(),
    websiteNode(),
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
      image: { '@type': 'ImageObject', url: opts.imageUrl },
      mainEntityOfPage: { '@id': `${url}#webpage` },
      isPartOf: { '@id': ID.website },
      inLanguage: 'en',
      ...(opts.wordCount ? { wordCount: opts.wordCount } : {}),
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: opts.title,
      isPartOf: { '@id': ID.website },
      primaryImageOfPage: { '@type': 'ImageObject', url: opts.imageUrl },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      inLanguage: 'en',
    },
    breadcrumbNode(url, [
      { name: 'Home', item: SITE.url },
      { name: 'Articles', item: absoluteUrl('/articles') },
      { name: opts.title, item: url },
    ]),
  ]);
}

/** Articles index: a Blog listing every post. */
export function blogIndexSchema(opts: {
  path: string;
  posts: Array<{ title: string; description: string; path: string; published: Date }>;
  portraitUrl: string;
}) {
  const url = absoluteUrl(opts.path);
  return graph([
    personNode(opts.portraitUrl),
    websiteNode(),
    {
      '@type': 'Blog',
      '@id': `${url}#blog`,
      url,
      name: `Articles — ${PERSON.name}`,
      description: 'Essays on building FlashFX, motion design, and founding a company solo.',
      author: { '@id': ID.person },
      publisher: { '@id': ID.person },
      inLanguage: 'en',
      blogPost: opts.posts.map((post) => ({
        '@type': 'BlogPosting',
        '@id': `${absoluteUrl(post.path)}#article`,
        headline: post.title,
        description: post.description,
        url: absoluteUrl(post.path),
        datePublished: post.published.toISOString(),
        author: { '@id': ID.person },
      })),
    },
    breadcrumbNode(url, [
      { name: 'Home', item: SITE.url },
      { name: 'Articles', item: url },
    ]),
  ]);
}

/* ── shared nodes ────────────────────────────────────────────────────────── */

export type FaqEntry = { question: string; answer: string };

/** FAQPage is only emitted when there are entries, and callers are expected to
 *  render the same Q&As visibly — schema that describes invisible content is a
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
