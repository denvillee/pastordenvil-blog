# denvillee.com — Now and Not Yet

Personal site for Denvil Lee. Five rooms — essays, devotionals, notes for
leaders, frameworks, and clips — tied together by one idea a week.

Astro, static output, Markdown content, deployed to Netlify.

## Running it

```bash
npm install
npm run dev                  # http://localhost:4321
PUBLISH_ALL=1 npm run dev    # include drafts and future-dated entries
npm run build                # production build → dist/
```

## Read these first

| Document | What it covers |
|---|---|
| `BACKEND.md` | The contract: content model, tokens, publishing gate, what not to do |
| `HOSTING.md` | DNS state, cutover steps, environment variables, the daily build |

Design authority lives in the project docs `claude/visual-and-social-system.md`
and `claude/website-strategy-brief.md`.

## Layout

```
src/content/weeks/        the editorial spine — one idea per week
src/content/essays/       The Essay        (weekly)
src/content/moments/      Moments          (twice weekly, three-move form)
src/content/leaders/      Leaders Corner   (every other week)
src/content/frameworks/   Frameworks       (monthly, drawn)
src/content/watch/        Watch            (clips, embedded not re-hosted)
src/content/reading/      the shelf
src/content/archive/      PRIVATE. No public pages. See BACKEND.md §2.

src/content.config.ts     schemas — the source of truth for content shape
src/lib/content.ts        publish gate, feed, week helpers
src/styles/tokens.css     every colour and type decision on the site
src/styles/fonts.css      self-hosted @font-face rules
public/fonts/             Archivo (variable) and Spectral woff2
```

## Adding an entry

```md
---
title: "The kingdom is not a metaphor. It is an address."
publishAt: 2026-09-02        # goes live on this date, not on commit
week: week-01                # ties it to the week's one idea
summary: "One or two sentences. Used on cards, in RSS, and by the card generator."
scripture: "Mark 1:15"
topics: ["Kingdom"]
draft: false
---

The body, in Markdown.
```

Commit and push. The build **fails loudly** if front matter is missing or
malformed — a broken entry never reaches the live site.

## Two things that will bite you if you forget them

1. **Content needs a build to appear.** It is date-gated at build time, so the
   daily build hook in `.github/workflows/daily-build.yml` is load-bearing. No
   hook, no publishing.
2. **Ember and Brass fail contrast as text on light ground.** They are
   surfaces that carry Ink. The tokens and the `.chip--*` / `.btn--*` classes
   already handle it — use them rather than writing the hex yourself.
