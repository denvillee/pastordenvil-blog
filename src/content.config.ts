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
  /* Position inside that series. Built into the shared shape rather than onto
     essays alone, so a run of Moments or For Leaders posts needs no new field. */
  seriesOrder: z.number().optional(),
  scripture: z.string().optional(),
  tags: z.array(z.string()).default([]),
  ogImage: z.string().optional(),
  /* The section page's own introduction, as a real post rather than a panel:
     linkable, shareable, and editable in the same place as everything else.
     It pins to the top of its section's list and is excluded from the Latest
     slot, the archive, the by-date view and RSS, because it is a signpost
     rather than news. Without this flag the front page announces it as a new
     essay the day it ships. `live()` drops it by default for exactly that
     reason: a future consumer that forgets to filter gets it right anyway. */
  pageIntro: z.boolean().default(false),
  /* One word of the title, circled by hand the way the references mark a
     heading. Optional: which word carries the idea is an editorial call, and a
     template guessing it would circle the wrong word most of the time. */
  titleMark: z.string().optional(),
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
  }),
});

/* A named run of pieces. The series exists as its own thing rather than being
   inferred from the posts, because it needs a name and a line of its own, and
   because a reader should see the shape of the whole run on arrival: the parts
   still to come are listed here before they exist as files.

   A part is live when a piece in the matching stream carries this series name
   and that seriesOrder. Everything else in `parts` shows as forthcoming, with
   no date attached, because a date not yet chosen is a promise not yet made. */
const series = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/series' }),
  schema: z.object({
    name: z.string(),
    dek: z.string(),
    room: z.enum(['essays', 'moments', 'leaders']).default('essays'),
    current: z.boolean().default(false),
    parts: z.array(z.object({ order: z.number(), title: z.string() })).default([]),
  }),
});

export const collections = {
  pages,
  landing,
  series,
  /* Essays can arrive as a set — a named series in parts (the anthropology set
     runs 10-12). `series` names the set, `part` numbers the essay inside it.
     A standalone essay leaves both blank and sits outside any set. */
  essays: room('essays'),
  leaders: room('leaders', {
    /* Three kinds of post, each a fixed layout, chosen from a dropdown: a short
       written note, a picture with a caption, or a full essay. The freedom
       being asked for here is freedom of kind, not freedom of arrangement, so
       there is no rich editor and no per-post layout control. */
    format: z.enum(['note', 'image', 'essay']).default('note'),
    /* The line under the picture, for format: image. */
    caption: z.string().optional(),
  }),
  moments: room('moments', {
    /* Three kinds of post, each a fixed layout, chosen from a dropdown: a short
       written note, a picture with a caption, or a full essay. The freedom
       being asked for here is freedom of kind, not freedom of arrangement, so
       there is no rich editor and no per-post layout control. */
    format: z.enum(['note', 'image', 'essay']).default('note'),
    /* The line under the picture, for format: image. */
    caption: z.string().optional(),
  }),

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

  /* WATCH, rebuilt 28 Aug 2026 (packet 1.8, "kept and narrowed").
     Embeds only, never re-hosted: Denvil's talks live on whichever channel
     posted them, and this page points at them.

     The previous shape here was a vertical-clip model with posters, durations
     and a `day` of the week. It went with the publishing cadence that was
     retired, and none of its fields survive into this one. */
  /* WATCH. Embeds only, never re-hosted, grouped by year.

     Two providers, because Denvil's talks live where the church that recorded
     them put them: YouTube for some, Vimeo for the sermons The Chapel hosts.
     The provider decides the embed origin and the poster, and nothing else
     about the entry changes. */
  watch: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/watch' }),
    schema: z.object({
      title: z.string(),
      /* Set by hand, always. Deriving it from the upload date puts a talk
         given in December and posted in January under the wrong year. */
      year: z.number().int(),
      provider: z.enum(['youtube', 'vimeo']).default('youtube'),
      /* The id only, not a URL. */
      videoId: z.string(),
      /* The poster, self-hosted, as a file stem under /assets/img with no
         extension: the component serves .webp with a .jpg fallback. Vimeo has
         no predictable thumbnail address the way YouTube does, and pointing at
         their CDN means a broken still the day they change a URL, so the image
         is pulled down once and served from here. Leave blank on a YouTube
         entry and its thumbnail is derived from the id. */
      poster: z.string().optional(),
      /* Where he was teaching: the church, conference or event. This is the
         line the page leads with. */
      context: z.string().optional(),
      /* The day it was given. Denvil is usually one voice inside a series of
         other speakers, so the talk stands on its own and the series is not
         printed: it belongs to the church that ran it, not to him. */
      givenOn: z.coerce.date().optional(),
      /* Kept only so existing entries stay valid. Not printed. */
      note: z.string().optional(),
      /* Runtime in seconds, straight from the provider. Shown as m:ss. */
      durationSeconds: z.number().int().optional(),
      order: z.number().default(0),
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
      cover: z.string().optional(),        // /assets/covers/*.jpg, spine colour is the fallback
      progress: z.string().optional(),
      /* Denvil's own line about the book: why it is on the shelf, or what he is
         taking from it. Optional and never generated. The body of the entry is
         a neutral description of what the book argues; this is the only place
         a first-person reaction belongs, and it appears only when he writes
         one. */
      note: z.string().optional(),
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
