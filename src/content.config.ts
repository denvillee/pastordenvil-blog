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

export const collections = {
  pages,
  /* Essays can arrive as a set — a named series in parts (the anthropology set
     runs 10-12). `series` names the set, `part` numbers the essay inside it.
     A standalone essay leaves both blank and sits outside any set. */
  essays: room('essays', { part: z.number().optional() }),
  leaders: room('leaders'),
  moments: room('moments'),

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
