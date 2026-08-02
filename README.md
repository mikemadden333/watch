# Watch

Real-time campus-safety intelligence for K-12 school networks.
**Madden Education Advisory, LLC.**

> Decision support, not dispatch. Watch never instructs lockdown. Defer to
> police and district protocol.

Watch turns fragmented public-safety data into a calm, honest, auditable
posture per campus. Its integrity is the product: every status is traceable to
a source, a timestamp, and a rule — and the UI never hides the gap between when
something happened and when the data could say so.

## Milestone 1 (this build)

Splash + city select + six screens on the seeded **Chicago** scenario
(Veritas Charter Schools), deployable to Vercel.

- **Splash & city select** — animated wordmark, breathing rings, radar sweep;
  Chicago (pilot) / Dallas (live, next milestone) / your city.
- **01 Network Briefing** — deterministic morning-posture banner, campus grid,
  intelligence feed, network-at-a-glance, per-source freshness rail.
- **02 Map** — Leaflet; campuses + incidents, rings on the selected campus only,
  7-day age-fade, layer toggles, data-window scrubber.
- **03 Campus Detail + Playbook** — evidence card, role-filtered checklist that
  stamps actor + time, status timeline, contacts, vicinity.
- **04 Alerts** — LIVE vs DATA-DAY classes, delivery audit, honesty rules.
- **05 Admin** — campuses, versioned thresholds, data-source toggles
  (Citizen overlay OFF · not contracted). Nothing hardcoded.
- **06 Audit + Accuracy Ledger** — append-only log, CSV / signed-PDF export,
  after-action generated from the log; customer-facing ledger.

The seeded scenario is the demo spine (labeled a simulation): Englewood Prep
**ELEVATED** (confirmed shooting 0.31 mi NE, occurred 21:47, published 06:40),
Woodlawn Academy **MONITOR** (2-outlet shots-fired report), four **CLEAR**
campuses, plus an NWS Tornado Warning **ALERT** example for the alerts screen.

## Two clocks + honesty rules (enforced in UI)

- Every incident carries **three timestamps** — `occurred_at`, `published_at`,
  `detected_at`. The gap is always shown, never hidden.
- Two alert classes named in the UI: **LIVE** (e.g. an NWS warning now) and
  **DATA-DAY** (a confirmed incident published this morning that occurred
  earlier).
- Confidence tiers: **CONFIRMED** / **CORROBORATED** / **REPORTED**.
  Single-source reports never page anyone and never appear on the map.
- Per-source freshness rail on every screen; a feed outside its expected window
  is flagged and excluded from status calculation.
- There is no live CPD feed, and the product never implies one. NWS is the only
  authoritative real-time source; CPD data is the confirmation layer.

## Status rules v2.0 (deterministic, version-pinned)

`src/lib/rules.ts` — pure, per-account overridable. Precedence
ALERT > ELEVATED > MONITOR > CLEAR. Every result carries the rule id and rules
version so it can be written verbatim to the append-only audit log.

- **MONITOR** M-1 — 2 independent outlets, violent incident, inside the elevated
  ring within the corroboration window. In-app only.
- **ELEVATED** E-1 NWS watch ∩ campus · E-2 confirmed incident inside 0.5 mi on
  the latest data day (morning posture) · E-3 corroboration with 3+ sources.
- **ALERT** A-1 NWS warning polygon ∩ campus (LIVE) · A-2 confirmed
  shooting/homicide inside 0.25 mi on the latest data day (DATA-DAY) · A-3
  Citizen-verified (only if contracted — off by default).

```bash
npm run verify:rules   # deterministic self-check against the seed (7/7 pass)
```

## Stack

- **Next.js** (App Router) — deploys to Vercel.
- **Supabase** (Postgres) — schema + RLS-by-tenant in `supabase/migrations`,
  seed in `supabase/seed.sql`. The demo UI runs on the seeded fixtures in
  `src/lib/data/chicago.ts`, so it never hard-depends on the DB being reachable.
- **Leaflet** + CARTO tiles for the map.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys (never commit)
npm run dev                  # http://localhost:3000
```

Routes: `/` (splash) → `/chicago/briefing`, `/chicago/map`,
`/chicago/campuses/eng`, `/chicago/alerts`, `/chicago/admin`, `/chicago/audit`.

## Supabase setup

Run the migration then the seed against the project (SQL editor, or `psql`
using the service role / connection string):

```
supabase/migrations/0001_init.sql
supabase/seed.sql
```

- Tenant isolation via row-level security keyed on a `tenant_id` JWT claim.
- `audit_events` is append-only (an `UPDATE`/`DELETE` trigger blocks mutation).
- Adapters upsert incidents idempotently on `(tenant_id, source, source_record_id)`.

## Deploy to Vercel

1. Import this repo into Vercel (framework preset: Next.js — auto-detected).
2. Add project env vars (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NWS_CONTACT_EMAIL`.
3. Deploy. Every push to the working branch auto-deploys a preview.

## Not in this milestone

Live adapters (NWS / CPD VR / ME / crimes / GDELT / RSS on Vercel cron), the
retro-confirmation matcher, and the live Dallas pack are the next steps — the
adapter contract and Citizen webhook slot are designed for but not wired here.

---

Built to the handoff brief. Public-domain data first; commercial feeds are
optional overlays, off by default, never load-bearing.
