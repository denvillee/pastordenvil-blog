/* NLT passage proxy.

   Two reasons this is a function and not a fetch from the browser:

   1. The key stays on the server. Calling api.nlt.to straight from the page
      would ship NLT_API_KEY to every visitor. Tyndale's anonymous tier needs no
      key at all, but it is capped at 500 requests a day for the whole site,
      which one busy evening would exhaust.
   2. Nothing is stored. The response is passed straight through with
      no-store, so the NLT text never lands in the service worker cache, in
      localStorage, or in the built files. Tyndale permits us to display it,
      not to keep it, and this is the difference in code.

   If NLT_API_KEY is unset the function falls back to the anonymous tier, so the
   NLT option still works before the key is added; it will just rate-limit
   sooner. */

const ENDPOINT = 'https://api.nlt.to/api/passages';

/* Tyndale takes full book names for most books but the abbreviation for a
   numbered one: "2.Corinthians.1.3" returns nothing at all, while "2Cor.1.3"
   works. Verified against their API rather than assumed. */
const NUMBERED = {
  '1 samuel': '1Sam', '2 samuel': '2Sam', '1 kings': '1Kgs', '2 kings': '2Kgs',
  '1 chronicles': '1Chr', '2 chronicles': '2Chr',
  '1 corinthians': '1Cor', '2 corinthians': '2Cor',
  '1 thessalonians': '1Thes', '2 thessalonians': '2Thes',
  '1 timothy': '1Tim', '2 timothy': '2Tim',
  '1 peter': '1Pet', '2 peter': '2Pet',
  '1 john': '1Jn', '2 john': '2Jn', '3 john': '3Jn',
};

function toNltRef(ref) {
  /* "Ruth 2:1-23" -> "Ruth.2.1-Ruth.2.23"; "Romans 8:28" -> "Romans.8.28";
     "2 Corinthians 1:3-4" -> "2Cor.1.3-2Cor.1.4" */
  const m = ref.trim().match(/^((?:[1-3]\s)?[A-Za-z ]+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  const [, bookRaw, ch, from, to] = m;
  const key = bookRaw.trim().toLowerCase();
  const b = NUMBERED[key] || bookRaw.trim().replace(/\s+/g, '.');
  return to ? `${b}.${ch}.${from}-${b}.${ch}.${to}` : `${b}.${ch}.${from}`;
}

function parse(html) {
  /* The API answers with a page, not JSON, and a verse element can carry more
     than the verse: the book-and-chapter header, an editorial subhead, a
     "Book One (Psalms 1-41)" label. Those are Tyndale's apparatus rather than
     the verse, and left in they show up as "Ruth 1 Elimelech Moves His Family
     to Moab In the days when...". Strip the headings first, then the tags. */
  const clean = (t) => t
    .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '')     // chapter headers and subheads
    .replace(/<span class="vn">\d+<\/span>/g, '')          // the verse number
    .replace(/<span class="(?:cw|cw_ch|bk_ch_vs_header)"[^>]*>[\s\S]*?<\/span>/gi, '')
    /* Tyndale's own translation notes. Left in, Genesis 1:27 comes back as
       "So God created human beings*1:27 Or the man; Hebrew reads ha-adam. in
       his own image", with the apparatus wedged into the middle of the verse.
       The note belongs to their edition, not to the sentence we are showing,
       so the marker and the note both come out. */
    .replace(/<a[^>]*class="[^"]*a-tn[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<span class="tn"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span class="tn-ref"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  const out = [];
  const re = /<verse_export[^>]*vn="(\d+)"[^>]*>([\s\S]*?)<\/verse_export>/g;
  let m;
  while ((m = re.exec(html))) {
    const t = clean(m[2]);
    if (t) out.push({ v: Number(m[1]), t });
  }
  return out;
}

export default async (request) => {
  const url = new URL(request.url);
  const ref = url.searchParams.get('ref') || '';
  const nlt = toNltRef(ref);
  if (!nlt) return new Response(JSON.stringify({ error: 'bad reference' }), { status: 400 });

  const key = process.env.NLT_API_KEY;
  const target = `${ENDPOINT}?ref=${encodeURIComponent(nlt)}&version=NLT${key ? `&key=${encodeURIComponent(key)}` : ''}`;

  try {
    const res = await fetch(target);
    if (!res.ok) return new Response(JSON.stringify({ error: 'upstream ' + res.status }), { status: 502 });
    const verses = parse(await res.text());
    if (!verses.length) return new Response(JSON.stringify({ error: 'no verses' }), { status: 502 });
    return new Response(JSON.stringify({ ref, verses }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        /* Never stored, anywhere. */
        'cache-control': 'no-store, no-cache, must-revalidate, private',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'fetch failed' }), { status: 502 });
  }
};

export const config = { path: '/api/nlt' };
