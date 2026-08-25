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

/** Every published entry in a room, newest first. */
export async function live(key: CollectionKey) {
  const all = await getCollection(key as any);
  return all
    .filter((e: any) => isLive(e.data))
    .sort((a: any, b: any) => b.data.publishAt.getTime() - a.data.publishAt.getTime());
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
  essays:     { label: labels.roomEssayTag,     path: 'essays',     cls: '' },
  leaders:    { label: labels.roomLeadersTag,   path: 'leaders',    cls: 't-leaders' },
  moments:    { label: labels.roomMomentsTag,   path: 'moments',    cls: 't-moments' },
  frameworks: { label: labels.roomFrameworkTag, path: 'frameworks', cls: 't-framework' },
} as const;
export type RoomKey = keyof typeof ROOMS;

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
