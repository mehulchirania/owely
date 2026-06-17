# Owely — Phased Build Plan

The full app, broken into shippable phases. Each phase is independently
verifiable (`npm run typecheck && npm test && npm run build` clean) and leaves
the app in a working state. Build in order; later phases depend on earlier ones.

**Confirmed decisions** (from review of `docs/ARCHITECTURE.md`):
1. Android = **PWA wrapped as a TWA** (one codebase).
2. Read path = **hybrid** (Server Components for initial render, client
   subscriptions for the live group feed).
3. Session = **Firebase `__session` cookie**, 14-day, verified in `proxy.ts` +
   every action.
4. Settlement = **UPI or cash only**. Payer marks paid and captures a payment
   reference where available; the payee can verify or dispute. No card, wallet,
   gateway, aggregator, or stored-value flows.
5. Group invites = **phone is the primary join key** (pending `invites/{id}`
   linked on first sign-in).
6. 1:1 expenses = **direct groups** (`type: "direct"`) that reuse the same
   expense, settlement, and debt engine.
7. Categories = predefined + owner-scoped custom categories for both groups and
   direct people.

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
- `LoginForm` + `SignOutButton` — client auth flows post the ID token to
  `/api/auth/session` on sign-in and call `DELETE` on sign-out.
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

## Phase 5 — Settlements + UPI + Cash ☑

Deliverables
- `src/lib/upi.ts` — deep-link builder `upi://pay?pa=&pn=&am=&cu=INR` (paise →
  rupees, 2 decimals, URL-encoded `pn`). Unit-tested.
- `src/actions/settlements.ts` — `settleUp` records a payer-confirmed completed
  UPI or cash settlement with optional reference; `disputeSettlement` lets the
  payee mark a completed settlement disputed.
- Settle-up UI: show simplified transfers; UPI opens the deep link; cash is
  recorded manually. Don't navigate away until the user confirms.

Acceptance: settle a debt end-to-end with a captured reference; disputed path
works; settlement recompute reflects in balances.

---

## Phase 6 — Direct People + Categories ◧

Core organization layer; not paid. This makes 1:1 expenses first-class without
forking the money/debt model.

Deliverables
- `Group.type`: `"group"` or `"direct"`.
- Direct relationship metadata: deterministic `directPairKey` and
  `directPeerUids` for list views and dedupe.
- Relationship categorization fields on `Group`: `categoryId`, `categoryName`,
  and `categoryKind`.
- Predefined group/direct categories in code.
- Custom category collection: `categories/{id}` owner-scoped, action-only writes.
- Direct relationship actions: create/link by registered user or phone invite,
  enforce exactly two members, dedupe existing direct pair.
- People page: list direct relationships, net balance per person, add-person
  flow, and entry into the shared expense/settlement screens.
- Category management UI: create/edit/delete custom categories, assign category
  to group/direct relationship.

Acceptance: 1:1 expenses use the same `Expense`, `Settlement`, and
`simplifyDebts` paths as groups; direct groups can never have more than two
members; categories are visible/filterable for both groups and people.

Status
- ☑ Domain foundation: group type, direct metadata, category fields, custom
  collection/rule, read-model mapping, predefined categories.
- ☑ Direct relationship actions and direct invite acceptance.
- ☑ People UI: list direct relationships, add person, route to existing
  expense/settle screens, hide group-only controls on direct ledgers.
- ☑ Category write path: `actions/categories.ts` create/update/delete
  (owner-scoped) + `setGroupCategory` (predefined or owned custom, or clear).
  `ensureUser` initializes new users' `tier:"free"` + `currency:"INR"`.
- ☐ Category management + filter UI (the only remaining Phase 6 piece).

---

## Phase 7 — Paid Features ◧ (backend partially done)

Largest phase; each sub-feature is independent and can ship separately.
Everything in this phase is paid-tier unless explicitly moved down later.

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
- **Multi-currency** ☐ — group-level base currency, user display preference,
  currency-specific formatting, and a clear no-FX/FX policy before launch.
- **Receipt OCR** ☐ — Storage upload → Cloud Function calls Google Vision →
  prefill the expense form. `receiptURL` on expense.
- **PDF export** ☐ — server route renders group history to a downloadable PDF.

Acceptance: each sub-feature demoable; new collections carry their rules; no
client writes introduced.

---

## Phase 8 — PWA + polish ☐

Deliverables
- PWA manifest + service worker (installable; offline shell).
- TWA packaging notes for the Play Store listing (`docs/` how-to).
- Pass over empty / loading / error states across all screens.
- Accessibility sweep: 375px no-scroll, 44px touch targets, visible focus,
  `prefers-reduced-motion`, AA contrast.
- **Freemium Limits**: Server actions enforce max 100 expenses/mo for free tier,
  unlimited for paid.

Acceptance: Lighthouse PWA installable; a11y checks pass; ready for a TWA build.

---

## Remaining roadmap (sequenced) — mostly UI on finished backends

The money/debt engine, auth, groups, direct 1:1s, settlements, own expenses,
recurring, contacts matching, categories, and freemium counting all exist as
verified backend. What's left is largely the UI to drive them, plus launch ops.
Sequenced by dependency and user value; each ships independently, gate-green.

**R1 — Categories UI (finishes Phase 6).** Backend ✅. Category management screen
(create/edit/delete custom), a picker on group/direct create + a "change
category" control (→ `setGroupCategory`), category chip (icon+color tint) on
list rows, and filter groups/people by category.

**R2 — Own-expenses UI (the "two sections per profile").** Backend ✅
(`actions/own-expenses.ts`, `users/{uid}/ownExpenses`). `/own` route: list +
monthly total + add/edit/delete; a Shared ⇄ Own switch in the nav.

**R3 — Recurring UI + scheduler.** Backend ✅ (`actions/recurring.ts`,
`generateDueRecurring`, `/api/cron/recurring`). "Make this monthly" on the
add-expense form; a manage screen to list/pause/reschedule/delete with next-run;
**ops:** wire Cloud Scheduler to POST the cron daily with `CRON_SECRET`.

**R4 — Contacts add UI.** Backend ✅ (`findRegisteredUsers`,
`addMembersByPhone`). Contact Picker API (Android/TWA, secure context) with a
manual name+number fallback; "on Owely" badges; batch add. Desktop = manual.

**R5 — Offline replay queue (client).** Backend guarantee ✅ (`clientId`
idempotency). IndexedDB queue for expense writes made offline; optimistic UI;
replay on reconnect; visible sync status. Pairs with the existing offline reads.

**R6 — Paid tier + multi-currency.** Backend: freemium counting ✅, `tier` field
✅; needs the upgrade/paywall UX on the `freemium-limit` result, plan state, and
multi-currency (group base currency + user display preference + per-currency
formatting; decide the no-FX vs FX policy before launch).

**R7 — Premium extras.** Templates (`templates/{id}` + reuse on add-expense),
Receipt OCR (Storage upload → Vision Cloud Function → prefill), PDF export
(server route → group history). Each independent.

**R8 — PWA + polish (Phase 8).** Manifest + service worker (installable, offline
shell), TWA packaging notes, a11y sweep (375px, 44px targets, focus,
reduced-motion, AA contrast), empty/loading/error pass.

**R9 — Deploy / ops.** Console: real `apiKey`/`appId` in `apphosting.yaml`,
service-account runtime secret, App Hosting backend + GitHub, Cloud Scheduler
(R3), any Firestore composite indexes, deploy `firestore.rules`. Then rotate the
dev service-account key.

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
