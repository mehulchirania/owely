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
    relationship-categories.ts  Predefined group/direct categories
    result.ts validation.ts session.ts read-model.ts recompute.ts
    *.test.ts               Vitest specs (money · debts · UPI)
    firebase/               client (reads+Auth) · admin (writes) · collections
  actions/                  Server Actions — the only write path
    auth.ts groups.ts expenses.ts settlements.ts
  components/               Login, groups, expense form/feed, settle panel, …
    landing/                Marketing landing page sections + motion engine
  app/                      App Router: landing (/) · (auth)/login · (app)/* shell
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

## Status

Core app complete end-to-end (Phases 1-5): Google + Phone OTP sign-in, groups
with phone invites, expenses with equal/unequal/percentage splits, live debt
simplification, and UPI/cash settle-up with payment-reference capture + dispute. The
`Owely.dc.html` design handoff has been applied to the remaining app surfaces,
including forms, menus, settings, errors, settle-up, and a login screen styled
like the post-login dashboard. Phase 6 has started with 1:1 People UI, direct
relationship backend support, and predefined/custom category foundations.
Still console-blocked for a live deploy (API key, App ID, service-account key;
see env above). Deferred: category management UI, paid features (templates, recurring UI,
multi-currency, OCR, PDF) and PWA/a11y sweep. See
[`docs/STATE.md`](./docs/STATE.md) and [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md).

## What's intentionally not built

Payment aggregation · card/wallet payments · friend graph outside groups · bilateral IOU tracking.
