/*
  The essay enricher.

  Denvil writes in plain markdown, in the CMS, with no components and no JSX.
  Everything designed about an essay page therefore has to be recognised in the
  rendered HTML rather than authored into it. This file is where that happens.

  Three things get recognised:

  1. Callout blockquotes. `> [!BIG]`, `> [!CIRCLE]` and `> [!QUOTE]` become the
     three display treatments the site already uses everywhere else: a claim
     with a hand-drawn underline, a short line with a circle drawn round it,
     and a strip-of-tape note card. Plain markdown, so the CMS keeps working
     and nothing here needs MDX.

  2. Scripture blockquotes. A quotation that ends in a parenthetical reference
     becomes a passage the reader can change translation on, the same gesture
     the study app uses. Denvil's own wording is always the first pane and the
     default: he chose that rendering and the switcher is an offer, not a
     correction.

  3. A bare chapter-and-verse reference, "(17:33)", inherits the book from the
     last full reference above it, which is how he writes and how anybody reads.

  Nothing here invents text. Every translation other than "As quoted" is fetched
  from the publisher's own API at build time by lib/bible.ts, and the NLT is not
  written into the page at all: Tyndale permits displaying it, not storing it,
  so it is fetched per reader at runtime and never cached.
*/

import { getPassages, type Passage } from './bible';

/* ── the hand-drawn marks, as strings ───────────────────────────────────
   Mark.astro owns these paths for component use. The enricher works on an
   HTML string and cannot render a component, so the two shapes it needs are
   repeated here. If a path changes in Mark.astro, change it here too: they
   are deliberately the same drawing. */
const PATHS: Record<string, { vb: string; w: number; d: string[] }> = {
  'underline-double': { vb: '0 0 200 16', w: 4, d: [
    'M3 6.5c24-3 50-4.6 76-4.8 30-.3 60 1.2 90 3.3 12 .8 22 1.8 31 2.7',
    'M9 13.2c25-2.2 51-3.3 77-3.4 26 0 52 .9 78 2.4',
  ]},
  'circle-loose': { vb: '0 0 240 100', w: 5, d: [
    'M120 7C74 3 28 16 13 36 1 52 12 74 45 85c37 12 96 11 138-3 27-9 42-24 37-40C214 24 172 11 120 7z',
    'M45 85c-9-4-17-9-22-16',
  ]},
};

function mark(kind: keyof typeof PATHS, color: string) {
  const m = PATHS[kind];
  const paths = m.d
    .map((d) => `<path d="${d}" stroke="currentColor" stroke-width="${m.w}" stroke-linecap="round" stroke-linejoin="round" />`)
    .join('');
  return `<span class="mk mk-${kind} mk-${color} mk-draw" aria-hidden="true"><svg viewBox="${m.vb}" fill="none" preserveAspectRatio="none" focusable="false">${paths}</svg></span>`;
}

/* ── scripture references ──────────────────────────────────────────────── */

const BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalm','Psalms','Proverbs','Ecclesiastes',
  'Song of Songs','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel',
  'Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk',
  'Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts',
  'Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians',
  'Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus',
  'Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John',
  'Jude','Revelation',
];
const BOOK_RE = BOOKS.map((b) => b.replace(/ /g, '\\s')).join('|');

/* "(Genesis 2:7)" or "(1 Samuel 17:45)" or the bare "(17:33)". Trailing only:
   a reference in the middle of a sentence is his prose, not a citation. */
const TRAILING_REF = new RegExp(
  `\\((?:(${BOOK_RE})\\s+)?(\\d+):(\\d+)(?:\\s*[-–—]\\s*(\\d+))?\\)\\s*[.]?\\s*$`
);

function normalise(book: string, chapter: string, from: string, to?: string) {
  return to ? `${book} ${chapter}:${from}-${to}` : `${book} ${chapter}:${from}`;
}

/* ── entity helpers ─────────────────────────────────────────────────────
   The rendered HTML already carries curly quotes as real characters. Only
   the five structural entities matter when we put fetched text back in. */
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/* ── the passage block ──────────────────────────────────────────────────
   "As quoted" is always first and always the default. The other panes are
   whatever bible.ts could actually resolve, so a reference the lookup cannot
   parse simply keeps its quotation and loses the tabs, rather than breaking. */
function passageBlock(ref: string, quotedHtml: string, passages: Passage[]) {
  const panes: string[] = [
    `<blockquote class="vs-pane" data-pane="AS">${quotedHtml}</blockquote>`,
  ];
  const tabs: string[] = [
    `<button type="button" class="vs-tab" data-vs-set="AS" aria-pressed="true">As quoted</button>`,
  ];

  for (const p of passages) {
    panes.push(
      /* No quotation marks added around a fetched translation. The text
         often contains speech of its own, and wrapping it produced things
         like: may the Lord be with you!\u201D\u201D\u201D. The card, the rule and the
         reference underneath already say this is a quotation. Denvil's own
         "As quoted" pane keeps whatever marks he typed, because that is his
         sentence and not ours to tidy.

         The source link is not decoration. The NET's licence asks to be named
         where it is quoted, and every pane that shows somebody else's work
         should say whose it is and where to read more of it. */
      `<blockquote class="vs-pane" data-pane="${p.code}" hidden><p>${esc(p.text)}</p>` +
      (p.link ? `<p class="vs-src"><a href="${esc(p.link)}" rel="noopener">${esc(p.label)}</a></p>` : '') +
      `</blockquote>`
    );
    tabs.push(
      `<button type="button" class="vs-tab" data-vs-set="${p.code}" aria-pressed="false">${p.label}</button>`
    );
  }

  /* The NLT is never written into the page. Its pane ships empty and is filled
     from Tyndale's API when a reader asks for it, then dropped when the tab
     closes. That is the difference between displaying a translation and
     storing one, and it is the whole reason this pane looks different. */
  const hasNlt = passages.some((p) => p.code === 'NLT');
  if (!hasNlt) {
    panes.push(
      `<blockquote class="vs-pane" data-pane="NLT" hidden><p class="vs-wait">Loading the New Living Translation.</p>` +
      `<p class="vs-src"><a href="https://www.newlivingtranslation.com" rel="noopener">New Living Translation</a></p></blockquote>`
    );
    tabs.push(`<button type="button" class="vs-tab" data-vs-set="NLT" aria-pressed="false">NLT</button>`);
  }

  /* One real translation plus "As quoted" is the minimum worth a control. */
  const worthTabs = tabs.length > 1;

  return `<figure class="vs${worthTabs ? '' : ' vs-plain'}" data-vs data-ref="${esc(ref)}">` +
    panes.join('') +
    `<figcaption class="vs-cite"><cite class="vs-ref">${esc(ref)}</cite>` +
    (worthTabs
      ? `<span class="vs-tabs" role="group" aria-label="Translation for ${esc(ref)}">${tabs.join('')}</span>`
      : '') +
    `</figcaption></figure>`;
}

/* ── callouts ───────────────────────────────────────────────────────────── */

/* The claim, with the site's own drawn underline beneath it.

   Not a CSS shape: this is the same uneven path Mark.astro draws everywhere
   else on the site, so a big idea in an essay is marked with the identical
   stroke as a marked word in a heading. It sits under the block rather than
   wrapped around the words, because .u stretches to its box and a wrapper
   round a three-line claim gives you one enormous rule down the side of it. */
function bigIdea(inner: string) {
  return `<aside class="bigidea"><p class="bigidea-t">${inner}</p>` +
    `<span class="bigidea-u">${mark('underline-double', 'yellow')}</span></aside>`;
}

/* A labelled statement. Denvil sets one of these off in the manuscript with a
   run-in label -- THE CORE IDEA -- above the claim, which is a different move
   from a big idea: a big idea is the sentence the paragraph was building to,
   while this one names what the passage is about before saying it. So it gets
   its own treatment rather than being flattened into a bigidea: a rule down
   the side, the label in the site's small-caps voice, the claim beneath it.
   First paragraph is the label, the rest is the claim. */
function coreIdea(paras: string[]) {
  const [label, ...rest] = paras;
  const body = (rest.length ? rest : [label]).join('</p><p class="core-t">');
  const eyebrow = rest.length ? `<p class="core-k">${label}</p>` : '';
  return `<aside class="core">${eyebrow}<p class="core-t">${body}</p></aside>`;
}

function circled(inner: string) {
  return `<aside class="bigidea bigidea-c"><p class="bigidea-t"><span class="c">${inner}${mark('circle-loose', 'coral')}</span></p></aside>`;
}

/* A note card under a strip of tape. Every paragraph is body, except a last
   one opening with "~ ", which is an attribution and is set as one. The tilde
   is there because an em dash is not allowed in copy on this site. */
function taped(paras: string[]) {
  const last = paras[paras.length - 1];
  const isBy = paras.length > 1 && /^~\s+/.test(last);
  const body = (isBy ? paras.slice(0, -1) : paras).map((t) => `<p>${t}</p>`).join('');
  const by = isBy ? `<p class="pq-by">${last.replace(/^~\s+/, '')}</p>` : '';
  return `<aside class="pq"><div class="pq-card"><span class="pq-tape" aria-hidden="true"></span>` +
    `<blockquote class="pq-q">${body}</blockquote>${by}</div></aside>`;
}

/* ── the pass ───────────────────────────────────────────────────────────── */

const BLOCKQUOTE = /<blockquote>([\s\S]*?)<\/blockquote>/g;

export async function enrich(html: string): Promise<string> {
  if (!html) return html;

  /* Collect first, rewrite second: the passage lookups are async and running
     them inside a replace callback would hand back a pile of Promises. */
  type Job = { whole: string; inner: string };
  const jobs: Job[] = [];
  let m: RegExpExecArray | null;
  BLOCKQUOTE.lastIndex = 0;
  while ((m = BLOCKQUOTE.exec(html))) jobs.push({ whole: m[0], inner: m[1] });

  let lastBook = '';
  const replacements: Array<[string, string]> = [];

  for (const job of jobs) {
    const paras = [...job.inner.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((p) => p[1].trim());
    if (!paras.length) continue;

    const flag = paras[0].match(/^\[!(BIG|CIRCLE|QUOTE|CORE)\]\s*/i);
    if (flag) {
      const kind = flag[1].toUpperCase();
      const cleaned = [paras[0].slice(flag[0].length).trim(), ...paras.slice(1)].filter(Boolean);
      if (!cleaned.length) continue;
      if (kind === 'BIG') replacements.push([job.whole, bigIdea(cleaned.join('</p><p class="bigidea-t">'))]);
      else if (kind === 'CIRCLE') replacements.push([job.whole, circled(cleaned[0])]);
      else if (kind === 'CORE') replacements.push([job.whole, coreIdea(cleaned)]);
      else replacements.push([job.whole, taped(cleaned)]);
      continue;
    }

    /* Scripture? The reference lives at the end of the last paragraph. */
    const last = paras[paras.length - 1];
    const plain = stripTags(last);
    const ref = plain.match(TRAILING_REF);
    if (!ref) continue;

    const [, bookRaw, chapter, from, to] = ref;
    const book = bookRaw ? bookRaw.replace(/\s+/g, ' ').trim() : lastBook;
    if (!book) continue;
    lastBook = book;
    const full = normalise(book, chapter, from, to);

    /* Lift the citation out of the quotation: it becomes the figcaption. */
    const quotedHtml = paras
      .map((p, i) => (i === paras.length - 1 ? p.replace(TRAILING_REF, '').trim() : p))
      .filter(Boolean)
      .map((p) => `<p>${p}</p>`)
      .join('');

    const passages = await getPassages(full);
    replacements.push([job.whole, passageBlock(full, quotedHtml, passages)]);
  }

  let out = html;
  for (const [from, to] of replacements) out = out.replace(from, to);
  return out;
}
