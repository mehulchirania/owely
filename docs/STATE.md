# Owely — Current State

India-first freemium expense-splitting app. Android + Web.

_Last updated: 2026-06-16_

## Stack (as scaffolded)

- **Next.js 16.2.9** (App Router, Server Components, Server Actions) — note:
  the spec said Next 15; `create-next-app` installed 16. App Router APIs are
  unchanged. Pin to 15 if there's a reason to.
- React 19.2 · TypeScript 5 (strict) · Tailwind v4 · Vitest 4
- Target deploy: Vercel
- Planned: Firebase Auth (Google + Phone OTP), Firestore (offline persistence)

## Project layout

```
src/
  types/index.ts    All domain types (single source of truth)
  lib/
    money.ts (+test)         Paise math: format/parse, splitEqual, splitByWeights
    simplify-debts.ts(+test) Net balances + greedy min-cashflow; simplifyFromNet,
                             netWithSettlements, netPositionFromSettlements
    upi.ts (+test)           UPI deep-link builder (paise→rupees at boundary)
    result.ts                ActionResult<T> success/failure
    validation.ts            Zod schemas + parseInput/parseActionData
    session.ts               requireSession / authorizeUser / authorizeMember
    session-cookie.ts        Cookie constants (import-safe for the edge proxy)
    read-model.ts            Admin reads + Timestamp→millis conversion
    recompute.ts             Shared simplified-debt recompute (server-only)
    firebase/{client,admin,collections,auth-errors}.ts
  actions/          The only write path (Server Actions)
    auth.ts  groups.ts  expenses.ts  settlements.ts
  components/       LoginForm, SignOutButton, CreateGroupForm, InviteMemberForm,
                    GroupMenu, ExpenseForm, ExpenseFeed, SettlePanel, ProfileForm
  app/
    page.tsx                       marketing landing
    (auth)/login                   Google + Phone OTP
    (app)/                         server-guarded shell
      groups, groups/[groupId], .../expenses/new, .../expenses/[id]/edit,
      .../settle, settings
    api/auth/session/route.ts      set/clear session cookie
  proxy.ts          Route gate (Next 16 Middleware → Proxy)
docs/STATE.md       ← this file
.env.example        Template; copy to .env.local
```

Conventions (from project brief): components in `/components`, server actions in
`/actions`, utils in `/lib`, types in `/types`. Firestore writes only through
Server Actions.

## Money model — the rules that are already enforced in code

- **Everything is integer paise.** No floats touch money. Display divides by 100
  at the edge only (`formatPaise`).
- **Splits always reconcile.** `splitEqual` and `splitByWeights` distribute the
  paise remainder deterministically (largest-remainder method) so the per-member
  values sum back to the exact total. Verified by property-style tests across
  awkward amounts.
- `rupeesToPaise`: strings validated strictly (rejects sub-paise precision);
  numbers rounded to nearest paise (absorbs float drift like `0.1 + 0.2`).
- `assertExactSplit` guards unequal splits before persistence.

## Firebase

- **Project:** `owely-c6c51` (project number / messagingSenderId `167116474777`).
- **Client SDK** (`lib/firebase/client.ts`): Auth + Firestore reads only, with a
  persistent multi-tab IndexedDB cache (offline support). Config from
  `NEXT_PUBLIC_FIREBASE_*` — public by design; access is governed by security
  rules, not key secrecy.
- **Admin SDK** (`lib/firebase/admin.ts`, `server-only`): the *only* write path,
  used inside Server Actions. Bypasses security rules → authorization must be
  enforced in the action layer (verify session, check group membership).
  Credentials via `FIREBASE_SERVICE_ACCOUNT_KEY` (raw JSON or base64).
- **Two values still needed** from the console (register a Web app + generate a
  service-account key): `NEXT_PUBLIC_FIREBASE_API_KEY`,
  `NEXT_PUBLIC_FIREBASE_APP_ID`, and `FIREBASE_SERVICE_ACCOUNT_KEY`.

## Debt simplification

`simplifyDebts(expenses, members, groupId, idFactory, now?)`:
1. Net balance per member (paid − owed), always sums to 0.
2. Partition creditors / debtors.
3. Greedy: largest debtor → largest creditor.
4. ≤ n−1 transfers; money is conserved exactly (test-verified by reconstructing
   net balances from the emitted settlements).

`idFactory` and `now` are injected for determinism/testability. The engine is a
pure function so it can run inside a Server Action and in tests identically.

> Heuristic, not provably minimal (that's NP-hard) — same tradeoff Splitwise
> makes. Correctness (conservation) is exact; transfer count is near-minimal.

## Status

- [x] Project scaffold (Next 16, TS strict, Tailwind v4)
- [x] Domain types
- [x] Money/paise utilities + tests
- [x] Debt simplification engine + tests
- [x] Vitest wired (`npm test`, `npm run typecheck`)
- [x] Firebase SDK layer (client + admin + collection paths), env-driven
- [x] Deployable landing page (verified serving 200) + metadata
- [x] Firestore security rules (deny client writes, scope reads)
- [x] Firebase App Hosting config (`apphosting.yaml`, `.firebaserc`, `firebase.json`)
- [x] Docs: `AGENTS.md` (← `CLAUDE.md`), `PROJECT_HANDOFF.md`, `README.md`
- [x] Architecture reviewed + 5 decisions confirmed (`docs/ARCHITECTURE.md`)
- [x] Phased build plan documented (`docs/PHASES.md`, Phases 0–7)
- [x] Settlement model updated for payment-ref capture (Decision 4)

**Console setup (one-time, blocks deploy):**
- [ ] Paste `apiKey` + `appId` into `.env.local` + `apphosting.yaml`
- [ ] Service-account key → `FIREBASE_SERVICE_ACCOUNT_KEY`
- [ ] Create App Hosting backend + connect GitHub repo → live URL

**Build phases (see `docs/PHASES.md` for deliverables):**
- [x] Phase 1 — Server plumbing (result, validation, session, route, **proxy**)
- [x] Phase 2 — Auth UI + app shell (Google + Phone OTP)
- [x] Phase 3 — Groups (actions + invite by phone)
- [x] Phase 4 — Expenses (add/edit, split types, simplify recompute)
- [x] Phase 5 — Settlements + UPI deep-link + payment-ref capture
- [x] `Owely.dc.html` design handoff applied to core app surfaces
- [x] Login redesigned to match the post-login web dashboard feel
- ◧ Phase 6 — Templates · recurring · OCR · PDF
  - [x] Recurring expenses (backend): `recurring/{id}` defs + `generateDueRecurring`
        + `/api/cron/recurring` (Cloud Scheduler hits it daily). Idempotent.
  - [x] Own (personal, un-split) expenses (backend): `users/{uid}/ownExpenses`
        + actions. The "two sections per profile" — own vs shared tracking.
  - [x] Contacts member-add (backend): `findRegisteredUsers` + `addMembersByPhone`.
  - [x] Offline-safe writes (backend): `clientId` idempotency on expense creation.
  - [ ] Templates · OCR · PDF · the UI for all of the above (no UI built yet).
- [ ] Phase 7 — PWA + polish

Phases 1-5 ship the full core loop. The dark Owely prototype styling now covers
landing/auth, the dashboard-style login screen, app shell, groups, expenses,
settlement, settings, forms, menus, and error states. Note: Next 16 renamed Middleware ->
**Proxy** (`src/proxy.ts`); settlement record/mark collapsed into one payer
`settleUp` action; no `AuthProvider` (server session cookie is source of truth).

## Commands

```
npm run dev        # next dev (Turbopack)
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run build      # next build
npm run lint       # eslint
```
