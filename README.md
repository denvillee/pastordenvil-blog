# denvillee.com

Personal teaching site for Denvil Lee. Astro, static output, deployed on Netlify.
Design direction: **Now and Not Yet**.

Phase A runs on `pastordenvil.com`. Phase B flips the primary domain to `denvillee.com`
with one env var and no code change. See `claude/hosting-runbook.md` in the project.

---

## Quickstart

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/
npm run preview
```

To see banked content that has not reached its publish date:

```bash
PUBLISH_ALL=1 npm run build
```

---

## How publishing works

Every entry carries `publishAt` and `draft`. The build emits an entry only when
`draft: false` **and** `publishAt` is in the past. Nothing else gates it.

That means a static site needs a rebuild for scheduled content to appear, which is what
`.github/workflows/daily-build.yml` is for: it pings a Netlify build hook every morning at
09:00 UTC. Without it, banked posts never publish. `workflow_dispatch` fires it by hand.

**Writing a week:**

1. Add the week to `src/content/weeks/` with its one `idea` sentence.
2. Write the pieces into `src/content/essays/`, `leaders/`, `moments/`, `frameworks/`.
   Give each the same `week:` number.
3. Set `publishAt` to when it should appear. Commit and push.

The `week` number is what ties a week together: it pulls the idea into the blue rail at the
top of every piece, and it builds the "rest of this week" block at the bottom. One idea,
several rooms, one flow. That is the editorial model rendered as UI.

---

## Structure

```
src/
  content.config.ts          collection schemas. The content contract, enforced by zod.
  content/
    essays/ leaders/ moments/ frameworks/    the four writing rooms
    watch/                   clips. Links out. Video is never re-hosted here.
    reading/                 the shelf
    weeks/                   the season spine: one idea per week
  layouts/
    Base.astro               head, nav, footer, the three small scripts
    Article.astro            every piece in every room
  components/
    Hero, FeatureEssay, Streams, WatchRail, FrameworksSection,
    ReadingShelf, ShareKit, Signup, DesignNotes, Nav, Footer
    diagrams/TwoAges.astro   framework 01, inline SVG
    cards/                   the six shareable card templates
  lib/
    publish.ts               scheduling, read time, week siblings
    kit.ts                   card copy and export sizes
  styles/site.css            all styles, token-driven, light and dark
public/assets/img/           generated brand imagery, webp + jpg + og-default
```

---

## Graphics

Three separate systems, all in-repo, none dependent on stock photography.

**1. Brand imagery.** `public/assets/img/`. Generated abstraction: a shaft of warm light on a
deep ivy ground for the hero, layered cobalt and ember arcs for the essay feature, three
vertical clip covers. Ships as `.webp` with `.jpg` fallback through `<picture>`. This carries
the site until a real photo session happens, then the same slots take real photographs.

**2. Framework diagrams.** `src/components/diagrams/`. Astro components, **not** `.svg` files.
They use `currentColor` and the palette tokens, so they adapt to light and dark automatically.
An exported flat SVG would not. Register a new one in the `DIAGRAMS` map in
`src/pages/frameworks/[...slug].astro` and reference it by name in the entry's `diagram:` field.

**3. The shareable kit.** `src/components/cards/` plus `/kit/`. Six templates: quote card,
scripture card, two panel relatable, text thread, series poster, clip cover. Copy lives in
`src/lib/kit.ts`, so one edit updates both the home page band and the studio page. `/kit/` is
`noindex` and renders every card at Instagram portrait, square, and story dimensions for
screenshotting.

> **Rule for the card system: borrow the format, never the picture.** The recognizable meme
> photographs are copyrighted press and stock images. The formats are free and they are what
> actually carries the humor.

**OG images.** `public/assets/img/og-default.jpg` is the fallback. Per-post images can be set
with `ogImage:` in frontmatter. Generating them per post at build is still open, see below.

---

## The CMS

`/admin` runs [Sveltia CMS](https://sveltiacms.app/). It is a Git-based CMS: every save is a
commit to this repo, Netlify rebuilds, the site updates. There is no database, no separate
hosting, and no vendor holding your content. If the CMS disappeared tomorrow, every word would
still be sitting in `src/content` as plain markdown.

It replaced the obvious choice deliberately. Decap CMS (formerly Netlify CMS) is the name most
people land on, but its standard login path was Netlify Identity, which Netlify has deprecated.
Sveltia is the maintained successor: same config format, a fraction of the bundle, no
Identity dependency.

**Sveltia is bundled from npm, not a CDN**, so the site's `script-src 'self'` policy still
holds. The 2 MB admin bundle only loads on `/admin`; public pages still ship ~1 KB of JS.

### Before it will work

1. Set `backend.repo` in `public/admin/config.yml` to `owner/repo`. It ships as `OWNER/REPO`.
2. Pick a login method:
   - **Personal access token** — fastest, no server. Create a fine-grained GitHub PAT with
     read and write access to this repo's contents, and paste it into the Sveltia login screen.
     Right answer for a single author.
   - **GitHub OAuth app** — nicer long term, "sign in with GitHub" and no token to keep.
     Needs an OAuth app registered and an auth relay. Backend side owns this.
3. `/admin` and `/kit` are excluded from `sitemap-index.xml` and disallowed in `robots.txt`,
   and `/admin/*` carries its own looser CSP in `netlify.toml` because the CMS talks to the
   GitHub API. That exception is scoped to `/admin` and must stay that way.

### What is editable without touching code

| In the CMS | Writes to |
|---|---|
| Essays, Leaders Corner, Moments, Frameworks | `src/content/<room>/*.md` |
| Watch clips, Reading shelf | `src/content/watch`, `src/content/reading` |
| Season weeks and the week idea | `src/content/weeks/*.md` |
| About, Speaking, Subscribe page copy | `src/content/pages/*.md` |
| Home page copy: hero, ticker, section notes | `src/data/home.json` |
| Site wide copy: footer, signup, meta | `src/data/site.json` |
| Section titles: menu, footer, band headings, empty states | `src/data/labels.json` |
| The six shareable card templates | `src/data/kit.json` |
| Images | `public/assets/img/uploads/` |

**Adding never overwrites.** Each entry is its own file named by slug. Room indexes and
`/archive/` are generated from whatever exists, so the archive grows on its own and old URLs
stay valid indefinitely. The only collision is two entries in the same room with an identical
title, since the slug comes from the title; the CMS warns about it under the field. Room
indexes group by year automatically once there is more than one year of content.

Publishing is still `publishAt` plus `draft`, edited from the CMS like any other field. Set a
future date, save, and it stays invisible until the daily build passes that date.

**What is deliberately not in the CMS:** the design system, the framework diagrams, and page
structure. Colours live in tokens and diagrams are components so they can adapt to dark mode.
Both would break if they became free-text fields.

---

## Environment variables

Set in Netlify under **Site configuration → Environment variables**.

| Variable | Value | Scope |
|---|---|---|
| `PUBLIC_KIT_FORM_ID` | the Kit form id | production and previews |
| `PUBLISH_ALL` | `1` | **deploy previews only** |
| `SITE_URL` | `https://denvillee.com` | production, Phase B only |

The CMS needs no environment variables. Its config is `public/admin/config.yml`.

`PUBLISH_ALL=1` in production would unbank the entire scheduled season at once. Keep it
scoped to previews.

---

## Forms

**Subscribe** posts directly to Kit from a real `<form>`, not through Kit's embed script. The
embed pulls its own CSS and rewrites the markup, which breaks the brass signup band on every
page it appears on. If Kit needs different field names, change them in
`src/components/Signup.astro` rather than rewriting the markup at runtime.

**Speaking** uses Netlify Forms and forwards to `hello@denvillee.com`. Both forms carry a
`company` honeypot and both work with JavaScript disabled.

---

## Design system

Tokens are defined once at the top of `src/styles/site.css`, in three blocks so light, dark,
and system all resolve correctly.

| Token | Hex | Where it lives |
|---|---|---|
| `--ink` | `#0E1211` | hero, video rail, cards |
| `--ivy` | `#14342B` | secondary dark band |
| `--bone` | `#F3F1EA` | reading ground |
| `--cobalt` | `#2B4CF0` | links, buttons, the Christ band in the framework diagram |
| `--ember` | `#FF6A2B` | stickers and tags, one per screen |
| `--brass` | `#ECC46E` | the light in the imagery, the signup band |

Type: **Archivo** (variable, width axis) for structure and display, **Spectral** for reading.

Never write a colour literal into a component. Add a token.

Motion respects `prefers-reduced-motion`: the kinetic hero, the marquee, the scroll reveals,
and the hover lifts all stand down.

---

## Budgets

Currently: **~6 KB gzipped CSS**, **~1 KB JS**, no framework runtime. Targets are ≤ 40 KB CSS,
≤ 15 KB JS, LCP ≤ 2.0 s, CLS ≤ 0.02, Lighthouse ≥ 95 / 100 / 100 / 100.

The hero image is the LCP element. It carries `fetchpriority="high"` and is never lazy-loaded.

---

## Content that still needs replacing before launch

- `src/content/essays/you-are-not-closer-to-the-end-than-paul-was.md` — **sample prose**,
  written to design the reading experience against. Denvil has not written or edited it.
- `src/content/moments/`, `src/content/leaders/` — sample bodies, real frontmatter.
- `src/pages/about.astro` — placeholder copy.
- `public/assets/guides/` — framework 01's one page PDF.

---

## Still open with the backend side

1. `backend.repo` in `public/admin/config.yml` still says `OWNER/REPO`. Set it when the repo exists.
2. CMS login: PAT is fine for launch. A GitHub OAuth app is the nicer follow-up and needs an auth relay.
3. Per-post OG image generation at build. Astro can do it with a dynamic endpoint; who owns it?
4. Does Kit accept this plain form post, or does it need its script? Everything else is settled.
5. The `speaking` form's Netlify notification wiring to `hello@denvillee.com`.
6. Analytics, and whether it needs a CSP exception. The current policy is in `netlify.toml`.
7. Search. Out of scope for launch, relevant when the teaching archive eventually ships.

Related project docs: `claude/hosting-runbook.md`, `claude/frontend-contract.md`,
`claude/season-one-editorial-plan.md`, `claude/theological-spine.md`.
