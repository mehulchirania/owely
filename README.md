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
| **Paid Features** | Unlimited expenses, multi-currency, OCR, PDF export | Often bundled awkwardly |

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

## Architecture

```
src/
  types/index.ts            Domain types (one per Firestore collection)
  lib/
    money.ts                Paise math — splits always reconcile to the total
    simplify-debts.ts       Net-balance + greedy min-cashflow engine (pure)
    upi.ts                  UPI deep-link builder (paise→rupees at the boundary)
    currency.ts             Supported paid display/base currency metadata
    receipt-ocr.ts          Receipt OCR hint extraction (pure, tested)
    vision-ocr.ts           Server-only Google Vision OCR client
    entitlements.ts         Server-side paid feature guards
    relationship-categories.ts  Predefined group/direct categories
    result.ts validation.ts session.ts read-model.ts recompute.ts
    *.test.ts               Vitest specs (money · debts · UPI)
    firebase/               client (reads+Auth) · admin (writes) · collections
  actions/                  Server Actions — the only write path
    auth.ts groups.ts expenses.ts settlements.ts categories.ts templates.ts currency.ts
  components/               Login, groups, expense form/feed, settle panel, …
    landing/                Marketing landing page sections + motion engine
  app/                      App Router: landing (/) · (auth)/login · (app)/* shell
    api/receipts/ocr        Paid receipt OCR prefill route
    api/groups/[groupId]/export/pdf  Paid PDF export route
  proxy.ts                  Route gate (Next 16 Middleware → Proxy)
docs/STATE.md               Living status doc
```

**Principles**

- **All money is integer paise.** Never floats. Display divides by 100 at the edge.
- **Writes go through Server Actions only** (Admin SDK). The client never writes
  Firestore directly. `firestore.rules` is a secondary, deny-by-default layer.
- **Offline-first:** Firestore uses a persistent multi-tab cache so the app works
  on patchy mobile data.
- Strict TypeScript, no `any`. `npm run build` and `npm test` must stay green.

## Deployment — Firebase App Hosting

SSR via App Hosting (`apphosting.yaml`, `.firebaserc`). Connect a GitHub repo to
an App Hosting backend; every push builds and deploys to a
`<backend>--owely-c6c51.<region>.hosted.app` URL. Full one-time setup steps are
in [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md).

Remote auth needs three Firebase-side settings to match the repo config:
`NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_APP_ID` are inlined from
`apphosting.yaml` at build time, `FIREBASE_SERVICE_ACCOUNT_KEY` must exist as an
App Hosting runtime secret, and the deployed `*.hosted.app` host must be listed
under Firebase Auth authorized domains.

## Status

Core app complete end-to-end (Phases 1-5): Google + Phone OTP sign-in, groups
with phone invites, expenses with equal/unequal/percentage splits, live debt
simplification, and UPI/cash settle-up with explicit method capture,
over-settlement guards, payment-reference capture, and dispute. The
`Owely.dc.html` design handoff has been applied to the remaining app surfaces,
including forms, menus, settings, errors, settle-up, and a login screen styled
like the post-login dashboard. Phase 6 is fully complete, supporting 1:1 People UI,
direct relationships, and user-facing Category Management + Dashboard filter UI.
Phase 7 features are fully supported including saved split templates, group/own
recurring expenses UI, private Personal Ledger (`/own`) for tracking un-shared expenses
with monthly summaries, offline-safe idempotent writes, display/base currency metadata,
paid PDF export, and Google Vision Receipt OCR prefill uploading.

Phase B differentiators are fully implemented:
- **Group Mode Selector**: Selection of smart modes (Trip, Roommates, Couple, Lunch, Friends, Family, Custom).
- **Debt Round-off & Thresholds**: Filter balances below threshold and round transfers to nearest rupee.
- **Batch Expense Entry**: Multi-row batch expense creation action and BatchExpenseForm UI.
- **Monthly Closures**: Freeze roommate/utilities group months, enforce write locks, and record carry-forward balances.
- **Zero-friction Guest Ledger**: Invite links seed guest_uuid members immediately. Guests access group details read-only and record settlements using secure session cookies.
- **Guest-to-User Merge**: Automatic merging of guest ledger history, balances, and settlements to actual authenticated user account upon sign-up.
- **Fairness Insights**: Visual dashboard tracking contributor ratios and round-robin payee recommendations.

**Landing Page UI Polish**:
- Removed the "Start for free" and "See how it works" buttons to streamline onboarding, and renamed the navigation link from "Open app" to "Login".

Remote auth is configured for the live App Hosting domain. Deferred:
billing-provider selection and final TWA container packaging.
See [`docs/STATE.md`](./docs/STATE.md) and [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md).

## What's intentionally not built

Payment aggregation · card/wallet payments · friend graph outside groups · bilateral IOU tracking.
