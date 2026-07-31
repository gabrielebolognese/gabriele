/* ============================================================================
   faq.ts — Q&A rendered BOTH as visible page content and as FAQPage JSON-LD.

   The previous FAQ schema described three questions that appeared nowhere on
   the page. Google requires FAQ structured data to match visible content, and
   the mismatch is a documented manual-action trigger. Everything here is
   rendered by src/components/Faq.astro, so the two can never diverge.

   This is also the single best format for answer-engine extraction — a direct
   question followed by a self-contained answer is what gets quoted.
   ========================================================================= */

import type { FaqEntry } from './schema';
import { FACTS } from './identity';

export const HOMEPAGE_FAQ: FaqEntry[] = [
  {
    question: 'Who is Gabriele Bolognese?',
    answer:
      'Gabriele Bolognese is an Italian founder and self-taught developer, known as the creator of FlashFX — a browser-based motion graphics and video editing platform. He started as a video editor and YouTube creator before teaching himself TypeScript and building FlashFX solo.',
  },
  {
    question: 'What is FlashFX?',
    answer:
      `FlashFX is a browser-based motion graphics and video editing platform, built as an alternative to desktop software like After Effects and Premiere Pro. It runs entirely in the browser with no install, and is used by more than ${FACTS.usersLabel} people.`,
  },
  {
    question: 'Who founded FlashFX?',
    answer:
      'FlashFX was founded by Gabriele Bolognese, who built the product solo across four complete rebuilds before launch and remains its lead developer.',
  },
  {
    question: 'How did Gabriele Bolognese learn to code?',
    answer:
      'He is entirely self-taught. He began with AI-assisted prototypes, lost an early codebase to a file restructuring error, and rebuilt from fundamentals in TypeScript — a failure he credits as the reason FlashFX was eventually engineered properly.',
  },
  {
    question: 'Where is Gabriele Bolognese based?',
    answer:
      'He is based in Rovigo, in the Veneto region of northern Italy, and works remotely on FlashFX.',
  },
];
