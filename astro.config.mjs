import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
  site,
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') && !isExcluded(page) })],
  build: { format: 'directory' },
  compressHTML: true,
  vite: { build: { assetsInlineLimit: 0 } }
});
