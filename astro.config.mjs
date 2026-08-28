import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Phase A runs on pastordenvil.com (hosting runbook §0).
// Phase B: set SITE_URL=https://denvillee.com in Netlify and redeploy. Nothing else changes.
const site = process.env.SITE_URL || 'https://pastordenvil.com';

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
