import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* ------------------------------------------------------------------
   Fields every publishable room shares.

   publishAt is the spine of the scheduled-publishing model: content is
   written and committed weeks early, and simply does not appear in a
   build that runs before its date. Nothing is "live" until the clock
   says so. See BACKEND.md.
   ------------------------------------------------------------------ */
const base = {
  title: z.string(),
  publishAt: z.coerce.date(),
  summary: z.string(),
  week: reference('weeks').optional(),
  topics: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
};

const dir = (name: string) => glob({ pattern: '**/*.md', base: `./src/content/${name}` });

/* Week — the editorial spine. One idea, carried across every room.
   Everything else points at a week; the week never points back. */
const weeks = defineCollection({
  loader: dir('weeks'),
  schema: z.object({
    number: z.number(),
    season: z.string().default('Season One'),
    movement: z.string(),
    idea: z.string(),
    startsOn: z.coerce.date(),
    source: z.string().optional(),
    reading: z.string().optional(),
    mondayNote: z.string().optional(),
  }),
});

/* The Essay — weekly, 1,000-1,400 words. */
const essays = defineCollection({
  loader: dir('essays'),
  schema: z.object({
    ...base,
    scripture: z.string().optional(),
    readingTime: z.number().optional(),
    featured: z.boolean().default(false),
  }),
});

/* Moments — the devotional room. Ken Gire's three moves, as three fields,
   so the template can never drift from the form. */
const moments = defineCollection({
  loader: dir('moments'),
  schema: z.object({
    ...base,
    passage: z.string(),
    passageText: z.string().optional(),
    scene: z.string(),
    response: z.string(),
  }),
});

/* Leaders Corner — every other week, ~600 words, written to the person carrying something. */
const leaders = defineCollection({
  loader: dir('leaders'),
  schema: z.object({
    ...base,
    anchor: z.boolean().default(false),
  }),
});

/* Frameworks — a theological system, drawn. Monthly.
   One framework fans out into a diagram, an essay, a clip, and a guide. */
const frameworks = defineCollection({
  loader: dir('frameworks'),
  schema: z.object({
    ...base,
    number: z.number(),
    diagram: z.string().optional(),
    beats: z.array(z.string()).default([]),
    guide: z.string().optional(),
    clip: reference('watch').optional(),
    essay: reference('essays').optional(),
  }),
});

/* Watch — vertical clips. Embedded, never re-hosted. */
const watch = defineCollection({
  loader: dir('watch'),
  schema: z.object({
    ...base,
    kind: z.enum(['hook', 'micro-teaching', 'human', 'question']),
    provider: z.enum(['youtube', 'vimeo', 'instagram']).default('youtube'),
    videoId: z.string(),
    seconds: z.number().optional(),
    captionsBurnedIn: z.boolean().default(true),
    sourceCredit: z.string().optional(),
  }),
});

/* Reading shelf — what is actually being read. Honest or it does not work. */
const reading = defineCollection({
  loader: dir('reading'),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    week: reference('weeks').optional(),
    startedOn: z.coerce.date().optional(),
    status: z.enum(['reading', 'finished', 'abandoned', 'returning-to']).default('reading'),
    note: z.string().optional(),
    link: z.string().url().optional(),
  }),
});

/* Archive — the 4,555-file teaching index. PRIVATE.
   Deferred from launch by decision. Nothing here renders a public page
   until the standardization pass in claude/sermon-notes-standardization.md
   is done. It exists so the engine can feed the rooms above. */
const archive = defineCollection({
  loader: dir('archive'),
  schema: z.object({
    title: z.string(),
    preachedOn: z.coerce.date().optional(),
    venue: z.string().optional(),
    series: z.string().optional(),
    scripture: z.string().optional(),
    bigIdea: z.string().optional(),
    audio: z.string().url().optional(),
    video: z.string().url().optional(),
    standardized: z.boolean().default(false),
    privacyCleared: z.boolean().default(false),
  }),
});

export const collections = { weeks, essays, moments, leaders, frameworks, watch, reading, archive };
