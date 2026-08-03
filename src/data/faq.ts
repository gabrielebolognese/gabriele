/* ============================================================================
   faq.ts — Q&A rendered BOTH as visible page content and as FAQPage JSON-LD.

   The previous FAQ schema described three questions that appeared nowhere on
   the page. Google requires FAQ structured data to match visible content, and
   the mismatch is a documented manual-action trigger. Everything here is
   rendered by src/components/Faq.astro, so the two can never diverge.

   The questions stay in the third person because they mirror what people
   actually type into a search box. The answers are first person, because they
   are mine.
   ========================================================================= */

import type { FaqEntry } from './schema';
import { FACTS } from './identity';

export const HOMEPAGE_FAQ: FaqEntry[] = [
  {
    question: 'Who is Gabriele Bolognese?',
    answer:
      'I am an Italian founder and self-taught developer, and the creator of FlashFX, a browser-based motion graphics and video editing platform. I started out as a video editor and a YouTube creator, then taught myself TypeScript and built FlashFX on my own.',
  },
  {
    question: 'What is FlashFX?',
    answer:
      `FlashFX is my browser-based motion graphics and video editing platform, built as an alternative to desktop software like After Effects and Premiere Pro. It runs entirely in the browser with no install, and more than ${FACTS.usersLabel} people use it.`,
  },
  {
    question: 'Who founded FlashFX?',
    answer:
      'I did. I built the product on my own across four complete rebuilds before launch, and I am still it’s lead developer.',
  },
  {
    question: 'How did Gabriele Bolognese learn to code?',
    answer:
      'I am entirely self-taught. I started with AI-assisted prototypes, lost an early codebase to a file restructuring error, and rebuilt from the fundamentals in TypeScript. That failure is the reason FlashFX eventually got engineered properly, and why I make alot less mistakes now.',
  },
  {
    question: 'Where is Gabriele Bolognese based?',
    answer:
      'I am based in Rovigo, in the Veneto region of northern Italy, and I work on FlashFX remotely.',
  },
];
