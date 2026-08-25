import { getCollection } from 'astro:content';

/* Audio feed for the older catalog (Doral Vineyard 2015-2016 and later).
   Only entries that are BOTH standardized and privacy-cleared appear, and
   only ones with an actual audio URL. The archive is otherwise private.
   See claude/sermon-notes-standardization.md for why those gates exist. */
const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET(context) {
  const all = await getCollection('archive');
  const eps = all
    .filter((e) => e.data.audio && e.data.standardized && e.data.privacyCleared)
    .sort((a, b) => (b.data.preachedOn?.valueOf() ?? 0) - (a.data.preachedOn?.valueOf() ?? 0));

  const site = context.site?.toString().replace(/\/$/, '') ?? 'https://denvillee.com';

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Denvil Lee — Teaching Archive</title>
    <link>${site}</link>
    <description>Messages from the archive, released as they are cleared.</description>
    <language>en-us</language>
    <itunes:author>Denvil Lee</itunes:author>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Religion &amp; Spirituality"><itunes:category text="Christianity"/></itunes:category>
${eps
  .map(
    (e) => `    <item>
      <title>${esc(e.data.title)}</title>
      <description>${esc(e.data.bigIdea ?? '')}</description>
      <pubDate>${(e.data.preachedOn ?? new Date()).toUTCString()}</pubDate>
      <guid isPermaLink="false">${esc(e.id)}</guid>
      <enclosure url="${esc(e.data.audio)}" type="audio/mpeg" length="0"/>
      ${e.data.venue ? `<itunes:subtitle>${esc(e.data.venue)}</itunes:subtitle>` : ''}
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
