import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* Shared shape for every "room". Field names follow BACKEND.md / the hosting runbook. */
const roomSchema = z.object({
  title: z.string(),
  dek: z.string(),
  /* The deck is the line under the headline and it is written to be read, not
     to be a search result. When a piece carries its own meta description, the
     document head uses that instead: Denvil's handoffs supply one, and the two
     jobs want different sentences. */
  metaDescription: z.string().optional(),
  /* What a card says about the piece. The deck describes it to somebody
     already on the page; the teaser has to make a stranger click. Falls back
     to the deck when it is not set, which is most of the time. */
  teaser: z.string().optional(),
  /* Ask the reader for a response at the end of the piece. Off by default and
     set per piece: a short Moment does not need anybody to review its
     argument, and an invitation on everything stops being an invitation. */
  /* The private response block, opt-in per piece. Named for what it is: the
     reader is not being asked to review the writing. Moments leave it off. */
  respond: z.boolean().default(false),
  publishAt: z.coerce.date(),
  draft: z.boolean().default(false),
  week: z.number().optional(),
  series: z.string().optional(),
  /* Position inside that series. Built into the shared shape rather than onto
     essays alone, so a run of Moments or For Leaders posts needs no new field. */
  seriesOrder: z.number().optional(),
  /* Where the piece sits in the private manuscript. Deliberately NOT seriesOrder:
     `series` is now the public collection label, unordered and unnumbered, while
     the ordering lives only behind /studio/book/. Denvil, 3 Sep: the site is a
     collection of standalone essays, not a book published a chapter at a time. */
  bookChapter: z.number().optional(),
  scripture: z.string().optional(),
  tags: z.array(z.string()).default([]),
  ogImage: z.string().optional(),
  /* Names a drawn ArtPlate to carry a piece that has no photograph. Denvil,
     30 Aug: "All pages don't need photos of me. we'll design photos / stock for
     what we need." Leaving this unset keeps the loud Placeholder, which is
     deliberate: a slot genuinely waiting on a picture should look like it is. */
  plate: z.enum(['stack','passage','shelf','letter','timeline','lost','notice',
                 'morning','shelter']).optional(),
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

/* A collection of pieces, by name.

   This was "a named run": it carried `current`, and a `parts` array listing the
   whole run so the shape of it showed before the later parts existed. Denvil,
   3 Sep: the site is a collection of standalone essays, not a book published a
   chapter at a time. So a series is now a label and a line, and the fields that
   made it a run are gone rather than left empty. Leaving `parts` in place would
   have kept it one CMS edit away from coming back. */
const series = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/series' }),
  schema: z.object({
    name: z.string(),
    dek: z.string(),
    room: z.enum(['essays', 'moments', 'leaders']).default('essays'),
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
    /* Kinds of post, each a fixed layout, chosen from a dropdown: a short
       written note, a picture with a caption, a full essay, or — new, 1 Sep —
       a `tiny` observation. The freedom being asked for here is freedom of
       kind, not freedom of arrangement, so there is no rich editor and no
       per-post layout control.

       `tiny` is shorter than a note and has no argument in it: two or three
       fragments and a date, the way the comp shows it. It gets no title on the
       page, so `title` is used only for the URL and the archive. */
    format: z.enum(['note', 'image', 'essay', 'tiny']).default('note'),
    /* The line under the picture, for format: image. */
    caption: z.string().optional(),

    /* Denvil's Moments cards carry the sentence inside the artwork: the quote
       is set in the image, over a photograph, with the marks drawn on. When
       that is true the page must not print the same sentence again above the
       picture, so the heading is kept for screen readers and search and taken
       out of the visual layout. Per post, because it is only true of the
       cards. */
    titleInImage: z.boolean().default(false),

    /* ── the note-card grid ───────────────────────────────────────────
       The comp's Moments page is eight handwritten cards on visibly different
       paper. Authored rather than randomised: a random paper would reshuffle
       on every build and the page would never look the same twice, which is
       exactly the kind of restlessness a page about noticing should not have. */
    paper: z.enum(['plain', 'green', 'lined', 'cream', 'pink']).default('plain'),
    /* What is holding it to the page. */
    clip: z.enum(['none', 'tape', 'paperclip']).default('none'),
    /* One word or short phrase inside the card that gets a drawn mark, and
       which mark it gets. The word must appear in the card's own text; if it
       does not, nothing is drawn rather than something being invented. */
    emphasis: z.string().optional(),
    emphasisMark: z.enum(['highlight', 'circle', 'underline']).default('underline'),
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
    /* Which talk leads the page. Newest is not the same as best: a page ordered
       by date was promoting whatever happened to be last uploaded. Denvil picks
       one. Newest is only the fallback when nothing is flagged. */
    featured: z.boolean().default(false),
      provider: z.enum(['youtube', 'vimeo']).default('youtube'),
      /* The id only, not a URL. Optional since the library took audio: a
         podcast episode is an mp3 and has no video anywhere to point at. Every
         video entry still has one, and the card that renders a player is only
         reached when it does. */
      videoId: z.string().optional(),
      /* Whose show it is. Printed on an audio card in place of the venue,
         because with a podcast the show is the thing a listener recognises. */
      show: z.string().optional(),
      /* The episode's own page on the show's site. Attribution, and the way
         out for a listener who wants to subscribe to somebody else's podcast,
         which is the one case where sending a reader off the site is the
         helpful thing to do rather than the lazy thing. */
      episodeUrl: z.string().url().optional(),
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
      /* Runtime in seconds, straight from the provider. */
      durationSeconds: z.number().int().optional(),

      /* Where the teaching actually begins inside the recording, and where it
         ends, as a timestamp: "42:10", or "1:02:30" past the hour.

         Three of the talks here are whole services, ninety-eight to a hundred
         minutes, because that is how the church posted them. Sending a reader
         to minute zero of a service to hear a sermon that starts forty minutes
         in is asking them to go looking for it. With a start set, the player
         opens on the teaching and the length printed on the card is the length
         of the teaching, not of the service.

         Only the start is honoured by both players. YouTube takes an end too;
         Vimeo's embed has no end parameter, so there an end only corrects the
         printed length. */
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),

      /* ── Fields for the full archive ────────────────────────────────────
         The library is expected to grow past a hundred messages, and a bulk
         import should not need a schema change or a component rewrite. Every
         one of these is optional so the entries already here stay valid, and
         each is a field the import will actually carry.

         When the archive lands, series and organization become the better
         grouping than year, which is why they are named rather than folded
         into the single free-text `context` line the page leads with today. */
      series: z.string().optional(),
      /* The comp's four Watch tabs: Teaching, Leadership, Conversations, Q&A.
         Optional on purpose. Every one of the 61 talks currently in the library
         is a weekend message, so defaulting them all to "teaching" would render
         a four-tab control with 61 in the first tab and nothing in the other
         three — a filter that filters nothing, which is worse than no filter.
         The tab row renders only the categories that actually have entries, so
         the control appears as Denvil categorises and not before. */
      category: z.enum(['teaching', 'leadership', 'conversation', 'qa']).optional(),
      /* What kind of thing this is, which is a different question from what it
         is about. Denvil, 2 Sep: "since we have audio and podcast maybe we can
         put those tabs back at the top". Optional, and derived when it is not
         set: an entry with an audio file and no video is audio, everything else
         is video. Set it to 'podcast' by hand for an episode of somebody's
         show, which is neither of those: it is a conversation he was a guest
         on, and a reader looking for one is not looking for a sermon. */
      kind: z.enum(['video', 'audio', 'podcast']).optional(),
      organization: z.string().optional(),
      location: z.string().optional(),
      scripture: z.string().optional(),
      description: z.string().optional(),
      /* A separate audio file, when there is one. This is what a locked-screen
         phone player needs, and it is deliberately not derived from the video
         id: the audio may be exported and hosted separately. */
      audioSrc: z.string().optional(),
      tags: z.array(z.string()).default([]),
      /* Overrides the filename-derived id. An import that carries its own
         permalinks should be able to keep them. */
      slug: z.string().optional(),

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
      /* The comp's Bookshelf filter row: All Books, Leadership, Theology,
         Personal Growth, Culture, Communication, Teams, Strategy. Optional, and
         the row renders only the categories that actually have books, so it
         appears as the shelf is labelled rather than showing eight chips with
         nothing behind six of them. */
      category: z.enum(['leadership','theology','formation','culture',
                        'communication','teams','strategy']).optional(),
      /* The comp's "Featured Recommendation" panel. One book at a time; if more
         than one is flagged the first by `order` wins. */
      featured: z.boolean().default(false),
      /* The comp sets a handwritten pull quote beside the Featured
         Recommendation, with a drawn asterisk and a coloured underline. It is a
         line FROM the book, so it is attributed to the author, not to Denvil.
         Optional: no quote, no panel. */
      pullQuote: z.string().optional(),
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
