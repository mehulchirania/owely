# Owely — Phased Build Plan

The full app, broken into shippable phases. Each phase is independently
verifiable (`npm run typecheck && npm test && npm run build` clean) and leaves
the app in a working state. Build in order; later phases depend on earlier ones.

**Confirmed decisions** (from review of `docs/ARCHITECTURE.md` §8):
1. Android = **PWA wrapped as a TWA** (one codebase).
2. Read path = **hybrid** (Server Components for initial render, client
   subscriptions for the live group feed).
3. Session = **Firebase `__session` cookie**, 14-day, verified in middleware +
   every action.
4. Settlement confirmation = **payer marks paid and captures a payment reference
   (UPI UTR) where available**; the reference is stored on the settlement so the
   payee can verify. (Drove the `Settlement.paymentRef` / `settledBy` /
   `settledAt` fields + a `"disputed"` status.)
5. Group invites = **phone is the primary join key** (pending `invites/{id}`
   linked on first sign-in).

Legend: ☐ not started · ◧ in progress · ☑ done.

---

## Phase 0 — Foundation ☑ (complete)

Scaffold, domain types, money engine, debt-simplify engine, Firebase SDK layer,
landing page, Firestore rules, App Hosting config, docs. 18 tests passing.
See `docs/STATE.md` for the detailed inventory.

---

## Phase 1 — Server plumbing ☑

The shared spine every Server Action and protected route depends on.

Deliverables
- `src/lib/result.ts` — `ActionResult<T>` discriminated union + `success()` /
  `failure()` helpers. Actions never throw across this boundary.
- `src/lib/validation.ts` — Zod schemas (expense, group, settlement, invite,
  template) + `parseActionData(formData, schema)` (FormData → object → parse).
- `src/lib/session.ts` — `requireSession()` and `requireMember(groupId)` guards;
  resolve the user from the `__session` cookie via Admin `verifySessionCookie`.
- `src/app/api/auth/session/route.ts` — `POST` sets the session cookie from an ID
  token; `DELETE` clears it (sign-out).
- `src/proxy.ts` — gate `(app)/*` on cookie presence (routing only). **Built as
  `proxy.ts`, not `middleware.ts`:** Next 16 renamed Middleware → Proxy and
  deprecates the old filename (confirmed in the bundled docs). Imports only the
  cookie constant from `lib/session-cookie.ts` to keep the Admin SDK out of the
  edge bundle.

Acceptance: guards + validation unit-tested; typecheck/build clean. No UI yet.

Notes / decisions
- Timestamps: writes use Admin `FieldValue.serverTimestamp()`; read-models
  convert `Timestamp → epoch millis` so the `number` fields in `src/types` hold.
  This conversion lives in one read-model helper, not scattered.

---

## Phase 2 — Auth UI + app shell ☑

Deliverables
- `(auth)/login` — Google sign-in + Phone OTP (reCAPTCHA verifier) screens.
- `AuthProvider` (client) — exposes auth state; posts the ID token to
  `/api/auth/session` on sign-in, calls `DELETE` on sign-out.
- `(app)/layout.tsx` — authenticated shell (nav, sign-out), server-guarded.
- First-sign-in: create/merge `users/{uid}`; link any pending phone invites.

Acceptance: full Google + Phone OTP login → session cookie → gated route → sign
out. Works at 375px. Auth errors mapped to readable messages.

---

## Phase 3 — Groups ☑

Deliverables
- `src/actions/groups.ts` — `createGroup`, `renameGroup`, `deleteGroup`,
  `leaveGroup`, `inviteByPhone`, `acceptInvite`. Each verifies session +
  membership; dual nothing (single source — group doc).
- `invites/{inviteId}` collection + **its security rule in the same change**
  (read/write denied to client; action-only).
- Group list page (RSC) + create-group flow.
- Group dashboard shell (members, simplified-debt summary placeholder).

Acceptance: create a group, invite a phone, second account accepts on sign-in,
both see the group. Delete → archived/removed with confirmation.

Open question to resolve in-phase: shareable invite link as a fallback to phone
(default no; phone is the join key per Decision 5).

---

## Phase 4 — Expenses ☑

The core loop; touches the money + debt engines (state plan before coding).

Deliverables
- `src/actions/expenses.ts` — `addExpense`, `editExpense`, `deleteExpense`.
  Pipeline: `requireMember` → `parseActionData` → build splits in paise
  (`splitEqual` / `splitByWeights` / `assertExactSplit`) → Admin write →
  recompute `simplifyDebts` over all group expenses → write
  `group.simplifiedDebts` → revalidate.
- Add-expense UI: amount (rupees → paise at boundary), payer, category,
  split-type tabs (equal / unequal / percentage) with **inline reconciliation
  validation** before submit.
- Expense feed inside the group — client subscription (realtime + offline).
- Optimistic add/edit.

Acceptance: add expenses with all three split types; balances + simplified debts
update correctly; engine tests extended for the action path; reconciliation
mismatch blocked at the UI.

---

## Phase 5 — Settlements + UPI ☑

Deliverables
- `src/lib/upi.ts` — deep-link builder `upi://pay?pa=&pn=&am=&cu=INR` (paise →
  rupees, 2 decimals, URL-encoded `pn`). Unit-tested.
- `src/actions/settlements.ts` — `recordSettlement` (creates `pending`),
  `markSettled(paymentRef?)` (payer confirms, stores ref + `settledBy`/
  `settledAt` → `completed`), `disputeSettlement` (payee → `disputed`).
- Settle-up UI: show simplified transfers; "Pay via UPI" opens the deep link;
  on return, capture the payment reference and mark paid. Don't navigate away
  until the user confirms.

Acceptance: settle a debt end-to-end with a captured reference; disputed path
works; settlement recompute reflects in balances.

---

## Phase 6 — Templates · Recurring · OCR · PDF ◧ (backend partially done)

Largest phase; each sub-feature is independent and can ship separately.

Deliverables
- **Templates** ☐ — `templates/{id}` (ownerUid-scoped) + rule; save participants +
  split ratio; reuse in one tap on the add-expense screen.
- **Recurring** ☑ (backend) — `recurring/{id}` definition collection (shared +
  own scope) + rule. `lib/recurring.ts` `generateDueRecurring` clones due defs
  into real expenses on `dayOfMonth` (1–28), once/month (idempotent via
  `lastRunMonth` + deterministic `{recurringId}_{YYYY-MM}` doc id). Triggered by
  `POST /api/cron/recurring` (secret-guarded) — wire Cloud Scheduler to hit it
  daily. Actions in `actions/recurring.ts`. **No UI yet.**
- **Own vs shared expenses** ☑ (backend) — NEW: `OwnExpense` + per-user
  `users/{uid}/ownExpenses` for un-split personal bills (insurance, solo
  utility), separate from the focus (shared group expenses).
  `actions/own-expenses.ts` + rule. **No UI yet.**
- **Contacts member-add** ☑ (backend) — `findRegisteredUsers` (which contacts
  are on Owely) + `addMembersByPhone` (batch link/invite). UI (Contact Picker
  API, Android/TWA only, with manual fallback) is a future client task.
- **Offline writes** ☑ (backend) — `clientId` idempotency on `addExpense` /
  `addOwnExpense` so a client replay queue can't double-count. The queue itself
  is a future client task.
- **Receipt OCR** ☐ — Storage upload → Cloud Function calls Google Vision →
  prefill the expense form. `receiptURL` on expense.
- **PDF export** ☐ — server route renders group history to a downloadable PDF.

Acceptance: each sub-feature demoable; new collections carry their rules; no
client writes introduced.

---

## Phase 7 — PWA + polish ☐

Deliverables
- PWA manifest + service worker (installable; offline shell).
- TWA packaging notes for the Play Store listing (`docs/` how-to).
- Pass over empty / loading / error states across all screens.
- Accessibility sweep: 375px no-scroll, 44px touch targets, visible focus,
  `prefers-reduced-motion`, AA contrast.
- **Freemium Limits**: Server actions enforce max 100 expenses/mo for free tier, unlimited for premium.
- **Multi-Currency Settings**: Group-level base currency, user preference for display, dynamic UI handling.

Acceptance: Lighthouse PWA installable; a11y checks pass; ready for a TWA build.

---

## Cross-phase invariants (apply to every phase)

- Integer paise everywhere; `formatPaise` only at the display edge.
- Writes go through Server Actions (Admin SDK) only; client never writes.
- New collection ⇒ its Firestore rule in the same change.
- Server timestamps on write; convert to millis in one read-model helper.
- Every action: `requireSession()` + membership check; returns `ActionResult`.
- After every change: update `README.md`, prepend `PROJECT_HANDOFF.md`, keep
  `docs/STATE.md` + this file current.
- `npm run typecheck && npm test && npm run build` clean before a phase is "done".
