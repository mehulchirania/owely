# Owely — Current State

India-first freemium expense-splitting app. Android + Web.

_Last updated: 2026-06-18 (batch member-add UI + templates UI + multi-currency UI complete)_

## Stack (as scaffolded)

- **Next.js 16.2.9** (App Router, Server Components, Server Actions) — note:
  the spec said Next 15; `create-next-app` installed 16. App Router APIs are
  unchanged. Pin to 15 if there's a reason to.
- React 19.2 · TypeScript 5 (strict) · Tailwind v4 · Vitest 4
- Target deploy: Firebase App Hosting
- Firebase Auth (Google + Phone OTP), Firestore (offline persistence)

## Project layout

```
src/
  types/index.ts    All domain types (single source of truth)
  lib/
    money.ts (+test)         Paise math: format/parse, splitEqual, splitByWeights
    simplify-debts.ts(+test) Net balances + greedy min-cashflow; simplifyFromNet,
                             netWithSettlements, netPositionFromSettlements
    upi.ts (+test)           UPI deep-link builder (paise→rupees at boundary)
    currency.ts              Supported display/base currency metadata
    receipt-ocr.ts (+test)   Receipt OCR hint extraction
    vision-ocr.ts            Server-only Google Vision OCR client
    result.ts                ActionResult<T> success/failure
    validation.ts            Zod schemas + parseInput/parseActionData
    session.ts               requireSession / authorizeUser / authorizeMember
    session-cookie.ts        Cookie constants (import-safe for the edge proxy)
    read-model.ts            Compatibility barrel for feature-owned query modules
    recompute.ts             Shared simplified-debt recompute (server-only, transactional)
    freemium.ts              Freemium limit enforcement (monthly counter per group)
    entitlements.ts          Paid feature guards for Server Actions
    log.ts                   Server-side error logging for action observability
    relationship-categories.ts Predefined group/direct category metadata
    firebase/{client,admin,collections,auth-errors}.ts
  features/           Domain-organized Server Actions + queries
    auth/             Session, sign-in, profile, user queries
    groups/           Group CRUD, direct links, invites, guest merge, categories, closures, queries
    expenses/         Add/edit/delete, batch, splits, queries
    settlements/      Settle-up, dispute, guest settle, queries
    recurring/        Monthly recurring definitions + queries
    templates/        Saved split templates + queries
    currency/         Display/base currency settings
    personal-ledger/  Private /own expenses + queries
    admin/            Admin panel actions
  components/       LoginForm, SignOutButton, CreateGroupForm, InviteMemberForm,
                    BatchInviteForm, GroupMenu, ExpenseForm, ExpenseFeed,
                    SettlePanel, ProfileForm, CustomCategoriesManager,
                    DisplayCurrencyForm, GroupCurrencyForm, FairnessInsights,
                    MonthlyClosePanel, RecurringPanel, CopyButton, CategoryPicker
    landing/        Marketing landing: LandingMotion (client motion engine) +
                    Nav, Hero, Marquee, HowItWorks, Features, Simplify, Compare,
                    Pricing, ValueBand, Cta, Footer, icons
  app/
    page.tsx                       marketing landing (motion-rich, static)
    (auth)/login                   Google + Phone OTP
    (app)/                         server-guarded shell
      groups, groups/[groupId], .../expenses/new, .../expenses/[id]/edit,
      .../settle, settings
    api/auth/session/route.ts      set/clear session cookie
    api/receipts/ocr              paid receipt OCR prefill route
    api/groups/[groupId]/export/pdf paid PDF export route
  proxy.ts          Route gate (Next 16 Middleware → Proxy)
docs/STATE.md       ← this file
.env.example        Template; copy to .env.local
```

Conventions (from project brief): components in `/components`, server actions in
`/features/*/actions.ts`, feature-owned reads in `/features/*/queries.ts`,
server-only domain helpers beside their feature, pure/cross-feature utilities in
`/lib`, and types in `/types`. Firestore writes only through Server Actions.

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
- **Remote auth config:** `apphosting.yaml` includes the public Web `apiKey`
  and `appId` for build-time inlining. The runtime
  `FIREBASE_SERVICE_ACCOUNT_KEY`, `CRON_SECRET`, `OWELY_ADMIN_USERNAME`, and
  `OWELY_ADMIN_PASSWORD` secrets must exist in Firebase App Hosting, and the live
  `*.hosted.app` domain is authorized in Firebase Auth settings.
- Paid receipt OCR also requires the Google Cloud Vision API to be enabled for
  the Firebase project/service account.

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
- [x] Paste `apiKey` + `appId` into `.env.local` + `apphosting.yaml`
- [x] Add live `*.hosted.app` URL to Firebase Auth authorized domains
- [x] Service-account key → `FIREBASE_SERVICE_ACCOUNT_KEY`
- [ ] Create App Hosting backend + connect GitHub repo → live URL

- [ ] Create App Hosting secrets for `CRON_SECRET`, `OWELY_ADMIN_USERNAME`, and
      `OWELY_ADMIN_PASSWORD`

**Build phases (see `docs/PHASES.md` for deliverables):**
- [x] Phase 1 — Server plumbing (result, validation, session, route, **proxy**)
- [x] Phase 2 — Auth UI + app shell (Google + Phone OTP)
- [x] Phase 3 — Groups (actions + invite by phone)
- [x] Phase 4 — Expenses (add/edit, split types, simplify recompute)
      Expense/settlement writes use read-first Firestore recompute transactions
      with in-memory projections of the pending mutation, avoiding
      read-after-write transaction failures while keeping cached debts current.
      Offline client-ID replays no-op before quota checks, and batch adds count
      only genuinely new IDs against the free monthly limit.
- [x] Phase 5 — Settlements + UPI/cash + payment-ref capture
- [x] `Owely.dc.html` design handoff applied to core app surfaces
- [x] `DESIGN.md` refreshed as the living app design guide for tokens, app
      shell, Groups/People/Personal/Recurring/Admin surfaces, mobile/accessibility
      constraints, money semantics, and implementation checklist.
- [x] Login redesigned to match the post-login web dashboard feel
- [x] Responsive layout with desktop sidebar & wide content width (max-w-5xl)
- [x] Dashboard with inline tabs (Groups / People / Activity)
- [x] Group details inline tabs (Expenses / Balances & Settle / Members)
- [x] Phone-first UPI intent payments with custom settlement amount inputs
- [x] Admin Panel (/admin) for user stats, upgrading tiers, and membership control
- [x] Group member balances read from stored simplified transfers, so completed
      settlements/disputes stay reflected in the visible balance UI
- [x] Settlement trust guardrails: payer records explicit UPI/Cash method,
      over-settlement is blocked against the active simplified debt, and
      history/PDF export show method plus reference/note.
- ◧ Phase 6 — Direct people + categories
  - [x] Domain foundation: `Group.type` (`group`/`direct`), direct pair metadata,
        group/direct category fields, custom `categories/{id}` collection name,
        owner-scoped rule, read-model mapping, and predefined category constants.
  - [x] Direct relationship actions: create/link by registered phone, create
        pending direct invite for unregistered phone, accept/auto-claim direct
        invites into a deduped two-member direct group.
  - [x] People UI: `/people` list, add-person form, mobile/desktop primary nav,
        direct ledgers routed through existing expense/settle screens, and no
        group invite controls on direct ledgers.
  - [x] Category write path: `actions/categories.ts` —
        create/update/delete (owner-scoped) + `setGroupCategory` (predefined or
        owned custom, or clear). Completed the read-only half (collection, rule,
        read-model, predefined constants already existed). `ensureUser` now
        initializes `tier:"free"` + `currency:"INR"` for new users.
  - [x] Category management & filter UI: Added custom category list/creation inside Settings page and category picker tags in group details, along with dynamic filtering chips on the standard Groups and People dashboard tabs.
  - [x] Category denormalization cleanup: custom category renames update tagged
        groups, and deleting a custom category clears the tag from affected
        group/direct ledgers.
- ◧ Phase 7 — Paid features: backend done for current scope; UI/ops pending
  - [x] Paid feature guards (backend): `requirePaidFeature` enforces `tier:"paid"`
        on paid-only Server Actions; wired into templates and recurring
        create/update paths. Delete remains allowed for cleanup.
  - [x] Templates (backend): `templates/{id}` owner-scoped saved split recipes
        with participants + equal/percentage weights, rule already read-scoped,
        `actions/templates.ts`, Zod schemas, and read-model fetch.
  - [x] PDF export (backend): paid route
        `/api/groups/{groupId}/export/pdf` renders group members, current
        simplified debts, expenses, and settlement history as a downloadable PDF.
  - [x] PDF export (UI): paid users get a group-level download entry point;
        free users are routed to Settings instead of seeing raw paid-route JSON.
  - [x] Plan/tools surface (UI): Settings shows stored tier, display currency,
        free monthly limit, and Pro feature availability.
  - [x] Recurring expenses (backend): `recurring/{id}` defs + `generateDueRecurring`
        + `/api/cron/recurring` (Cloud Scheduler hits it daily). Generation uses
        Asia/Kolkata dates and transactionally claims deterministic monthly docs.
  - [x] Recurring expenses (UI): group/direct ledgers have a Recurring tab where
        paid users can create monthly equal-split rules and pause/resume/delete
        saved rules. Actual generation still requires Scheduler + `CRON_SECRET`.
  - [x] Own (personal, un-split) expenses: private personal ledger at `/own` with monthly spent metrics, private expense list, and full add/edit/delete CRUD features.
  - [x] Own recurring expenses (UI): paid users can create, pause/resume, and
        delete monthly personal rules on `/own` with a day-of-month selector
        for SIPs, insurance, subscriptions, and other private recurring costs.
  - [x] Contacts member-add (backend): `findRegisteredUsers` + `addMembersByPhone`.
  - [x] Offline-safe writes (backend): `clientId` idempotency on expense creation.
  - [x] Multi-currency (backend metadata): paid `actions/currency.ts` writes user
        display currency and creator-only group base currency from a supported
        code list. New/read legacy groups default to `INR`. Expense arithmetic
        still stays paise-only until the no-FX/FX policy is decided.
  - [x] Receipt OCR (backend): paid `POST /api/receipts/ocr` accepts an image,
        checks optional group membership, calls Google Vision, and returns raw
        text plus amount/date/merchant/title hints. It does not write expenses;
        the normal expense action remains the paise/debt boundary.
  - [x] Receipt OCR (UI): paid users can upload a receipt image on the new
        expense form to prefill title/amount; free users see a Pro affordance.
        OCR remains confirmation-only and does not write expenses directly.
  - [x] Templates UI: apply/save/delete split template chips on ExpenseForm
        (Pro+; basis-point ↔ percentage conversion at apply/save boundary).
  - [x] Multi-currency UI: `DisplayCurrencyForm` in Settings (user display
        currency, Pro-only), `GroupCurrencyForm` in group Members tab
        (creator+paid; read-only for others).
  - [x] Batch member-add UI: `BatchInviteForm` in group Members tab — dynamic
        name+phone rows, calls `addMembersByPhone`, shows added/invited/skipped
        result summary.
  - [ ] Payment gateway (Razorpay): "Go Pro" and "Trip Pass" CTAs are still
        dead buttons. Requires order-create route, checkout modal, and webhook.
- ◧ Phase 8 — PWA + polish
  - [x] Bootstrapped PWA: created manifest.json, custom circular owl app icon, and configured Next.js layout metadata.
  - [x] Landing page simplification: Removed "Start for free" and "See how it works" buttons, renamed "Open app" to "Login".
- [x] Phase B — Differentiators (Smart Modes, Guest Links, Batch Add, & Closures)
  - [x] Group Mode Selector: Added selection dropdown for Trip, Roommates, Couple, Lunch, etc. during group creation.
  - [x] Debt Round-off & Thresholds: Configured simplifyFromNet engine to round transfer balances to nearest unit and filter tiny balances.
  - [x] Batch Expense Entry: Created addBatchExpenses server action and BatchExpenseForm UI grid rows for trip expenses.
  - [x] Monthly Closures: Added closeMonth server action, isMonthClosed locking helper, MonthlyClosePanel UI tab, and write locks blocking modifications in closed periods. Closure cutoff math is IST-based and the closure doc is created atomically.
  - [x] Zero-friction Guest Ledger: Generated guest_uuid profiles immediately on invite. Added guest-login Route Handler setting guest session cookies, and /groups/[groupId]/guest page for read-only viewing and payment confirmations.
  - [x] Guest-to-User Merge: Merges guest ledger history, balances, and settlements to authenticated user account upon acceptInvite.
  - [x] Fairness Insights: Created widget displaying contributor ratios and round-robin payment suggestions.

Phases 1-5 ship the full core loop. The dark Owely prototype styling now covers
landing/auth, the dashboard-style login screen, app shell, groups, expenses,
settlement, settings, forms, menus, and error states. Settlements are UPI or cash
only; no payment gateway/aggregator is planned. Note: Next 16 renamed Middleware ->
**Proxy** (`src/proxy.ts`); settlement record/mark collapsed into one payer
`settleUp` action; no `AuthProvider` (server session cookie is source of truth).
Direct 1:1 expenses are being built as `type: "direct"` groups so the existing
expense, settlement, and debt engine remains the single source of truth. Direct
group backend creation and People screens are in place; category UI remains.
All non-3rd-party paid UI is now complete: templates (apply/save/delete on
ExpenseForm), multi-currency controls (Settings + group Members tab), and batch
member-add (`BatchInviteForm`). Remaining paid work is the payment gateway
(Razorpay order/webhook), SMS delivery, console ops, and infra (Cloud Scheduler,
Firestore indexes, App Hosting deployment).

## Commands

```
npm run dev        # next dev (Turbopack)
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run build      # next build
npm run lint       # eslint
```
