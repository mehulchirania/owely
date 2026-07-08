# Owely 🦉

**India-first** freemium expense-splitting app. Split bills with friends and flatmates, then
settle up over **UPI or cash**. Built for fairness and transparency. Android + Web.
Supports both group expenses and 1:1/direct expenses through one shared ledger.

Firebase project: `owely-c6c51`.

## Why Owely? (Us vs The Competition)

| Feature | Owely | Others |
|---|---|---|
| **Core Splitting** | Free for most personal use cases | Often paywalled or heavily restricted |
| **Monetization** | Fair usage limits for heavy users (Freemium) | Gating basic usability (ads, charts) |
| **Settlement** | UPI deep links + cash recording | Manual copy-pasting |
| **User Experience** | Clean, dashboard-app feel, ad-free | Cluttered, heavy advertising |
| **Paid Features** | Unlimited expenses, display currency, OCR, PDF export | Often bundled awkwardly |

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill the TODO_FROM_CONSOLE values
npm run dev                  # http://localhost:3000
```

The landing page renders without any Firebase config. Auth and data features need
the env vars below.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Vitest (money + debt-simplification engines) |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |

## Environment

Copy `.env.example` → `.env.local`. Derivable values are pre-filled; three come
from the Firebase console:

- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_APP_ID` — register a Web
  app under Project settings.
- `FIREBASE_SERVICE_ACCOUNT_KEY` — Service accounts → Generate new private key
  (raw JSON or base64). Server-only; never commit it.
- `CRON_SECRET` is the shared secret for the daily recurring-expense scheduler.
- `OWELY_ADMIN_USERNAME`, `OWELY_ADMIN_PASSWORD` are required for the production
  admin panel. Local development falls back to `admin/admin` only when these are
  unset outside production.

## Architecture

```
src/
  types/index.ts            Domain types (one per Firestore collection)
  lib/
    money.ts                Paise math — splits always reconcile to the total
    simplify-debts.ts       Net-balance + greedy min-cashflow engine (pure)
    upi.ts                  UPI deep-link builder (paise→rupees at the boundary)
    upi-links.ts            Higher-level settle links with VPA-priority rule
    settlement-flow.ts      Client-safe settle QR/reminder message helpers
    contacts.ts             Contact import normalization, hashes, quota keys
    parse-rupees.ts         Client-safe rupee→paise parser (mirrors rupeesToPaise)
    currency.ts             Supported paid display/base currency metadata
    receipt-ocr.ts          Receipt OCR hint extraction (pure, tested)
    vision-ocr.ts           Server-only Google Vision OCR client
    entitlements.ts         Server-side paid feature guards
    relationship-categories.ts  Predefined group/direct categories
    result.ts validation.ts session.ts read-model.ts recompute.ts
    *.test.ts               Vitest specs (money · debts · UPI · parseRupees)
    firebase/               client (reads+Auth) · admin (writes) · collections
  features/                 Domain-organized Server Actions + queries
    auth/                   Session, sign-in, profile
    groups/                 Group CRUD, direct links, invites, guest merge, categories, closures
    contacts/               Contact sync, matching, quota, retention controls
    expenses/               Add/edit/delete, batch, splits
    settlements/            Settle-up, dispute, guest settle
    recurring/              Monthly recurring definitions
    templates/              Saved split templates
    currency/               Display/base currency settings
    personal-ledger/        Private /own expenses
  components/               Login, groups, expense form/feed, settle panel, …
    landing/                Marketing landing page sections + motion engine
  app/                      App Router: landing (/) · (auth)/login · (app)/* shell
    api/receipts/ocr        Paid receipt OCR prefill route
    api/groups/[groupId]/export/pdf  Paid PDF export route
  proxy.ts                  Route gate (Next 16 Middleware → Proxy)
docs/STATE.md               Living status doc
DESIGN.md                   Living design system + product surface guide
FABLE_INSTRUCTIONS.md       Release-overhaul execution plan (phased, gated)
```

**Principles**

- **All money is integer paise.** Never floats. Display divides by 100 at the edge.
- **Writes go through Server Actions only** (Admin SDK). The client never writes
  Firestore directly. `firestore.rules` is a secondary, deny-by-default layer.
- **Backend code is feature-first:** app/routes/components import feature actions
  and feature auth/query modules directly; shared `lib/` code is reserved for
  pure utilities, Firebase plumbing, compatibility barrels, and cross-feature
  infrastructure.
- **Offline-first:** Firestore uses a persistent multi-tab cache so the app works
  on patchy mobile data.
- Strict TypeScript, no `any`. `npm run build` and `npm test` must stay green.

## Deployment — Firebase App Hosting

SSR via App Hosting (`apphosting.yaml`, `.firebaserc`). Connect a GitHub repo to
an App Hosting backend; every push builds and deploys to a
`<backend>--owely-c6c51.<region>.hosted.app` URL. Full one-time setup steps are
in [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md).

Remote auth needs Firebase-side settings to match the repo config:
`NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_APP_ID` are inlined from
`apphosting.yaml` at build time. `FIREBASE_SERVICE_ACCOUNT_KEY`, `CRON_SECRET`,
`OWELY_ADMIN_USERNAME`, and `OWELY_ADMIN_PASSWORD` must exist as App Hosting
runtime secrets, and the deployed `*.hosted.app` host must be listed under
Firebase Auth authorized domains.

## Status

Core app complete end-to-end (Phases 1-5): Google + Phone OTP sign-in, groups
with phone invites, expenses with equal/unequal/percentage splits, live debt
simplification, and UPI/cash settle-up via a bottom pay sheet with GPay,
PhonePe, generic UPI, desktop QR fallback, explicit method capture,
over-settlement guards, payment-reference capture, manual reminders, and dispute. The
`Owely.dc.html` design handoff has been applied to the remaining app surfaces,
including forms, menus, settings, errors, settle-up, and a login screen styled
like the post-login dashboard. Phase 6 is fully complete, supporting 1:1 People UI,
direct relationships, and user-facing Category Management + Dashboard filter UI.
Phase 7 features are fully supported including saved split templates (apply/save/delete
chips on the expense form), multi-currency settings (display currency in Settings and
per-group base currency in the Members tab), batch member-add (`BatchInviteForm` with
dynamic name+phone rows and added/invited/skipped summary), group/own recurring expenses
UI, private Personal Ledger (`/own`) for tracking un-shared expenses with monthly
summaries, offline-safe idempotent writes, display/base currency metadata, paid PDF
export, and Google Vision Receipt OCR prefill uploading.
Expense and settlement writes use a read-first recompute transaction with
in-memory mutation projection, so Firestore accepts the write ordering while
`group.simplifiedDebts` still reflects the triggering change immediately.
Offline client-ID replays return as no-ops before quota checks, and batch adds
count only genuinely new IDs against the free monthly limit.
Personal recurring rules on `/own` support a 1-28 day-of-month selector for
monthly SIPs, insurance, subscriptions, and similar private expenses.
The recurring scheduler evaluates due dates in Asia/Kolkata and claims each
monthly generation transactionally before writing deterministic generated docs.
Deleting groups/direct ledgers also cleans related top-level recurring,
template, and invite documents.

Phase B differentiators are fully implemented:
- **Group Mode Selector**: Selection of smart modes (Trip, Roommates, Couple, Lunch, Friends, Family, Custom).
- **Debt Round-off & Thresholds**: Filter balances below threshold and round transfers to nearest rupee.
- **Batch Expense Entry**: Multi-row batch expense creation action and BatchExpenseForm UI.
- **Monthly Closures**: Freeze roommate/utilities group months, enforce write locks, and record carry-forward balances.
- **Zero-friction Guest Ledger**: Invite links seed guest_uuid members immediately. Guests access group details read-only and record settlements using secure session cookies.
- **Guest-to-User Merge**: Automatic merging of guest ledger history, balances, and settlements to actual authenticated user account upon sign-up.
- **Fairness Insights**: Visual dashboard tracking contributor ratios and round-robin payee recommendations.
- **Contacts Integration**: Contact Picker-ready import with manual fallback, owner-scoped contact store, On Owely matching, per-user sync quota, group/direct add actions, and Settings retention controls.

**Landing Page UI Polish**:
- Removed the "Start for free" and "See how it works" buttons to streamline onboarding, and renamed the navigation link from "Open app" to "Login".
- **Login Flow Refinement**: Reordered mobile OTP to be the primary sign-in action, rebuilt the OTP input with a highly fluid, animated 6-box design, stabilized auto-focus behavior, and enhanced error visibility for edge cases.

All non-3rd-party items are complete. Remaining before go-live: Razorpay
payment gateway (order creation, checkout modal, webhook to flip tier), SMS invite
delivery, Cloud Scheduler wiring for recurring expenses, Firestore composite index
deployment, and Firebase App Hosting backend creation. Deferred: TWA container packaging.
See [`docs/STATE.md`](./docs/STATE.md) and [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md).

## What's intentionally not built

Payment aggregation · card/wallet payments · friend graph outside groups · bilateral IOU tracking.
