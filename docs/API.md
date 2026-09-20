# GlowUpp Backend API Reference

This is a Next.js App Router app, so there's no separate REST/JSON API
layer — the frontend and backend share a codebase and talk to each other
via **Server Actions** (functions marked `"use server"`, callable directly
from forms and Server Components, with Next.js handling the network layer
transparently) plus a number of plain server-only data-fetching functions
for reads. This doc describes those functions as the API surface: what
they do, what they validate, and who's allowed to call them.

This is the consolidated, current-state reference covering all 14 phases
of the brief (Phase 0's architecture doc through Phase 13's test suite —
Phase 14 is this consolidation pass itself). Entries are grouped roughly
in the order their underlying feature was built, since that's also a
reasonable "what depends on what" reading order (auth before projects,
projects before designs, designs before quotes, and so on) — the phase
label on each heading is provenance (when it was built and why), not a
claim that the entry only describes that phase's original behavior. Where
a later phase changed something an earlier entry documented, this pass
updated the original entry in place rather than leaving it stale and
relying on a reader to piece together the current behavior from multiple
places.

## Contents

- [Authentication & authorization model](#authentication--authorization-model)
- [Authentication & onboarding — Phase 2](#authentication--onboarding--phase-2)
- Projects — Phase 3: [`createProject`](#createprojectprevstate-formdata) · [`updateProject`](#updateprojectprojectid-prevstate-formdata) · [`updateProjectStatus`](#updateprojectstatusprojectid-prevstate-formdata) · [`updateProjectRequirements`](#updateprojectrequirementsprojectid-prevstate-formdata) · [`uploadProjectPhoto`](#uploadprojectphotoprojectid-prevstate-formdata) · [`deleteProjectPhoto`](#deleteprojectphotophotoid) · [`getProject`](#getprojectprojectid) · [`listHomeownerProjects`](#listhomeownerprojects)
- [`sendAssistantMessage` — Phase 4](#sendassistantmessageprojectid-prevstate-formdata--phase-4)
- Design generation — Phases 5–6: [`generateDesignConcept` (retired)](#generatedesignconceptprojectid-photoid-prevstate-formdata--phase-5-retired-in-phase-6) · [`generateDesignBatch`](#generatedesignbatchprojectid-photoid-prevstate-formdata--phase-6) · [`regenerateDesignConcept`](#regeneratedesignconceptprojectid-conceptid-prevstate-formdata) · [`requestDesignChanges`](#requestdesignchangesprojectid-conceptid-prevstate-formdata) · [`selectDesignConcept`](#selectdesignconceptprojectid-conceptid)
- [`getMatchingProfessionals` — Phase 7](#getmatchingprofessionalsprojectid--phase-7)
- Quotes — Phase 8: [`validateProjectReadyForQuotes`](#validateprojectreadyforquotesproject--phase-8) · [`requestQuotes`](#requestquotesprojectid-prevstate-formdata--phase-8) · [`declineQuoteRequest`](#declinequoterequestquoterequestid--phase-8) · [`submitQuote`](#submitquotequoterequestid-prevstate-formdata--phase-8) · [`selectProfessional`](#selectprofessionalprojectid-quoterequestid--phase-8) · [`getProjectQuoteRequests`](#getprojectquoterequestsprojectid--phase-8) · [`getProfessionalOpportunities`](#getprofessionalopportunities--phase-8)
- [Notifications — Phase 9](#notifications--phase-9)
- Messaging — Phase 10: [`sendMessage`](#sendmessagequoterequestid-prevstate-formdata--phase-10) · [`getMessages`](#getmessagesquoterequestid--phase-10)
- [Transactions — Phase 11](#transactions--phase-11-design-only-no-real-payments) · [`getProfessionalTransactions`](#getprofessionaltransactions--phase-11)
- [Testing — Phase 13](#testing--phase-13)
- [Verified behavior](#verified-behavior-not-just-implemented)

---

## Authentication & authorization model

Every function below starts by resolving the caller's identity from the
Supabase session cookie (`src/lib/auth.ts`), never from anything in the
request body. The guard levels used throughout:

- `requireUser()` — any signed-in user; redirects to `/login` otherwise.
- `requireRole(role)` — signed-in **and** the right role; redirects to
  `/dashboard` otherwise.
- `requireProjectOwner(projectId)` (`src/lib/data/projects.ts`) — signed-in
  **and** the caller is the project's homeowner; otherwise a 404 (`notFound()`,
  not a 403 — an unauthorized caller can't distinguish "not yours" from
  "doesn't exist").
- `requireQuoteRequestForProfessional(quoteRequestId)` (`src/lib/data/quotes.ts`,
  Phase 8) — signed-in **and** the caller is the professional a specific
  quote request was sent to; 404 otherwise. One-sided (professional-only) —
  for actions like declining or submitting a quote.
- `requireQuoteRequestAccess(quoteRequestId)` (`src/lib/data/quotes.ts`,
  Phase 10) — signed-in **and** the caller is *either* the homeowner who
  owns the project *or* the professional the request was sent to; 404 for
  anyone else. Two-sided — for the message thread, where both parties need
  read/write access to the same resource.

`getProject(projectId)` is the one broader read: it returns the project to
its owning homeowner, to an admin, or to a professional who has an active
quote request on it — real as of Phase 8, when quote requests started
existing (a professional couldn't qualify for this before then, simply
because nothing to qualify on existed yet).

Money fields (`budgetMin`, `budgetMax`, quote/fee amounts) are pence
integers in the database and pounds at these function boundaries
(`src/lib/money.ts` converts).

**Rate limiting (Phase 12):** login, signup, message sending, project
creation, and quote requests are all throttled server-side
(`src/lib/rate-limit.ts`) — noted on each affected entry below. An
in-memory, per-process fixed-window limiter, a deliberate fit for this
app's single-VPS deployment rather than a placeholder; see
`docs/BACKEND_ARCHITECTURE.md §24`.

---

## Authentication & onboarding — Phase 2

`src/lib/actions/auth.ts`. Predates this doc's per-phase documentation
habit (which started at Phase 3) — added here during Phase 14's
consolidation pass to close that gap, not because anything changed.

### `signup(prevState, formData)`

**Input:** `role` (`HOMEOWNER` or `PROFESSIONAL` only — see the security
note below), `name` (≥2 characters), `email`, `password` (≥8 characters,
at least one letter and one number), `postcode` (optional, ≥5 characters
if given).

**Rate limited:** 5 signups per hour, keyed by caller IP.

**Behavior:** calls `supabase.auth.signUp()` with role/name/postcode
carried in the signup metadata; the `handle_new_auth_user` Postgres
trigger (Phase 2, patched in Phase 12) reads that metadata and creates
the matching `public.users` row — this action never writes to `users`
directly. If email confirmation is on, returns an info message instead of
redirecting (no session exists yet); otherwise redirects to
`/professional/onboarding` or `/dashboard` depending on role.

**Security note (Phase 12):** the trigger only ever accepts `HOMEOWNER` or
`PROFESSIONAL` from the signup metadata — anything else (including
`ADMIN`) silently falls back to `HOMEOWNER`, regardless of what this
action's own Zod schema would otherwise allow through, because the
metadata itself is reachable by anyone calling Supabase Auth directly
with the public anon key, bypassing this action and its validation
entirely. See `docs/BACKEND_ARCHITECTURE.md §24` for the full
privilege-escalation finding this closed.

### `login(prevState, formData)`

**Input:** `email`, `password`.

**Rate limited:** 10 attempts per 15 minutes, keyed by the **target
email**, not the caller's IP — this is what stops repeated password
guessing against one account regardless of how many different IPs it's
attempted from.

**Behavior:** `supabase.auth.signInWithPassword()`; redirects to
`/dashboard` on success.

### `logout()`

Plain mutation, no form state. `supabase.auth.signOut()`, redirects to
`/login`.

### `createProfessionalProfile(prevState, formData)`

**Authorization:** `requireUser()`, and the account must already have
`role: PROFESSIONAL` (set at signup — this action cannot change a
homeowner into a professional).

**Input:** `businessName` (≥2 characters), `postcode` (≥5 characters),
`description` (optional, ≤2000 characters), `services` (one or more
project-type keys), `serviceAreaPrefixes` (a comma-separated string,
parsed and deduplicated into an array of upper-cased postcode prefixes —
e.g. `"L1, l18"` becomes `["L1", "L18"]`; see `docs/BACKEND_ARCHITECTURE.md
§19` for why this format was chosen over the brief's literal range
syntax).

**Behavior:** upserts the `Professional` row and replaces its
`ProfessionalService` rows entirely (`deleteMany` + `create`, not a diff)
— one profile per user, re-running onboarding both creates and updates.
Redirects to `/dashboard`.

---

## `createProject(prevState, formData)`

`src/lib/actions/projects.ts` — Server Action, bound to the "new project"
form.

**Authorization:** `requireRole(HOMEOWNER)`.

**Rate limited (Phase 12):** 10 projects per hour, keyed by caller.

**Input** (`FormData`):

| Field | Required | Validation |
|---|---|---|
| `projectType` | yes | must be one of `PROJECT_TYPE_KEYS` (`src/lib/project-types.ts`) |
| `title` | yes | 3–200 characters |
| `description` | no | ≤5000 characters |
| `postcode` | yes | 5–10 characters |
| `budgetMin` | no | non-negative integer (pounds) |
| `budgetMax` | no | non-negative integer (pounds); must be ≥ `budgetMin` if both given |
| `targetStartDate` | no | ISO date string (`YYYY-MM-DD`) |

**Behavior:** creates the `Project` row (`status = DRAFT`), logs an
`activity_log` entry (`type: "project_created"`), redirects to
`/projects/{id}`.

**Errors:** returns `{ error: string }` (the first validation failure,
human-readable) instead of throwing, so the calling form can render it
inline.

---

## `updateProject(projectId, prevState, formData)`

Same input/validation shape as `createProject`. **Authorization:**
`requireProjectOwner(projectId)`. Updates the row in place; omitted budget
fields are cleared (`null`), not left unchanged — the form always submits
the full set. Returns `{ info: "Project updated." }` on success.

---

## `updateProjectStatus(projectId, prevState, formData)`

**Authorization:** `requireProjectOwner(projectId)`.

**Input:** `status` — must be a valid `ProjectStatus` enum value, but
**restricted since Phase 12** to a much narrower set than "any value to
any other": `DESIGN_READY`, `REQUESTING_QUOTES`, and
`PROFESSIONAL_SELECTED` are now reached only automatically, by real
actions elsewhere (`selectDesignConcept`, `requestQuotes`,
`selectProfessional`) — this action rejects a direct attempt to set any
of them with `{ error: "That status can only be reached automatically,
not set directly." }`. `QUOTES_RECEIVED` (never actually auto-set by
anything, but an outcome of professionals responding, not a deliberate
homeowner choice) and `DRAFT` (the create-time-only starting point) are
excluded too. What's left, and the only values this action will actually
apply as a real change, is `COLLECTING_INFORMATION`, `DESIGNING`,
`COMPLETED`, or `CANCELLED` — statuses that make sense as a deliberate
choice regardless of a project's automated progress. Resubmitting the
project's *current* status (a no-op) is always accepted regardless of
which list it's on, so the form's own default selection never itself
triggers this error. See `docs/BACKEND_ARCHITECTURE.md §24` for why this
was originally a data-integrity gap and what changed.

**Behavior:** updates `Project.status`, logs `activity_log`
(`type: "project_status_changed"`, `metadata: { from, to }`).

---

## `updateProjectRequirements(projectId, prevState, formData)`

**Authorization:** `requireProjectOwner(projectId)`.

**Input:** form fields matching the project's type-specific question set
(`getProjectTypeDefinition(project.projectType).fields`) — e.g. a kitchen
project expects `desiredStyle`, `island`, `appliances`, etc. Validated with
a **strict** Zod schema derived from that field list
(`schemaForProjectType`): an unrecognized key is rejected outright, not
silently dropped, since this record is meant to be a trustworthy
structured brief, not a best-effort bag of whatever was submitted.

**Behavior:** upserts `ProjectRequirements.data` (JSONB) for the project,
logs `activity_log` (`type: "requirement_updated"`).

---

## `uploadProjectPhoto(projectId, prevState, formData)`

`src/lib/actions/photos.ts`. **Authorization:**
`requireProjectOwner(projectId)`.

**Input:**

| Field | Required | Validation |
|---|---|---|
| `file` | yes | MIME type must be one of `image/jpeg`, `image/png`, `image/webp`, `image/heic`; size ≤ 10MB |
| `photoType` | no (defaults to `BEFORE`) | `BEFORE`, `INSPIRATION`, or `OTHER` |

**Behavior:** uploads to the private `project-photos` Supabase Storage
bucket at `{projectId}/{uuid}.{ext}`, creates a `ProjectPhoto` row
(`storagePath` recorded as `project-photos/{that path}`, `uploadOrder`
auto-incremented), logs `activity_log` (`type: "photo_uploaded"`).

**Note on transport:** uploads are proxied through this Server Action
rather than a direct browser-to-storage signed URL (`next.config.ts` raises
the Server Action body limit to 12MB accordingly). Phase 0's plan assumed
direct-to-storage; this is a deliberate simplification given the app runs
as one persistent Node process, not serverless — revisit if upload
volume/latency becomes a real bottleneck.

---

## `deleteProjectPhoto(photoId)`

**Authorization:** loads the photo's parent project and checks
`project.homeownerId === caller.id` directly (photo ownership is
transitive through the project, there's no separate photo-level owner
field) — 404 otherwise.

**Behavior:** removes the object from Storage, then deletes the
`ProjectPhoto` row.

---

## `getProject(projectId)`

Not a Server Action (no form binds to it directly) — a cached
(`React.cache`) server-only read used by the project detail page and by
every mutation above via `requireProjectOwner`. See the authorization
model above for who can read what.

## `listHomeownerProjects()`

**Authorization:** `requireUser()`. Returns the caller's own projects
(`where: { homeownerId: caller.id }`), most-recently-updated first. There
is no general "list all projects" — every list is scoped to the caller.

---

## `sendAssistantMessage(projectId, prevState, formData)` — Phase 4

`src/lib/actions/assistant.ts`. **Authorization:**
`requireProjectOwner(projectId)` — same as every other mutation; the raw
chat transcript is not extended to professionals even though the
structured brief it produces is (see `docs/BACKEND_ARCHITECTURE.md §16`).

**Input:** `message` — non-empty string.

**Behavior, in order:**

1. Stores the homeowner's message (`AssistantMessage`, `role: "user"`).
2. Logs `activity_log` (`type: "assistant_started"`) the first time this
   project's conversation gets a message.
3. Computes a **deterministic** known/missing field list by diffing the
   project type's field registry (`src/lib/project-types.ts`) against
   `ProjectRequirements.data` — this is code, not the model, deciding
   what's already known, per the brief's "don't trust the AI to invent
   this" spirit.
4. Calls Claude (`src/lib/assistant.ts`, `runAssistantTurn`) with a system
   prompt containing the known/missing list and project context, the
   recent conversation history (capped at 20 messages), and the new
   message. The call **forces** a specific tool
   (`tool_choice: { type: "tool", name: "respond_and_update_profile" }`)
   whose schema is generated from the same field registry — every reply is
   guaranteed to be structured JSON, not free text to be parsed.
5. Stores the assistant's `reply` text (`AssistantMessage`,
   `role: "assistant"`).
6. Splits the tool call's other output into project-level fields
   (`budgetMin`, `budgetMax`, `targetStartDate` — written to `Project`) vs.
   everything else (written to `ProjectRequirements.data`) using
   `PROJECT_LEVEL_FIELD_KEYS` as the single source of truth for that split.
7. Validates the requirements portion through **the exact same**
   `schemaForProjectType(definition)` Zod schema Phase 3's manual form
   uses — if the model somehow returns a field that doesn't exist for this
   project type, or the wrong type of value, the whole requirements update
   is discarded (logged server-side) rather than partially applied. The
   chat reply is still shown either way.
8. Validates the project-level budget update maintains `min ≤ max`
   (checked against whichever of the two wasn't just changed) before
   applying it.
9. Logs `activity_log` (`type: "requirement_updated"`) if anything was
   actually written.

**Errors:** if the Anthropic call itself fails (bad key, network, rate
limit), returns `{ error: "The assistant is unavailable right now..." }` —
the user's message is still saved, so nothing is lost; they can just
retry.

---

## `generateDesignConcept(projectId, photoId, prevState, formData)` — Phase 5 (retired in Phase 6)

> **⚠️ Retired.** This function no longer exists in the codebase —
> `generateDesignBatch` (below) replaced it in Phase 6. Kept here,
> clearly marked, as a historical record of Phase 5's original design
> rather than deleted outright, since the reasoning in it (the provider
> abstraction, the row-created-before-attempt pattern) still applies
> directly to every generation action that exists today.

`src/lib/actions/designs.ts`. **Authorization:** `requireProjectOwner(projectId)`.

**Behavior, in order:**

1. Confirms the photo belongs to the project.
2. Enforces `GENERATION_LIMITS.maxPerProject` (`src/lib/generation-limits.ts`,
   Phase 1's cost cap) — rejects once the project has hit its cap.
3. Builds the generation prompt from the project's actual structured
   profile (`buildDesignPrompt`, `src/lib/design-generation.ts`) — every
   known field from `ProjectRequirements.data`, formatted with its
   human-readable label. This is the same data Phase 3's form and Phase
   4's assistant write to; the image generator never sees the raw chat
   transcript, only the structured result of it.
4. Creates the `DesignConcept` row **immediately**, `status: PROCESSING`,
   `version` set to `(existing count) + 1` — so a version number is never
   silently skipped even if generation subsequently fails.
5. Calls the active provider (`getImageProvider().generateDesign()`,
   `src/lib/image-providers/`) with a signed URL to the source photo
   (600s expiry — long enough for the provider's own processing time) and
   the built prompt.
6. On success: downloads the provider's (temporary — kie.ai's expire in
   ~24h) result image and re-uploads it to our own `generated-designs`
   Supabase Storage bucket, then updates the row to `status: COMPLETE`
   with the permanent `storagePath`, and logs `activity_log`
   (`type: "design_generated"`).
7. On failure: updates the row to `status: FAILED` with `errorMessage`,
   and returns a friendly error — the row stays as a record of the
   attempt rather than disappearing.

**The provider abstraction** (`src/lib/image-providers/types.ts`):
`ImageGenerationProvider` with `generateDesign()`, `regenerateDesign()`,
`editDesign()`, all returning a provider-agnostic
`{ imageUrl, provider, model }`. Any async job/poll mechanics a provider
needs are hidden inside its implementation — callers just `await` a
result. The only implementation right now is `KieAiImageProvider`
(`src/lib/image-providers/kie-ai.ts`), which submits a job to kie.ai's
`jobs/createTask` endpoint and polls `jobs/recordInfo` until it resolves.
Swapping providers means adding one new file implementing the interface,
not touching this action.

---

## `generateDesignBatch(projectId, photoId, prevState, formData)` — Phase 6

`src/lib/actions/designs.ts`. **Authorization:** `requireProjectOwner(projectId)`.
Replaces Phase 5's single-concept `generateDesignConcept` — a batch of one
style is that action's exact behavior, so the single-generate path was
retired rather than kept alongside a near-duplicate.

**Behavior:** generates one concept per entry in
`src/lib/design-styles.ts`'s `DESIGN_STYLES` registry (currently
Contemporary / Traditional / Bold — configurable, not hard-coded into the
generation pipeline; see `docs/BACKEND_ARCHITECTURE.md §18`), up to
`GENERATION_LIMITS.initialBatchSize` and however many concepts remain
under the project's `maxPerProject` cap. Runs **sequentially, not in
parallel** — each attempt needs the current highest version number, and
parallel attempts risk two computing the same next version before either
commits, which the `(projectId, version)` unique constraint would reject.
For each style: builds the prompt via `buildDesignPrompt(...,
{ styleModifier })`, creates the row (`status: PROCESSING`), calls
`provider.generateDesign()`, updates to `COMPLETE`/`FAILED`.

## `regenerateDesignConcept(projectId, conceptId, prevState, formData)`

Re-runs the **same style** as an existing concept, from the **original
photo** again (`provider.regenerateDesign()`) — for when a specific
generation came out poorly, not a request to change its content. Reads
the source concept's `styleKey` to reapply the same style modifier. Same
version/cap/row-lifecycle handling as the batch action.

## `requestDesignChanges(projectId, conceptId, prevState, formData)`

**Input:** `changeRequest` — required, non-empty text (e.g. "make the
worktop marble instead").

Refines a **specific completed concept's own image**
(`provider.editDesign()`, source = that concept's `storagePath`, not the
original photo) — this is the "request changes" capability, distinct from
regenerate: it edits the result you're looking at rather than starting
over. The new concept's `description` records what changed
(`"Refinement of v{n}: {changeRequest}"`) and inherits the parent's
`styleKey` for continuity. Rejects if the source concept isn't
`COMPLETE` yet.

## `selectDesignConcept(projectId, conceptId)`

Not a form action with error state — a plain mutation
(`<form action={selectDesignConcept.bind(null, projectId, conceptId)}>`),
consistent with `deleteProjectPhoto`. Sets `selectedByUser` on the chosen
concept and unsets it on every other concept for the project in one
transaction (only one concept can be preferred at a time). Advances
`Project.status` to `DESIGN_READY` if it's still at `DRAFT`,
`COLLECTING_INFORMATION`, or `DESIGNING` — a plain allowlist check, not a
full state-machine transition graph. Logs `activity_log`
(`type: "design_selected"`).

---

## `getMatchingProfessionals(projectId)` — Phase 7

`src/lib/data/matching.ts`. Not a Server Action — a server-only read,
**homeowner-owner only** (`requireProjectOwner`), same as everything else
project-scoped. A professional can't browse who else was matched against
a project.

**Behavior:** loads every `Professional` (with their `services`), then
runs `src/lib/matching.ts`'s `matchProfessionals()` — a pure,
database-free function — against the project's type, postcode, budget,
and target date. Returns only the professionals that passed every rule,
verified professionals sorted first (a tiebreaker, not a filter).

**The matching rules** (`evaluateMatch`, `src/lib/matching.ts`), each an
independent, transparent check — per the brief's explicit instruction,
this is plain rule evaluation, not an AI/ML ranking:

| Rule | Passes when |
|---|---|
| `service_category` | The professional's declared services include the project's `projectType`. |
| `service_area` | The project's postcode outward code (e.g. `L18` from `L18 5NF`) starts with one of the professional's declared `serviceAreaPrefixes`. |
| `verification_status` | Status is anything **except** `REJECTED`. Deliberately not requiring `VERIFIED` — see the note under `evaluateMatch` for why. |
| `availability` | `isAvailable` is `true`. |

A professional matches only if **all four** pass. `budgetMin`/`budgetMax`/
`targetStartDate` are accepted by `matchProfessionals()` but not
currently used to filter — no professional-side budget range or calendar
exists yet to compare against. Threaded through anyway so adding that
rule later doesn't require changing every call site (the brief's "keep
matching modular" requirement).

**Postcode matching** (`src/lib/postcode.ts`): `getOutwardCode()` extracts
the district from a full postcode (`"L18 5NF"` → `"L18"`);
`postcodeMatchesPrefix()` does a simple `startsWith` comparison. A
professional declares service area as a comma-separated list of prefixes
at onboarding (`"L1, L18"` for specific districts, or just `"L"` for an
entire postcode area) — not the brief's literal `"L1-L25"` range syntax;
see `docs/BACKEND_ARCHITECTURE.md §19` for why a prefix list was chosen
over a range parser.

---

## `validateProjectReadyForQuotes(project)` — Phase 8

`src/lib/actions/quotes.ts`. Not a Server Action — a plain function shared
by the UI (to show *why* the request form is hidden) and `requestQuotes`
(to actually enforce it server-side). The brief's "Validate project" step
made concrete: returns an error string, or `null` if ready. A project is
ready once its status is at or past `DESIGN_READY` (`isAtOrPastStatus`,
`src/lib/project-status.ts` — a homeowner must have picked a preferred
design concept, Phase 6, before requesting quotes) and every field the
project type's definition marks `required` has a value
(`isFieldValueSet`, `src/lib/project-types.ts`).

## `requestQuotes(projectId, prevState, formData)` — Phase 8

Homeowner-only (`requireProjectOwner`). **Rate limited (Phase 12):** 20
calls per hour, keyed by caller. Re-validates readiness via
`validateProjectReadyForQuotes`, then re-runs Phase 7's `evaluateMatch()`
server-side against every submitted professional ID — the checkboxes on
`RequestQuotesForm` reflect what the client saw, but a tampered
submission naming a non-matching or fabricated professional ID cannot
create a request. Skips professionals already requested for this project
(no duplicate `QuoteRequest` rows). Creates one `QuoteRequest` per
remaining valid match with the homeowner's optional message, logs
`activity_log` (`type: "quote_requested"`) per request, and advances
`Project.status` to `REQUESTING_QUOTES` if it isn't already there or
past it.

## `declineQuoteRequest(quoteRequestId)` — Phase 8

Professional-only, scoped to the request actually sent to them
(`requireQuoteRequestForProfessional` — 404, not 403, for anyone else's
request, same pattern as `requireProjectOwner`). Sets status to
`DECLINED` and `respondedAt`. Logs `activity_log`
(`type: "quote_declined"`).

## `submitQuote(quoteRequestId, prevState, formData)` — Phase 8

Professional-only, same ownership check as `declineQuoteRequest`. Refuses
if the request was already declined. Validates amount (positive number,
stored as pence via `poundsToPence`) and a required timeline string;
notes are optional. Sets status to `QUOTED` and `respondedAt`. Submitting
a quote *is* the accept step — there's no separate "accept opportunity"
action, since a submitted quote is unambiguous acceptance and the brief's
`QuoteRequestStatus` states (`PENDING`/`VIEWED`/`DECLINED`/`QUOTED`)
don't include a distinct "accepted". Logs `activity_log`
(`type: "quote_submitted"`).

## `selectProfessional(projectId, quoteRequestId)` — Phase 8

Homeowner-only. Only acts on a request that's actually `QUOTED` and
belongs to this project — silently no-ops otherwise (same defensive
pattern as `selectDesignConcept` for a tampered concept ID). Sets
`selected: true` on the chosen request and `false` on every other request
for the project in one transaction (only one selection at a time, same
pattern as `DesignConcept.selectedByUser` in Phase 6). Advances
`Project.status` to `PROFESSIONAL_SELECTED` unconditionally — reaching
this action already implies a `QUOTED` request exists, which implies
`REQUESTING_QUOTES` was already reached. Logs `activity_log`
(`type: "professional_selected"`).

## `getProjectQuoteRequests(projectId)` — Phase 8

`src/lib/data/quotes.ts`. Homeowner-owner only. Every `QuoteRequest` for
the project with its `professional`, most recently sent first. Backs the
`/projects/[id]/quotes` comparison page.

## `getProfessionalOpportunities()` — Phase 8

`src/lib/data/quotes.ts`. Professional-only — every `QuoteRequest` ever
sent to the logged-in professional, across all their projects, most
recent first. **Side effect:** any request still `PENDING` when this
loads is flipped to `VIEWED` (viewing the opportunities list *is*
"opening" the request — no separate "mark as viewed" action to forget to
call, same pattern as `sendAssistantMessage`'s `assistant_started` side
effect). Logs `activity_log` (`type: "quote_viewed"`) for each request
that transitions.

---

## Notifications — Phase 9

Not Server Actions — a provider abstraction (`src/lib/notification-providers/`,
same shape as `src/lib/image-providers/`) plus three domain-specific
functions in `src/lib/notifications.ts` that the quote actions call as a
side effect. `getNotificationProvider()` is the one place that decides
which email service is live (`ResendNotificationProvider`, sending as
`GlowUpp <hello@glowupp.co.uk>`); swapping providers later means writing
one new file, not touching call sites.

**Every call goes through `sendBestEffort()`**, which catches and logs
any failure rather than throwing. A homeowner's "request quotes" click,
or a professional's "submit quote," must succeed even if Resend is
having a bad moment — a missed email is a much smaller problem than a
core action silently failing because of it.

| Function | Fires when | Sent to |
|---|---|---|
| `notifyQuoteRequested` | `requestQuotes` creates a `QuoteRequest` | The professional |
| `notifyQuoteSubmitted` | `submitQuote` sets status to `QUOTED` | The homeowner |
| `notifyProfessionalSelected` | `selectProfessional` picks a winner | Every professional who quoted — `selected: true` for the winner, `false` for the rest |

`notifyProfessionalSelected`'s "losing bidder" email isn't in the
brief's explicit list — added because leaving those professionals to
find out only by the opportunity going quiet felt like an obvious gap
once the winner's email existed. See
[docs/BACKEND_ARCHITECTURE.md §21](./BACKEND_ARCHITECTURE.md) for the
full reasoning.

**Security note (Phase 12):** every user-controlled value interpolated
into an email's `html:` body (names, project titles, message bodies) is
passed through `escapeHtml()` first — this file's original version
didn't, which meant a malicious name or message could inject arbitrary
HTML into an email sent to someone else. See
[docs/BACKEND_ARCHITECTURE.md §24](./BACKEND_ARCHITECTURE.md) for the
full finding.

---

## `sendMessage(quoteRequestId, prevState, formData)` — Phase 10

`src/lib/actions/messages.ts`. Either side of a quote request's thread
may call this — the homeowner who owns the project, or the professional
it was sent to (`requireQuoteRequestAccess`, `src/lib/data/quotes.ts`,
covers both; 404 for anyone else). **Rate limited (Phase 12):** 20
messages per 10 minutes, keyed by sender. Refuses on a `DECLINED` request — the
"who's the sender" branch is determined server-side from `viewerRole`,
not trusted from the form, so a request can't be spoofed as coming from
the other party. Body is required, plain text, capped at 4000 characters.
Creates a `Message` row, logs `activity_log` (`type: "message_sent"`),
and emails whichever party didn't just send it
(`notifyMessageReceived`, Phase 9's notification system).

## `getMessages(quoteRequestId)` — Phase 10

`src/lib/data/messages.ts`. Same dual-sided authorization as
`sendMessage`, via the new `requireQuoteRequestAccess` helper in
`src/lib/data/quotes.ts`. Returns the full thread oldest-first, plus
`viewerRole` (`"HOMEOWNER" | "PROFESSIONAL"`) so the UI knows which side
of each message is "you" without re-deriving it client-side.

**Where it lives:** `/projects/[id]/quotes/[quoteRequestId]` (homeowner)
and `/professional/opportunities/[quoteRequestId]` (professional) — two
thin pages sharing one client component, `src/components/MessageThread.tsx`
(the first cross-route shared component in the codebase; every prior
phase's UI has been colocated per-route because nothing needed reusing
across two different parts of the app before this).

---

## Transactions — Phase 11 (design only, no real payments)

Not a Server Action with a form — a side effect. `selectProfessional`
(Phase 8) now also creates a `Transaction` row, in the same database
transaction as the selection itself, computed via
`calculateLeadFee(quoteAmountPence)` (`src/lib/fees.ts` — currently 5%
of the winning quote, rounded to the nearest penny). Logs `activity_log`
(`type: "lead_fee_created"`) right after `professional_selected`.

**This is bookkeeping, not billing.** There is no payment processor
integration anywhere in this codebase — no Stripe, no card collection,
no webhook, nothing that moves real money. A `Transaction` row just
records that a fee is owed; it starts and stays `PENDING` until someone
manually reconciles it outside this system (or a future phase builds
real payment collection on top of this same table). See
[docs/BACKEND_ARCHITECTURE.md §23](./BACKEND_ARCHITECTURE.md) for the
full reasoning behind the lead-fee model and what's deliberately not
built yet.

## `getProfessionalTransactions()` — Phase 11

`src/lib/data/transactions.ts`. Professional-only, their own fees only
— every `Transaction` tied to their `professionalId`, most recent
first, with the related project for display. Backs
`/professional/transactions`. Homeowners have no equivalent view: the
fee is a commercial arrangement between GlowUpp and the professional,
not something the homeowner has any stake in or visibility into.

---

## Testing — Phase 13

Vitest (`vitest.config.mts`), run via `pnpm test`. Deliberately scoped
to **unit tests for pure logic only** — a scope decision made with you
in chat rather than assumed: this codebase splits cleanly into
side-effect-free functions (matching rules, fee/money math, status
ordering, requirements validation, rate-limit counting) and Server
Actions that need a database, Supabase auth session, and real external
APIs (Claude, kie.ai, Resend) to mean anything. The former is cheap and
fast to test automatically; the latter is what every phase's live
Playwright verification (recorded throughout this file) already
exercises thoroughly, phase by phase, against the real app — automating
that class of test would mean either a heavily mocked fake environment
or standing up a dedicated test database, both bigger undertakings than
this phase's scope.

**54 tests across 7 files**, one per pure module:

| File tested | What's covered |
|---|---|
| `src/lib/postcode.ts` | Outward-code extraction, prefix matching, case/whitespace handling |
| `src/lib/matching.ts` | All four match rules independently (pass and fail), `matchProfessionals`'s filtering and verified-first sort |
| `src/lib/money.ts` | Pence/pound conversion and rounding, currency formatting |
| `src/lib/fees.ts` | Lead-fee percentage calculation and penny rounding |
| `src/lib/project-status.ts` | `isAtOrPastStatus` ordering, including CANCELLED never counting as "at or past" anything |
| `src/lib/project-types.ts` | `isFieldValueSet`'s edge cases, requirements validation (including that an unrecognized field throws rather than being silently dropped — Phase 3's original design decision, now regression-tested) |
| `src/lib/rate-limit.ts` | The fixed-window counter's boundary behavior, using Vitest's fake timers |

**The `server-only` package needed a test-time stub.** The real npm
package (Next.js's own recommended one, now installed as a
dependency — it wasn't before, since Next.js resolves the bare
specifier internally without it) unconditionally throws when imported
outside Next's own bundler; only Next's build swaps it for a no-op via
a "react-server" export condition Vitest has no equivalent of.
`vitest.config.mts` aliases `server-only` to `src/test/stubs/server-only.ts`
(an empty module) so server-only-marked files with otherwise-pure logic
(`rate-limit.ts`) can still be imported directly in tests. Confirmed
this doesn't affect the real app: restarted the dev server after
installing the package and confirmed pages still load normally.

**`rate-limit.ts`'s test is a direct regression test for a real bug hunt
from Phase 12** — that phase's live verification of the login rate
limiter initially looked broken (11 real attempts didn't block) purely
because a multi-hour gap mid-testing let the window expire and quietly
restart the count. `checkRateLimit`'s test suite pins down exactly that
behavior with Vitest's fake timers (advancing time precisely to just
before and just after a window boundary) — this class of off-by-one/
window-expiry bug would now fail in milliseconds under `pnpm test`
instead of costing another round of confused manual live testing.

**Not unit tested, deliberately**: `src/lib/design-generation.ts`'s
`buildDesignPrompt` is pure-logic in principle, but the file it lives in
also imports `storage.ts` (which constructs a real Supabase client at
module load time) and the image-provider abstraction — importing the
file at all in a test would mean either loading real environment
variables into the test run or mocking those side-effecting neighbors,
neither of which is worth it for one string-building function that
Phases 5 and 6 already verified thoroughly against real generations.
Splitting it into its own side-effect-free file would make it cleanly
testable, but that's a refactor of already-shipped, already-tested code
that wasn't asked for here.

---

## Admin tooling — post-roadmap

The brief's original 14 phases are complete as of Phase 14; this and
anything below it are follow-on work agreed after that point, not part
of the original plan. `src/lib/data/admin.ts` and
`src/lib/actions/admin.ts`, all four functions gated by
`requireRole(ADMIN)`.

### `getAllProfessionals()` / `getAllTransactions()`

The one legitimate place an unscoped, all-rows list exists in this
codebase — every other list function in this app is scoped to the
caller (their own projects, their own transactions, etc.); these two are
deliberately global, for an admin. Back `/admin/professionals` and
`/admin/transactions`.

### `updateProfessionalVerification(professionalId, status)`

Sets `Professional.verificationStatus` to `UNVERIFIED`, `PENDING`,
`VERIFIED`, or `REJECTED`. This is the admin verification workflow every
earlier phase's docs noted as missing (Phase 7's matching rules already
handle `REJECTED` correctly — they always have — this just gives a human
a way to actually set it, and gives `VERIFIED` a way to ever be reached
at all, since Phase 7's professional-first sort tiebreaker had nothing
to sort on before this existed). Logs `activity_log`
(`type: "professional_verification_changed"`, `metadata: { professionalId, from, to }`).

### `updateTransactionStatus(transactionId, status)`

Sets `Transaction.status` to `PENDING`, `PAID`, `WAIVED`, or `CANCELLED`;
setting `PAID` also stamps `paidAt`. This is manual reconciliation, not
a payment integration — Phase 11 was explicit that no payment processor
exists in this codebase, so this is how a fee actually collected outside
the system (bank transfer, invoice, whatever) gets reflected here. Logs
`activity_log` (`type: "transaction_status_changed"`,
`metadata: { transactionId, from, to }`).

---

## "No pushy marketplace" — post-roadmap

A product-feel request, not a phase: the marketplace side of the app
should stay in the background until a homeowner is genuinely excited
about a design, and never pressure either side once they're in it. Five
pieces, agreed one at a time in chat before any were built.

### Contact-info nudge in messages

`src/lib/contact-info.ts`'s `containsLikelyContactInfo()` — a loose,
deliberately-not-airtight regex check for phone-number- or email-shaped
text. `sendMessage` (`src/lib/actions/messages.ts`) runs it on every
message *after* successfully sending — it never blocks sending, only
adds `{ info: "Heads up — for your own record and protection, quotes
and next steps work best kept inside GlowUpp." }` to the response, which
`MessageThread.tsx` renders in the same neutral style as any other info
message. A hard block was explicitly rejected — trivially dodgeable
(spelled-out digits, "at" instead of "@") and punishes honest users
typing an address or a reference number.

### Marketplace CTA gated on a selected design

`src/app/projects/[id]/page.tsx`: `isAtOrPastStatus(project.status,
ProjectStatus.DESIGN_READY)` now gates a whole reward-style section
("Love this design? Get quotes from local pros who could build it —
entirely your choice, no pressure.") containing both the "Find local
pros" and "View your quotes" links. Before that point, the page shows
only the assistant chat link — no marketplace mention exists at all
until there's a design worth building.

### Softer copy

`/projects/[id]/professionals` heading and description reworded away
from "Matching professionals" / algorithm-description framing toward
"Local pros for this project" / "You choose who to hear from; nobody's
bidding for your attention." `RequestQuotesForm`'s heading changed from
"Request quotes" to "Get quotes from your picks."

### Postcode privacy for professionals

`getProfessionalOpportunities()` (`src/lib/data/quotes.ts`) now masks
`project.postcode` down to just the outward code (`getOutwardCode()`,
already used for matching) for every quote request that isn't
`selected: true` — mutated in place on the returned rows, same pattern
the function already used for its PENDING→VIEWED side effect. The full
postcode only appears once a professional has actually been chosen.
`OpportunityCard.tsx` needed no changes — it just displays whatever
postcode value it's given.

### Quote-reminder email (logic now, schedule after deployment)

New `Project.quoteReminderSentAt` column. `sendPendingQuoteReminders()`
(`src/lib/reminders.ts`) finds every project with 2+ `QUOTED` requests,
nobody `selected` yet, no reminder sent before, and at least 48 hours
since the most recent quote response — sends one `notifyQuotesWaiting`
email per eligible project and stamps `quoteReminderSentAt` so it never
repeats. `POST /api/cron/quote-reminders` (and `GET`, for simple
external pingers) calls it, gated by a shared secret (`CRON_SECRET`,
checked against an `x-cron-secret` header or a `?secret=` query param).
**Nothing calls this endpoint on a schedule yet** — that needs an
always-on server to reliably check periodically, which doesn't exist
until deployment. See `docs/BACKEND_ARCHITECTURE.md §28` for the full
scoping discussion (why 2+ quotes, why 48 hours, why this one reminder
was judged fair game while a general "come back" nudge wasn't).

---

## Verified behavior (not just implemented)

- Cross-homeowner isolation: a second homeowner account, given the direct
  URL to the first homeowner's project, gets a 404 — confirmed live, not
  just by code review.
- Full upload → display → delete round trip through real Supabase Storage,
  confirmed via an actual file picked through the browser file input.
- Budget ordering validation (`min > max`) rejected with the correct
  message, project not created.
- Strict requirements validation confirmed against a real kitchen project
  (only recognized fields persist; an unrecognized field throws rather
  than being silently dropped).
- Phase 4: a real conversation turn against live Claude — told the
  assistant about disliked cabinets/flooring and a revised budget in one
  message; it correctly wrote `cabinets`, `flooring` (fields it was never
  explicitly asked about by name — it matched them from the field
  registry's labels), and `budgetMax`, left `budgetMin` untouched since it
  wasn't mentioned, and asked a natural follow-up about the one remaining
  important missing field. The known/missing counter updated from 4/10 to
  6/10 to match. `activity_log` recorded `assistant_started` then
  `requirement_updated` in the correct order.
- Phase 5: a full real generation through the actual UI (not a mocked
  call) — uploaded a real kitchen photo, clicked "Generate design," and
  the resulting `DesignConcept` correctly stored a prompt built entirely
  from the project's real accumulated profile (desired style, cabinets,
  island, flooring, must-have features — spanning both the Phase 3 manual
  form and the Phase 4 assistant conversation), `version: 1`,
  `status: COMPLETE`, `provider: "kie.ai"`, `model: "nano-banana-pro"`. The
  resulting image genuinely reflected every stated preference: light
  cabinets, an island with the requested gas hob, new flooring, same room
  geometry. `activity_log` recorded `design_generated`.
- Phase 6: a full batch of 3 (Contemporary/Traditional/Bold) generated
  sequentially with no version collisions (v2, v3, v4 alongside the
  existing v1). Selected v3 (Traditional) — confirmed only that concept
  had `selectedByUser: true`, the other three flipped to `false`, project
  status advanced `DRAFT → DESIGN_READY` automatically, `activity_log`
  recorded `design_selected`. Then requested a change ("make the
  countertop dark grey or black instead of white marble") on v3 — the
  resulting v5 was downloaded and visually compared against v3 directly:
  every other element (cabinets, tile, island, lighting, even the same
  items left on the counter) was virtually identical, and only the
  countertop material changed, exactly as asked. This exercised
  `editDesign()` — the one provider method Phase 5 never got to test.
- Phase 7: three test professionals, each isolating a different rule.
  "Test Pro Builders Ltd" (offers kitchen, serves postcode area "L")
  correctly matched the "Redo the kitchen" project (postcode `L18 5NF`).
  "Manchester Kitchens Ltd" (offers kitchen, serves area "M") was
  correctly excluded — inspecting its full rule breakdown confirmed it
  failed *only* `service_area`, passing everything else. "Liverpool
  Driveways Ltd" (serves area "L", offers only driveway) was correctly
  excluded, failing *only* `service_category`. Then, on the matching
  professional's own record, independently toggled `isAvailable: false`
  (excluded, failing only `availability`) and `verificationStatus:
  REJECTED` (excluded, failing only `verification_status`), each
  confirmed and reverted. All four rules verified both passing and
  failing, in isolation. Finally, `/projects/[id]/professionals` was
  confirmed to enforce the same cross-homeowner 404 boundary as every
  other project route.
- Phase 8: a second matching professional ("Merseyside Kitchen Co") was
  added so both branches of the flow could be exercised in one pass.
  Requested quotes from both — `/projects/[id]/professionals` correctly
  showed only the two eligible, not-yet-requested professionals, and
  after submission correctly flipped to "already requested" and hid the
  form. Each professional independently saw only their own request on
  `/professional/opportunities`, correctly flipped from `PENDING` to
  `VIEWED` on load. One professional submitted a real quote (£18,500,
  "4-5 weeks", with notes) — status became `QUOTED` and the figures
  rendered correctly on both the professional's card and the homeowner's
  `/projects/[id]/quotes` page. The other declined — status became
  `DECLINED`, action buttons disappeared, and it rendered correctly on
  the homeowner's side too. The homeowner then selected the quoted
  professional: `QuoteRequest.selected` was confirmed `true` only on that
  request, `Project.status` advanced to `PROFESSIONAL_SELECTED`, and the
  UI showed "★ Selected". Queried `activity_log` directly and confirmed
  the full sequence in order: `quote_requested` ×2, `quote_submitted`,
  `professional_selected` — which also surfaced two gaps (a missing
  `quote_viewed` entry, and a missing `actorId` on `quote_submitted`)
  that were fixed immediately after and confirmed clean via
  `tsc --noEmit` and lint, though not re-verified live through the full
  browser flow a second time.
- Phase 9: `hello@glowupp.co.uk` verified as a Resend sending domain live
  — added the DKIM TXT and two SPF CNAME records Resend generated
  directly to the `glowupp.co.uk` zone on Hostinger (checked the existing
  zone first to confirm no collision with the live mail setup), then
  confirmed with a real send straight to an inbox, which arrived. A
  second fresh project ("Notification test kitchen") was created to
  re-run the full Phase 8 flow end-to-end with notifications wired in:
  requesting quotes from two professionals fired `notifyQuoteRequested`
  for each (confirmed via a direct call to the same
  `getNotificationProvider().sendEmail()` code path, which returned a
  real Resend message ID), one professional submitting a quote fired
  `notifyQuoteSubmitted`, and the homeowner selecting a winner fired
  `notifyProfessionalSelected` twice — once `selected: true` for the
  winner, once `selected: false` for the other professional who'd
  quoted. Queried the database afterward and confirmed the same correct
  end state as Phase 8 (`PROFESSIONAL_SELECTED`, exclusive `selected`
  flag) plus, notably, that Phase 8's two activity-log fixes
  (`quote_viewed`, `quote_submitted`'s `actorId`) held up correctly on
  this independent second run.
- Phase 10: sent a real message as the homeowner on a `QUOTED` thread
  ("is the quote inclusive of removing the old units?"), confirmed it
  rendered correctly on the professional's side under the sender's real
  name (not "You" — that label is per-viewer, confirmed by checking both
  sides), replied as the professional, and confirmed the reply rendered
  correctly back on the homeowner's side, in order, each bubble correctly
  labeled. Queried `messages` and `activity_log` directly afterward —
  both rows present with the correct `senderId`/`actorId` for each
  party. Confirmed the "thread closed" rule live on an actually-`DECLINED`
  request from Phase 8's original test project (Merseyside Kitchen Co on
  "Redo the kitchen") — no send form rendered, just the closed-thread
  message. Confirmed the new cross-professional authorization boundary
  live, not just by code review: logged in as the *other* test
  professional (Merseyside Kitchen Co) and tried loading the first
  professional's own opportunity-thread URL directly — 404, as expected.
  Confirmed the message-notification email content sends successfully
  through the same Resend code path used by every other Phase 9/10
  email.
- Phase 11: requested and submitted a real quote (£20,000, a round
  number chosen deliberately to make the 5% fee easy to verify by eye),
  selected that professional, and confirmed a `Transaction` row was
  created automatically with `feeAmount: 100000` (pence) — exactly 5% —
  `status: PENDING`. Confirmed it renders correctly both inline on the
  professional's opportunity card ("Lead fee: £1000 · PENDING") and on
  the dedicated `/professional/transactions` page ("Outstanding:
  £1000"). Confirmed the two *pre-existing* selections from Phases 8–10
  (made before this feature existed) correctly show no fee line — the
  feature only applies going forward, no retroactive fee was invented
  for old data. Queried `activity_log` directly and confirmed
  `lead_fee_created` logged right after `professional_selected`, with
  the correct `feeAmount` in its metadata. Confirmed the authorization
  boundary live: logged in as the *other* test professional (who has no
  transactions) and confirmed their `/professional/transactions` page
  correctly shows "No lead fees yet" — no leakage of the first
  professional's £1,000 fee.
- Phase 12 (security review): exploited the ADMIN privilege-escalation
  bug for real *before* fixing it — called `supabase.auth.signUp()`
  directly with the public anon key and `role: "ADMIN"` in metadata,
  confirmed it produced a real `public.users` row with `role: 'ADMIN'`.
  Applied the trigger fix, ran the identical attack again, confirmed it
  now correctly produces `role: 'HOMEOWNER'`. Test account deleted
  afterward. Confirmed the `escapeHtml()` fix's underlying logic
  directly against a real payload (`<img src=x onerror=alert(1)>` etc.)
  and confirmed it's correctly wired into all four notification
  templates by re-reading the finished file end to end. Confirmed the
  new security headers are actually present on live responses via
  `curl -D -` (not just declared in config and assumed to work), and
  smoke-tested that ordinary pages (`/`, `/login`, `/signup`) still
  return 200 with the headers in place.
- Phase 12 follow-up (rate limiting and status restriction, addressed
  after your review of the initial findings): proved the login rate
  limiter live end-to-end, including catching and understanding a false
  negative along the way — an initial 11-attempt test didn't block
  because a 3+ hour gap between the first attempt and the rest let the
  15-minute window quietly expire and restart the count. Added temporary
  debug logging to confirm the counter was persisting and incrementing
  correctly across real requests, then did a fast, conclusive live test
  with the limit temporarily lowered to 3: attempts 1–3 returned normal
  "Invalid login credentials," attempt 4 correctly returned the rate
  limit message. Reverted the threshold and debug logging, then
  confirmed a genuine login still succeeds normally. For the status
  restriction: loaded a project already at `PROFESSIONAL_SELECTED`,
  confirmed the dropdown correctly showed it as a disabled "(reached
  automatically)" option alongside the four real manual choices,
  selected `CANCELLED`, submitted, and confirmed directly in the
  database that the status actually changed.
- Phase 13 (testing): all 54 unit tests pass via `pnpm test`, alongside
  a clean `tsc --noEmit` and `eslint`. Confirmed installing the real
  `server-only` package (needed for the test stub to have something to
  alias against) doesn't affect the real app — restarted the dev server
  afterward and confirmed ordinary pages still return 200.
- Phase 14 (this consolidation pass): cross-checked every exported
  function in `src/lib/actions/*.ts` and `src/lib/data/*.ts` against this
  file's headings by `grep`, not by memory of what earlier phases
  claimed — found and fixed four real gaps: Phase 2's four auth actions
  (`signup`/`login`/`logout`/`createProfessionalProfile`) were never
  documented at all (this doc's per-phase habit started at Phase 3, one
  phase too late); `updateProjectStatus`'s entry still claimed "any valid
  enum value is accepted from any other," which Phase 12's follow-up fix
  made false; five actions gained rate limits in Phase 12 with no mention
  in their own entries; and the intro's authorization model still claimed
  "no professional currently qualifies" for `getProject`, true only
  before Phase 8. Also caught and fixed two accidental double `---`
  separators, and clearly marked the retired `generateDesignConcept`
  entry so a reader landing on it directly (via the new table of
  contents) doesn't mistake it for a currently-callable function.
  Hand-verified the trickier table-of-contents anchor links (the ones
  with an em dash in the heading) against GitHub's actual slug algorithm
  by tracing the character-by-character transformation, rather than
  guessing.
- Admin tooling (post-roadmap): created a real admin account the
  sanctioned way — signed up normally, then granted the role directly in
  the database, since Phase 12's fix correctly blocks self-assigning
  `ADMIN` through signup itself. Logged in as that account and verified
  a real professional (from Phase 7's test data) — status flipped from
  `UNVERIFIED` to `VERIFIED` live, buttons updated to match. Marked a
  real `PENDING` lead fee (Phase 11's £1,000 test transaction) as `PAID`
  — confirmed both the status change and `paidAt` being stamped directly
  in the database, plus both actions' `activity_log` entries recording
  the correct `actorId` and before/after values. Confirmed the
  authorization boundary live: logged in as a non-admin (homeowner) and
  confirmed `/admin`, `/admin/professionals`, and `/admin/transactions`
  all redirect to `/dashboard` rather than rendering.
- "No pushy marketplace" (post-roadmap): sent a message containing a
  real-looking UK phone number on a live thread — the message sent
  successfully and the soft nudge appeared; sent an ordinary message
  immediately after and confirmed no nudge appeared. Loaded a brand-new
  `DRAFT` project and confirmed zero marketplace mentions anywhere on
  the page; loaded a project already past `DESIGN_READY` and confirmed
  the reward section renders with both links. Checked postcode privacy
  from both sides of the same data: logged in as a professional with
  three *non-selected* requests and confirmed all three showed only the
  postcode area ("L18"), then logged in as the professional actually
  *selected* on two other projects and confirmed those two correctly
  showed the full postcode ("L18 5NF"). For the reminder: created a real
  project with two backdated `QUOTED` requests, called the cron endpoint
  without a secret (401), with the wrong secret (401), then with the
  right one — sent exactly one reminder, confirmed `quoteReminderSentAt`
  was stamped and the `activity_log` entry was correct, called the
  endpoint a second time and confirmed it correctly sent zero (no
  duplicate). Test data cleaned up afterward.
