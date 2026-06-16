# Owely — Current State

India-first, free expense-splitting app (a Splitwise alternative). No feature
gating, no paywalls. Android + Web.

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
  types/            All domain types (single source of truth)
    index.ts        User, Group, Expense, Settlement, MemberDetail, enums
  lib/              Pure utilities (no React, no Firebase)
    money.ts        Paise math: format/parse, splitEqual, splitByWeights, asserts
    money.test.ts
    simplify-debts.ts   Net balances + greedy min-cashflow engine
    simplify-debts.test.ts
    firebase/
      client.ts     Browser SDK: Auth + Firestore (offline persistent cache)
      admin.ts      Server-only Admin SDK: privileged writes + session verify
      collections.ts  Collection names + typed path builders
  app/              Next.js routes (scaffold default only so far)
docs/
  STATE.md          ← this file
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
- [ ] Paste `apiKey` + `appId` into `.env.local` + `apphosting.yaml` (console)
- [ ] Service-account key → `FIREBASE_SERVICE_ACCOUNT_KEY` for Server Actions
- [ ] Create App Hosting backend + connect GitHub repo → live URL
- [ ] Auth flow UI (Google + Phone OTP) + session cookie
- [ ] Server Actions layer (`/actions`)
- [ ] Group CRUD + invite by phone
- [ ] Add-expense UI (equal / unequal / percentage)
- [ ] Settlement flow + UPI deep-link
- [ ] Templates, recurring, OCR, PDF export

## Commands

```
npm run dev        # next dev (Turbopack)
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run build      # next build
npm run lint       # eslint
```
