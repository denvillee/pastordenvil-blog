// Build-time Bible verse fetcher.
//
// Free, no-key sources (always on):
//   NET  — labs.bible.org
//   WEB  — bible-api.com
//
// Licensed sources (on once you add the matching env var in Netlify):
//   NIV, NASB — via api.bible, needs API_BIBLE_KEY
//              (Starter plan is free for a non-commercial site — pick NIV
//              and NASB as 2 of your 3 free copyrighted picks at
//              https://scripture.api.bible)
//   NLT       — via api.nlt.to, needs NLT_API_KEY
//              (free registration at https://api.nlt.to/Account/Register)
//
// Every fetch fails silently (returns null) so a missing/invalid key, a
// reference the lookup can't parse, or a network hiccup just means that
// one translation doesn't show up as a tab — it never breaks the build.

export type Passage = {
  code: 'NIV' | 'NET' | 'NLT' | 'NASB' | 'WEB';
  label: string;
  text: string;
  link: string;
};

const API_BIBLE_KEY = process.env.API_BIBLE_KEY;
const NLT_API_KEY = process.env.NLT_API_KEY;

const cache = new Map<string, Passage[]>();

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- NET (free, no key) ----------

async function fromNet(reference: string): Promise<Passage | null> {
  try {
    const res = await fetch(`https://labs.bible.org/api/?passage=${encodeURIComponent(reference)}&type=json`);
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ text: string }>;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const text = stripHtml(rows.map((r) => r.text).join(' '));
    if (!text) return null;
    return { code: 'NET', label: 'NET', text, link: 'https://netbible.org' };
  } catch {
    return null;
  }
}

// ---------- WEB (free, no key) ----------

async function fromWeb(reference: string): Promise<Passage | null> {
  try {
    // bible-api.com rejects a real en/em dash — normalize to a plain hyphen.
    const ref = reference.trim().replace(/[–—]/g, '-');
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=web`);
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    const text = data.text ? stripHtml(data.text) : '';
    if (!text) return null;
    return { code: 'WEB', label: 'WEB', text, link: 'https://worldenglish.bible' };
  } catch {
    return null;
  }
}

// ---------- NLT (free key from Tyndale) ----------

async function fromNlt(reference: string): Promise<Passage | null> {
  if (!NLT_API_KEY) return null;
  try {
    // api.nlt.to wants "Book.Chapter.Verse-Verse", e.g. "Mark.1.9-13"
    const ref = reference
      .trim()
      .replace(/[–—]/g, '-')
      .replace(/\s*:\s*/g, '.')
      .replace(/\s+/g, '.');
    const res = await fetch(
      `https://api.nlt.to/api/passages?ref=${encodeURIComponent(ref)}&key=${encodeURIComponent(NLT_API_KEY)}&version=NLT`
    );
    if (!res.ok) return null;
    const html = await res.text();
    const text = stripHtml(html);
    if (!text) return null;
    return { code: 'NLT', label: 'NLT', text, link: 'https://www.newlivingtranslation.com' };
  } catch {
    return null;
  }
}

// ---------- NIV / NASB (free "pick 3" key from api.bible) ----------

const BOOK_CODES: Record<string, string> = {
  genesis: 'GEN', exodus: 'EXO', leviticus: 'LEV', numbers: 'NUM', deuteronomy: 'DEU',
  joshua: 'JOS', judges: 'JDG', ruth: 'RUT',
  '1 samuel': '1SA', '2 samuel': '2SA', '1 kings': '1KI', '2 kings': '2KI',
  '1 chronicles': '1CH', '2 chronicles': '2CH', ezra: 'EZR', nehemiah: 'NEH',
  esther: 'EST', job: 'JOB', psalm: 'PSA', psalms: 'PSA', proverbs: 'PRO',
  ecclesiastes: 'ECC', 'song of solomon': 'SNG', 'song of songs': 'SNG',
  isaiah: 'ISA', jeremiah: 'JER', lamentations: 'LAM', ezekiel: 'EZK', daniel: 'DAN',
  hosea: 'HOS', joel: 'JOL', amos: 'AMO', obadiah: 'OBA', jonah: 'JON', micah: 'MIC',
  nahum: 'NAM', habakkuk: 'HAB', zephaniah: 'ZEP', haggai: 'HAG', zechariah: 'ZEC', malachi: 'MAL',
  matthew: 'MAT', mark: 'MRK', luke: 'LUK', john: 'JHN', acts: 'ACT', romans: 'ROM',
  '1 corinthians': '1CO', '2 corinthians': '2CO', galatians: 'GAL', ephesians: 'EPH',
  philippians: 'PHP', colossians: 'COL', '1 thessalonians': '1TH', '2 thessalonians': '2TH',
  '1 timothy': '1TI', '2 timothy': '2TI', titus: 'TIT', philemon: 'PHM', hebrews: 'HEB',
  james: 'JAS', '1 peter': '1PE', '2 peter': '2PE', '1 john': '1JN', '2 john': '2JN',
  '3 john': '3JN', jude: 'JUD', revelation: 'REV',
};

function parseReference(reference: string) {
  const m = reference
    .trim()
    .replace(/[–—]/g, '-')
    .match(/^((?:[1-3]\s)?[A-Za-z ]+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  const [, bookRaw, chapter, verseStart, verseEnd] = m;
  const code = BOOK_CODES[bookRaw.trim().toLowerCase()];
  if (!code) return null;
  return {
    code,
    chapter: Number(chapter),
    verseStart: Number(verseStart),
    verseEnd: verseEnd ? Number(verseEnd) : Number(verseStart),
  };
}

type ApiBibleEntry = { id: string; abbreviation?: string; name?: string };
let apiBibleCatalog: Promise<ApiBibleEntry[]> | null = null;

async function getApiBibleCatalog(): Promise<ApiBibleEntry[]> {
  if (!API_BIBLE_KEY) return [];
  if (!apiBibleCatalog) {
    apiBibleCatalog = (async () => {
      try {
        const res = await fetch('https://api.scripture.api.bible/v1/bibles?language=eng', {
          headers: { 'api-key': API_BIBLE_KEY as string },
        });
        if (!res.ok) return [];
        const data = (await res.json()) as { data?: ApiBibleEntry[] };
        return data.data ?? [];
      } catch {
        return [];
      }
    })();
  }
  return apiBibleCatalog;
}

function findBible(catalog: ApiBibleEntry[], abbrevs: string[]): ApiBibleEntry | undefined {
  const wanted = abbrevs.map((a) => a.toUpperCase());
  return (
    catalog.find((b) => wanted.includes((b.abbreviation ?? '').toUpperCase())) ??
    catalog.find((b) => wanted.some((a) => (b.name ?? '').toUpperCase().includes(a)))
  );
}

async function fromApiBible(
  reference: string,
  abbrevs: string[],
  code: 'NIV' | 'NASB',
  label: string
): Promise<Passage | null> {
  if (!API_BIBLE_KEY) return null;
  const parsed = parseReference(reference);
  if (!parsed) return null;
  const catalog = await getApiBibleCatalog();
  const bible = findBible(catalog, abbrevs);
  if (!bible) return null;
  const passageId =
    parsed.verseStart === parsed.verseEnd
      ? `${parsed.code}.${parsed.chapter}.${parsed.verseStart}`
      : `${parsed.code}.${parsed.chapter}.${parsed.verseStart}-${parsed.code}.${parsed.chapter}.${parsed.verseEnd}`;
  try {
    const res = await fetch(
      `https://api.scripture.api.bible/v1/bibles/${bible.id}/passages/${passageId}` +
        `?content-type=text&include-notes=false&include-titles=false&include-verse-numbers=false&include-chapter-numbers=false`,
      { headers: { 'api-key': API_BIBLE_KEY as string } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { content?: string } };
    const raw = data.data?.content;
    if (!raw) return null;
    const text = stripHtml(raw);
    if (!text) return null;
    return { code, label, text, link: 'https://www.biblegateway.com/versions/' };
  } catch {
    return null;
  }
}

// ---------- public API ----------

/**
 * Returns every translation that successfully resolved for this reference,
 * in display order: NIV, NET, NLT, NASB, WEB. NIV/NASB/NLT quietly drop out
 * if their key isn't set yet; NET/WEB always try.
 */
export async function getPassages(reference: string | undefined): Promise<Passage[]> {
  if (!reference) return [];
  if (cache.has(reference)) return cache.get(reference)!;

  const [niv, net, nlt, nasb, web] = await Promise.all([
    fromApiBible(reference, ['NIV'], 'NIV', 'NIV'),
    fromNet(reference),
    fromNlt(reference),
    fromApiBible(reference, ['NASB2020', 'NASB1995', 'NASB'], 'NASB', 'NASB'),
    fromWeb(reference),
  ]);

  const passages = [niv, net, nlt, nasb, web].filter((p): p is Passage => p !== null);
  cache.set(reference, passages);
  return passages;
}
