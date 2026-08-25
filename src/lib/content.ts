import { getCollection, type CollectionEntry } from 'astro:content';

/* ------------------------------------------------------------------
   The publishing gate.

   Content is written and committed weeks ahead of time. It becomes
   public when its publishAt date has passed and a build runs — not
   when it is committed. A daily scheduled build is therefore load-
   bearing infrastructure, not a nicety. See BACKEND.md §4.

   PUBLISH_ALL=1 in the environment shows everything, including future
   and draft entries. Netlify deploy previews set it; production must
   never set it.
   ------------------------------------------------------------------ */
/* Read from process.env, not import.meta.env: Vite only inlines PUBLIC_*
   prefixed variables, and this flag must stay server-side so it can never
   be read by a browser. */
const flag = typeof process !== 'undefined' ? process.env?.PUBLISH_ALL : undefined;
const SHOW_ALL = flag === '1' || flag === 'true';

export const isLive = (data: { publishAt: Date; draft?: boolean }, now = new Date()) =>
  SHOW_ALL || (!data.draft && data.publishAt.valueOf() <= now.valueOf());

type Room = 'essays' | 'moments' | 'leaders' | 'frameworks' | 'watch';

/** Published entries from a room, newest first. */
export async function published<T extends Room>(room: T): Promise<CollectionEntry<T>[]> {
  const all = await getCollection(room);
  return (all as CollectionEntry<T>[])
    .filter((e) => isLive(e.data as any))
    .sort((a, b) => (b.data as any).publishAt.valueOf() - (a.data as any).publishAt.valueOf());
}

/** Everything published, across every room, newest first. The home feed. */
export async function feed() {
  const rooms: Room[] = ['essays', 'moments', 'leaders', 'frameworks', 'watch'];
  const lists = await Promise.all(rooms.map(async (r) => (await published(r)).map((e) => ({ room: r, entry: e }))));
  return lists.flat().sort(
    (a, b) => (b.entry.data as any).publishAt.valueOf() - (a.entry.data as any).publishAt.valueOf(),
  );
}

/** The current week: the highest-numbered week whose start date has passed. */
export async function currentWeek() {
  const weeks = (await getCollection('weeks')).sort((a, b) => b.data.number - a.data.number);
  const now = Date.now();
  return weeks.find((w) => w.data.startsOn.valueOf() <= now) ?? weeks.at(-1) ?? null;
}

/** Everything that belongs to one week, in every room. The editorial spine. */
export async function weekBundle(weekId: string) {
  const rooms: Room[] = ['essays', 'moments', 'leaders', 'frameworks', 'watch'];
  const out: Record<string, any[]> = {};
  for (const r of rooms) {
    out[r] = (await published(r)).filter((e) => (e.data as any).week?.id === weekId);
  }
  const books = await getCollection('reading');
  out.reading = books.filter((b) => b.data.week?.id === weekId);
  return out;
}

export const ROOMS = {
  essays:     { label: 'The Essay',      path: '/essays',     cadence: 'Weekly' },
  moments:    { label: 'Moments',        path: '/moments',    cadence: 'Twice weekly' },
  leaders:    { label: 'Leaders Corner', path: '/leaders',    cadence: 'Every other week' },
  frameworks: { label: 'Frameworks',     path: '/frameworks', cadence: 'Monthly' },
  watch:      { label: 'Watch',          path: '/watch',      cadence: '4–5 a week' },
} as const;

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
export const fmtShort = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
