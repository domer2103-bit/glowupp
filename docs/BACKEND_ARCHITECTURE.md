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
- Supabase's **Row Level Security (RLS)** gives us a second, database-level
  enforcement layer for "users can only see their own rows" — this is a
  belt-and-braces addition on top of server-side authorization checks in
  the app code, not a replacement for them (see §7).

---

## 5. Authentication

**Supabase Auth**, with a `profiles` table (`id`, `role`, `name`, `phone`,
`postcode`, timestamps) keyed to `auth.users.id`.

- Roles: `homeowner`, `professional`, `admin` — a single enum column, not
  separate tables, since a user's permissions differ by role but their
  identity fields are shared.
- Session handling via Supabase's Next.js server-side helpers (cookie-based
  sessions, refreshed server-side) — no custom JWT handling needed.
- Authorization (who can access *which project/quote*) is enforced in two
  layers: application code (every server action checks `auth.uid()` against
  ownership) **and** Postgres RLS policies as defense-in-depth. Frontend
  route guards are UX only, never treated as security.

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

## 9. Security (preview — full pass happens in Phase 12)

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

1. **Phase 0 — this document.** ✅ (pending your sign-off)
2. **Phase 1 — Database foundation.** Prisma schema for users, projects,
   photos, requirements, design concepts, quote requests, professionals,
   activity log. Supabase project provisioned.
3. **Phase 2 — Auth & authorization.** Supabase Auth wired up, role-based
   access, RLS policies.
4. **Phase 3 — Project API.** Create/update/list projects, photo
   upload/delete, requirements update.
5. **Phase 4 — GlowUpp AI Assistant.** Claude-backed conversation +
   structured project profile.
6. **Phase 5 — Image generation service.** Provider abstraction + first
   provider integration.
7. **Phase 6 — Design generation workflow.** Multi-concept generation,
   comparison, regeneration, versioning.
8. **Phase 7 — Professional matching.** Rule-based matching service.
9. **Phase 8 — Quote request system.**
10. **Phase 9 — Notifications** (email first, via Resend).
11. **Phase 10 — Messaging** (simple, project-scoped).
12. **Phase 11 — Transaction architecture** (design only, no real payments).
13. **Phase 12 — Security review.**
14. **Phase 13 — Testing.**
15. **Phase 14 — API documentation.**

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
8. **AI cost control:** yes, cap image generations per project for the
   MVP. Exact number still TBD — I'll propose a concrete default (e.g. N
   concepts + M regenerations before requiring a manual override) when the
   `design_concepts` schema is designed in Phase 1, and you can adjust it
   then.
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
