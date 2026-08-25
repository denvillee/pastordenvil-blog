/* Posters are uploaded through the CMS, so the extension is whatever the phone gave it.
   Only a real JPEG has a hand-made .webp sibling next to it; for anything else the
   caller must drop the <source> rather than promise a webp that is not there. */
export function webpFor(src?: string): string | null {
  if (!src) return null;
  return /\.jpe?g$/i.test(src) ? src.replace(/\.jpe?g$/i, '.webp') : null;
}
