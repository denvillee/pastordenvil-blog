import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* Shared shape for every "room". Field names follow BACKEND.md / the hosting runbook. */
const roomSchema = z.object({
  title: z.string(),
  dek: z.string(),
  publishAt: z.coerce.date(),
  draft: z.boolean().default(false),
  week: z.number().optional(),
  series: z.string().optional(),
  scripture: z.string().optional(),
  tags: z.array(z.string()).default([]),
  ogImage: z.string().optional(),
  /* The Latest slot on the home page. Pinning holds a piece there regardless of
     date, because Moments and For Leaders are short and frequent while essays
     are long and rare: on pure recency a week of quick posts buries a new essay
     the day after it goes up. Newest pinned item wins if more than one is set. */
  pinned: z.boolean().default(false),
  /* Optional, and optional on purpose. A piece with no image runs text-only at
     the same width rather than reaching for a stock picture; one generic image
     repeated across every post is a placeholder wearing a photograph. */
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  /* Attribution block. Rendered as "Where this comes from" under the article.
     Required in practice for frameworks: see claude/theological-spine.md. */
  notes: z.string().optional(),
  /* A drawing, by component name — see src/components/diagrams and src/lib/diagrams.ts.
     Available in every room so a framework can live inside the piece that uses it
     rather than only in its own room. Blank means no drawing. */
  diagram: z.string().optional(),
  diagramCaption: z.string().optional(),
});

const room = (base: string, extend = {}) =>
  defineCollection({
    loader: glob({ pattern: '**/*.md', base: `./src/content/${base}` }),
    schema: roomSchema.extend(extend),
  });

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    dek: z.string(),
    publishAt: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

/* The section landing copy: Denvil's own words about why each room exists.
   `lead` is the paragraph that stays visible; the body is what opens behind
   the disclosure. Split in two on purpose, so a regular coming back for what
   is new steps over 300 words instead of scrolling past them. */
const landing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/landing' }),
  schema: z.object({
    room: z.string(),
    title: z.string(),
    lead: z.string(),
  }),
});

export const collections = {
  pages,
  landing,
  /* Essays can arrive as a set — a named series in parts (the anthropology set
     runs 10-12). `series` names the set, `part` numbers the essay inside it.
     A standalone essay leaves both blank and sits outside any set. */
  essays: room('essays', { part: z.number().optional() }),
  leaders: room('leaders'),
  moments: room('moments'),

  /* PARKED, 28 Aug 2026. The Frameworks room is retired: no route, no CMS tab,
     /frameworks/ 301s to /essays/. The collection stays defined so the three
     existing files remain valid on disk rather than being quietly orphaned.
     Their substance belongs inside essays now, and the TwoAges drawing already
     renders there through the `diagram` field. */
  frameworks: room('frameworks', {
    order: z.number(),
    summary: z.string().optional(),
    guide: z.string().optional(),        // /assets/guides/*.pdf
    essay: z.string().optional(),        // slug of the companion essay
    clip: z.string().optional(),         // id of the companion clip
  }),

  watch: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/watch' }),
    schema: z.object({
      title: z.string(),
      caption: z.string(),
      week: z.number().optional(),
      day: z.enum(['monday', 'wednesday', 'friday', 'saturday']).optional(),
      durationSeconds: z.number(),
      scripture: z.string().optional(),
      poster: z.string(),
      youtube: z.string().default(''),
      tiktok: z.string().default(''),
      instagram: z.string().default(''),
      publishAt: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
  }),

  reading: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/reading' }),
    schema: z.object({
      title: z.string(),
      author: z.string(),
      year: z.number().optional(),
      shelfStatus: z.enum(['now', 'shelf', 'next', 'finished']),
      shelfMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),  // which month's shelf this book belongs to
      cover: z.string().optional(),        // /assets/covers/*.jpg — spine colour is the fallback
      progress: z.string().optional(),
      spine: z.enum(['cobalt', 'ivy', 'brass', 'ember', 'ink']).default('ivy'),
      link: z.string().default(''),
      order: z.number().default(0),
      publishAt: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
  }),

  weeks: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/weeks' }),
    schema: z.object({
      number: z.number(),
      start: z.coerce.date(),
      end: z.coerce.date(),
      movement: z.string(),
      konigPhase: z.enum(['for us', 'in us', 'with us']).nullable().default(null),
      idea: z.string(),
      source: z.string().optional(),
    }),
  }),
};
