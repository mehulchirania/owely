<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Owely — Agent Context

> `CLAUDE.md` imports this file via `@AGENTS.md`, so Claude and Codex share one
> source of truth. Keep it that way to avoid context drift between sessions.

## Project identity

Free, **India-first** expense-splitting app — a Splitwise alternative with **no
feature gating and no paywalls**. Targets Android + Web.
Firebase project: **`owely-c6c51`** (project number `167116474777`).
Developer: Mehul Chirania (`mehulchirania@gmail.com`), Bengaluru.

## Stack

Next.js 16 (App Router, Server Components, Server Actions) · React 19 ·
TypeScript 5 (strict, no `any`) · Tailwind CSS v4 · Firebase Auth (Google +
Phone OTP) · Firestore (offline persistence) · Vitest. Deploy target:
**Firebase App Hosting** (SSR).

## Workflow rules (non-negotiable)

1. **Edit files directly in this repo, current branch. Never `git worktree add`,
   never create a side branch.**
2. **After every change: update `README.md`, prepend a dated entry to
   `PROJECT_HANDOFF.md`, and keep `docs/STATE.md` current.** Stale docs cause
   context drift between Claude and Codex sessions.
3. **Run `npm run typecheck` after every edit.** `strict: true` — fix every type
   error before committing. No `any`.
4. **`npm run build` must exit clean.** Resolve all ESLint errors.
5. **`npm test` must pass.** The money + debt engines are correctness-critical;
   add tests when you touch them.

## Money model (overrides everything)

- **All money is integer paise** (1 INR = 100 paise). Never floats. Display
  divides by 100 only at the edge (`formatPaise`).
- **Splits must always reconcile to the exact total.** Use `splitEqual` /
  `splitByWeights` from `src/lib/money.ts` — largest-remainder distribution so no
  paisa is lost or invented. Validate unequal splits with `assertExactSplit`.
- `rupeesToPaise`: strings validated strictly (reject sub-paise); numbers rounded
  to nearest paise (absorb float drift).

## Debt simplification

`simplifyDebts(expenses, members, groupId, idFactory, now?)` in
`src/lib/simplify-debts.ts`. Pure function — runs identically in a Server Action
and in tests. Net balance (paid − owed) → greedy largest-debtor/largest-creditor
matching → ≤ n−1 transfers. Money conserved exactly; transfer count is a
near-minimal heuristic (true minimum is NP-hard). **Recompute on every expense
add/edit/delete** and store on `group.simplifiedDebts`.

## Architecture & conventions

- Types in `src/types/` — every Firestore collection has a corresponding type.
- Pure utils in `src/lib/` (no React, no Firebase imports).
- Firebase in `src/lib/firebase/`: `client.ts` (browser, reads + Auth),
  `admin.ts` (`server-only`, privileged writes), `collections.ts` (names/paths).
- **Server Actions are the only Firestore write path** (`src/actions/`, to be
  built). Admin SDK bypasses security rules → each action MUST verify the session
  and check group membership itself.
- Components in `src/components/` (to be built).
- **Never write Firestore directly from the client.**

## Firestore layout

```
users/{uid}
groups/{groupId}
groups/{groupId}/expenses/{expenseId}
groups/{groupId}/settlements/{settlementId}
invites/{inviteId}        phone-based group invites
templates/{templateId}    saved split templates (ownerUid-scoped)
```

`firestore.rules` is the **client-SDK defense layer only**: denies all client
writes (writes go through Admin SDK) and scopes reads to the signed-in user /
their groups. Primary authorization lives in the action layer.

## Settlement / UPI

UPI deep link: `upi://pay?pa={upiId}&pn={name}&am={amount}&cu=INR`. `am` is in
**rupees** (divide paise by 100, 2 decimals, at the link boundary). Owely never
holds funds — it only opens the user's UPI app, deliberately avoiding
payment-aggregator regulation.

## Deployment (Firebase App Hosting)

- Config in `apphosting.yaml`; public `NEXT_PUBLIC_FIREBASE_*` inlined at BUILD,
  Admin key a RUNTIME secret. `.firebaserc` pins `owely-c6c51`.
- URL format: `<backend>--owely-c6c51.<region>.hosted.app`.
- Launch steps in `PROJECT_HANDOFF.md`.

## Env vars

See `.env.example`. Still TODO from the console: `NEXT_PUBLIC_FIREBASE_API_KEY`,
`NEXT_PUBLIC_FIREBASE_APP_ID` (register a Web app), `FIREBASE_SERVICE_ACCOUNT_KEY`
(generate a service-account key).

## What NOT to build

- Multi-currency UI (model supports it; UI stays INR-only).
- Friend graph outside groups.
- Bilateral IOU tracking (different product).

## Commands

```
npm run dev        # next dev (Turbopack)
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run build      # next build
npm run lint       # eslint
```
