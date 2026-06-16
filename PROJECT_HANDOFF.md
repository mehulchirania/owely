# Owely — Project Handoff

Prepend a new dated entry at the top after every change. Newest first.

---

## 2026-06-16 - Login redesign matched to post-login web app

Redesigned `/login` from the earlier centered onboarding screen into a dark
desktop-app style window inspired by the logged-in Goa Trip dashboard. The page
now has the macOS-like top chrome, `app.owely.in/login` address pill, preview
sidebar/groups, dashboard metrics, expense rows, settle-up preview, and a
compact sign-in card that preserves the existing Google + Phone OTP flow.

Touched `src/app/(auth)/login/page.tsx` and tightened `LoginForm` control
styling so the auth form fits the same surface language. No auth behavior was
changed.

Verification: `npm run typecheck`, `npm run build`, `npm test`, and
`npm run lint` all clean. Browser checked `/login` at desktop and 375px mobile;
both render without horizontal overflow.

---

## 2026-06-16 - Owely.dc.html design handoff completed across app UI

Completed the in-flight Claude Design implementation from
`Expense Sharing SaaS-handoff.zip` / `Owely.dc.html` without replacing the real
data-backed flows. The remaining scaffold-looking surfaces now use the Owely
dark design system: create group, invite member, group menu, add/edit expense
page chrome, settings/profile, app error state, and the settle-up / UPI panel.

The settle-up flow now matches the prototype more closely: debt cards show the
payee avatar, large amount, UPI ID when available, a primary UPI deep-link CTA
that opens in a new context, and a separate explicit "mark as settled" step with
optional UTR capture. Settlement history now uses Owely status chips.

Verification: `npm run typecheck`, `npm run build`, `npm test`, and
`npm run lint` all clean.

---

## 2026-06-16 — Backend: contacts, offline-idempotent + own + recurring expenses

Backend only (no UI for these yet). `typecheck` clean, **23 tests pass**,
`build` clean (lint: 2 pre-existing warnings from the in-flight UI redesign's
unused imports, not errors).

**Contacts / member add** (`src/actions/groups.ts`)
- `findRegisteredUsers(phones[])` — normalises raw contact numbers to E.164 and
  returns which already have Owely accounts (the "who's already with us" check).
  Chunks into Firestore `in` queries of ≤30.
- `addMembersByPhone(groupId, people[])` — batch add by name+phone; registered
  users join immediately, others get pending invites. Dedups within the batch.
- Refactored the link-or-invite logic into a shared `linkOrInvite` helper used by
  both `inviteByPhone` (one) and the batch action; also skips duplicate pending
  invites. (Contact Picker UI is a future client task — Android/TWA only.)

**Offline-idempotent expense writes**
- `Expense.clientId` (+ `OwnExpense.clientId`): a client-generated key used as
  the doc ID. `addExpense` / `addOwnExpense` no-op if a doc with that id already
  exists, so an offline-queued write replayed on reconnect is created exactly
  once — never double-counted. (The client replay queue itself is a future UI
  task; the backend guarantee is in place.)

**Own (personal, un-split) expenses** — the "two sections per profile" ask
- New `OwnExpense` type, `users/{uid}/ownExpenses` subcollection, rule, and
  `src/actions/own-expenses.ts` (add/edit/delete). No splits, no group, no debt
  recompute — a personal ledger for bills the user pays alone (insurance, solo
  utility). Shared/group expenses remain the product focus.

**Recurring expenses** (monthly auto-logging)
- New `RecurringExpense` type + top-level `recurring/{id}` collection (+ rule).
- `src/actions/recurring.ts` — `createSharedRecurring` (stores the resolved
  paise split so generation always reconciles), `createOwnRecurring`,
  `updateRecurring` (pause/reschedule), `deleteRecurring`. Owner-scoped.
- `src/lib/recurring.ts` `generateDueRecurring(now)` — clones due definitions
  into real expenses on their `dayOfMonth`, once per month. Idempotent two ways:
  `lastRunMonth` guard + deterministic generated doc id `{recurringId}_{YYYY-MM}`.
  Recomputes simplified debts for affected groups.
- `POST /api/cron/recurring` — secret-guarded (`CRON_SECRET`, Bearer header) for
  Cloud Scheduler to hit daily. Added `CRON_SECRET` to `.env.example` + local
  `.env.local`.

**Refactors / supporting**
- Extracted `computeSplits` into `src/lib/expense-splits.ts` (pure) so the
  expense action and the recurring generator build splits identically.
- Read-model: `fetchOwnExpenses`, `fetchOwnedRecurring`, `fetchGroupRecurring`;
  `clientId`/`recurringId` now mapped on expenses.
- `firestore.rules`: added `ownExpenses` (owner-only read) and `recurring`
  (owner or shared-group-member read); both write-denied (Admin only).

**Copy**: removed "free forever / no paywalls / no ads / not selling your data"
claims from the landing page, login page, and root metadata.

**Setup note**: Cloud Scheduler isn't wired in the console yet — recurring
generation won't run until a daily `POST /api/cron/recurring` with the
`CRON_SECRET` Bearer header is scheduled (or call it manually to test).

---

## 2026-06-16 — Phases 1–5 built: full app end-to-end

The core product is now functional: sign in → create a group → invite by phone →
add expenses (3 split types) → see simplified debts → settle over UPI. All gates
green: `typecheck` clean, **23 tests pass**, `build` clean, `lint` clean.

**Phase 1 — server plumbing**
- `src/lib/result.ts` — `ActionResult<T>` discriminated union (`success`/`failure`,
  with `code` + `fieldErrors`). Actions never throw across the client boundary.
- `src/lib/validation.ts` — Zod schemas for every action input + `parseInput` /
  `parseActionData`. `PhoneSchema` normalises to E.164 `+91…`. Money stays out of
  Zod (the action converts via `rupeesToPaise`). Added `zod` to deps.
- `src/lib/session.ts` — `getSessionUser` / `requireSession` (redirect) and
  `authorizeUser` / `authorizeMember` (return `ActionResult`). Verifies the
  `__session` cookie via Admin `verifySessionCookie`.
- `src/lib/session-cookie.ts` — cookie constants with **no heavy imports** so the
  edge proxy can read them without pulling in the Admin SDK.
- `src/lib/read-model.ts` — all Admin reads + the single `Timestamp → millis`
  conversion; shapes docs into domain types.
- `src/app/api/auth/session/route.ts` — `POST` mints the session cookie from an
  ID token, `DELETE` clears it.
- **`src/proxy.ts`** — Next 16 renamed Middleware → **Proxy** (`middleware.ts` is
  deprecated; `export function proxy()`). Gates `/groups` + `/settings` on cookie
  presence only.

**Phase 2 — auth + shell**
- `src/actions/auth.ts` — `ensureUser` (upserts `users/{uid}`, links pending phone
  invites on first sign-in), `updateProfile` (display name + UPI ID).
- `LoginForm` (Google popup + Phone OTP w/ invisible reCAPTCHA), `SignOutButton`,
  `(auth)/login`, server-guarded `(app)/layout.tsx`. No global AuthProvider —
  the server session cookie is the source of truth; client auth is transient.

**Phase 3 — groups**
- `src/actions/groups.ts` — create / rename / delete (creator only, recursive) /
  leave (hands off creator role; deletes empty group) / `inviteByPhone` (links an
  existing user immediately, else pending invite) / `acceptInvite`.
- `(app)/groups` list (net position read off stored `simplifiedDebts`),
  `(app)/groups/[groupId]` dashboard, `CreateGroupForm`, `InviteMemberForm`,
  `GroupMenu`.

**Phase 4 — expenses**
- `src/actions/expenses.ts` — `addExpense` / `editExpense` / `deleteExpense`.
  Pipeline: authorize → validate → build integer-paise splits (`splitEqual` /
  `splitByWeights` / `assertExactSplit`) → Admin write → recompute → revalidate.
- `ExpenseForm` (equal / unequal / percentage tabs, **inline reconciliation**
  before submit), `ExpenseFeed` (client `onSnapshot` live + offline, server
  initial), new + edit routes. Edit reopens as exact "unequal" (split type isn't
  stored; exact paise reproduces any split losslessly).

**Phase 5 — settlements + UPI**
- `src/lib/upi.ts` (+ tests) — `buildUpiLink` (paise→rupees at the boundary).
- `src/actions/settlements.ts` — `settleUp` (payer records a completed payment +
  optional UTR — collapses the record/mark two-step into one payer action) and
  `disputeSettlement` (payee only). `(app)/groups/[groupId]/settle` + `SettlePanel`.
- `src/lib/recompute.ts` — shared recompute used by expense + settlement actions.
  Engine refactored: `simplifyFromNet` + `netWithSettlements` fold **completed**
  settlements into net balances, so paid debts don't reappear and disputes
  restore them.

**Notable deviations from the original plan**
- `middleware.ts` → `proxy.ts` (Next 16 breaking change; confirmed in bundled docs).
- Settlement `recordSettlement`/`markSettled` collapsed into one `settleUp`.
- No `AuthProvider` context (not needed with server-side session).
- `/settings` profile page added (UPI ID is required for the settle deep link).

**Deferred (not built):** Phase 6 (templates · recurring · OCR · PDF) and Phase 7
(PWA + a11y sweep). Console setup (API key, App ID, service-account key) still
blocks a live deploy — see below.

---

## 2026-06-16 — Phased build plan documented (no code)

- Added **`docs/PHASES.md`** — the whole app broken into Phases 0–7 with
  deliverables + acceptance per phase. Phase 0 (foundation) is done; Phases 1–7
  are planned and tracked. Build order and cross-phase invariants captured there.
- Recorded the 5 reviewed architecture decisions as **confirmed** (see
  `docs/ARCHITECTURE.md` §8 and `docs/PHASES.md` header).
- **Decision 4 changed the data model:** settlements now capture a payment
  reference. `Settlement` gained `paymentRef?`, `settledBy?`, `settledAt?`, and a
  `"disputed"` status (`src/types/index.ts`). Payer marks paid + pastes the UPI
  UTR; payee can dispute. No engine/action code written yet.
- No application code built this session — documentation + the one type change
  only. Next actionable: **Phase 1 (server plumbing)**, tracked as task #1.

---

## 2026-06-16 — Project bootstrap + Firebase + deployable shell

**What exists now**

- **Scaffold:** Next.js 16 (App Router, Turbopack), React 19, TypeScript strict,
  Tailwind v4, Vitest. Own git repo at `C:\Users\mehul\Documents\Codex\owely`,
  separate from FitSplit.
- **Domain types** — `src/types/index.ts`.
- **Money engine** — `src/lib/money.ts` (+ tests): paise format/parse,
  `splitEqual`, `splitByWeights`, `assertExactSplit`. Largest-remainder split so
  totals always reconcile.
- **Debt engine** — `src/lib/simplify-debts.ts` (+ tests): net balances + greedy
  min-cashflow. Pure function. **18 tests pass, typecheck clean.**
- **Firebase layer** — `src/lib/firebase/{client,admin,collections}.ts`.
  Client = Auth + offline-persistent Firestore reads; Admin = `server-only`
  privileged writes; collections = typed names/paths.
- **Landing page** — `src/app/page.tsx` (real Owely page, verified serving 200
  with correct title/branding). Metadata updated in `layout.tsx`.
- **Firestore rules** — `firestore.rules` (deny client writes, scope reads).
- **App Hosting config** — `apphosting.yaml`, `.firebaserc`, `firebase.json`.
- **Docs** — `AGENTS.md` (imported by `CLAUDE.md`), `docs/STATE.md`, this file,
  `README.md`, `.env.example`.

**To actually deploy and get a live URL** (one-time, console + CLI):

1. **Register a Web app:** Firebase console → `owely-c6c51` → Project settings →
   Your apps → add Web app. Copy `apiKey` and `appId`.
2. Paste them into `.env.local` (local dev) **and** `apphosting.yaml` (build).
3. **Service account:** Project settings → Service accounts → Generate new
   private key. Put the JSON (raw or base64) into `.env.local` as
   `FIREBASE_SERVICE_ACCOUNT_KEY`. For prod, create the App Hosting secret:
   `firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT_KEY`, then
   uncomment the secret block in `apphosting.yaml`.
4. **Push to GitHub** (create a repo for Owely first; this is a fresh local git
   repo with no remote yet).
5. **Create the backend:** `firebase apphosting:backends:create --project owely-c6c51`
   (or console → App Hosting → Get started) and connect the GitHub repo + branch.
   App Hosting builds on every push and gives a `*.hosted.app` URL.
6. **Deploy Firestore rules:** `firebase deploy --only firestore:rules --project owely-c6c51`.
7. **Enable Auth providers:** console → Authentication → Sign-in method → enable
   **Google** and **Phone**. For Phone OTP add your domain to the authorized
   list and set up reCAPTCHA.

**Decisions / notes**

- Stack says Vercel; switched deploy target to **Firebase App Hosting** per
  request (SSR-capable, matches the existing FitSplit setup).
- `create-next-app` installed **Next 16**, not the spec's 15. App Router APIs are
  unchanged; not pinned. Revisit if a Next-15-specific need arises.
- Firebase web config lives in `NEXT_PUBLIC_*` (not secret by design; security is
  enforced by rules + App Check, not key secrecy).
- Storage bucket assumed `owely-c6c51.firebasestorage.app` (new-project default).
  Confirm against the console; older projects use `.appspot.com`.

**Not yet built** (next, in priority order)

Auth flow UI + session cookie · `src/actions/` Server Actions skeleton · Group
CRUD + invite by phone · Add-expense UI (equal/unequal/percentage) · Settlement +
UPI deep link · templates · recurring (Cloud Function) · receipt OCR · PDF export.
