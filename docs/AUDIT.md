# Owely — Architecture, Security & Feature Audit

_Audited 2026-07-03 against `main` @ `fa6fa51`. Reviewer: full read of the action
layer, auth/session, payments, guest flow, money + debt engines, Firestore rules,
and representative UI. `npm run typecheck` clean; `npm test` 32/32 passing (4 test
files, engines only)._

---

## 1. Executive summary

Owely's core is genuinely well built. Integer-paise money, largest-remainder
splits that always reconcile, a pure `simplifyDebts` engine, Server Actions as the
sole write path, transactional debt recompute keyed on the group doc, and a
defense-in-depth rules layer are all correct and above the bar for a solo project.
**The backend does not need a rewrite.** What it needs is a set of surgical fixes,
because a handful of them are the difference between "good architecture" and "safe
to handle other people's money."

Three findings are release-blockers:

1. **The admin panel is protected by a forgeable static cookie** (`owely_admin_session=true`). Anyone can set that cookie in dev-tools and gain full admin — including flipping any account to `paid` and reading every user's name + phone. This is the single most serious issue in the codebase.
2. **Guest invite links are permanent, shareable bearer tokens** that let *anyone* the link reaches view a group's full ledger and record settlements that erase real members' debts. The link never expires and is never consumed.
3. **A ₹49 Trip Pass grants permanent Pro.** The webhook writes `tripPassExpiresAt`, but no entitlement check ever reads it, so the 30-day window is never enforced.

Below these sit a real revenue/UX problem — **multi-currency is sold but not
implemented** — plus session-revocation, webhook-hardening, and test-coverage gaps.

Verdict: keep the architecture, fix the list in §7 in order. Est. 2–3 focused days
to clear everything through High severity.

---

## 2. Architecture assessment (what's right — keep it)

- **Layering is clean and enforced.** `types/` → pure `lib/` → `features/*/actions` → route handlers. Money utilities have no React or Firebase imports; the debt engine is pure and reused identically by actions, the recurring generator, and tests. This is exactly the structure that keeps Claude and Codex sessions from drifting.
- **Writes go through one door.** Every mutation is a Server Action or route handler using the Admin SDK; `firestore.rules` denies all client writes and scopes reads to the signed-in user / their groups. The rules are correctly treated as a second line, not the primary control.
- **Money is correct.** `rupeesToPaise` builds paise from string parts to dodge float drift, rejects sub-paise, and rounds numbers to absorb IEEE-754 noise. `splitEqual` / `splitByWeights` use largest-remainder distribution and are covered by tests. `assertExactSplit` gates every write. No paisa is lost or invented.
- **Concurrency is handled deliberately.** `recomputeSimplified` reads the group doc first to pin the transaction, prefers the fresh member list over the caller's, and projects in-memory mutations before deriving balances (respecting Firestore's no-read-after-write rule). Freemium counting increments inside that same transaction, so concurrent adds can't race past the cap.
- **Idempotency is thought through.** `clientId` becomes the expense doc ID for offline replay; recurring generation uses `{recurringId}_{YYYY-MM}` deterministic IDs plus a `lastRunMonth` guard.

None of the above should be touched by the remediation work.

---

## 3. Security audit

Severity uses: **Critical** (exploitable now, high impact), **High** (exploitable
with modest effort or high impact), **Medium** (real but bounded), **Low** (hardening).

| # | Severity | Area | Finding |
|---|----------|------|---------|
| S1 | Critical | Admin auth | Admin session is a static forgeable cookie value; also `admin/admin` default off-prod |
| S2 | Critical | Guest links | Invite link is a permanent, reusable bearer token to the ledger + settlement writes |
| S3 | Critical | Billing | Trip Pass never expires — `tripPassExpiresAt` written but never enforced |
| S4 | High | Payments | Webhook has no amount cross-check and no event idempotency/dedupe |
| S5 | High | Payments | No client-side payment verification / reconciliation path if webhook is missed |
| S6 | High | Sessions | Session cookie verified with `checkRevoked:false` → 14-day window survives sign-out elsewhere |
| S7 | Medium | Privacy | `findRegisteredUsers` is an unrated phone-enumeration oracle returning uid + photo |
| S8 | Medium | Data integrity | `mergeGuestToUser` is not atomic across group + expenses + settlements |
| S9 | Medium | Abuse | No Firebase App Check → public API key + Phone Auth open to SMS-pumping / quota drain |
| S10 | Low | Authz model | Any member can rename/invite/add; `leaveGroup` reassigns ownership arbitrarily |

### S1 — Admin panel guarded by a forgeable cookie *(Critical)*

`src/features/admin/actions.ts` sets `owely_admin_session` to the literal string
`"true"` and `isAdminAuthenticated()` returns `cookie === "true"`. The value is not
signed, not a session token, and carries no identity. **Any visitor can open
dev-tools, set `document.cookie = "owely_admin_session=true"`, and load `/admin`.**
From there `updateUserAdmin` can flip any user to `paid` (direct revenue loss),
rewrite display names/phones, and the panel lists **every user's name and phone
number** — a PII breach. The `admin/admin` fallback when `NODE_ENV !== "production"`
compounds it for any non-prod deploy.

Fix: replace the boolean cookie with a signed, expiring session (HMAC the payload
with a server secret, or issue a Firebase custom claim `admin:true` and verify it
in `getSessionUser`). Gate `/admin` and every admin action on that. Remove the
`admin/admin` default entirely — fail closed when unconfigured. Rate-limit the
login. Consider moving admin off a password entirely to an allow-listed UID claim.

### S2 — Guest invite links are permanent bearer tokens *(Critical)*

Flow: `linkOrInvite` creates a `guest_<uuid>` member + an invite doc, and texts
`…/api/groups/{groupId}/guest-login?token={inviteId}`. That route
(`guest-login/route.ts`) verifies only that the invite exists, matches the group,
and is `pending`, then sets an HttpOnly cookie `guest_session_{groupId} = guestUid`.
`guestSettleUp` and the guest page trust that cookie with no further check.

Problems, compounding:

- **The link never expires** — `createdAt` is stored but never compared to now.
- **The link is never consumed.** The route does not flip `status` away from `pending`, so the same URL works forever and for unlimited devices. Anyone the invite is forwarded to (WhatsApp, a shared screenshot, a leaked SMS) becomes that guest.
- **A guest can write.** `guestSettleUp` records settlements as the guest, and a completed settlement folds into `netWithSettlements` on recompute — so a stranger with a forwarded link can **mark a real member's debt paid and zero it out**, corrupting the ledger for paying users.
- The token is a Firestore auto-ID sent in plaintext over SMS.

Fix: treat the guest link as a one-time credential. On first use, mint a random
high-entropy `guestToken`, store its hash on the invite, set an expiry (e.g. 7 days),
and bind the cookie to that token — not to the raw invite ID. Rotate/invalidate on
use or on account claim. Most importantly, **decide whether guests may write at
all**; recording settlements that alter others' balances from an unauthenticated
bearer link is the risk. Safer default: guests get read-only ledger access and a
"pay via UPI" deep link, but settlement confirmation requires the authenticated
counterparty (or the guest to sign in and claim). Add a Firestore rule + action
check so a `guest_*` uid can never be `to`/`from` on a settlement written by anyone
but themselves through the guarded path.

### S3 — Trip Pass grants permanent Pro *(Critical, revenue)*

`payments/webhook/route.ts` sets `tier: "paid"` and `tripPassExpiresAt = now + 30d`
for the `trip_pass` plan. But `requirePaidFeature` in `entitlements.ts` only checks
`user.tier === "paid"` and never reads `tripPassExpiresAt`. Result: a one-time ₹49
purchase unlocks every paid feature forever — the ₹99/mo plan is undercut by its own
cheaper SKU. `grep` confirms `tripPassExpiresAt` is written in exactly one place and
read in none.

Fix: make `requirePaidFeature` the single source of truth for "is this user paid
right now." Compute effective entitlement as `tier === "paid" && (no expiry ||
expiry > now)`, and on expiry either lazily downgrade `tier` or, better, stop
storing entitlement as a mutable `tier` string and derive it from
`{subscriptionActive, subscriptionRenewsAt, tripPassExpiresAt}`. Add a test that a
trip pass dated 31 days ago yields `paid-required`.

### S4 — Webhook lacks amount check and idempotency *(High)*

`payments/webhook/route.ts` verifies the HMAC signature correctly (good, constant-time)
but then:

- Never checks that `entity.amount` equals `PLAN_AMOUNT_PAISE[plan]`. `notes` are set
  server-side in `createRazorpayOrder`, so this isn't directly forgeable today, but
  the webhook is the money-granting authority and should cross-check the captured
  amount against the plan before upgrading.
- Has no event dedupe. Razorpay delivers at-least-once and retries on non-2xx. Re-processing `payment.captured` re-runs the `update`; for `trip_pass` it **pushes `tripPassExpiresAt` forward on every replay**, silently extending access.

Fix: record processed `event.id` (or `payment.id`) in a `webhookEvents` collection and
no-op on replay; verify `amount`/`currency` against the plan; keep returning 500 only
for genuinely retryable failures.

### S5 — No reconciliation when the webhook is missed *(High)*

The webhook is the *only* path that grants paid. If Razorpay's callback is delayed or
dropped (it happens), the user has paid and sees no upgrade, with no client-side
"verify payment" fallback (Razorpay's handler signature `razorpay_payment_id |
order_id | signature` is never verified anywhere). Fix: add a
`POST /api/payments/verify` that validates the checkout signature and upgrades
directly, so the client success handler and the webhook are two independent paths to
the same idempotent grant.

### S6 — Session revocation is off *(High for a fintech)*

`getSessionUser` uses `verifySessionCookie(token, false)` (local JWT check, no
revocation lookup). The perf rationale is reasonable for a consumer app, but a stolen
`__session` cookie stays valid for the full 14 days even after the user signs out on
another device — `DELETE /api/auth/session` revokes refresh tokens, but a cookie
verified with `checkRevoked:false` won't notice. For an app that moves money and
stores phone numbers, either (a) verify with `checkRevoked:true` on the sensitive
actions (settle, invite, profile, admin) while keeping the fast path for reads, or
(b) shorten the session lifetime. Document the choice.

### S7 — Contact enumeration oracle *(Medium)*

`findRegisteredUsers` lets any signed-in user submit up to 500 phone numbers per call
and learn which are Owely users, returning `uid`, `displayName`, and `photoURL`. That's
a harvesting vector (upload a number range, map the social graph). Fix: rate-limit per
user, return the minimum needed (a boolean "on Owely" is usually enough — not uid or
photo), and log anomalous volumes.

### S8 — Guest→user merge is not atomic *(Medium)*

`mergeGuestToUser` runs a group transaction, then a separate expenses batch, then a
separate settlements batch. A failure between them leaves the group without the guest
uid while expense/settlement docs still reference it (or vice-versa), producing
orphaned split keys that don't map to any member — a silent ledger inconsistency. Fix:
do the whole rewrite in one transaction (bounded doc counts make this feasible for
typical groups) or make it resumable/idempotent and reconcile on next read.

### S9 — No Firebase App Check *(Medium)*

The public web API key is (correctly) inlined in `apphosting.yaml`, but there's no App
Check anywhere. With Phone Auth enabled, the public key + client Auth are exposed to
SMS-pumping and quota-drain abuse. Enable App Check (reCAPTCHA Enterprise on web) and
enforce it on Auth and Firestore.

### S10 — Flat authorization model *(Low, by design but note it)*

There's no group-admin role: any member can `renameGroup`, `inviteByPhone`,
`addMembersByPhone`, add expenses with any `paidBy`, and `leaveGroup` reassigns
`createdBy` to `remaining[0]` with no consent. This matches Splitwise's trust model, so
it's defensible — but for a money app you may want at least owner-only destructive
actions (delete group already is; consider gating member removal and currency changes,
which is already owner-gated — good).

---

## 4. Financial correctness & data model

The money engine itself is sound. The issues here are about the *system around* it.

- **Freemium counter never decrements (Medium).** `incrementCounterInTx` bumps the
  monthly counter on add, but `deleteExpense` doesn't decrement it. The cap is
  therefore "100 *writes* per month," not "100 live expenses" — a free user who adds
  and deletes churns toward the limit. Decide the intended semantics and either
  decrement on delete or rename the limit in the UI so it isn't surprising. The stale
  `Group.expenseCount` field in `types/index.ts` is unused legacy — remove it to avoid
  implying a second source of truth.

- **Settlement is locked to the simplified pairing (Medium UX).** `settleUp` only
  accepts a payment against an existing `from→to` edge in `simplifiedDebts` and caps at
  that amount. Because simplification is a *derived* minimal transfer set, the person
  you actually want to pay may not be your assigned counterpart, and if the pairing
  changes between page render and submit, a legitimate payment is rejected with "no
  active debt." Money still conserves (completed settlements fold back into net), so
  this is a UX correctness issue, not a loss-of-funds one — but it will generate
  "why can't I pay Priya directly?" support tickets. Consider allowing settlement
  against real net balances, not just the current greedy edges.

- **Dispute fully reverses with no bound (Low).** A payee can `disputeSettlement` at
  any time to resurrect a debt, with only a status flip and no evidence trail. Inherent
  to a UPI-P2P model with no callback, but worth a timestamped audit note and maybe a
  dispute window.

- **Month-close math is consistent.** IST-derived month keys, server timestamps, and
  the `documentId >= targetId` closure check line up across `freemium.ts`,
  `closures.ts`, and the edit/delete guards. No issue found.

---

## 5. Feature gaps (sold vs. built)

- **Multi-currency is advertised but non-functional (High — mis-sell risk).** It's a
  headline Pro feature in the pricing page and `AGENTS.md`, and `requirePaidFeature(…,
  "multi-currency")` gates the settings. But:
  - Every expense write hardcodes `currency: "INR"` — in `addExpense`, `addBatchExpenses`, the recurring generator (both scopes), and own-expenses.
  - `formatPaise` always renders `₹`.
  - `updateDisplayCurrency` / `setGroupBaseCurrency` only store a preference string; there is no FX rate source, no per-expense currency entry, and no conversion anywhere.

  So a user can pay for "multi-currency" and nothing converts. Either build it
  properly (per-expense original currency + amount, a stored FX rate at entry time,
  base-currency normalization for balances, and currency-aware formatting) or pull it
  from the paywall until it exists. Shipping a paid toggle that does nothing is a
  refund/chargeback and trust problem for a fintech.

- **OCR / PDF export / recurring / templates** are wired end-to-end with server-side
  entitlement checks (`requirePaidFeature`) — good, these are real. OCR depends on the
  Vision API being enabled (noted in `apphosting.yaml`); confirm before launch.

- **Recurring generation depends on an external cron** hitting `/api/cron/recurring`
  with `CRON_SECRET`. The endpoint is correctly secret-gated with a constant-time
  compare. Ensure Cloud Scheduler is actually provisioned — otherwise recurring
  silently never fires.

---

## 6. UI/UX review

Against the project's own standards (375px-first, 44px touch targets, three async
states, money via `formatPaise` at the edge):

- **Strengths:** empty states are designed, not blank (guest panel "all squared up",
  admin "no users"); focus-visible outlines are present on buttons; `error.tsx` exists;
  money is rendered through `formatPaise` in the components reviewed; UPI settle flow
  correctly opens app-specific deep links without navigating away.

- **`GuestSettlePanel` re-implements UPI link building inline** (three hand-built
  intent/`upi://` strings) instead of using `src/lib/upi.ts`. This is drift waiting to
  happen — a future fix to the link format won't reach the guest path. Route both
  through the same builder.

- **Client-side money parsing violates the stated discipline.** `GuestSettlePanel`
  computes `Math.round(parseFloat(amountRupees) * 100)` for its validation. The server
  re-parses with `rupeesToPaise`, so there's no write-path risk, but the client can
  show a different valid/invalid verdict than the server (e.g. sub-paise input). Mirror
  `rupeesToPaise` semantics in the client validator so the two agree.

- **Touch-target / 375px audit not yet done systematically.** Several controls use
  `h-9` (36px) chips (payment-method toggles, UPI app buttons) which are under the
  44px minimum the project mandates. Do a pass at 375px and bump interactive heights.

- **Admin dedupe hides users.** The admin page collapses users by `phone || uid`; two
  real users with null phones can mask each other. Minor, but it's a data view people
  will make decisions from.

(A full screen-by-screen a11y/contrast pass is out of scope for this backend-focused
audit; the `design:accessibility-review` skill is the right tool for that and should
be run before launch.)

---

## 7. Prioritized remediation roadmap

Do these in order. Everything through P1 is a launch blocker for handling money.

**P0 — before any real users (security-critical)**
1. Replace admin boolean cookie with a signed/claim-based admin session; remove `admin/admin`. *(S1)*
2. Make guest links single-use + expiring, and make guests read-only (or require auth to write settlements). Add a rule/action check that no one can write a settlement for a `guest_*` uid except through the guarded path. *(S2)*
3. Enforce `tripPassExpiresAt` inside `requirePaidFeature`; add a regression test. *(S3)*

**P1 — before charging money at scale**
4. Webhook: dedupe by event/payment id; cross-check captured amount vs plan. *(S4)*
5. Add `POST /api/payments/verify` client fallback so a missed webhook still upgrades. *(S5)*
6. Turn on session revocation for sensitive actions (or shorten session lifetime). *(S6)*
7. Either build multi-currency for real or remove it from the paywall. *(§5)*

**P2 — integrity & abuse hardening**
8. Make `mergeGuestToUser` atomic/idempotent. *(S8)*
9. Rate-limit + slim down `findRegisteredUsers`. *(S7)*
10. Enable Firebase App Check. *(S9)*
11. Decide freemium counter semantics (decrement on delete or relabel). *(§4)*

**P3 — correctness polish & tech debt**
12. Allow settlement against real net balances, not just simplified edges. *(§4)*
13. Route guest UPI links through `src/lib/upi.ts`; align client money validation with `rupeesToPaise`. *(§6)*
14. Remove unused `Group.expenseCount`. Confirm Cloud Scheduler + Vision API are provisioned. *(§4, §5)*
15. 375px / 44px touch-target pass. *(§6)*

**P4 — test coverage (currently the biggest blind spot)**
The engines are tested; nothing else is. Add integration tests for: entitlement
enforcement (incl. trip-pass expiry), freemium cap under the transaction, the guest
settle path, webhook signature + idempotency, and `recomputeSimplified` under
concurrent writes. These are the exact money- and security-critical paths, and per the
project's own rules they must have tests when touched — the P0–P2 work is the moment to
add them.

---

## 8. Backend rewrite verdict

**No rewrite.** The separation of concerns, the single-write-path discipline, the
integer-paise money model, and the transactional recompute are the hard parts, and
they're done well. A rewrite would throw away correct, tested foundations to
re-introduce the same bugs. Every issue above is a targeted change inside the existing
structure. Spend the effort on §7, not on a new backend.
