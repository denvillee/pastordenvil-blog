# denvillee.com — backend contract

**Who this is for:** the designer working on Now and Not Yet, and anyone else
who touches this repo. It says what the backend guarantees, what it expects
from you, and where the seams are.

**Design authority:** `claude/visual-and-social-system.md` and
`claude/website-strategy-brief.md` in the project. Where this document and
those disagree about *how it looks*, those win. Where they disagree about
*how it works*, this one does.

---

## 1. The short version

| Thing | Answer |
|---|---|
| Framework | Astro 5, static output, zero client JS except two small scripts |
| Content | Markdown files in `src/content/`, schema-validated at build |
| Styling | CSS custom properties in `src/styles/tokens.css`. Nothing else. |
| Type | Archivo (variable, wdth + wght) and Spectral, both self-hosted |
| Publishing | Date-gated. Content goes live on its `publishAt`, not on commit. |
| Host | Netlify, building from Git |
| DNS | Cloudflare (see `HOSTING.md`) |
| Email | Kit, via a plain form post we control |

**The build fails loudly on bad content.** A missing required field stops the
deploy rather than shipping a broken page. That is intentional.

---

## 2. The five rooms, as data

Every room is an Astro content collection under `src/content/`. The schema
lives in `src/content.config.ts` and is the single source of truth.

| Room | Folder | Cadence | Distinctive fields |
|---|---|---|---|
| The Essay | `essays/` | Weekly | `scripture`, `featured` |
| Moments | `moments/` | Twice weekly | `passage`, `passageText`, `scene`, `response` |
| Leaders Corner | `leaders/` | Every other week | `anchor` |
| Frameworks | `frameworks/` | Monthly | `number`, `beats[]`, `diagram`, `guide`, `clip`, `essay` |
| Watch | `watch/` | 4–5 a week | `kind`, `provider`, `videoId`, `seconds` |
| Reading | `reading/` | As it happens | `author`, `status`, `note` |
| Archive | `archive/` | **Private** | `standardized`, `privacyCleared` |

Every publishable room shares `title`, `publishAt`, `summary`, `week`,
`topics[]`, `draft`.

### Moments is a form, not a template

The Ken Gire structure — the passage, the scene retold, the response — is
enforced by the **schema**, as three separate required fields. The template
renders them as three fixed sections. This is deliberate: the form is the
value of the room, and a free-text body would let it drift entry to entry.
If you restyle Moments, keep the three moves visually distinct.

### The archive is deliberately dark

4,555 indexed teaching files exist and **none of them render a public page.**
The collection is here so the engine can feed the rooms above. Two boolean
gates — `standardized` and `privacyCleared` — must both be true before an
entry can appear even in the podcast feed. Do not add an archive index page.
That decision is documented in `claude/sermon-notes-standardization.md`.

---

## 3. The weekly spine

This is the most important thing in the backend and the easiest to miss.

The editorial plan is **one idea per week, carried across every room.** So
`weeks/` is a real collection, and every entry in every room points at a week
with `week: week-03`. Nothing points back — the week does not list its
children, they claim it. That keeps the reference one-directional and
impossible to desynchronise.

What that buys you, already wired in `src/lib/content.ts`:

```ts
currentWeek()          // the live week, by date
weekBundle(weekId)     // everything in every room belonging to that week
feed()                 // every published entry, all rooms, newest first
published('essays')    // one room, date-gated, newest first
```

The homepage already renders the current week's idea and a count per room.
**A week with an empty room is a visible gap** — that is a feature, it is the
production dashboard hiding in plain sight.

All ten Season One weeks are seeded from `claude/season-one-editorial-plan.md`,
with their movement, idea, source sermon, and reading.

---

## 4. Scheduled publishing

The whole editorial plan depends on banking three weeks of content in August
and having it release on its own. So:

- Content is committed early with a future `publishAt`.
- `isLive()` in `src/lib/content.ts` filters anything whose date has not
  passed. It also removes it from `getStaticPaths`, so **the page does not
  exist** — not hidden, not 404-on-purpose, simply not built.
- Therefore **a build must run for content to appear.** A daily scheduled
  build is load-bearing infrastructure, not a nicety.

Set that up as a daily Netlify build hook (see `HOSTING.md` §7). Until it
exists, publishing is manual and the plan does not work.

`PUBLISH_ALL=1` in the environment shows everything including drafts and
future entries. Netlify deploy previews should set it; **production must
never set it.**

---

## 5. Design tokens — the contract

`src/styles/tokens.css` is the only place a colour is defined. Components
read semantic tokens (`--fg`, `--ground`, `--accent`), never brand names
directly. Change a token, the whole site follows.

### The six brand colours are fixed

```
--ink    #0E1211    --bone   #F3F1EA    --ember  #FF6A2B
--ivy    #14342B    --cobalt #2B4CF0    --brass  #ECC46E
```

### The contrast law

Measured, not guessed. These are in the token file as a comment too, because
the palette has real traps in it:

| Pairing | Ratio | Verdict |
|---|---|---|
| Cobalt text on Bone | 5.47 | AA — fine |
| Bone text on Cobalt | 5.47 | AA — fine |
| Bone text on Ivy | 11.94 | AAA |
| **Ember text on Bone** | **2.53** | **Fails. Never do this.** |
| **Brass text on Bone** | **1.46** | **Fails badly. Never do this.** |
| Ink text on Ember | 6.60 | AA — this is how Ember is used |
| Ink text on Brass | 11.40 | AAA — this is how Brass is used |

**Ember and Brass are surfaces, not text.** They carry Ink on top. In dark
mode they become legible as text on Ink and may be used that way; the tokens
already handle the switch. Cobalt is lifted to `#7D97FF` in dark because raw
Cobalt on Ink is only 3.05.

`.chip--ember`, `.chip--brass`, `.btn--ember`, `.btn--brass` already encode
this. Use them rather than writing the colours yourself.

### Dark mode has three states

An explicit `data-theme` stamp, and the far more common un-stamped default
where only `prefers-color-scheme` applies. All three are handled in
`tokens.css`. If you add a colour, add it as a token in **all three blocks**,
or it will be undefined for most visitors.

### `.on-dark`

Any always-dark section (hero, video rail, framework header) gets
`class="on-dark"`. It re-points the semantic tokens locally so nested
components keep working without knowing where they sit. Use it instead of
hard-coding light text.

---

## 6. Typography

- **Archivo** carries headlines, navigation, labels, and the kinetic hero.
  It is variable on **both** `wght` (100–900) and `wdth` (62–125). The width
  axis is what makes the hero animation possible — do not swap it for a
  static face.
- **Spectral** sets every paragraph of long-form. Archivo never sets a
  paragraph.
- Scripture references always set in Spectral italic (`.scripture`).
- Both are **self-hosted** in `public/fonts/`. There is no runtime request to
  a font CDN. If you add a weight, download it into that folder and add the
  `@font-face` rule to `src/styles/fonts.css`.

Type scale is `--step--2` through `--step-6`, fluid. Nothing on the site sets
a font size outside it.

---

## 7. Motion

The art direction asks for a motion layer. The rule is that **every animation
degrades to nothing** under `prefers-reduced-motion: reduce`, which is
enforced globally in `global.css`.

- **Kinetic hero** — animates Archivo's `wdth` from 62 to 125 on load. Pure
  CSS, no JS.
- **Scroll reveal** — add `class="reveal"` to any element. An
  IntersectionObserver in `Base.astro` adds `.is-in`. With JS off or reduced
  motion on, content is simply visible.
- **Grain** — one `body::after` overlay driven by `--grain-opacity`. It
  multiplies in light and screens in dark. No component needs to think about
  it.

---

## 8. Video: embed, never re-host

`src/components/Embed.astro` is the only sanctioned way video appears.

Sermons preached on a church platform, with that church's production and
worship footage, are that church's asset. Re-uploading them is a real
relational and legal problem in a succession year. The component takes a
provider and an ID and embeds from the source, so credit and traffic stay
where they belong. It uses `youtube-nocookie` and lazy loading.

`videoId: "REPLACE_ME"` renders a visible placeholder rather than a broken
frame, so an unlinked clip is obvious in review and impossible to ship
silently.

---

## 9. Email

`src/components/Signup.astro` posts directly to Kit's form endpoint. It is
deliberately **not** a third-party embed widget: the markup, the styling, and
the consent copy stay under our control, and the list stays portable.

Set `PUBLIC_KIT_FORM_ID` in the Netlify environment to activate it. Until
then the form renders and says plainly that it is not wired up.

Two tracks: the default Monday Note, and `offer="mark"` which tags the
subscriber for the January reading-plan cohort.

Tone options are `brass`, `ivy`, and `plain`, all obeying the contrast law.

---

## 10. The card generator hook

`/cards.json` emits every published entry as structured data — title,
summary, the Moments `response`, framework `beats`, scripture, week.

That is the input for the six social card templates. A published essay can
generate its own social kit without anyone retyping a line. It uses the same
publish gate as the site, so a card can never leak content ahead of its date.

---

## 11. What not to do

- **Do not hard-code a colour in a component.** Add a token.
- **Do not use Ember or Brass as text on light ground.** It fails contrast.
- **Do not add an archive index page.** The archive is private by decision.
- **Do not re-host church video.** Embed it.
- **Do not set `PUBLISH_ALL` in production.** It would unbank every scheduled
  post at once.
- **Do not add a font CDN link.** Fonts are self-hosted on purpose.
- **Do not put MVCC or any church's branding on this site.** It is a personal
  site and must read as complementary to the day job, never competitive.

---

## 12. Where to start

```bash
npm install
npm run dev                 # http://localhost:4321
PUBLISH_ALL=1 npm run dev   # see everything, including future and drafts
npm run build               # production build
```

Design work happens in `src/styles/tokens.css` first, then the component
`<style>` blocks. Content shape lives in `src/content.config.ts`. If a design
needs a field the schema does not have, add the field — do not stuff it into
the summary.
