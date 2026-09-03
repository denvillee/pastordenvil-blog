import { getCollection, type CollectionKey } from 'astro:content';
import labels from '../data/labels.json';

/* PUBLISH_ALL=1 reveals drafts and future-dated entries.
   Deploy previews only. Setting it in production unbanks the whole season. */
const showAll =
  (typeof process !== 'undefined' && process.env?.PUBLISH_ALL === '1') ||
  import.meta.env.PUBLISH_ALL === '1';

export function isLive(data: { draft?: boolean; publishAt: Date }) {
  if (showAll) return true;
  if (data.draft) return false;
  return data.publishAt.getTime() <= Date.now();
}

/** Every published entry in a room, newest first.
 *
 *  Section intros are excluded here rather than at each call site. They are
 *  signposts, not news, and they carry a real publish date because inventing an
 *  early one would surface a lie anywhere the flag did not reach. That date
 *  makes them the newest thing in the room on the day they ship, so anything
 *  reading this list by recency would lead with the introduction: the home
 *  page's Latest slot, the archive, the by-date view, RSS. Filtering here means
 *  a view added later is right without anyone remembering the rule. Ask for the
 *  intro explicitly with introPost(). */
export async function live(key: CollectionKey) {
  const all = await getCollection(key as any);
  return all
    .filter((e: any) => isLive(e.data) && !e.data.pageIntro)
    .sort((a: any, b: any) => b.data.publishAt.getTime() - a.data.publishAt.getTime());
}

/** A room's introduction post, if it has one. Pinned to the top of its list. */
export async function introPost(key: CollectionKey) {
  const all = await getCollection(key as any);
  return all.find((e: any) => e.data.pageIntro && isLive(e.data));
}

/** Every published entry including the section intro, newest first.
 *
 *  This is what route generation wants. The intro is a real post at a real URL,
 *  linkable and shareable, so it needs a page built even though it never
 *  appears in a feed. Using live() in getStaticPaths gives it a 404. */
export async function allLive(key: CollectionKey) {
  const all = await getCollection(key as any);
  return all
    /* The section introduction no longer gets its own article route. It is the
       front door of the section page, rendered there in full, and building a
       second URL for the same writing meant maintaining two copies of it.
       netlify.toml 301s the old /why-this-exists/ addresses back to the
       section, so nothing that was linked or shared breaks. */
    .filter((e: any) => isLive(e.data) && !e.data.pageIntro)
    .sort((a: any, b: any) => b.data.publishAt.getTime() - a.data.publishAt.getTime());
}

/* The real opening of a piece, for the Latest block on the home page.

   A title plus a one-line summary asks a reader to decide from a label; the
   actual first paragraph lets them decide from the writing, and it means no
   teaser ever has to be written. Skips frontmatter leftovers, headings, images,
   block quotes and list items to find the first true paragraph, then strips the
   inline markdown that would otherwise render as literal asterisks. */
export function openingParagraph(body = '', limit = 460): string {
  const blocks = body.replace(/\r/g, '').split(/\n\s*\n/);
  for (const raw of blocks) {
    const b = raw.trim();
    if (!b) continue;
    if (/^(#{1,6}\s|>|!\[|\||-{3,}|\*{3,}|```)/.test(b)) continue;
    if (/^([-*+]\s|\d+\.\s)/.test(b)) continue;
    if (/^\[\^[^\]]+\]:/.test(b)) continue;
    const text = b
      .replace(/\[\^[^\]]+\]/g, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    if (text.length <= limit) return text;
    /* Cut on a sentence if one lands near the limit, otherwise on a word. */
    const window = text.slice(0, limit);
    const stop = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '));
    if (stop > limit * 0.5) return window.slice(0, stop + 1);
    return window.slice(0, window.lastIndexOf(' ')) + '\u2026';
  }
  return '';
}

export function readMinutes(body = '') {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

const FMT = new Intl.DateTimeFormat('en-US', {
  month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
});
export const displayDate = (d: Date) => FMT.format(d);
export const isoDate = (d: Date) => d.toISOString();

/* The tag that sits on top of every article and on the Archive tiles.
   `label` comes from the CMS so renaming a room renames it everywhere at once;
   `path` is the URL and `cls` is the colour, and both stay in code on purpose —
   changing a path after launch breaks every link anyone has ever shared. */
/* `piece` is what ONE item in this room is called, in running text. Without it
   the shared article furniture called everything an essay, so a Moment offered
   "Read essay", "Listen to this essay" and "See the books behind this essay".
   `sources` says whether a piece in this room is the kind of thing that has
   books behind it; a Moment is not. */
export const ROOMS = {
  essays:     { label: labels.roomEssayTag,     path: 'essays',     cls: '',          plural: labels.navEssays,  piece: 'essay',  sources: true,  listen: true },
  leaders:    { label: labels.roomLeadersTag,   path: 'leaders',    cls: 't-leaders', plural: labels.navLeaders, piece: 'essay',  sources: true,  listen: true },
  moments:    { label: labels.roomMomentsTag,   path: 'moments',    cls: 't-moments', plural: labels.navMoments, piece: 'moment', sources: false, listen: false },
} as const;
export type RoomKey = keyof typeof ROOMS;

/* The Latest slot. It holds the newest thing across the three STREAMS, whatever
   kind of thing that is, rather than the newest essay.

   A stream publishes discrete dated items and competes for this slot: essays,
   moments, leaders. Bookshelf and Studies are STATES, one continuing thing with
   no feed and so no "latest post"; they get a band further down the page and
   are deliberately not eligible here.

   `pinned` overrides the date. Without it a run of short posts would bury a new
   essay a day after it went up, since the short forms are frequent and the long
   ones are rare. Newest pinned item wins when several are set. */
export type LatestItem = {
  room: RoomKey;
  id: string;
  href: string;
  data: any;
  body: string;
};

export async function latest(): Promise<LatestItem | undefined> {
  const all: LatestItem[] = [];
  for (const room of Object.keys(ROOMS) as RoomKey[]) {
    for (const e of await live(room)) {
      all.push({ room, id: e.id, href: `/${ROOMS[room].path}/${e.id}/`, data: e.data, body: e.body ?? '' });
    }
  }
  if (!all.length) return undefined;
  const byDate = (a: LatestItem, b: LatestItem) =>
    b.data.publishAt.getTime() - a.data.publishAt.getTime();
  const pinned = all.filter((e) => e.data.pinned);
  return (pinned.length ? pinned : all).sort(byDate)[0];
}

/* The running series for a section, with each part marked live or forthcoming.

   Parts come from the series entry rather than from counting posts, so the
   shape of the whole run shows before the later parts exist as files. A part
   is live when a published piece in that section carries the series name and
   that seriesOrder. */
export async function currentSeries(room: RoomKey) {
  const all = await getCollection('series' as any);
  const def = all.find((s: any) => s.data.current && s.data.room === room);
  if (!def) return null;
  const posts = await live(room);
  const byOrder = new Map<number, any>();
  for (const p of posts) {
    if (p.data.series === def.data.name && typeof p.data.seriesOrder === 'number') {
      byOrder.set(p.data.seriesOrder, p);
    }
  }
  const parts = [...def.data.parts]
    .sort((a: any, b: any) => a.order - b.order)
    .map((part: any) => {
      const post = byOrder.get(part.order);
      return {
        order: part.order,
        /* The published piece's own title wins: it is the one a reader will
           actually see, and it may have been sharpened since the run was
           planned. */
        title: post?.data.title ?? part.title,
        href: post ? `/${ROOMS[room].path}/${post.id}/` : undefined,
        live: !!post,
      };
    });
  return { name: def.data.name, dek: def.data.dek, parts, total: parts.length };
}

/** Where a single piece sits in its series, for the line under its title. */
export async function seriesPlace(room: RoomKey, seriesName?: string, order?: number) {
  if (!seriesName || typeof order !== 'number') return null;
  const all = await getCollection('series' as any);
  const def = all.find((s: any) => s.data.name === seriesName && s.data.room === room);
  if (!def || !def.data.parts.length) return null;
  return { name: def.data.name, order, total: def.data.parts.length };
}

/* The same placement, plus a way back to the opening piece.

   Denvil, 1 Sep: if the newest essay keeps landing at the top of a list, a
   reader arriving cold meets part two first and has no idea it is part two.
   So the CARD says which part it is and offers the start of the run.

   This does not undo his 30 Aug rule. That rule was about the essay page
   itself, where "Part 1 of 2" made the writing read like a serialised book;
   the article page still shows the run's name and nothing more. A card in a
   list is a different job: it is signposting, not a chapter heading.

   `total` is only reported once the run is finished. While a series is still
   `current`, "Part 2 of 2" would tell a reader the story is over when Denvil
   is still writing it, so the count is withheld until it is true. */
export async function seriesTag(room: RoomKey, data: any) {
  const name = data?.series as string | undefined;
  const order = data?.seriesOrder as number | undefined;
  if (!name || typeof order !== 'number') return null;
  const all = await getCollection('series' as any);
  const def = all.find((s: any) => s.data.name === name && s.data.room === room);
  if (!def || !def.data.parts?.length) return null;

  const posts = await live(room);
  const first = posts.find((p: any) => p.data.series === name && p.data.seriesOrder === 1);

  return {
    name,
    order,
    total: def.data.current ? undefined : def.data.parts.length,
    firstHref: first && order !== 1 ? `/${ROOMS[room].path}/${first.id}/` : undefined,
    firstTitle: first?.data.title as string | undefined,
  };
}

/** The next published piece in the same run, for the card at the end of a piece.
    Returns null when the next one has not been written yet, which is the whole
    point: Denvil's instruction is that the card stays hidden until the essay it
    points at is actually live, so a reader is never invited to click nothing. */
/* The part before this one. The onward card at the foot of an essay used to
   render only when a NEXT part existed, so the newest piece in a run - which
   is the one the front page features, and therefore the one most readers
   arrive on - ended with no way into the series at all. */
export async function prevInSeries(room: RoomKey, seriesName?: string, order?: number) {
  if (!seriesName || typeof order !== 'number' || order <= 1) return null;
  const posts = await live(room);
  const prev = posts.find(
    (p: any) => p.data.series === seriesName && p.data.seriesOrder === order - 1,
  );
  if (!prev) return null;
  return {
    series: seriesName,
    order: order - 1,
    title: prev.data.title as string,
    dek: (prev.data.teaser ?? prev.data.dek) as string,
    href: `/${ROOMS[room].path}/${prev.id}/`,
  };
}

export async function nextInSeries(room: RoomKey, seriesName?: string, order?: number) {
  if (!seriesName || typeof order !== 'number') return null;
  const posts = await live(room);
  const next = posts.find(
    (p: any) => p.data.series === seriesName && p.data.seriesOrder === order + 1,
  );
  if (!next) return null;
  return {
    series: seriesName,
    title: next.data.title as string,
    dek: (next.data.teaser ?? next.data.dek) as string,
    href: `/${ROOMS[room].path}/${next.id}/`,
  };
}

/** The other pieces published in the same week, for the "rest of this week" block. */
export async function weekSiblings(week: number | undefined, selfId: string) {
  if (!week) return [];
  const out: { k: string; t: string; m: string; href: string }[] = [];
  for (const key of Object.keys(ROOMS) as RoomKey[]) {
    for (const e of await live(key)) {
      if (e.id === selfId || e.data.week !== week) continue;
      out.push({
        k: ROOMS[key].label,
        t: e.data.title,
        m: e.data.scripture ?? '',
        href: `/${ROOMS[key].path}/${e.id}/`,
      });
    }
  }
  return out;
}

export async function weekIdea(week: number | undefined) {
  if (!week) return null;
  const weeks = await getCollection('weeks');
  return weeks.find((w: any) => w.data.number === week)?.data ?? null;
}


/*
  Link the books an essay cites to their entry on the Bookshelf.

  Matching is on the exact title only. A fuzzy match would eventually point a
  reader at the wrong book, which is worse than not linking at all, so a title
  has to appear exactly as the Bookshelf has it before it becomes a link. The
  match is also skipped inside an existing anchor, so a source that already
  links somewhere keeps its own destination.
*/
export async function linkCitedBooks(html: string) {
  if (!html) return html;
  const books = await getCollection('reading' as any);
  const live = books.filter((b: any) => isLive(b.data));
  const used = new Set<string>();
  /* Both the title and the author are worth linking. An essay names Walton or
     Imes in the prose paragraphs above and only gives the book title down in a
     footnote, so linking titles alone leaves the name a reader actually reads
     unlinked. Longest form first so "Carmen Joy Imes" wins over "Imes", and
     each shelf entry is linked once per page either way. */
  const needles: Array<{ id: string; kind: 'title' | 'author'; text: string }> = [];
  for (const b of live) {
    const d = (b as any).data;
    const id = (b as any).id as string;
    if (d.title && d.title.length >= 6) needles.push({ id, kind: 'title', text: d.title });
    if (d.author && d.author.length >= 6) {
      needles.push({ id, kind: 'author', text: d.author });
      /* Surname alone, which is how he refers to them on second mention. */
      const parts = String(d.author).trim().split(/\s+/);
      const last = parts[parts.length - 1];
      if (last && last.length >= 4) needles.push({ id, kind: 'author', text: last });
    }
  }
  needles.sort((a, b) => b.text.length - a.text.length);
  /* Split on tags and only ever touch the text between them, so a title can be
     matched inside <em>...</em> without the markup interfering and without a
     match ever landing inside an attribute. */
  const parts = html.split(/(<[^>]+>)/);
  let insideLink = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('<')) {
      if (/^<a\b/i.test(part)) insideLink = true;
      else if (/^<\/a>/i.test(part)) insideLink = false;
      continue;
    }
    if (insideLink || !part.trim()) continue;
    for (const n of needles) {
      /* One link per book for the name and one for the title, not one per
         book overall: he introduces a scholar by name in the prose and gives
         the book only in a footnote, and both are worth a link. */
      const id = `${n.id}:${n.kind}`;
      if (used.has(id)) continue;
      const title = n.text;
      /* Match on a normalised copy and slice the original. A shelf entry is
         typed with a straight apostrophe and the rendered prose has a curly
         one, so "Being God's Image" never found "Being God\u2019s Image" and
         two of the books cited in the essays quietly failed to link. Lengths
         are identical, so an index into the normalised string is an index
         into the real one. */
      const hay = parts[i].replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
      const needle = title.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
      const at = hay.indexOf(needle);
      if (at === -1) continue;
      const before = hay[at - 1];
      const after = hay[at + needle.length];
      /* A real word boundary in the text itself. */
      if (before && /[A-Za-z0-9]/.test(before)) continue;
      if (after && /[A-Za-z0-9]/.test(after)) continue;
      used.add(id);
      parts[i] = parts[i].slice(0, at)
        + `<a class="cite-book" href="/bookshelf/#book-${n.id}">${parts[i].slice(at, at + needle.length)}</a>`
        + parts[i].slice(at + needle.length);
    }
  }
  return parts.join('');
}

/* A timestamp as a person writes it, in seconds.

   Accepts "42:10", "1:02:30" and a bare "2530". Anything it cannot read comes
   back undefined rather than zero, so a typo in the CMS leaves the video
   starting where it always did instead of somewhere arbitrary. */
export function toSeconds(v?: string | number): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined;
  const raw = String(v).trim();
  if (/^\d+$/.test(raw)) return Number(raw);
  const parts = raw.split(':');
  if (parts.length < 2 || parts.length > 3) return undefined;
  if (!parts.every((p) => /^\d{1,2}$/.test(p.trim()))) return undefined;
  const n = parts.map((p) => Number(p.trim()));
  const secs = n.length === 3 ? n[0] * 3600 + n[1] * 60 + n[2] : n[0] * 60 + n[1];
  return Number.isFinite(secs) ? secs : undefined;
}

/* h:mm:ss past the hour, m:ss under it. The old formatter printed a
   hundred-minute service as "99:51", which reads as ninety-nine seconds shy
   of a hundred minutes only if you already know what it means. */
export function clockTime(total?: number): string | undefined {
  if (!total || total < 0) return undefined;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}
