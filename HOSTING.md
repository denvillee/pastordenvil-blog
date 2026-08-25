# denvillee.com — hosting runbook

Last verified: 24 August 2026. Everything in "Current state" was checked live against DNS,
RDAP, and HTTP on that date, not taken from memory.

---

## 0. Two domains, one site

Two domains are in play, and they resolve to two different registrars with two different
access situations:

| Domain | Registrar | Status | Access |
|---|---|---|---|
| `denvillee.com` | Network Solutions | Registered 2015, live but pointed at dead Wix | **Account access lost** — recovery in progress, see §9 |
| `pastordenvil.com` | Hostinger | Registered 24 Aug 2026, parked, nothing built on it | **Full access today** |

`denvillee.com` is the canonical brand — it is what the site's own nav mark reads
(`DENVIL.LEE`) and what every existing document assumes. `pastordenvil.com` becomes a
redirect once denvillee.com is live. But denvillee.com's timeline depends on a Network
Solutions account recovery with no fixed date, and the editorial plan needs a live site
before **September 1**. So the two domains are sequenced instead of blocked on each other:

**Phase A — now, using pastordenvil.com (fully in hand today).**
1. Add `pastordenvil.com` to Cloudflare (free plan). Cloudflare will find the Hostinger
   parking records — there's nothing worth keeping, since the domain was only just
   registered and never pointed anywhere.
2. Deploy this repo to Netlify (§3 below still applies, just with `pastordenvil.com` as
   the domain instead of `denvillee.com` for now).
3. At Hostinger, change `pastordenvil.com`'s nameservers from the default parking pair
   (`aster.dns-parking.com`, `helios.dns-parking.com`) to the two Cloudflare provides.
   This is a Hostinger domain setting, not a hosting setting — no site was ever built
   there, so there's nothing to lose.
4. Point DNS at Netlify exactly as §4 describes. The real site is now live at
   `pastordenvil.com` — a working front door before September 1, independent of the
   Network Solutions situation.

**Phase B — once denvillee.com's Network Solutions access is recovered.**
1. Add `denvillee.com` to the same Cloudflare account, same Netlify site, following
   §§1–5 below unchanged.
2. In Netlify's domain settings, set `denvillee.com` as the **primary domain** and leave
   `pastordenvil.com` attached as a domain alias. Netlify automatically 301-redirects the
   alias to the primary — nothing to configure by hand, and nothing breaks for anyone who
   already has a `pastordenvil.com` link out in the world.
3. Move email (`hello@denvillee.com`, SPF, DMARC, CAA — §5) onto denvillee.com once it's
   primary. Pastordenvil.com needs no email of its own; it only ever redirects.

Net effect: content and design work happen exactly once, against one Netlify site. Only
the *domain pointed at it* changes, and the switch is a two-click change in Netlify's
domain panel whenever Network Solutions access comes back — see §9 for that recovery path.

---

## 1. Current state

| Layer | What is actually there |
|---|---|
| Registrar | **Network Solutions** — registered 22 Apr 2015, expires **22 Apr 2027**, status `clientTransferProhibited` |
| Nameservers | `ns2.wixdns.net`, `ns3.wixdns.net` |
| Apex A records | `185.230.63.107`, `185.230.63.171`, `185.230.63.186` (Wix) |
| `www` | CNAME → `cdn3.wixdns.net` |
| Site response | **HTTP 404 from Wix** on both apex and `www` |
| MX | `10 smtp-fwd.wordpress.com` |
| `blog.` / `mail.` | → `192.0.78.24` (WordPress.com) |
| `denvillee.wordpress.com` | Exists, titled "Denvil Lee", **0 posts** |
| SPF / DMARC / CAA | **None** |
| Netlify | No site deployed |

### The three problems

1. **The site is down.** Both hostnames return a Wix 404. Anyone who has an old sermon link,
   or who searches your name, hits a dead page.
2. **DNS is stranded.** Wix still holds authority for the zone through a cancelled account.
   You cannot add a record without getting back into Wix.
3. **The domain is spoofable.** With no SPF and no DMARC, anyone can send mail that appears
   to come from `@denvillee.com`, and anything you legitimately send is likely to be filtered.

### The one piece of good news

Nameserver delegation is set **at the registrar**, not at the DNS host. You need a Network
Solutions login and nothing else. Wix can be cut out without ever signing back into it.

---

## 2. Target architecture

```
Network Solutions  →  Cloudflare DNS  →  Netlify
   (registration)      (the zone)        (the site)
                            │
                            └─→ Cloudflare Email Routing  →  your inbox
```

Three independent layers, no vendor holding two of them. That separation is the entire
lesson of the current situation: cancelling one Wix subscription took down the website and
the DNS together. Split apart, losing any single vendor costs an afternoon.

| Layer | Choice | Why | Cost |
|---|---|---|---|
| Registrar | Network Solutions for now | Works; not worth touching mid-cutover | ~renewal |
| DNS | Cloudflare (free plan) | Fast, free, registrar-independent, good editor | $0 |
| Host | Netlify | Builds from Git on push, free TLS, atomic deploys, instant rollback | $0 |
| Email | Cloudflare Email Routing | Free forwarding, no mailbox to maintain | $0 |
| Newsletter | Kit | Portable list you own; exports cleanly | Free to 1k |

---

## 3. Cutover, in order

Do these in sequence. Steps 1–2 change nothing for visitors and are safe to do any time.

### Step 1 — Add the domain to Cloudflare
1. Create a free Cloudflare account, **Add a site**, enter `denvillee.com`, choose the Free plan.
2. Cloudflare scans the existing zone and imports what it finds. **Review the imported list.**
   Delete the `blog` and `mail` records and the WordPress `MX` — they point at an empty blog.
3. Cloudflare gives you two nameservers. Write them down. Do not change anything yet.

### Step 2 — Deploy the site to Netlify
1. Push this repository to GitHub.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
   Build command `npm run build`, publish directory `dist`. `netlify.toml` already sets both.
3. Confirm the temporary `*.netlify.app` URL builds and serves correctly.
4. **Site configuration → Domain management**, add `denvillee.com` and `www.denvillee.com`.
   Netlify will say DNS is not pointed at it yet. That is expected.

### Step 3 — Move the nameservers (the real cutover)
1. Log in to Network Solutions → **My Domains → denvillee.com → Manage → Nameservers**.
2. Replace the two `wixdns.net` entries with the two Cloudflare gave you.
3. Save. Propagation is usually well under an hour; allow up to 24.
4. Verify: `dig NS denvillee.com` should return the Cloudflare pair.

> The transfer lock (`clientTransferProhibited`) does **not** block this. That flag prevents
> moving the domain to a different registrar; it has no bearing on nameserver changes.

### Step 4 — Point DNS at the site
In the Cloudflare dashboard, once the zone is active:

| Type | Name | Value | Proxy |
|---|---|---|---|
| A or CNAME | `@` | Netlify's apex target (from Netlify's domain panel) | DNS only |
| CNAME | `www` | `<your-site>.netlify.app` | DNS only |

Set proxy to **DNS only** (grey cloud). Netlify issues and renews its own certificate, and
Cloudflare's proxy in front of it adds a second TLS layer you do not need.

Then in Netlify, confirm the certificate provisions. Check `https://denvillee.com` and
`https://www.denvillee.com` both load and `http://` redirects to `https://`.

### Step 5 — Email
1. Cloudflare → **Email → Email Routing → Get started**. Add the records it generates
   (MX plus an SPF TXT). This replaces the WordPress forwarder.
2. Create the address `hello@denvillee.com` forwarding to your personal inbox. This is the
   address the site's speaking page already uses.
3. Add the remaining protection records:

| Type | Name | Value |
|---|---|---|
| TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:hello@denvillee.com; pct=100` |
| CAA | `@` | `0 issue "letsencrypt.org"` |

If you later send the newsletter from `@denvillee.com` through Kit, Kit will give you its own
DKIM and SPF entries. Merge Kit's `include:` into the single SPF record — a domain may only
have one SPF TXT record, and having two breaks both.

### Step 6 — Verify, then stop touching it
- [ ] `https://denvillee.com` loads the new site
- [ ] `https://www.denvillee.com` redirects to the apex
- [ ] `http://denvillee.com` redirects to `https://`
- [ ] A deep link works: `/essays/the-kingdom-is-an-address/`
- [ ] A bad URL shows the styled 404, not a server default
- [ ] `/rss.xml` and `/sitemap-index.xml` return XML
- [ ] Test email **to** `hello@denvillee.com` arrives
- [ ] `dig TXT denvillee.com` shows exactly one SPF record
- [ ] `dig TXT _dmarc.denvillee.com` returns the DMARC policy

---

## 4. Things to do later, not now

**Move the registrar before April 2027.** Network Solutions renewals are several times the
at-cost price, and their upsell flow is hostile. Cloudflare Registrar sells at wholesale with
no markup; Porkbun is similar. The move needs the transfer lock lifted and an auth code, and
should be done at least 30 days before expiry, never during a cutover.

**Do not let the domain lapse.** Set the renewal to auto-renew and put a calendar reminder at
**1 March 2027**. A lapsed domain with a decade of inbound sermon links is the one genuinely
unrecoverable failure in this whole system.

**Keep the Wix account credentials** until the nameserver change has propagated and been
verified, then you can let it go entirely.

---

## 5. Publishing new content

The site builds from Markdown files in the repo. Content is written ahead of time
with a future `publishAt` and appears on its own date — see `BACKEND.md` §4 for the
full model and the room-by-room schema.

1. Create the file in the right room: `src/content/essays/`, `moments/`, `leaders/`,
   `frameworks/`, `watch/`, or `reading/`.
2. Set `publishAt` to the date it should go live. Set `week:` to tie it into the
   week's idea. `draft: true` holds it back regardless of date.
3. Commit and push. Netlify builds in about a minute — but the entry stays invisible
   until its date passes **and a build runs after that**. Which is why §7 exists.

## 6. Environment variables

Set these in Netlify under **Site configuration → Environment variables.**

| Variable | Value | Scope |
|---|---|---|
| `PUBLIC_KIT_FORM_ID` | The Kit form ID | Production and previews |
| `PUBLISH_ALL` | `1` | **Deploy previews only.** Never production. |

`PUBLISH_ALL=1` reveals every draft and future-dated entry. On production it would
unbank the entire scheduled season at once. Scope it to previews so you can review
what is coming without publishing it.

## 7. The daily build (required, not optional)

A static site only changes when it is rebuilt. Scheduled publishing therefore needs
something to trigger a build every day, or banked content simply never appears.

1. In Netlify: **Site configuration → Build & deploy → Build hooks → Add build hook.**
   Name it `daily`. Copy the URL.
2. In the GitHub repo, add `.github/workflows/daily-build.yml`:

```yaml
name: Daily build
on:
  schedule:
    - cron: '0 9 * * *'   # 09:00 UTC — 5am ET in summer, 4am ET in winter
  workflow_dispatch:       # so you can also fire it by hand
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsSL -X POST -d '{}' "${{ secrets.NETLIFY_BUILD_HOOK }}"
```

3. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**,
   named `NETLIFY_BUILD_HOOK`, holding the hook URL.

Run it once by hand with **workflow_dispatch** to confirm it fires. GitHub's cron can
drift by several minutes and occasionally skips on very low-activity repos — the manual
trigger is the fallback, and the Monday Note going out is the practical alarm if a day
is ever missed.

## 8. If something breaks

| Symptom | First thing to check |
|---|---|
| Site down, DNS fine | Netlify deploy log. Roll back to the last good deploy in one click. |
| Site down, DNS wrong | `dig NS denvillee.com`. If it is not Cloudflare, the registrar change reverted. |
| Certificate warning | Netlify domain panel → renew certificate. Usually a stale CAA record. |
| Mail not arriving | Cloudflare Email Routing status page, then confirm the MX records match. |
| Mail going to spam | `dig TXT denvillee.com` — more than one SPF record breaks authentication. |

## 9. Recovering the Network Solutions account

This is the blocker on Phase B (§0). The domain and DNS are fine; what's missing is a
login. Confirmed 24 Aug 2026: registrar of record is Network Solutions, LLC, transfer-locked,
expiring 22 Apr 2027 — none of that requires urgency, it just needs to get resolved before
denvillee.com can become the primary domain.

1. **Domain-based email lookup.** Network Solutions' login page has "Forgot User ID? →
   Forgot Email? Search by domain." Enter `denvillee.com` — it returns the email address
   the account is registered under, without needing to already know it.
2. **If that inbox is still reachable**, a normal password reset from there finishes it.
3. **If it's an old, unreachable, or third-party address** (a previous web designer, a
   former church staffer — this domain is from 2015, so that's a common outcome), use
   Network Solutions' support chat to request the account email be changed. They'll ask
   for proof of ownership: the original registration receipt, any old renewal emails, a
   card or bank statement showing an annual charge to Network Solutions around
   late April, or WHOIS history naming the owner. Any one of these is normally enough.
4. Before escalating, it's worth a quick search of Denvil's own email for "Network
   Solutions" or "NETSOL" (including spam/archive) — a decade-old renewal notice often
   names the account address directly and skips the whole recovery flow.

Once back in: nothing else in this document changes. Skip straight to Phase B, §0.
