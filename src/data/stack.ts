/* ============================================================================
   stack.ts: the languages and tools, as data.

   These arrived as 27 <img> tags pointing at img.shields.io. They are rendered
   locally instead, keeping every brand colour exactly as specified, because
   the badge service version would have meant:

     - 27 requests to a third party inside the About section, on a site that
       has no other external image anywhere;
     - 27 chances for the About section to render broken, since shields.io
       rate-limits and is occasionally slow or down, and a badge that fails is
       a visible hole rather than a silent one;
     - layout shift on every one, because a remote SVG has no intrinsic size in
       the HTML and this block sits above the fold on a laptop;
     - the visitor's IP and referrer handed to a third party to draw a
       rectangle with a word in it;
     - nothing in the image sitemap and no SEO value, unlike every other image
       on this site, which goes through astro:assets.

   The pills below cost one CSS rule and zero requests. `bg` is the badge
   colour from the original and `fg` is its logoColor, so the palette is
   unchanged.

   Ordered as given. This is a claim about what the site owner knows, so
   nothing is added, reordered by seniority, or quietly dropped here.
   ========================================================================= */

export interface Tech {
  name: string;
  /** Badge colour, as specified. */
  bg: string;
  /** Text colour. Only JavaScript and the two React entries are dark on light. */
  fg: 'light' | 'dark';
}

export interface TechGroup {
  title: string;
  items: Tech[];
}

export const STACK: TechGroup[] = [
  {
    title: 'Frontend',
    items: [
      { name: 'JavaScript',   bg: '#f7df1e', fg: 'dark' },
      { name: 'HTML5',        bg: '#e34f26', fg: 'light' },
      { name: 'CSS3',         bg: '#1572b6', fg: 'light' },
      { name: 'React',        bg: '#61dafb', fg: 'dark' },
      { name: 'React Native', bg: '#61dafb', fg: 'dark' },
      { name: 'Angular',      bg: '#dd0031', fg: 'light' },
      { name: 'Vue.js',       bg: '#4fc08d', fg: 'light' },
      { name: 'Bootstrap',    bg: '#7952b3', fg: 'light' },
    ],
  },
  {
    title: 'Backend',
    items: [
      { name: 'TypeScript', bg: '#3178c6', fg: 'light' },
      { name: 'PHP',        bg: '#777bb4', fg: 'light' },
      { name: 'Node.js',    bg: '#339933', fg: 'light' },
      { name: 'Java',       bg: '#ed8b00', fg: 'light' },
      { name: 'Python',     bg: '#3776ab', fg: 'light' },
      { name: 'Spring',     bg: '#6db33f', fg: 'light' },
    ],
  },
  {
    title: 'Machine learning and AI',
    items: [
      { name: 'PyTorch',    bg: '#ee4c2c', fg: 'light' },
      { name: 'TensorFlow', bg: '#ff6f00', fg: 'light' },
      { name: 'Pandas',     bg: '#150458', fg: 'light' },
    ],
  },
  {
    title: 'Databases',
    items: [
      { name: 'MySQL',      bg: '#4479a1', fg: 'light' },
      { name: 'PostgreSQL', bg: '#336791', fg: 'light' },
      { name: 'MongoDB',    bg: '#47a248', fg: 'light' },
    ],
  },
  {
    title: 'Tools and platforms',
    items: [
      { name: 'Git',         bg: '#f05032', fg: 'light' },
      { name: 'Docker',      bg: '#2496ed', fg: 'light' },
      { name: 'Electron',    bg: '#47848f', fg: 'light' },
      { name: 'Figma',       bg: '#f24e1e', fg: 'light' },
      { name: 'Photoshop',   bg: '#31a8ff', fg: 'light' },
      { name: 'Illustrator', bg: '#ff9a00', fg: 'light' },
      { name: 'Android',     bg: '#3ddc84', fg: 'light' },
    ],
  },
];

/** Flat list, for anything that wants the names without the grouping. */
export const STACK_NAMES: string[] = STACK.flatMap((g) => g.items.map((i) => i.name));
