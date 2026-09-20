# GlowUpp — Backend Architecture

Status: **Phase 0 — proposal, not yet implemented**
Owner: technical co-founder (Claude) + Dominik
Last updated: 2026-09-18

---

## 0. How to read this document

`~/Desktop/glowupp.co.uk` is currently an **empty folder** — no git repo, no
code, no config. There is nothing to "inspect" yet, so this document does the
other job Phase 0 asks for: it proposes the architecture we'd build on, so we
can agree on it *before* any code is written.

Everything below is a recommendation. Anything marked as an **Open Decision**
at the bottom needs your sign-off before Phase 1 starts.

---

## 1. Current architecture

None. Empty directory, no git history, no dependencies, no deployed
services, no domain configuration inspected yet.

---

## 2. Product shape, translated into engineering terms

Stripped of branding, GlowUpp is:

1. A **content-capture app** (photos + structured answers about a home
   improvement project).
2. An **AI conversation layer** that turns messy human answers into a
   structured record (the "Project Profile").
3. An **image generation pipeline** that edits a real photo based on that
   record.
4. A **lightweight two-sided marketplace** (homeowners ↔ local
   professionals) built on rule-based matching, quote requests, and simple
   messaging.

None of this requires anything exotic. It's a CRUD app with two AI-powered
steps bolted on. I'm going to resist the urge to over-engineer it — the
brief itself says so ("Simple → Testable → Useful → Scalable").

---

## 2a. Infrastructure inventory (Hostinger account, checked 2026-09-18)

Pulled directly from your Hostinger account via API — this is what already
exists and what we're building on:

| Resource | Detail |
|---|---|
| `glowupp.co.uk` | Registered today, status active, expires 2028-09-18. DNS not yet pointed anywhere. |
| Email | "Starter Business Email" subscription active, provisioned same day as the domain — this is `hello@glowupp.co.uk`. |
| VPS "KVM 2" | 2 vCPU, 8GB RAM, 100GB disk, Ubuntu 24.04, hostname `srv1179774.hstgr.cloud`. Currently running **n8n** (lightweight) and otherwise idle. **This is where GlowUpp will run.** |
| Business Web Hosting (shared) | Hosts `dfootprint.co.uk`, `roomcalculator.co.uk`, `homeadaptationsuk.co.uk`, `interviewmate.co.uk` (Node.js), `aiskoolhub.com` (WordPress), and others as addon domains. Not used for GlowUpp — kept as-is for the existing sites. |

**Update (2026-09-18) — groundwork done, with your go-ahead:**

- The VPS already runs **Traefik** (reverse proxy, automatic Let's Encrypt
  TLS via Docker labels) plus **Docker Compose**, managed from a single
  `/root/docker-compose.yml`. Each site (n8n, `onlineviewing.co.uk`, a
  self-hosted Plausible analytics stack) is just one more service block in
  that file, routed by a `Host()` label rule. **GlowUpp will follow the
  exact same pattern** — no new infrastructure to install, just one more
  service block once there's an app to build.
- Resources: 73GB disk free, ~5.4GB RAM available — comfortable headroom
  for another Next.js app alongside what's already running.
- `glowupp.co.uk` and `www.glowupp.co.uk` DNS **A record now points at the
  VPS** (`46.202.194.87`), so TLS certificate issuance will work
  immediately once the app is deployed. Email DNS (DKIM/SPF/DMARC/MX for
  the Hostinger Business Email mailbox) was left untouched.
- Reserved `/root/glowupp-data` on the VPS for the app's persistent volume
  (matching the `onlineviewing-data` pattern).
- **Not yet done, deliberately:** no `docker-compose.yml` service block for
  GlowUpp yet (it would reference a build context that doesn't exist), no
  app code, nothing deployed. That happens once there's a real Next.js app
  to ship — likely alongside Phase 3 (Project API), the first point where
  there's something worth putting behind a URL.

---

## 3. Proposed architecture (high level)

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js application                  │
│   (App Router, TypeScript, Tailwind)                     │
│                                                           │
│   Browser (React)                                        │
│        │  fetch / server actions                         │
│        ▼                                                 │
│   Server-side layer (Route Handlers + Server Actions)     │
│        │                                                  │
│        ├─► Postgres (via Supabase)  ── structured data    │
│        ├─► Object storage (Supabase Storage) ── photos    │
│        ├─► Anthropic Claude ── chat / project profile     │
│        └─► Image generation provider (abstracted) ── AI   │
│             design concepts                                │
└─────────────────────────────────────────────────────────┘
         │                                   │
         ▼                                   ▼
   Resend (email)                     Vercel (hosting)
```

**One codebase, one deployment target for the MVP.** Next.js gives us
frontend + backend in the same project — there's no separate "API server"
to build, deploy, and keep in sync. Given you're not a professional
developer, minimizing the number of moving systems is a deliberate choice,
not a shortcut. We can split services out later if/when there's a real
reason to (e.g. a job queue for slow image generation).

### Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **Next.js 14+ (App Router), TypeScript** | Industry-standard, huge ecosystem, works well with server actions for form/photo submission, good SEO for the marketing/landing pages. |
| Styling | **Tailwind CSS** | Fast to build a clean, modern consumer UI without a heavy design system. |
| Backend | **Next.js Route Handlers + Server Actions** (same app) | No separate backend service to run/deploy for MVP. |
| Database | **PostgreSQL via Supabase** | Relational data (users → projects → photos → requirements → designs → quotes → professionals) fits SQL naturally. Supabase adds hosted Postgres + Auth + Storage + **Row Level Security** in one product, which matters a lot for "homeowner A must never see homeowner B's data" (see §7 Security). |
| ORM | **Prisma** | Type-safe schema + migrations, plain SQL/Postgres underneath (not locked into Supabase's client library for data access). |
| Auth | **Supabase Auth** | Email/password + magic link out of the box, roles stored in our own `profiles` table linked to `auth.users`. Avoids hand-rolling password storage/reset flows. |
| File storage | **Supabase Storage** (private buckets) | Homeowner photos and generated designs stored as objects, never in the database. Access via short-lived signed URLs, not public links. |
| Text AI | **Anthropic Claude** (server-side only) | Drives the project-assistant conversation and maintains the structured Project Profile. Never called from the browser — API key stays server-side. **Confirmed.** |
| Image generation | **kie.ai**, abstracted behind `ImageGenerationProvider` — default model **Nano Banana Pro** (Gemini 2.5 Flash Image), compared against **Flux Kontext Pro** | Needs to *edit* an existing homeowner photo (preserve geometry, change style) — a specific capability, not generic text-to-image. kie.ai gives one API key/billing relationship across multiple models, so we can A/B test without re-plumbing. **Confirmed provider; final model chosen after a Phase 5 side-by-side test.** |
| Email | **Resend**, sending as `hello@glowupp.co.uk` (domain-verified via SPF/DKIM on Hostinger DNS) | Transactional email (quote notifications, etc.) needs an API — Hostinger's Business Email is a human mailbox product (IMAP/SMTP), not built for app-triggered sending, deliverability tracking, or webhooks. `hello@glowupp.co.uk` stays the reply-to/from address either way; Resend is just the delivery mechanism underneath it. Abstracted behind a `NotificationProvider` interface so it's replaceable. |
| Hosting | **Existing Hostinger VPS "KVM 2"** (2 vCPU / 8GB RAM / 100GB disk, Ubuntu 24.04) — Docker + Caddy (reverse proxy, auto-HTTPS), running alongside the existing n8n instance | Next.js server actions here need long-lived AI streaming responses, webhook callbacks from kie.ai, and eventually a background worker for image generation — Hostinger's managed/Passenger-style Node hosting (the kind `interviewmate.co.uk` uses) enforces request timeouts and doesn't support persistent workers well. The VPS is already paid for, has ample headroom over n8n's footprint, and gives full control. **Confirmed; not yet provisioned — happens explicitly in a later phase, with your go-ahead, since it touches a live shared server.** |

---

## 4. Data layer

**PostgreSQL**, reasoning:

- The core domain is highly relational (a project *belongs to* a homeowner,
  *has many* photos, *has many* design concepts, *has many* quote requests
  each *belonging to* a professional). Postgres is the natural fit.
- **Flexible project requirements** (kitchen vs. bathroom vs. driveway
  questions) are modeled as a `JSONB` column on a `project_requirements`
  table, validated against a **per-project-type schema config** (stored as
  data, not as code/migrations). This is how we satisfy "must allow new
  project types and questions without restructuring the database" — adding
  "Loft conversion" later means adding a config entry, not a migration.
- Supabase's **Row Level Security (RLS)** is enabled on every table as a
  safety net, but — important correction from what was originally written
  here — it is **not** the thing enforcing "users can only see their own
  rows" in normal operation. The app talks to Postgres through Prisma over
  a single trusted connection (Supabase's Session Pooler, as the `postgres`
  role), not through Supabase's per-user PostgREST API — and that trusted
  role bypasses RLS entirely, by Postgres design. The actual enforcement is
  100% in application code (`src/lib/auth.ts`'s `requireUser()`/
  `requireRole()`, plus every server action scoping its `where` clause to
  the caller's id). RLS still matters if the anon/authenticated key is ever
  used directly from the browser (Storage, Realtime, a future direct-query
  path) — see §5 and §9 for the full explanation.

---

## 5. Authentication

**Supabase Auth**, with the `users` table (`id`, `role`, `name`, `email`,
`phone`, `postcode`, timestamps) keyed to `auth.users.id`. A Postgres
trigger (`handle_new_auth_user`, in the Phase 2 migration) creates the
`users` row automatically the moment someone signs up — role/name/postcode
ride along in the signup call's metadata and the trigger reads them. The
`users` row is never created by application code directly, so it can't get
out of sync with `auth.users`.

- Roles: `HOMEOWNER`, `PROFESSIONAL`, `ADMIN` — a single enum column, not
  separate tables, since a user's permissions differ by role but their
  identity fields are shared.
- Session handling via `@supabase/ssr` (cookie-based sessions). Next.js 16
  renamed `middleware.ts` to `proxy.ts` — the session-refresh logic lives
  in `src/proxy.ts`, refreshing the session cookie on every request; it is
  not itself an authorization boundary.
- Authorization (who can access *which project/quote*) is enforced in
  **application code, primarily** — `src/lib/auth.ts` (`requireUser()`,
  `requireRole()`) is called by every page/server action that needs to know
  who's asking, following Next.js's own recommended "Data Access Layer"
  pattern. Postgres RLS policies exist on every table too, but as
  documented above/§9, they're a safety net for a different access path
  (direct Supabase client usage), not the primary control for Prisma-driven
  queries. Frontend route guards are UX only, never treated as security.

---

## 6. Storage

- Two private Supabase Storage buckets: `project-photos` (homeowner
  uploads) and `generated-designs` (AI output).
- Files are private by default; access is via signed URLs generated
  server-side, scoped to the requesting user's authorization, expiring
  after a short window (e.g. 5 minutes).
- Database rows store the **storage path/reference**, never binary data —
  matches the brief's explicit instruction.
- Upload flow: browser uploads directly to a signed upload URL (not proxied
  through our server) to avoid holding large files in a serverless
  function's memory/time limit.

---

## 7. AI

Two distinct AI surfaces, kept separate on purpose:

1. **Text — the GlowUpp Assistant.** Calls Anthropic Claude server-side.
   Its job is narrow: read the current structured Project Profile + latest
   message, decide what's known/missing/conflicting, and either ask one
   focused follow-up question or update the profile. The chat transcript is
   stored for context, but **the structured `project_profile` row is the
   source of truth**, never the raw conversation — this is explicit in the
   brief and it's the right call (structured data is queryable, gradeable,
   and safe to show a professional; a chat log isn't).
2. **Image — Design Concept generation.** A separate, swappable provider
   behind an `ImageGenerationProvider` interface (`generateDesign`,
   `regenerateDesign`, `editDesign`). Every call is logged with its exact
   prompt, source image, provider, and model, and every result is stored as
   a new versioned row — never overwritten (Phase 6 requirement).

Both AI calls happen **only** on the server. The browser never sees an API
key.

---

## 8. API

Given Next.js, "API" mostly means **Server Actions** (form-like
mutations — create project, upload photo, update requirements) plus a
handful of **Route Handlers** for things that need a real HTTP endpoint
(webhooks from the image generation provider, streaming the AI chat
response). Both run the same authorization checks. Full endpoint-by-endpoint
documentation happens in Phase 14 (`docs/API.md`), once the routes exist.

---

## 9. Security (preview — full pass happened in Phase 12, see §24)

Non-negotiables baked in from Phase 1 onward:

- Every query that touches project/quote/photo data is scoped to the
  authenticated user's ownership or explicit authorization — enforced
  server-side, backed by RLS.
- Homeowner photos are private by default; professionals only see photos
  attached to a project they've been sent a quote request for.
- AI API keys (Anthropic, image provider) live only in server environment
  variables, never in client bundles.
- File uploads are validated by MIME type and size limit before a signed
  upload URL is issued.
- No payments, no storage of financial credentials, anywhere in the MVP.

---

## 10. Development roadmap

Mirrors the phase structure in the brief:

1. **Phase 0 — this document.** ✅
2. **Phase 1 — Database foundation.** ✅ Complete (2026-09-18). Supabase
   Postgres project provisioned, Prisma schema defining `users`,
   `projects`, `project_photos`, `project_requirements`, `design_concepts`,
   `professionals`, `professional_services`, `quote_requests`,
   `activity_log`, first migration applied and verified live (constraints,
   cascades, and Zod validation smoke-tested against the real database,
   then reverted). See §13 below for what's in the repo.
3. **Phase 2 — Auth & authorization.** ✅ Complete (2026-09-19). Supabase
   Auth wired up (signup/login/logout), auto-provisioning trigger, RLS
   policies, server-side authorization DAL. See §14 below.
4. **Phase 3 — Project API.** ✅ Complete (2026-09-19). Project
   create/update/list/status, photo upload/delete via Supabase Storage,
   flexible requirements update. Full API reference in
   [docs/API.md](./API.md). See §15 below for what's in the repo.
5. **Phase 4 — GlowUpp AI Assistant.** ✅ Complete (2026-09-19). Claude-backed
   conversation, forced tool-calling for guaranteed structured output,
   deterministic known/missing tracking, writes validated through the same
   schemas Phase 3's manual forms use. See §16 below and
   [docs/API.md](./API.md).
6. **Phase 5 — Image generation service.** ✅ Complete (2026-09-19).
   Provider-independent abstraction, kie.ai implementation, Nano Banana Pro
   vs. Flux Kontext Pro compared on a real photo with real prompts, one
   full generation verified end-to-end through the actual UI. See §17
   below and [docs/API.md](./API.md).
7. **Phase 6 — Design generation workflow.** ✅ Complete (2026-09-19).
   Configurable multi-style batch generation, compare/select/regenerate/
   request-changes, verified live including a direct visual diff proving
   "request changes" edits only what was asked. See §18 below and
   [docs/API.md](./API.md).
8. **Phase 7 — Professional matching.** ✅ Complete (2026-09-19).
   Transparent rule-based matching (service category, postcode-prefix
   area, verification, availability), every rule verified independently
   for both pass and fail. See §19 below and [docs/API.md](./API.md).
9. **Phase 8 — Quote request system.** ✅ Complete (2026-09-19).
   Homeowner requests quotes from matched professionals (server-side
   re-validated against Phase 7's matching rules), professionals view/
   decline/quote from an opportunities inbox, homeowner compares and
   selects a winner. See §20 below and [docs/API.md](./API.md).
10. **Phase 9 — Notifications** (email first, via Resend). ✅ Complete
    (2026-09-19). `hello@glowupp.co.uk` verified live on Resend,
    provider-abstracted email sending wired into the quote flow
    (request/submit/select), verified end-to-end with a real inbox
    delivery. See §21 below and [docs/API.md](./API.md).
11. **Phase 10 — Messaging** (simple, project-scoped). ✅ Complete
    (2026-09-19). One thread per quote request between the homeowner and
    that professional, plain text, email-notified via Phase 9, verified
    live both directions plus the cross-professional authorization
    boundary. See §22 below and [docs/API.md](./API.md).
12. **Phase 11 — Transaction architecture** (design only, no real
    payments). ✅ Complete (2026-09-19). Lead-fee business model
    (confirmed with the product owner), `Transaction` records created
    automatically on professional selection, surfaced to professionals —
    no payment processor, no real money movement anywhere. See §23
    below and [docs/API.md](./API.md).
13. **Phase 12 — Security review.** ✅ Complete (2026-09-19). Full
    audit across every Server Action and data-access function; found and
    fixed one real privilege-escalation vulnerability (self-assignable
    ADMIN role via direct Supabase signup) and one HTML-injection
    vulnerability in notification emails; added baseline security
    response headers. Follow-up (same phase, after review): added
    in-memory rate limiting on login/signup/messages/project creation/
    quote requests, and restricted the manual project-status override to
    only the statuses that make sense as a deliberate choice. See §24
    below.
14. **Phase 13 — Testing.** ✅ Complete (2026-09-19). Vitest unit tests
    for every side-effect-free logic module (54 tests, 7 files) —
    scoped to pure logic by explicit choice in chat, since Server
    Actions/auth/external APIs are already covered by each phase's live
    verification. See §25 below and [docs/API.md](./API.md).
15. **Phase 14 — API documentation.** ✅ Complete (2026-09-19). A
    consolidation pass over [docs/API.md](./API.md) — a table of
    contents, a documentation gap for Phase 2's auth actions closed, and
    real drift from later phases (Phase 12's status restriction and rate
    limits) corrected in the original entries rather than left stale.
    See §26 below. **This was the roadmap's final phase.**

Each phase ships, gets checked, gets explained in plain English, and stops
for your review — per the brief's development rule.

---

## 11. Decisions

**Confirmed:**

1. **Single Next.js app** for frontend + backend. ✅
2. **Supabase** for Postgres + Auth + Storage + RLS. ✅
3. **Anthropic Claude** for the text assistant. ✅
4. **kie.ai** as the image generation provider platform, default model
   **Nano Banana Pro**, compared against **Flux Kontext Pro** before final
   lock-in. ✅
5. **Hosting: the existing Hostinger VPS ("KVM 2")**, not shared hosting,
   not Vercel — Docker + Caddy, deployed alongside the existing n8n
   instance. ✅

6. **Image model:** test Nano Banana Pro vs. Flux Kontext Pro head-to-head
   in Phase 5 on a real photo, decide from actual output rather than specs. ✅
7. **Repo setup:** `pnpm`, fresh git repo in `~/Desktop/glowupp.co.uk`. ✅
   (Not yet initialized — happens at the start of Phase 1, so it doesn't
   count as "building the backend" during a documentation phase.)
8. **AI cost control:** capped in `src/lib/generation-limits.ts` — 3
   concepts in the initial batch, 9 `design_concepts` rows per project in
   total (covers the initial batch plus roughly two rounds of
   regeneration), overridable via `MAX_DESIGN_GENERATIONS_PER_PROJECT`.
   Enforced in application code at generation time (Phase 5/6) rather than
   a database constraint, so it can be tuned without a migration. ✅
9. **VPS groundwork:** done now, see §2a above — Traefik/Docker Compose
   pattern confirmed reusable as-is, DNS pointed at the VPS, data directory
   reserved. No app code deployed yet.

---

## 12. Risks worth naming now

- **Image editing quality is the product's make-or-break feature**, and
  it's the least mature part of the AI ecosystem — a photorealistic "redo
  my kitchen but keep the room geometry" edit is harder than a from-scratch
  generation. This is worth a real spike/prototype before we build the full
  pipeline around one provider.
- **Two-sided marketplace cold-start**: matching only works once there are
  professionals in the system. The brief already accounts for this
  (manual matching allowed initially) — just flagging it's a go-to-market
  problem, not a backend one.
- **UK-specific data**: postcodes need UK-format validation and a sane way
  to compute "is professional X within service area of postcode Y" (postcode
  prefix matching is fine for MVP; proper geo-radius matching can come
  later).

---

## 13. Phase 1 — what's actually in the repo now

- **Framework note:** scaffolded with **Next.js 16.3.5 / React 19**, which
  is newer than my training data and has real breaking changes from the
  Next.js I "know." The package bundles its own docs at
  `node_modules/next/dist/docs/` — I'll read the relevant section before
  writing App Router/Server Action code in later phases rather than
  assuming older conventions still apply.
- **Prisma version note:** npm's `latest` tag for `prisma` currently points
  at an unreleased `8.0.0-rc.15`. Pinned to **`7.10.0`** (the last stable
  release) instead — not worth running a release candidate under a
  production backend. Prisma 7 requires a driver adapter for SQL databases
  (no more built-in engine connection), so `@prisma/adapter-pg` + `pg` are
  wired up in `src/lib/prisma.ts`.
- **Schema** (`prisma/schema.prisma`): all Phase 1 entities — `User`,
  `Project`, `ProjectPhoto`, `ProjectRequirements`, `DesignConcept`,
  `Professional`, `ProfessionalService`, `QuoteRequest`, `ActivityLog`.
  Money fields are integers in minor units (pence) to avoid floating-point
  rounding. `User.id` has no default — it's always set explicitly to match
  the corresponding `auth.users.id` once Phase 2 wires up Supabase Auth.
- **Flexible requirements** (`src/lib/project-types.ts`): a code-based
  registry — not a database table — mapping each project type (kitchen,
  bathroom, garden, driveway, patio, exterior) to its question set, with a
  Zod schema derived from each definition and used to validate
  `ProjectRequirements.data` on write. `.strict()` mode means an
  unrecognized or misspelled field fails loudly instead of being silently
  dropped. Adding a new project category is a code change here, not a
  migration.
- **Generation cost cap** (`src/lib/generation-limits.ts`): see §11 item 8.
- **Database**: Supabase project `glowupp` (`oqmvrrjcfgjzzlrvfuxd`,
  eu-west-1). Connected via the **Session Pooler** connection string, not
  the direct one — Supabase's direct-connection hostname currently
  resolves IPv6-only, which this network can't route to. Session mode
  (port 5432, not the 6543 Transaction pooler) behaves like a normal
  dedicated connection, which is what Prisma migrations need; fine for our
  single persistent Node process on the VPS.
- **Verification performed, not just assumed:** ran the migration against
  the live database, then a throwaway script that created real rows and
  confirmed the `project_requirements` unique-per-project constraint, the
  `design_concepts` unique-per-(project, version) constraint, `.strict()`
  Zod validation rejecting an unrecognized field, and cascade deletes —
  all before deleting the test data and the script itself.
- **Not yet done:** no auth wiring (Phase 2), no Row Level Security
  policies yet (those land with Phase 2, since they depend on
  `auth.uid()`), no seed data, no app UI.

---

## 14. Phase 2 — what's actually in the repo now

- **Framework correction applied:** Next.js 16 deprecated `middleware.ts`
  in favor of `proxy.ts` (same mechanism, new file/export name — see
  `node_modules/next/dist/docs/.../file-conventions/proxy.md`). Session
  refresh lives in `src/proxy.ts`, not `middleware.ts`.
- **Auth stack:** `@supabase/ssr` + `@supabase/supabase-js`. Browser client
  in `src/lib/supabase/client.ts`, server client in
  `src/lib/supabase/server.ts` (both thin wrappers, no custom logic).
- **Auto-provisioning trigger** (`prisma/migrations/20260918234225_auth_trigger_and_rls`,
  fixed by `20260918235500_fix_auth_trigger_updated_at`): a Postgres
  trigger on `auth.users` that creates the matching `public.users` row on
  signup, reading role/name/postcode out of the signup call's metadata.
  The first version of this migration had a bug — it didn't set
  `updated_at`, which has no database-level default (Prisma's `@updatedAt`
  is enforced by Prisma Client at write time, not by Postgres), so every
  signup failed with a generic "Database error saving new user" until a
  follow-up migration fixed the trigger's INSERT. Caught and fixed via live
  testing, not left for you to find.
- **Migration tooling note:** `prisma migrate dev` fails against Supabase
  for any migration touching `auth.*` — its shadow-database validation
  spins up a plain empty Postgres schema that doesn't have Supabase's
  `auth` schema or helper functions (`auth.uid()`, `auth.role()`). Use
  `prisma migrate dev --create-only` to scaffold the migration folder, hand
  -write the SQL, then `prisma migrate deploy` to apply it directly without
  shadow-db validation. (`--create-only` itself also hits the same
  shadow-db error once an `auth.*`-touching migration already exists in
  history — the two migrations in this repo had their folders created by
  hand for that reason; the SQL inside is identical either way.)
- **RLS correction:** see the corrected §4/§5 text above — RLS is enabled
  with policies on every table (19 policies across 9 tables) but is a
  safety net, not the live enforcement path, given the app connects via
  Prisma as a trusted role rather than through Supabase's per-user API.
- **Authorization DAL** (`src/lib/auth.ts`): `getCurrentUser()` (cached
  per-request), `requireUser()` (redirects to `/login`), `requireRole()`
  (redirects to `/dashboard` if the role doesn't match). Every future
  server action should start with one of these rather than reading the
  Supabase session directly.
- **Pages built:** `/`, `/signup` (role selector), `/login`, `/dashboard`
  (role-conditional placeholder content), `/professional/onboarding`
  (creates the `Professional` + `ProfessionalService` rows). These are
  functional, not styled — GlowUpp's actual visual design is a separate,
  later concern from backend correctness.
- **Verified end-to-end in a real browser, not just typechecked:**
  homeowner signup → trigger creates `users` row correctly → login (after
  confirming the test account via the Supabase admin API, to avoid
  depending on a real inbox) → dashboard shows homeowner-specific content
  → logout → session cleared → direct navigation to `/dashboard` while
  logged out redirects to `/login`. Separately: professional signup (via
  admin API, to avoid Supabase's free-tier email-sending rate limit, which
  the homeowner test had already exhausted for the hour) → same trigger →
  login auto-redirects to onboarding (no profile yet) → onboarding form
  creates real `professionals`/`professional_services` rows → dashboard
  shows professional-specific content. Role boundary confirmed: logged in
  as the homeowner, direct navigation to `/professional/onboarding`
  silently redirects to `/dashboard` rather than showing the form.
- **Known gap, honestly stated:** the specific "homeowner A cannot see
  homeowner B's project" scenario from the brief isn't fully exercised yet
  because `Project` CRUD doesn't exist until Phase 3 — what's proven now is
  the *mechanism* (`requireUser()` returns the real caller, every future
  query must scope its `where` to that id) and the *role* boundary
  (homeowner vs. professional route access). The *ownership* boundary
  between two homeowners gets its first real test in Phase 3.
- **Two throwaway test accounts remain in the database** (a homeowner and
  a professional, both `...+glowupp_*@gmail.com`) — left in place
  deliberately, since Phase 3 will want real accounts to build project
  CRUD against rather than recreating them.

---

## 15. Phase 3 — what's actually in the repo now

- **Storage:** a private `project-photos` Supabase Storage bucket
  (`scripts/setup-storage.ts`, idempotent — kept in the repo, not a
  throwaway script, so a fresh environment can re-provision it), capped at
  10MB per file, restricted to `image/jpeg`, `image/png`, `image/webp`,
  `image/heic` at the bucket level (a second enforcement point beyond the
  app-code check). Zero Storage RLS policies were added — Storage's own
  `storage.objects` table has RLS on by default, so a private bucket with
  no policies is already maximally locked down for the
  anon/authenticated-key path; our server reaches it via the service-role
  key regardless (`src/lib/storage.ts`), same reasoning as the Phase 2 RLS
  correction.
- **Upload transport is proxied through a Server Action**, not a
  direct-to-storage signed URL as Phase 0 originally sketched — see the
  note under `uploadProjectPhoto` in [docs/API.md](./API.md) for why, and
  `next.config.ts`'s `experimental.serverActions.bodySizeLimit` (raised to
  12MB) for the mechanics.
- **Money is pence in the database, pounds at the UI boundary**
  (`src/lib/money.ts`) — deliberate, to keep currency arithmetic
  integer-only.
- **Authorization pattern, now fully proven:** `src/lib/data/projects.ts`
  (`getProject`, `requireProjectOwner`, `listHomeownerProjects`) is the one
  place project-ownership checks live; every mutation in
  `src/lib/actions/projects.ts` and `src/lib/actions/photos.ts` goes
  through it. `getProject` returns 404 rather than 403 for unauthorized
  access, deliberately, so a project's existence isn't leaked to someone
  who shouldn't see it.
- **A Next.js 16 detail worth knowing:** dynamic route params
  (`/projects/[id]`) are typed via the global `PageProps<'/projects/[id]'>`
  helper and must be awaited (`const { id } = await props.params`) — this
  replaced the old synchronous `params` object from earlier Next versions.
- **Verified live, not just typechecked** (see docs/API.md's closing
  section for the full list): the cross-homeowner 404 boundary — the core
  thing this phase exists to prove — a real file uploaded through an
  actual browser file picker (via the Playwright MCP tool, since the
  primary browser tool's automation doesn't expose native file-chooser
  interaction) all the way through to display and deletion, and the
  budget-ordering validation message.
- **Known rough edge in the tooling, not the app:** the primary browser
  tool's `read_page` intermittently returned an empty tree immediately
  after `navigate` on a reused tab; opening a fresh tab before each
  navigation reliably fixed it. Noted here in case it recurs in a later
  phase — it's a testing-tool quirk, not a symptom of anything wrong in
  the app.
- **Test data added:** the "Redo the kitchen" project (with saved
  requirements) under the Phase 2 homeowner test account, plus a second
  homeowner account (`...+glowupp_homeowner_b@gmail.com`) created
  specifically to prove the isolation boundary. Both left in place for
  Phase 4+ to build on.

---

## 16. Phase 4 — what's actually in the repo now

- **Model:** `claude-sonnet-5`. Chosen for instruction-following quality on
  a structured-extraction task, per the Phase 0 reasoning for picking
  Claude at all — the per-turn cost is worth it for a feature the whole
  product's UX hinges on. Easy to swap to a cheaper model later
  (`src/lib/assistant.ts`, one constant) if per-conversation cost becomes
  a real concern at volume.
- **Guaranteed structured output, not parsed free text:** every call
  forces one specific tool (`tool_choice: { type: "tool", name:
  "respond_and_update_profile" }`), whose JSON schema is generated at
  request time from the same `src/lib/project-types.ts` registry Phase 1/3
  already used for the Zod validation — so the set of fields the AI can
  possibly mention is identical to the set of fields a human editing the
  form directly could touch. There's no separate, looser code path for
  AI-written data.
- **"Known vs. missing" is computed by code, not asked of the model.**
  `computeProfileStatus()` diffs the field registry against
  `ProjectRequirements.data` directly. This is passed into the system
  prompt so the assistant prioritizes real gaps, but the ledger itself
  never depends on the model accurately self-reporting what it has or
  hasn't asked about.
- **New table, new migration friction:** `AssistantMessage`
  (`prisma/migrations/20260919102457_add_assistant_messages`) stores the
  transcript for display/continuity — explicitly not the source of truth,
  which is `ProjectRequirements.data`/`Project` fields, updated through the
  exact same validated path either way. RLS on this table is narrower than
  other project data: homeowner + admin only, no professional read access,
  since a raw chat transcript is more unfiltered than the structured brief
  a professional is meant to see. Confirms the Phase 3 finding: once one
  migration in the history touches `auth.*`, `prisma migrate dev` is
  permanently unusable (the shadow database replays the *entire* migration
  history, not just the new one) — every migration from here on is
  created by hand and applied with `migrate deploy`.
- **Chat is request/response, not streamed.** A homeowner sends a message
  and waits for the full reply rather than seeing it token-by-token.
  Streaming is a real UX nicety but adds meaningful plumbing complexity
  (SSE/`ReadableStream` through a Server Action) that the brief doesn't
  require — deliberately deferred rather than built ahead of need.
- **Verified against the live model, not mocked:** see
  [docs/API.md](./API.md)'s closing section. One real conversation turn
  correctly split a single free-form message into a `Project`-level budget
  update and two `ProjectRequirements` field updates, left an unmentioned
  field alone, and asked a relevant follow-up — then the new
  `/projects/[id]/assistant` route was confirmed to enforce the exact same
  cross-homeowner 404 boundary as every other project route, using the
  same `requireProjectOwner()` function.
- **Not yet done:** no conversation reset/restart control, no way to
  correct a field the assistant got wrong other than telling it again in
  chat (which works, since contradictions prompt a confirmation, but isn't
  a dedicated "undo"), no rate limiting on assistant calls beyond what
  Phase 12's security pass will add generally.

---

## 17. Phase 5 — what's actually in the repo now

### The model comparison, run for real

Phase 0 deferred a real decision between Nano Banana Pro and Flux Kontext
Pro to this phase rather than guessing from spec sheets. Ran both against
the same real photo (a CC-BY-SA kitchen photo from Wikimedia Commons — not
a synthetic test image) with the same prompt: change materials/finishes,
add a central island, preserve the room's geometry and camera angle
exactly.

**Flux Kontext Pro**: near-pixel-perfect preservation of the room — same
camera angle, same counter layout, same sink/oven position — but **it did
not add the requested island**. Behaves like a faithful material/color
swap, conservative about structural changes.

**Nano Banana Pro**: added the island as asked, with a plausible layout,
while still keeping it recognizably the same kitchen (same ceiling shape,
wall angle, window). Took more liberty with the exact counter arrangement
to make room for it.

**Decision: Nano Banana Pro**, confirmed with you directly after seeing
both results (images were sent for your own inspection, not just described
in text). Reasoning: GlowUpp's core loop is a homeowner specifying
concrete structural wants — an island, particular appliances, layout
changes — via the Phase 3 form or the Phase 4 assistant, then seeing them
visualized. A model that quietly drops explicit requests undermines that
loop more than a model that takes reasonable liberty with unstated
details. Flux Kontext Pro's higher literal fidelity remains a real
advantage worth revisiting — e.g. as a second option in Phase 6's
multi-concept generation, since generating one "faithful" and one "bolder"
concept per batch could be a genuinely good product idea, not just a
fallback.

**A note on docs.kie.ai accuracy**: several of its pages contradict
themselves between prose and example payloads (e.g. the Flux Kontext page
recommends `flux-kontext-pro`/`flux-kontext-max` in prose but shows
`flux1-kontext` in its example). Nano Banana Pro's documented full input
shape (`aspect_ratio`, `resolution`, `output_format` alongside `prompt` +
`image_input`) failed with a bare "Internal Error" on a real call; the
minimal shape (`prompt` + `image_input` only) succeeded. `src/lib/image-providers/kie-ai.ts`
uses the verified-working shapes, not the documented ones, with a comment
explaining the discrepancy — a reminder that for a fast-moving
marketplace API, a live test beats trusting the docs.

### What's in the repo

- **Provider abstraction** (`src/lib/image-providers/types.ts`):
  `ImageGenerationProvider` with `generateDesign()`, `regenerateDesign()`,
  `editDesign()` — all hiding async job/poll mechanics inside the
  implementation, so a future provider (or a hypothetical synchronous one)
  doesn't change the interface. `getImageProvider()`
  (`src/lib/image-providers/index.ts`) is the single place that decides
  which provider is live.
- **kie.ai implementation** (`src/lib/image-providers/kie-ai.ts`): submits
  to `POST /api/v1/jobs/createTask`, polls `GET /api/v1/jobs/recordInfo`
  every 3s up to a 120s timeout. `editDesign()` differs from
  `generateDesign()`/`regenerateDesign()` only in which image URL it
  passes (a prior `DesignConcept`'s image vs. the original photo) — same
  underlying call.
- **New storage bucket**: `generated-designs`, private, created via the
  same idempotent `scripts/setup-storage.ts` used for `project-photos` in
  Phase 3. Generated images are downloaded from the provider's temporary
  URL (kie.ai's expire in ~24h) and re-uploaded here for permanent
  storage — the database never points at a provider-hosted URL directly.
- **Prompt building** (`src/lib/design-generation.ts`,
  `buildDesignPrompt`): turns the structured `ProjectRequirements.data`
  into a design-instruction prompt, walking the same
  `src/lib/project-types.ts` field registry Phases 1/3/4 all share — one
  more system that reads from that registry instead of encoding project-
  type-specific logic itself.
- **Cost control enforced**: `generateDesignConcept` checks
  `GENERATION_LIMITS.maxPerProject` (Phase 1's cap, §11 item 8) before
  generating.
- **Versioning**: the `DesignConcept` row is created with `status:
  PROCESSING` and its `version` number *before* the provider call runs,
  not after — so a failed generation still occupies its version number
  and shows up as a visible `FAILED` attempt, rather than silently
  vanishing or letting a retry reuse the same version.
- **Verified against the live provider and the live app**, not mocked —
  see [docs/API.md](./API.md)'s closing section for the full real
  generation run through the actual UI, with the resulting image inspected
  directly.
- **Not yet done, deliberately (Phase 6's job)**: no multi-concept batch
  generation, no named style variations, no "regenerate"/"edit" UI wired
  up yet (the interface methods exist and are implemented, just not
  exercised by a page), no comparison/selection UI.

---

## 18. Phase 6 — what's actually in the repo now

- **Configurable style registry** (`src/lib/design-styles.ts`): the
  brief's own example names ("Modern"/"Warm"/"Premium") are explicitly
  not what got hard-coded — `DESIGN_STYLES` is a data-driven list
  (currently Contemporary / Traditional / Bold, each with a prompt
  modifier), structured exactly like `project-types.ts`'s registry.
  Nothing in the generation pipeline references a style by name; adding a
  fourth style, renaming one, or rewording its prompt modifier is a
  one-entry change here.
- **New column**: `DesignConcept.styleKey` (nullable — Phase 5's rows
  predate it and have `null`), added specifically so "regenerate this
  style" can look up which modifier produced a given concept rather than
  parsing it back out of free text.
- **One shared attempt lifecycle for all three generation paths**
  (`runConceptAttempt` in `src/lib/actions/designs.ts`): batch generation,
  regeneration, and edits all go through the same "create the row at a
  pre-allocated version → attempt the provider call → update to
  COMPLETE/FAILED" logic, rather than three near-duplicate
  implementations. What differs between them is only which provider
  method gets called and which image is the source
  (`src/lib/design-generation.ts`'s `runDesignGeneration`, `mode`
  parameter).
- **Batch generation runs sequentially, not in parallel** — a deliberate,
  explained trade-off (see `docs/API.md`): parallel attempts computing the
  same "next version number" before either commits would violate the
  `(projectId, version)` unique constraint from Phase 1. Correct still
  matters more than a faster batch for something that runs a handful of
  times per project.
- **`editDesign()` finally exercised.** Phase 5 built and typed all three
  `ImageGenerationProvider` methods but only ever called
  `generateDesign()`. This phase's "request changes" flow was the first
  real use of `editDesign()` — verified not just by checking the database
  row, but by downloading both images and visually confirming only the
  requested element (the countertop) changed while everything else in the
  frame stayed the same.
- **`selectDesignConcept` gives `DESIGN_READY` its only code path.** The
  status existed in the `ProjectStatus` enum since Phase 1 but nothing
  set it until now — selecting a preferred concept is what the brief's
  state model actually means by "a design has been chosen." Deliberately
  a plain allowlist check (only advances from `DRAFT`/
  `COLLECTING_INFORMATION`/`DESIGNING`), not a full transition graph —
  the brief itself says "use a better state model if appropriate," and a
  handful of allowed transitions has been sufficient so far.
- **Verified live** — see `docs/API.md`'s closing section for the full
  batch-generate → select → request-changes run, including the direct
  visual comparison between v3 and its refinement v5.
- **Not yet done, deliberately (later phases' job)**: no UI limit-reached
  messaging beyond the plain error string, no way to delete/hide a
  concept a homeowner doesn't want cluttering the comparison view (every
  version stays visible forever, per the brief's "never overwrite" — this
  is intentional, not a gap, but worth noting as a UX question for later),
  no lineage/parent-concept tracking beyond what `description` records in
  free text.

---

## 19. Phase 7 — what's actually in the repo now

- **Design decision: prefix list, not range syntax.** The brief's own
  example writes a professional's service area as `"L1–L25"` — a numeric
  range. `Professional.serviceAreaPrefixes` instead stores a plain array
  of prefixes (`["L1", "L18"]`, or just `["L"]` for an entire postcode
  area). A prefix list covers the two cases that actually matter —
  "I serve this one district" and "I serve this whole area" — without
  needing to parse and validate numeric ranges, handle malformed ranges,
  or decide what `"L1-L25, M1"` mixed syntax should mean. If per-district
  cherry-picking across a large range turns out to matter in practice,
  the fix is additive (accept a range syntax and expand it into prefixes
  at write time) rather than a rework of the matching logic itself.
- **`src/lib/matching.ts` has no `"server-only"` import, deliberately** —
  unlike almost every other `src/lib/*.ts` file in this codebase. It's
  pure data in, data out, with no database or Next.js dependency, so it's
  trivially callable from a standalone script (used for the independent
  per-rule verification below) and would be the first candidate for a
  real unit test suite in Phase 13.
- **Verification status is a soft signal, not a hard gate** — a
  deliberate deviation from a strict reading of the brief's example
  (which shows `"Verified: yes"` as part of a matching professional).
  There's no admin verification workflow yet (that's Phase 12/admin
  tooling), so every professional starts and stays `UNVERIFIED` — gating
  matching on `VERIFIED` would make the matching service permanently
  non-functional. Only `REJECTED` professionals are excluded; verification
  status is still surfaced in every match result for transparency, and
  used to sort verified professionals first once that state exists. Worth
  revisiting once an admin verification flow ships.
- **Budget and timeframe are accepted, not yet enforced.** Both flow
  through `MatchProject` into `matchProfessionals()`, per the brief's
  "keep matching modular" instruction, but nothing filters on them yet —
  professionals don't currently declare a budget range or a calendar to
  compare against. Adding that rule later is a new function in
  `matching.ts` plus a schema field, not a restructuring.
- **Onboarding now collects service area.** The Phase 2 professional
  onboarding form gained one field: a comma-separated list of postcode
  prefixes, parsed and deduplicated server-side
  (`ProfessionalProfileSchema` in `src/lib/actions/auth.ts`). Re-running
  onboarding both creates and updates a profile (it was already an
  upsert), so the existing Phase 2 test professional could be updated
  in place through the real form rather than patched directly in the
  database.
- **Verified live, rule by rule, not just end-to-end.** See
  [docs/API.md](./API.md)'s closing section: three professionals set up
  to isolate `service_category` and `service_area` independently through
  the real UI and a real project, then `availability` and
  `verification_status` verified directly against `evaluateMatch()` by
  toggling each field on the matching professional's own record one at a
  time (and reverting), confirming each rule fails *only* the field it's
  supposed to check — not a coincidental pass/fail from some other rule.
- **Not yet done, deliberately (Phase 8's job)**: no "request a quote"
  action on the matching-professionals page — this phase stops at "show
  me who matches," per the brief's phase boundary; sending an actual
  quote request is Phase 8.

---

## 20. Phase 8 — what's actually in the repo now

- **"Accept opportunity" is implicit, not a separate state.** The brief
  lists "accept/decline the opportunity" and "submit a quote" as separate
  professional actions, but Phase 1's `QuoteRequestStatus` enum only has
  four states: `PENDING`, `VIEWED`, `DECLINED`, `QUOTED`. Rather than add
  a fifth `ACCEPTED` state, submitting a quote *is* treated as acceptance
  — there's no scenario where a professional would want to "accept" and
  then never quote, and a request that's still `PENDING`/`VIEWED` can
  always still be declined later. Keeps the state machine at four states
  instead of five, with no lost capability.
- **`selected` mirrors `DesignConcept.selectedByUser`, deliberately.**
  Same pattern as Phase 6: a `Boolean` column, exclusivity enforced by
  the action (`selectProfessional` clears every other request for the
  project in the same transaction it sets the chosen one), not a database
  constraint. Consistent with how the rest of this codebase treats
  "only one active X" — application-level invariants, not DB-level ones,
  matching the broader RLS-as-defense-in-depth posture described in §6.
- **No message thread — deliberately out of scope.** The brief mentions
  professionals being able to "ask clarification questions." This phase
  does not build a message thread for that: `QuoteRequest.message` (the
  homeowner's initial note) and `quoteNotes` (the professional's reply)
  are single fields, not a conversation. Phase 10 is explicitly
  "Messaging" as its own phase in the roadmap — building even a minimal
  thread here would duplicate that work.
- **No real notifications — deliberately out of scope.** Professionals
  find out about new opportunities by visiting
  `/professional/opportunities`, not by email. Phase 9 is explicitly
  "Notifications" (email first, via Resend) as its own phase — the
  opportunities inbox is the interim substitute, not a placeholder for
  a notification that silently never arrives.
- **`validateProjectReadyForQuotes` makes "Validate project" concrete.**
  The brief names this as a step without specifying what "ready" means.
  Defined as: a preferred design concept has been selected (status at or
  past `DESIGN_READY`, via the new shared `isAtOrPastStatus` helper —
  see below) and every field the project type marks `required` has a
  value (`isFieldValueSet`, also newly shared — see below). Enforced
  both in the UI (to explain why the request form is hidden) and again
  inside `requestQuotes` itself, so a direct POST can't skip it.
- **Server-side re-validation against Phase 7's matching, not trust in
  the form.** `requestQuotes` re-runs `evaluateMatch()` against every
  submitted professional ID before creating anything. The checkboxes on
  `RequestQuotesForm` only reflect what the client rendered — a tampered
  submission naming an ineligible or fabricated professional ID is
  silently dropped from the request, not honored.
- **Two small shared helpers extracted, refactoring their old call
  sites too**, rather than duplicating logic that already existed
  inline:
  - `isAtOrPastStatus` (`src/lib/project-status.ts`) — used to be a
    local `PRE_DESIGN_READY_STATUSES` array inside
    `src/lib/actions/designs.ts`. Now shared between Phase 6's design
    selection gating and Phase 8's quote-request gating, both of which
    care about the same underlying project-status ordering.
  - `isFieldValueSet` (`src/lib/project-types.ts`) — used to be
    duplicated inline inside `src/lib/assistant.ts`'s
    `computeProfileStatus`. Now shared with
    `validateProjectReadyForQuotes`'s required-field check, so "what
    counts as a field having a value" (an empty string or empty array
    doesn't count; `0`/`false` do) can't drift between the two call
    sites.
- **Verified live, both sides of the flow, not just end-to-end from one
  account.** See [docs/API.md](./API.md)'s closing section for the full
  walkthrough: a second matching professional was added so both the
  "declined" and "quoted" paths could run in the same test pass, each
  professional confirmed to see only their own request, the
  PENDING→VIEWED side effect confirmed on load, and the final homeowner
  selection confirmed against the database directly (`selected: true` on
  exactly one row, `Project.status` at `PROFESSIONAL_SELECTED`,
  `activity_log` in the correct order).
- **Two gaps found by that same `activity_log` check, fixed
  immediately**: `getProfessionalOpportunities`'s PENDING→VIEWED
  transition wasn't logging a `quote_viewed` activity, and
  `submitQuote`'s `quote_submitted` entry wasn't setting `actorId` —
  both inconsistent with every other activity-logging call site in the
  codebase. Also added a `quote_declined` log to `declineQuoteRequest`,
  which hadn't been logging anything at all. All three fixed and
  confirmed clean via `tsc --noEmit` and lint, but not re-verified live
  through the full browser flow a second time — worth a spot-check next
  time this code path is touched.
- **Not yet done, deliberately (later phases' job)**: no email
  notifications when a quote request arrives or a quote is submitted
  (Phase 9); no way for a professional to ask a clarifying question
  before quoting (Phase 10); no real payment or contract step after
  selection (Phase 11).

---

## 21. Phase 9 — what's actually in the repo now

- **`hello@glowupp.co.uk` verified live, DNS added directly, not just
  instructed.** Rather than walking you through adding Resend's DKIM/SPF
  records to Hostinger by hand, the exact records Resend generated
  (`resend._domainkey` TXT, `rsend` and `send` CNAMEs) were added
  directly to the live `glowupp.co.uk` zone via the Hostinger DNS
  connector, after first reading the existing zone to confirm none of
  the three new records collided with the live mail setup (existing MX,
  SPF `@` TXT, DKIM CNAMEs, DMARC — all untouched). Verified by sending a
  real email through to an actual inbox, not just checking Resend's
  dashboard status.
- **Provider abstraction, mirroring `image-providers/` exactly.**
  `src/lib/notification-providers/types.ts` defines a generic
  `NotificationProvider` interface (just `sendEmail`); `resend.ts`
  implements it against the official `resend` SDK; `index.ts`'s
  `getNotificationProvider()` is the single place that decides which
  provider is live. Same reasoning as Phase 5's `ImageGenerationProvider`
  — swapping Resend for another email service later is one new file, not
  a search-and-replace across every call site.
- **Design decision: Resend over reusing the existing n8n instance.**
  You already run n8n on the VPS and could have routed notification
  emails through an n8n workflow calling Hostinger's SMTP. Went with
  Resend instead — explained in plain terms in chat before building —
  because Hostinger's Business Email is a human-mailbox product with
  modest outbound sending caps; pushing automated app traffic through it
  risks tripping those limits and getting the *real* `hello@glowupp.co.uk`
  mailbox flagged, which is a worse failure mode than a missed
  notification. Resend's free tier (3,000 emails/month) covers this
  app's volume at MVP scale with room to spare, and gives delivery/bounce
  tracking that a bare SMTP send through n8n wouldn't.
- **Best-effort sending, deliberately swallowing failures.**
  `src/lib/notifications.ts`'s `sendBestEffort()` wraps every send in a
  try/catch that logs and never re-throws. A homeowner's "request
  quotes" click, or a professional's "submit quote," must still succeed
  even if Resend has an outage — the core mutation (the database write)
  is the thing that matters; the email is a courtesy on top of it, not a
  precondition for the action to be considered successful.
- **A fourth notification, not in the brief's explicit list, added
  anyway: losing bidders get told too.** The brief calls out "notify
  professional of new request" and (implicitly) "notify homeowner of a
  submitted quote," but says nothing about what happens to a professional
  who quoted and *wasn't* picked. Leaving them to find out only by the
  opportunity going quiet felt like an obvious product gap once the
  winner's "you were selected" email existed, so `selectProfessional`
  now emails every professional who quoted — `selected: true` for the
  winner, `false` for the rest, both through the same
  `notifyProfessionalSelected` function with one boolean branching the
  copy.
- **Verified live, the full Phase 8 flow re-run with notifications
  wired in.** A second fresh test project was created so the entire
  request → submit → select sequence could run again end-to-end, this
  time with real emails firing at each step. Delivery of the exact
  `sendEmail()` code path was confirmed independently (a direct call
  returned a real Resend message ID), and the database end state
  (`PROFESSIONAL_SELECTED`, exclusive `selected` flag, correct
  `activity_log` sequence) matched Phase 8's — which also incidentally
  re-confirmed that Phase 8's `quote_viewed`/`actorId` fixes hold up on
  an independent second run, not just the one they were fixed against.
- **Not yet done, deliberately (later phases' job)**: no in-app
  notification center or unread badge — email is the only channel for
  now, per the brief's "email first" phrasing; presumably in-app
  notifications either arrive later in this phase's scope or get folded
  into Phase 10 (Messaging)'s UI work. No notification preferences /
  unsubscribe management — every professional and homeowner gets every
  relevant email unconditionally, fine for MVP volume but worth
  revisiting if volume grows. No retry queue for a failed send — a
  failure is logged and dropped, not retried.

---

## 22. Phase 10 — what's actually in the repo now

- **Design decision: one thread per `QuoteRequest`, not one per
  `Project`.** A project can have several quote requests once quotes
  have gone out to more than one professional — each of those is a
  separate, private conversation, not a shared group chat everyone can
  see. Scoping `Message.quoteRequestId` to the request (rather than
  `Project.id` directly) reuses the exact same homeowner/professional
  pairing Phase 8 already modeled, and reuses its authorization
  primitives instead of inventing new ones.
- **New shared authorization helper, `requireQuoteRequestAccess`**
  (`src/lib/data/quotes.ts`) — Phase 8 already had
  `requireQuoteRequestForProfessional` (professional-only, for
  responding to an opportunity) and `requireProjectOwner` (homeowner-only,
  for everything project-scoped). Neither fits messaging, where *either*
  party needs read/write access to the same thread. The new helper
  checks both `quoteRequest.homeownerId` and
  `quoteRequest.professional.userId` against the current user, 404s for
  anyone else, and returns which side the viewer is on
  (`"HOMEOWNER" | "PROFESSIONAL"`) so the UI can label messages
  correctly without re-deriving that from scratch.
- **First genuinely shared UI component in the codebase.**
  `src/components/MessageThread.tsx` — every prior phase's UI has lived
  colocated inside its own route folder (`RequirementsForm`,
  `OpportunityCard`, `ConceptCard`, etc.) because nothing needed reusing
  across two different parts of the app before now. A message thread is
  the same list-plus-form UI on both the homeowner's and the
  professional's side of the same conversation, so duplicating it across
  two route folders would just be two copies drifting apart over time.
  This is the first entry in what's now a `src/components/` convention
  for anything genuinely cross-cutting; route-specific UI stays
  colocated as before.
- **Kept deliberately simple, per the brief's own framing.** Flat,
  chronological, plain-text messages. No read receipts, no attachments,
  no editing or deleting a sent message, no typing indicators, no
  real-time delivery (a reply only appears after a page load/action
  revalidation, same as every other Server Action in this codebase — no
  websockets have been introduced anywhere).
- **Thread closes on decline, stays open otherwise.** Once a professional
  declines an opportunity, `sendMessage` refuses new messages
  server-side (checked against `QuoteRequest.status`, not just hidden in
  the UI) — there's nothing left to discuss on a closed-out opportunity.
  Deliberately *not* gated by which professional ended up selected: a
  professional who quoted but wasn't chosen can still exchange messages
  if needed (e.g. the homeowner following up about future work), since
  the brief doesn't call for closing that door and doing so add
  complexity without a clear benefit.
- **Every message triggers a Phase 9 email**, reusing
  `notifyMessageReceived` — the same best-effort, never-throws pattern
  as every other notification. A failed email never blocks a message
  from actually sending; the database write is what matters.
- **Verified live, both directions and the authorization boundary.** A
  homeowner asked a real question on a `QUOTED` thread, the professional
  replied, both sides rendered correctly with the right message
  correctly labeled "You" per-viewer (confirmed by checking the exact
  same thread from both logged-in accounts). Confirmed the closed-thread
  rule against an actually-`DECLINED` request left over from Phase 8's
  test data. Confirmed the new authorization boundary isn't just correct
  in code but actually enforced: logged in as a different professional
  and tried loading another professional's own thread URL directly —
  404. See [docs/API.md](./API.md)'s closing section for the full
  walkthrough.
- **Not yet done, deliberately (later phases' job)**: no in-app "unread
  message" indicator (Phase 9 already deferred in-app notifications
  broadly; messaging doesn't change that). No message search or
  pagination — fine at MVP thread lengths, would need revisiting if
  threads grow long. No way to message before a `QuoteRequest` exists —
  a professional can't be messaged until a quote has actually been
  requested from them, which matches the brief's "project-scoped"
  framing (there's no relationship to attach a message to before that).

---

## 23. Phase 11 — what's actually in the repo now

- **Business model decision, made with you before building, not
  assumed.** "Transaction architecture" needs a business model to
  design around, and this genuinely wasn't mine to decide unilaterally —
  it determines how GlowUpp makes money, which is about as material a
  product decision as they come. Presented three options in chat
  (lead-fee, platform-mediated/escrow, or defer the decision) with
  tradeoffs; you picked **lead-fee**: GlowUpp never touches
  homeowner→professional money at all — the homeowner pays the
  professional entirely off-platform, and GlowUpp instead charges the
  professional a fee once they're selected for a job.
- **Why lead-fee over platform-mediated, beyond your preference.** It's
  also the option that keeps §9's existing MVP security posture true —
  "no payments, no storage of financial credentials, anywhere in the
  MVP" was already written into this document back in Phase 0, before
  Phase 11 existed. A platform-mediated/escrow model (Stripe Connect,
  GlowUpp holding funds and taking a cut) would mean GlowUpp handling
  real customer money, which pulls in UK e-money/FCA-adjacent compliance
  obligations — a materially bigger, riskier build than an MVP warrants.
  Lead-fee sidesteps that entirely: GlowUpp only ever invoices its own
  professionals for its own service, the same commercial relationship
  Checkatrade and Bark run on.
- **Fee trigger: on selection, not on lead delivery.** A stricter reading
  of "lead fee" would charge a professional the moment a quote request
  reaches them, win or not — but that's worse for professionals (pay
  even for opportunities that go nowhere) and doesn't have a natural
  amount to charge (no job value exists yet). Charging on *selection*
  instead means the fee is a success fee in substance even though it's
  framed as a lead fee: a professional only ever pays once they've
  actually won the work, and the fee scales with the real job value
  (5% of the winning `QuoteRequest.quoteAmount`, computed once in
  `src/lib/fees.ts::calculateLeadFee` and frozen onto the `Transaction`
  row — not recalculated later if the rate itself changes). The 5% rate
  is a placeholder in the same spirit as other MVP defaults elsewhere in
  this codebase (e.g. Phase 8's validation thresholds) — easy to tune,
  clearly isolated in one named constant, not a hardcoded magic number
  scattered through the codebase.
- **"Design only, no real payments" taken literally.** There is no
  payment processor anywhere in this phase's code — no Stripe, no card
  collection, no webhook. What *is* real: the `Transaction` table, the
  automatic creation of a row when a professional is selected, and
  professional-facing visibility into what they owe. What's
  intentionally not real: actually collecting that fee. A `Transaction`
  starts and stays `PENDING` forever under this phase's code — there is
  no "mark as paid" action, admin or otherwise, anywhere yet. That's a
  deliberate stopping point, not an oversight: building real payment
  collection, or even just a manual admin reconciliation flow, would be
  a genuinely new phase's worth of work (its own compliance
  considerations, its own UI, its own testing surface) that the brief's
  "design only" framing explicitly doesn't ask for yet.
- **Schema mirrors existing conventions rather than inventing new
  ones.** `Transaction.feeAmount` is pence, same as every other money
  field in this schema (`QuoteRequest.quoteAmount`,
  `Project.budgetMin/Max`). `quoteRequestId` is a unique 1:1 relation,
  not just an indexed foreign key, because exactly one `QuoteRequest`
  per project can ever be `selected: true` (Phase 8's existing
  invariant) — so at most one `Transaction` can ever exist per project
  by construction, not by an application-level check.
- **Not surfaced to homeowners, deliberately.** The fee is a private
  commercial arrangement between GlowUpp and the professional — the
  homeowner has no stake in it and the lead-fee model specifically
  exists so they never need to know it's there. No homeowner-facing
  route reads the `Transaction` table anywhere.
- **Verified live, with a real number chosen to make the arithmetic
  checkable by eye**, not just by code review: a £20,000 quote produced
  a £1,000 (5%) `Transaction`, correct on both the inline opportunity
  card and the dedicated `/professional/transactions` summary page.
  Confirmed two *older* selections (made before this feature existed,
  in Phases 8–10) correctly show no fee — nothing retroactive was
  invented for existing data. Confirmed the authorization boundary
  live: a second professional with no transactions of their own sees an
  empty state, not the first professional's fee. See
  [docs/API.md](./API.md)'s closing section for the full walkthrough.
- **Not yet done, deliberately (a future phase's job, well beyond this
  one's "design only" scope)**: no real payment collection (Stripe or
  otherwise), no invoicing/PDF receipts, no "mark as paid" action of any
  kind (admin or automatic), no dunning or non-payment handling, no
  refunds/disputes, no admin reconciliation dashboard. Phase 12
  (Security review) is the next phase in the roadmap and doesn't touch
  this; real payment collection isn't currently on the roadmap as a
  named phase at all — it would need to be scoped as new work if/when
  you're ready to build it.

---

## 24. Phase 12 — security audit findings

A systematic pass across every Server Action (`src/lib/actions/*.ts`)
and every data-access function (`src/lib/data/*.ts`), the RLS policies,
the auth trigger, storage handling, dependency tree, and response
headers — not a re-read of what earlier phases already claimed, an
independent check of it.

### Fixed

**1. Privilege escalation — self-assignable ADMIN role (high severity).**
The `handle_new_auth_user()` trigger (Phase 2) read
`raw_user_meta_data->>'role'` and cast it directly to the `UserRole`
enum, with only a fallback for empty/null — no whitelist. The Next.js
signup action's Zod schema (`src/lib/actions/auth.ts`) restricts role to
`HOMEOWNER`/`PROFESSIONAL`, but that validation only runs inside our own
Server Action — it does nothing to stop someone calling
`supabase.auth.signUp()` directly with the public anon key (a normal,
documented way to use that API, e.g. from browser devtools) and setting
`role: "ADMIN"` in the metadata. The trigger would then happily create a
real `public.users` row with `role = 'ADMIN'`, which
`src/lib/data/projects.ts`'s `getProject()` and this migration's own RLS
policies (`is_admin()`) both already trust to grant read access to
*every* homeowner's projects, photos, requirements, and design
concepts — through the app's own normal login flow, no further exploit
needed. **Fixed** in migration `20260919183610_restrict_signup_role`:
the trigger now only ever accepts `HOMEOWNER` or `PROFESSIONAL` from
signup metadata; anything else (including `ADMIN`) silently falls back
to `HOMEOWNER`. There is deliberately no way to self-register as admin —
that role can only be granted directly in the database, by someone with
access to it. **Verified live, not just by re-reading the SQL**: wrote a
throwaway script that called `supabase.auth.signUp()` with the public
anon key and `role: "ADMIN"` in metadata — the exact attack — both
before and after the fix. Before: created a real `ADMIN` row. After: the
same call correctly resulted in `HOMEOWNER`. Test account deleted
afterward.

**2. HTML injection in notification emails (medium severity).**
`src/lib/notifications.ts`'s four email functions interpolated
user-controlled strings — names, project titles, message bodies,
homeowner notes — directly into the `html:` email body sent via Resend,
unescaped. A malicious homeowner or professional could put HTML (a fake
link, forged content, a tracking pixel) into their own name or a message
body and have it render as live HTML in another real user's inbox.
**Fixed**: added `escapeHtml()` and applied it to every user-controlled
value across all four templates (`notifyQuoteRequested`,
`notifyQuoteSubmitted`, `notifyProfessionalSelected`,
`notifyMessageReceived`). The plain-text bodies were never at risk
(plain text can't execute as HTML) and were left as-is; only the
`html:` templates needed the fix. `link`/`viewLink` values weren't
touched — those are built from `APP_URL` plus our own fixed paths and
UUIDs, never from user input.

**3. No baseline security response headers.** Added
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, and a conservative
`Permissions-Policy` via `next.config.ts`'s `headers()`. Confirmed live
via `curl -D -` that they're actually present on responses, and that
ordinary pages still load correctly with them in place. A
Content-Security-Policy was deliberately **not** added here — a real CSP
needs to be built against every external origin this app actually loads
from (Supabase, kie.ai-hosted images, etc.) and tested carefully against
every page, not bolted on during a review pass on a guess.

### Reviewed, confirmed clean

- No raw SQL anywhere (`$queryRaw`/`$executeRaw`) — every query goes
  through Prisma's parameterized query builder.
- No `dangerouslySetInnerHTML` anywhere in the UI — React's default
  auto-escaping covers every place user content renders in the browser
  (message bodies, names, project titles, etc.).
- No open redirects — every `redirect()` call target is a fixed string
  or a server-generated ID, never a raw value taken from user input
  (query params, form fields).
- Every single function in `src/lib/actions/*.ts` and
  `src/lib/data/*.ts` calls one of `requireUser`/`requireRole`/
  `requireProjectOwner`/`requireQuoteRequestForProfessional`/
  `requireQuoteRequestAccess` before touching data — checked by grep,
  not by memory of what earlier phases claimed.
- IDOR spot-checked across every "sub-resource" ID (a design concept ID,
  a photo ID, a quote request ID) — every action that takes one also
  cross-checks it actually belongs to the project/request already
  authorized in the same call, not just that *some* project the caller
  owns exists.
- Secrets: `.env*` is gitignored and confirmed never committed
  (`git log --all -- .env` is empty). Every third-party API key
  (Anthropic, kie.ai, Resend, Supabase service role) is read only in
  files marked `"server-only"`, never reachable from a client bundle.
- File uploads: MIME type and size validated server-side before upload
  (Phase 3), storage buckets are private, and photo URLs are short-lived
  signed URLs (5 minutes) generated fresh per render — never a permanent
  public link.
- `pnpm audit` found 3 vulnerabilities, all transitive dependencies of
  the `prisma` CLI's own tooling for database drivers this project
  doesn't use (`mysql2`, pulled in by Prisma's multi-database config
  support) — not reachable at runtime by this app, since it only ever
  connects to Postgres. No action taken; worth a periodic re-check as
  Prisma itself updates.

### Follow-up fixes (same phase, after your review of the findings)

Both items below were originally written up as "flagged, not fixed" —
deliberately left for you to weigh in on rather than changed
unilaterally, since one is an infrastructure/cost tradeoff and the other
changes existing product behavior. You asked for both to be addressed;
here's what shipped.

**4. No application-level rate limiting (addressed).** Originally
dismissed here as something that would need "real infrastructure," which
on reflection was overly cautious: GlowUpp runs on a single VPS process
(§2a), not multiple scaled instances, so a lightweight in-memory limiter
provides *real* protection for this app's actual deployment, not just
the appearance of it — the caveat about it being inadequate only applies
to a multi-instance deployment this app doesn't have. Added
`src/lib/rate-limit.ts`: a module-level, in-memory fixed-window counter
(same "cache on the module/globalThis" pattern as the Prisma client
singleton surviving dev hot-reload), with a periodic sweep so long-lived
processes don't accumulate stale entries forever. Wired into the five
actions where abuse actually matters:

| Action | Key | Limit |
|---|---|---|
| `login` | target email (not caller IP — stops brute-forcing one account regardless of how many IPs it's tried from) | 10 / 15 min |
| `signup` | caller IP | 5 / hour |
| `sendMessage` | sender user ID | 20 / 10 min |
| `createProject` | homeowner user ID | 10 / hour |
| `requestQuotes` | homeowner user ID | 20 / hour |

Resets on server restart/deploy — an acceptable trade at this scale; the
upgrade path if this app ever moves to multiple instances is swapping
the in-memory `Map` for a Redis-backed store behind the same
`checkRateLimit()` call sites, not a rewrite.

**Verified live, not just by reading the code** — and this took real
debugging to get right. The first attempt to prove the login limiter
live gave a false negative: 11 real login POSTs (confirmed via the dev
server's own request log, not guessed) still didn't trigger a block.
Added temporary debug logging to the limiter and discovered the actual
cause — the first test attempt happened, a 3+ hour gap followed (an
interrupted session), and by the time testing resumed the 15-minute
window had long since expired and silently restarted the count from
that second attempt. Once that was understood, the counting logic
itself was confirmed correct by direct inspection of the debug output
(bucket count incrementing correctly call over call). For a fast,
unambiguous live confirmation, the login limit was temporarily lowered
to 3 attempts in code, the server restarted, and 4 real login attempts
made: the 4th correctly returned "Too many login attempts for this
account — please try again in a few minutes." while the first 3
returned the normal "Invalid login credentials." The threshold and
debug logging were then reverted to their real values (10 / 15 min, no
debug output) and a genuine login was confirmed to still succeed
normally afterward.

**5. `updateProjectStatus` manual override (addressed).** Per your
choice, the statuses now reachable automatically —`DESIGN_READY`
(Phase 6's `selectDesignConcept`), `REQUESTING_QUOTES` and
`PROFESSIONAL_SELECTED` (Phase 8's `requestQuotes`/`selectProfessional`)
— are no longer offered as manual choices. `QUOTES_RECEIVED` (never
actually auto-set by anything, but an outcome of professionals
responding, not a deliberate homeowner choice) and `DRAFT`
(create-time-only starting point) were dropped too, leaving exactly
`COLLECTING_INFORMATION`, `DESIGNING`, `COMPLETED`, and `CANCELLED` as
manually settable — statuses that make sense as a deliberate choice
regardless of where a project's automated progress currently stands.
Enforced server-side in `updateProjectStatus`
(`MANUALLY_SETTABLE_STATUSES`, `src/lib/actions/projects.ts`) — leaving
the status unchanged is always allowed as a harmless no-op (so the
form's own default selection can always be resubmitted), and any real
change is only accepted into the four manual statuses. The client
(`StatusForm.tsx`) mirrors the same list so the dropdown doesn't offer
choices the server will reject, and — since a project can currently sit
at an automated-only status like `PROFESSIONAL_SELECTED` — shows that
current value as a disabled "(reached automatically)" option so the
dropdown doesn't look broken or blank for those projects. **Verified
live**: loaded a project already at `PROFESSIONAL_SELECTED`, confirmed
the dropdown correctly showed it disabled alongside the four real
choices, selected `CANCELLED`, submitted, and confirmed directly in the
database that the status actually changed to `CANCELLED`.

---

## 25. Phase 13 — what's actually in the repo now

- **Scope decision, made with you before building.** "Testing" could
  mean anything from a handful of unit tests to a full integration
  suite against a dedicated test database — a real effort/thoroughness
  tradeoff, not something to assume unilaterally. Presented two options
  in chat: unit tests for pure logic only, or that plus integration
  tests for Server Actions and auth boundaries against a real test
  database. You picked the former — every phase's live Playwright
  verification (recorded throughout docs/API.md) already exercises the
  Server-Action/auth/external-API surface thoroughly and repeatedly;
  automating that class of test would mean either a heavily mocked fake
  environment (tests that pass without proving much) or standing up
  genuine test-database infrastructure — a bigger, separate undertaking
  from "add a test suite for what's already built."
- **Vitest, not Jest.** Fast, native ESM/TypeScript support with no
  transpilation config to hand-tune, and a `vitest.config.mts` that
  mirrors the project's existing path alias (`@/*` → `src/*`) so tests
  import modules exactly the way application code does.
- **The `server-only` package needed a test-specific workaround.** Every
  server-only-marked file in this codebase has worked correctly through
  `next dev`/`next build` all along without the `server-only` package
  being an installed dependency — Next.js resolves that bare specifier
  internally. Outside Next's bundler (plain Node, or Vitest), there's no
  such magic: attempting to import a server-only file in a test threw
  `"This module cannot be imported from a Client Component module"` —
  the real package's actual, unconditional behavior; Next's build is
  what swaps it for a no-op via a `"react-server"` export condition
  Vitest doesn't implement. Fixed by installing the real `server-only`
  package (Next's own recommended one — a correctness improvement
  either way, not just a test workaround) and aliasing it in
  `vitest.config.mts` to an empty stub (`src/test/stubs/server-only.ts`)
  for the test environment only. Confirmed this change doesn't affect
  the real app: restarted the dev server after installing the package
  and confirmed ordinary pages still load normally.
- **`rate-limit.ts`'s test suite is a direct regression test for a real
  debugging session**, not a hypothetical. Phase 12's live verification
  of the login rate limiter initially appeared broken — 11 real login
  attempts didn't trigger a block — purely because a multi-hour gap
  partway through testing let the 15-minute window quietly expire and
  restart the count from a later attempt, not because the logic was
  wrong. `checkRateLimit`'s tests use Vitest's fake timers to pin down
  exactly that boundary behavior (blocking starts on the Nth+1 call, not
  the Nth; a window one millisecond from expiry still blocks; a fully
  expired window resets cleanly) — this exact class of bug would now
  surface in milliseconds under `pnpm test`, not cost another round of
  confused manual browser testing.
- **What's covered vs. not, by design, not oversight.** Covered: every
  function with no database, no Supabase session, and no external API
  call — quote matching, postcode prefix logic, money/fee math, project
  status ordering, requirements validation, rate-limit counting. Not
  covered by this phase's automated suite: Server Actions, authorization
  boundaries (IDOR checks, cross-user isolation), the Claude
  assistant conversation, image generation, email sending, and the
  privilege-escalation fix from Phase 12 — all of these continue to be
  verified live, phase by phase, through the real app rather than
  through mocks. `src/lib/design-generation.ts`'s `buildDesignPrompt` is
  pure logic in principle but wasn't tested either — the file it lives
  in also imports `storage.ts` (which constructs a real Supabase client
  at module load time), so testing it would mean either loading real
  environment variables into the test run or mocking those
  side-effecting neighbors, for one string-building function Phases 5
  and 6 already verified thoroughly against real generations. Splitting
  it into its own side-effect-free file would make it cleanly testable
  — a reasonable follow-up, but a refactor of already-shipped code that
  wasn't asked for here.
- **Not yet done, deliberately (out of this phase's chosen scope)**: no
  integration tests, no CI pipeline running `pnpm test` automatically on
  push (there's no CI configured at all yet — this repo has never been
  pushed to a remote in a way that would trigger one), no test coverage
  reporting/thresholds, no end-to-end browser test suite (Playwright has
  been used throughout this project for live manual verification, not
  as an automated, checked-in test suite).

---

## 26. Phase 14 — what's actually in the repo now

The final phase of the roadmap, and a different kind of phase from every
other one: no new code, no new schema, no new live testing — a
consolidation pass over [docs/API.md](./API.md) itself, checking that 13
phases' worth of incrementally-appended documentation still describes
the app that actually exists today.

- **Method: cross-referenced against the code, not against memory.**
  `grep`'d every exported function in `src/lib/actions/*.ts` and
  `src/lib/data/*.ts`, then checked each one had a corresponding heading
  in `docs/API.md`. This is what caught the four real gaps below —
  none of them would have surfaced from re-reading the doc in isolation,
  since a doc that's internally consistent can still be silently missing
  something or describing something that changed.
- **Real gap: Phase 2's auth actions were never documented.** `signup`,
  `login`, `logout`, and `createProfessionalProfile`
  (`src/lib/actions/auth.ts`) predate this doc's per-phase documentation
  habit, which only started at Phase 3 — the doc's own original title
  said as much ("this version covers Phase 3 only"), but that caveat
  never got revisited as the doc kept growing under a title that
  implied otherwise. Added a full "Authentication & onboarding — Phase
  2" section, including the Phase 12 security note on `signup` (the
  ADMIN-role trigger fix) and the Phase 12 rate limits on both `signup`
  and `login` — filled in with the same rigor as if it had been written
  contemporaneously, not just a stub.
- **Real drift: `updateProjectStatus`'s entry described pre-Phase-12
  behavior.** It still read "No transition graph is enforced yet — any
  valid enum value is accepted from any other" — true when written in
  Phase 3, false since Phase 12's follow-up fix restricted it to four
  manually-appropriate statuses. Rewrote the entry to describe the
  actual current restriction, rather than leaving the accurate-when-written,
  wrong-now version in place next to a separate architecture note (§24)
  that already explained the change — a reader following only
  `docs/API.md` had no way to know the original entry was stale without
  already knowing to cross-check `docs/BACKEND_ARCHITECTURE.md`.
- **Real drift: five rate limits added in Phase 12 were invisible in
  their own entries.** `login`, `signup`, `sendMessage`, `createProject`,
  and `requestQuotes` all gained a `checkRateLimit()` call, but none of
  their `docs/API.md` entries said so — a caller hitting an unexpected
  "too many attempts" error would have found no mention of rate limiting
  anywhere on the relevant entry, only (if they thought to look) in
  §24's security writeup. Added a `**Rate limited:**` line to each.
- **Real drift: the authorization-model intro still described
  pre-Phase-8 reality.** It said "no professional currently qualifies"
  for `getProject`'s broader read — true when Phase 3 wrote it (quote
  requests didn't exist yet), false since Phase 8. Also added the two
  authorization helpers Phases 8 and 10 introduced
  (`requireQuoteRequestForProfessional`, `requireQuoteRequestAccess`) to
  the guard-level list, which only had the three Phase 1–3 ones.
  Left there because they were never wrong at the time — this kind of
  drift is the natural cost of writing documentation phase-by-phase
  rather than as a single pass at the end, which is exactly what this
  phase exists to catch.
- **Retired function, now clearly marked.** `generateDesignConcept`
  (Phase 5) was replaced by `generateDesignBatch` in Phase 6, and the
  newer entry already said so — but the older entry itself gave no
  indication anything had changed, and a reader landing on it directly
  (which the new table of contents now makes easy to do) could
  reasonably assume it was still callable. Added an explicit "⚠️
  Retired" callout rather than deleting the entry outright — the
  reasoning in it (the provider abstraction, the row-created-before-attempt
  pattern) still applies directly to every generation action that
  exists today, so it stays as a clearly-labeled historical record
  instead of disappearing.
- **Added a table of contents**, since the file had grown to roughly 900
  lines across 14 phases with no way to jump directly to a section.
  Verified the trickier anchor links (the ones generated from headings
  containing an em dash, e.g. `` `generateDesignConcept(...)` — Phase 5
  (retired in Phase 6) ``) actually resolve, by manually tracing
  GitHub's real slug algorithm character-by-character rather than
  guessing at the output — an em dash surrounded by spaces, once the
  punctuation is stripped and the two flanking spaces are each turned
  into a hyphen, produces a double hyphen in the anchor, which is what
  every affected link in the table of contents uses.
- **What this phase deliberately didn't do**: no restructuring of the
  doc's overall organization (still roughly chronological by phase, not
  regrouped by resource) — the existing structure has never drawn a
  complaint across 13 phases of active use, and a full reorganization
  risks introducing new errors for a cosmetic gain. No changes to
  `docs/BACKEND_ARCHITECTURE.md`'s own structure beyond this closing
  section and the roadmap line — that document's organization (numbered
  sections appended per phase) was never in question, only
  `docs/API.md`'s accuracy and completeness were.

This is the last phase in the brief's roadmap. Every phase from 0
through 14 is now ✅ complete.

---

## 27. Post-roadmap — Admin tooling

The brief's 14 phases are done; this is the first piece of agreed
follow-on work, sequenced first among several (deployment, real
payments, legal pages, monitoring) because it's the only one with no
external dependency and no business decision to make first — pure
application code against the existing schema, same as every phase
before it.

- **Closes two gaps every earlier phase's docs explicitly flagged as
  missing.** Phase 7's write-up noted there was no admin verification
  workflow, so every professional stayed `UNVERIFIED` forever and the
  "verified professionals sort first" tiebreaker had nothing to ever
  sort on. Phase 11's write-up noted a `Transaction` had no way to be
  marked paid — it would sit `PENDING` forever under that phase's code,
  by design, since real payment collection was explicitly out of scope.
  Both are now real: `/admin/professionals` (verify/reject/reset) and
  `/admin/transactions` (mark paid/waived/cancelled/pending).
- **The one legitimate unscoped list in the codebase.** Every other list
  function in this app is scoped to the caller — a homeowner's own
  projects, a professional's own transactions. `getAllProfessionals()`
  and `getAllTransactions()` (`src/lib/data/admin.ts`) are deliberately
  global, gated by `requireRole(ADMIN)` instead of an ownership check,
  since "see everything" is exactly what the role is for.
- **Getting a real admin account required going through the Phase 12
  fix, not around it — which is exactly what that fix was for.**
  `ADMIN` can no longer be self-assigned via signup metadata (Phase 12's
  privilege-escalation fix), so creating a test admin meant signing up
  normally as a homeowner and then updating `role` directly in the
  database — the "trusted, out-of-band process" that fix's own migration
  comment says is the only legitimate way to grant it. Exercising this
  path for real, rather than special-casing around the security fix to
  make testing easier, is itself a small confirmation the fix still
  holds.
- **Manual reconciliation, not a payment integration.** Marking a
  `Transaction` `PAID` here doesn't move any money — it's how a fee
  actually collected outside the system (bank transfer, an invoice)
  gets reflected once someone checks. Real payment collection is a
  separate, not-yet-started piece of follow-on work (see the roadmap
  discussion that preceded this phase).
- **Verified live**: created a real admin account the sanctioned way
  (signup, then a direct database role grant), verified a real Phase 7
  test professional (`UNVERIFIED → VERIFIED`, confirmed in the UI and
  the database), marked Phase 11's real £1,000 test transaction `PAID`
  (confirmed `paidAt` was stamped, not just the status), confirmed both
  actions' `activity_log` entries carry the correct `actorId` and
  before/after values, and confirmed a non-admin account is redirected
  away from all three admin routes rather than rendering them. See
  [docs/API.md](./API.md)'s closing section for the full walkthrough.
- **Not yet done, deliberately**: no way to edit a homeowner's or
  professional's account details, no way to view/moderate projects or
  messages, no audit log UI (the `activity_log` rows exist and are
  queried directly for verification in this session, but there's no
  admin page that lists them). Scoped tightly to the two gaps that were
  actually blocking something (verification, fee reconciliation), not a
  general admin panel.

---

## 28. Post-roadmap — "No pushy marketplace"

A product-feel conversation, not a phase — you described the app you
wanted: visualize first, marketplace second, no bidding-war energy, and
a real concern about a client and professional meeting through GlowUpp
and then just taking the relationship (and the lead fee) elsewhere. Five
concrete pieces came out of that conversation, agreed one at a time
before any code was written — this section is the reasoning behind each,
not just what shipped.

- **On stopping fee circumvention, generally.** This isn't a solved
  problem for any marketplace, and it isn't fully solvable here either —
  discussed openly rather than promising more than the code delivers.
  The three real levers: keep the fee low enough that dodging it isn't
  worth the risk (5%, Phase 11, already well below what most trade
  marketplaces charge); make the in-app experience valuable enough that
  leaving it loses something (the messaging, quote comparison, and
  visualizations already do this somewhat, just by existing); and soft,
  non-blocking structural nudges rather than hard enforcement, since
  hard blocks are both easy to dodge (spelled-out digits, "at" instead
  of "@") and punish honest users. All five pieces below are instances
  of the third lever — nothing here claims to make circumvention
  impossible.
- **The contact-info nudge is deliberately loose and non-blocking.**
  `src/lib/contact-info.ts`'s detector is a simple regex, not an
  attempt at a airtight filter — false negatives (a real phone number it
  misses) are expected and fine; false positives (flagging an invoice
  number) are harmless, since the result is just a quiet tip, never a
  blocked message. The message always sends regardless of what the
  detector finds.
- **The marketplace-gating threshold reuses an existing concept
  instead of inventing a new one.** "Ready for the marketplace" is
  exactly `isAtOrPastStatus(status, DESIGN_READY)` — the same check
  `validateProjectReadyForQuotes` (Phase 8) already uses to decide
  whether requesting quotes is even allowed. The UI now simply declines
  to *advertise* the marketplace before that point, rather than
  advertising it and then blocking the actual request — a homeowner
  browsing before picking a design never sees marketplace language at
  all, not even a disabled button.
- **Postcode privacy piggybacks on matching's existing prefix logic,
  not a new geocoding concept.** `getOutwardCode()` (Phase 7,
  `src/lib/postcode.ts`) already existed for matching a project's
  district against a professional's declared service area — reusing it
  here to mask the homeowner's postcode down to the same district-level
  granularity a professional already implicitly knows from the match
  itself (a professional serving "L18" already knows a matched project
  is somewhere in L18; showing the outward code reveals nothing new, the
  full postcode is what's actually withheld). Masking happens
  server-side, in the data layer (`getProfessionalOpportunities()`), not
  the UI — `OpportunityCard.tsx` has no privacy logic of its own, it
  just renders whatever postcode value it's handed, which is exactly the
  point: there's no client-side path that could leak the real value.
- **The reminder email's rules were negotiated in chat, not assumed.**
  Every parameter — 2+ quotes (not 1), a wait after the *most recent*
  response (not the first), sent once ever, only for projects that
  already opted into the marketplace by requesting quotes at all — came
  from an explicit back-and-forth, not a default guess. The distinction
  that made this one acceptable where a general "come back and use
  GlowUpp" nudge wasn't: this only ever reaches someone who already has
  something real waiting for a decision, not someone being activated
  into a funnel they haven't engaged with.
- **The reminder's scheduling gap is a real, not a hedged, limitation.**
  `sendPendingQuoteReminders()` and its `/api/cron/quote-reminders`
  endpoint are fully real and tested — the only missing piece is
  something to call that endpoint periodically, which needs a server
  that's always running. This app has never run anywhere but a
  developer's laptop so far; there's nothing to schedule against yet.
  The endpoint is protected by `CRON_SECRET` (a shared-secret header or
  query param) specifically so it's already safe to point a real
  scheduler at the moment one exists — no further code changes needed
  once deployment happens, just pointing a cron job (Hostinger's own, or
  an external pinger) at the URL.
- **Verified live, both directions of every piece that has two
  sides.** The contact-info nudge: confirmed it fires on a real
  phone-number-shaped message and stays silent on an ordinary one, on
  the same live thread. The marketplace gate: confirmed a brand-new
  `DRAFT` project shows zero marketplace mentions, and a project already
  past `DESIGN_READY` shows the full reward section. Postcode privacy:
  confirmed from *both* sides of the same underlying data — a
  professional with only non-selected requests saw the district only,
  the professional actually selected on other projects saw the full
  postcode. The reminder: created a real project with two backdated
  quotes, hit the endpoint unauthenticated (401), with a wrong secret
  (401), then correctly — one reminder sent, correctly stamped, correctly
  logged — and confirmed calling it again sends zero, not a duplicate.
  See [docs/API.md](./API.md)'s closing section for the full walkthrough.
- **Not yet done, deliberately**: no scheduler actually calling the
  cron endpoint (deployment-dependent, as above). No detection beyond
  the one regex-based nudge — no image/attachment scanning (there are no
  attachments in this app), no escalating warnings for repeated
  attempts. No broader "activation" email strategy — this remains the
  only automated reminder in the app, on purpose.
