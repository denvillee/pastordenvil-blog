import { feed, ROOMS } from '../lib/content';

/* Card generator source.

   The six social templates (quote, scripture, two-panel, text thread,
   series poster, clip cover) are generated FROM this endpoint, so a
   published entry produces its own social kit without anyone retyping a
   line. See claude/visual-and-social-system.md.

   Only published entries appear — the same gate the site uses — so a card
   can never leak content ahead of its publish date. */
export async function GET() {
  const items = (await feed()).map(({ room, entry }) => {
    const d = entry.data;
    return {
      id: entry.id,
      room,
      roomLabel: ROOMS[room].label,
      url: `${ROOMS[room].path}/${entry.id}/`,
      title: d.title,
      summary: d.summary,
      publishAt: d.publishAt.toISOString(),
      week: d.week?.id ?? null,
      topics: d.topics ?? [],
      // Moments carry the three moves; the quote card usually pulls from response.
      passage: d.passage ?? null,
      response: d.response ?? null,
      scripture: d.scripture ?? null,
      beats: d.beats ?? null,
    };
  });

  return new Response(JSON.stringify({ generated: new Date().toISOString(), items }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
