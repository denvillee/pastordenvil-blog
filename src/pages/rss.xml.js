import rss from '@astrojs/rss';
import { live } from '../lib/publish';
import { ROOMS } from '../lib/publish';
import site from '../data/site.json';

export async function GET(context) {
  const rooms = ['essays', 'leaders', 'moments'];
  const items = [];
  for (const room of rooms) {
    for (const e of await live(room)) {
      items.push({
        title: e.data.title,
        description: e.data.dek,
        pubDate: e.data.publishAt,
        link: `/${ROOMS[room].path}/${e.id}/`,
        categories: [ROOMS[room].label, ...(e.data.tags ?? [])],
      });
    }
  }
  items.sort((a, b) => b.pubDate - a.pubDate);

  return rss({
    title: site.name,
    description: site.feedDescription,
    site: context.site,
    items,
    customData: '<language>en-us</language>',
  });
}
