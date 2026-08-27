/* Bookshelf month logic, shared by /bookshelf/ and /bookshelf/all/.
   Layer rules per the design doc: the month page must never render empty —
   if the newest month has no books, fall back to the most recent month that
   does. Month labels read "August 2026". */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function monthLabel(ym?: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return ym;
  return `${MONTHS[m - 1]} ${y}`;
}

export function latestMonth(books: { shelfMonth?: string }[]): string | undefined {
  return books.map((b) => b.shelfMonth).filter(Boolean).sort().reverse()[0] as string | undefined;
}
