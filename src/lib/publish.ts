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
export const ROOMS = {
  essays:     { label: labels.roomEssayTag,     path: 'essays',     cls: '',          plural: labels.navEssays },
  leaders:    { label: labels.roomLeadersTag,   path: 'leaders',    cls: 't-leaders', plural: labels.navLeaders },
  moments:    { label: labels.roomMomentsTag,   path: 'moments',    cls: 't-moments', plural: labels.navMoments },
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

/** The next published piece in the same run, for the card at the end of a piece.
    Returns null when the next one has not been written yet, which is the whole
    point: Denvil's instruction is that the card stays hidden until the essay it
    points at is actually live, so a reader is never invited to click nothing. */
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
  /* Longest title first, so a title that contains a shorter one wins. */
  const byLength = [...live].sort(
    (a: any, b: any) => (b as any).data.title.length - (a as any).data.title.length
  );
  const used = new Set<string>();
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
    for (const b of byLength) {
      const id = (b as any).id as string;
      if (used.has(id)) continue;
      const title = (b as any).data.title as string;
      if (!title || title.length < 6) continue;
      const at = parts[i].indexOf(title);
      if (at === -1) continue;
      const before = parts[i][at - 1];
      const after = parts[i][at + title.length];
      /* A real word boundary in the text itself. */
      if (before && /[A-Za-z0-9]/.test(before)) continue;
      if (after && /[A-Za-z0-9]/.test(after)) continue;
      used.add(id);
      parts[i] = parts[i].slice(0, at)
        + `<a class="cite-book" href="/bookshelf/#book-${id}">${title}</a>`
        + parts[i].slice(at + title.length);
    }
  }
  return parts.join('');
}
