import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkSmartypants from 'remark-smartypants';

// denvillee.com is the canonical domain and has been since the cutover.
// pastordenvil.com stays attached only as a 301 (netlify.toml), so it is the
// wrong thing for a canonical tag, an OG url or a sitemap entry to name.
//
// The default used to be pastordenvil.com, left over from Phase A, with the
// real domain supplied as SITE_URL in Netlify. That works right up until the
// environment variable is missing from one build, at which point every
// canonical, every share link and the whole sitemap quietly point at a domain
// that redirects away. The default is now the answer and SITE_URL is the
// override, which is the way round that fails safe.
const site = process.env.SITE_URL || 'https://denvillee.com';

/* The private pages are noindex and stay out of the sitemap. Match the path
   exactly: a substring test would also swallow a future
   /essays/kitchen-table-theology/. */
const excluded = new Set(['/kit/', '/studio/']);
const isExcluded = (page) => excluded.has(new URL(page).pathname);

export default defineConfig({
  /* Typography, with one deliberate exception.
     Astro's default smartypants collapses any run of dots into a single
     ellipsis glyph, which quietly rewrote Denvil's four-dot beat: he types
     "....and...." and the page was printing "…and…". That beat is his, it
     appears sixteen times across the first two essays, and a build step should
     not be editing his punctuation. Quotes and dashes stay smart; ellipses are
     left exactly as written. */
  markdown: {
    smartypants: false,
    remarkPlugins: [[remarkSmartypants, { ellipses: false }]],
  },

  site,
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') && !isExcluded(page) })],
  build: { format: 'directory' },
  compressHTML: true,
  vite: { build: { assetsInlineLimit: 0 } }
});
