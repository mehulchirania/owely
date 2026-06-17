<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Owely — Agent Context

> `CLAUDE.md` imports this file via `@AGENTS.md`, so Claude and Codex share one
> source of truth. Keep it that way to avoid context drift between sessions.

## Project identity

**India-first** freemium expense-splitting app. Targets Android + Web.
Provides free (100 expenses/mo) and paid tiers. Paid unlocks unlimited expenses,
multi-currency, OCR receipt capture, PDF export, and other advanced features.
Core splitting supports both groups and 1:1/direct relationships through the
same group expense/debt engine.
Firebase project: **`owely-c6c51`** (project number `167116474777`).
Developer: Mehul Chirania (`mehulchirania@gmail.com`), Bengaluru.

## Stack

Next.js 16 (App Router, Server Components, Server Actions) · React 19 ·
TypeScript 5 (strict, no `any`) · Tailwind CSS v4 · Firebase Auth (Google +
Phone OTP) · Firestore (offline persistence) · Vitest. Deploy target:
**Firebase App Hosting** (SSR).

## Agent behavior

### Token efficiency
No conversational filler. No restating the question. No "Great question!" openers. Lead with the answer or the action. If a response would be pure acknowledgement, skip it.

### Verify before asserting
Never claim a function, file, component, Firestore path, or type exists without reading it first. Memory of what was written earlier is not the same as what is on disk. Read → reason → act. This applies equally to money utils, debt engine logic, and UI component assumptions.

### Response formatting
Use prose over bullet points for explanations and reasoning. Bullets are for reference material, checklists, and schema definitions — not for thinking out loud. No excessive bolding inside prose. Never use bullets when declining or redirecting. Tables are for comparisons, not for things a sentence would cover.

### File creation strategy
- **Under 100 lines:** write the complete file in one pass.
- **Over 100 lines:** outline the structure first, build section by section, review, then finalize. Never dump an unreviewed 400-line file in one block.
- **File vs inline:** a component, hook, action, or util is a file. An explanation or short snippet stays inline.

### Complexity calibration
- **Simple bug or style fix:** direct edit, no preamble.
- **New feature under 3 files:** implement with brief rationale.
- **New feature touching money model, debt engine, or auth:** state the plan and get confirmation before writing code.
- **Architectural change:** start with "Here's what I'd actually do", state the exact decision, name the hidden friction, close with what the top teams do differently.

### Decision making
- Prioritize long-term maintainability over clever shortcuts.
- When two approaches are equally valid, pick the one that produces less code.
- Handle edge cases at the boundary (auth, group membership checks, paise arithmetic) — not inside business logic.
- Never leave a TODO without a linked decision — either implement it or open a tracked issue.
- When something is unclear, ask one question. If it would block progress, state the assumption and proceed — flag it so the user can redirect.

---

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

## UI / UX standards

### Design principles
- Every screen must work at 375px (iPhone SE) without horizontal scroll. Owely targets Android — test at small viewport first.
- Touch targets minimum 44×44px — no exceptions for icons, split-type selectors, or member chips.
- Interactive elements must have a visible focus state. Don't remove outlines without replacing them.
- Motion: respect `prefers-reduced-motion`. Wrap any animated transitions in a check before applying.
- Color contrast minimum AA: 4.5:1 for body text, 3:1 for large text and UI components.

### Component discipline
- One component, one responsibility. If a component needs a comment explaining what it does, split it.
- Props are typed explicitly — no `any`, no spreading unknown objects into DOM elements.
- Loading and error states are not optional. Every async operation has three UI states: loading, success, error.
- Money display: always render via `formatPaise` at the edge. Never format paise inline inside a component — the conversion belongs in one place.

### State and data flow
- Firestore-derived state is the source of truth. Never duplicate it into local state that can drift.
- Local UI state (modals, toggles, form fields) lives in `useState` / `useReducer`.
- Optimistic updates for expense add/edit actions — the app must feel instant on poor connectivity.
- Destructive actions (delete expense, leave group) require a confirmation step. No undo = must confirm.

### UX patterns
- Empty states are designed, not blank. An empty group tells the user to add an expense, not just shows nothing.
- Paise input: accept rupee decimals from the user (`rupeesToPaise` at form submission boundary), never expose raw paise in input fields.
- Split validation errors are inline and immediate — show reconciliation mismatch before submit, not after.
- UPI deep links open in a new context; don't navigate away from the settlement screen until the user confirms the payment was made.
- Cash is the only non-UPI settlement method. Record it manually; do not add card,
  wallet, payment-gateway, or payment-aggregator flows.

---

## Backend / Firestore discipline

### Data model
- Prefer flat collections over deeply nested subcollections. Current schema is the reference — don't add nesting without a clear reason.
- Denormalize deliberately. If a field is read in a list view, it belongs on the list document — don't require a secondary fetch.
- Document IDs are auto-generated or deterministic slugs. Never use phone number, email, or UID as a document ID in group or expense collections.
- Timestamps use `serverTimestamp()` — never `new Date()` on the client.
- When adding a new collection: write the Firestore security rule for it in the same change. Never leave a collection unprotected.

### Error handling
- All Firestore and Admin SDK calls are wrapped in try/catch at the call site. Errors are typed, not swallowed.
- Firebase Auth errors are mapped to user-readable messages before surfacing — never expose raw error codes to the UI.
- Server actions return a typed result. Never throw unstructured errors from an action.
- Money-critical paths (expense create/edit, settlement record) must validate `assertExactSplit` before writing. A partial write with a reconciliation error is worse than a failed write.

### Security
- Every Server Action verifies the session and checks group membership itself — Admin SDK bypasses Firestore rules.
- `firestore.rules` denies all client writes. This is a feature, not a limitation — don't add client write rules to work around a missing action.
- Never write Firestore directly from the client.

---

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
categories/{categoryId}   custom group/direct categories (ownerUid-scoped)
```

`groups/{groupId}.type` is `"group"` or `"direct"`. A direct group is exactly
two members and represents a 1:1 relationship while reusing the same expense,
settlement, and debt simplification paths. Direct group IDs are deterministic
opaque hashes of the sorted UID pair, with `directPairKey` stored for audits and
dedupe. Categorization belongs to the relationship/group, not globally to the
other user.

`firestore.rules` is the **client-SDK defense layer only**: denies all client
writes (writes go through Admin SDK) and scopes reads to the signed-in user /
their groups. Primary authorization lives in the action layer.

## Settlement / UPI + Cash

UPI deep link: `upi://pay?pa={upiId}&pn={name}&am={amount}&cu=INR`. `am` is in
**rupees** (divide paise by 100, 2 decimals, at the link boundary). Cash
settlements are manual records with the same payer-confirmed flow. Owely never
holds funds — it only opens the user's UPI app or records cash, deliberately
avoiding payment-aggregator regulation.

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
- Payment aggregation, card payments, wallet payments, or in-app stored value.
- Friend graph outside groups/direct relationships.
- Bilateral IOU tracking (different product).

## Commands

```
npm run dev        # next dev (Turbopack)
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run build      # next build
npm run lint       # eslint
```
