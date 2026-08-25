import rss from '@astrojs/rss';
import { feed, ROOMS } from '../lib/content';

export async function GET(context) {
  const items = (await feed()).map(({ room, entry }) => ({
    title: entry.data.title,
    pubDate: entry.data.publishAt,
    description: entry.data.summary,
    link: `${ROOMS[room].path}/${entry.id}/`,
    categories: [ROOMS[room].label],
  }));
  return rss({
    title: 'Denvil Lee — Now and Not Yet',
    description: 'Essays, devotionals, frameworks, and notes for leaders.',
    site: context.site,
    items,
  });
}
