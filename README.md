# Owely 🦉

Free, **India-first** expense-splitting app — a Splitwise alternative with **no
feature gating and no paywalls**. Split bills with friends and flatmates, then
settle up over **UPI** in one tap. Android + Web.

Firebase project: `owely-c6c51`.

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
    *.test.ts               Vitest specs for the above
    firebase/
      client.ts             Browser SDK: Auth + offline-persistent Firestore reads
      admin.ts              server-only Admin SDK: the only write path
      collections.ts        Collection names + typed path builders
  app/                      Next.js App Router (landing page so far)
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

Foundation complete: scaffold, types, money + debt engines (18 tests passing),
Firebase SDK layer, deployable landing page, security rules, hosting config.
Next: auth flow, Server Actions, group CRUD, add-expense UI, UPI settlement. See
[`docs/STATE.md`](./docs/STATE.md) and [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md).

## What's intentionally not built

Multi-currency UI · friend graph outside groups · bilateral IOU tracking.
