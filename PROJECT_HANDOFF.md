# Owely — Project Handoff

Prepend a new dated entry at the top after every change. Newest first.

---

## 2026-06-16 — Project bootstrap + Firebase + deployable shell

**What exists now**

- **Scaffold:** Next.js 16 (App Router, Turbopack), React 19, TypeScript strict,
  Tailwind v4, Vitest. Own git repo at `C:\Users\mehul\Documents\Codex\owely`,
  separate from FitSplit.
- **Domain types** — `src/types/index.ts`.
- **Money engine** — `src/lib/money.ts` (+ tests): paise format/parse,
  `splitEqual`, `splitByWeights`, `assertExactSplit`. Largest-remainder split so
  totals always reconcile.
- **Debt engine** — `src/lib/simplify-debts.ts` (+ tests): net balances + greedy
  min-cashflow. Pure function. **18 tests pass, typecheck clean.**
- **Firebase layer** — `src/lib/firebase/{client,admin,collections}.ts`.
  Client = Auth + offline-persistent Firestore reads; Admin = `server-only`
  privileged writes; collections = typed names/paths.
- **Landing page** — `src/app/page.tsx` (real Owely page, verified serving 200
  with correct title/branding). Metadata updated in `layout.tsx`.
- **Firestore rules** — `firestore.rules` (deny client writes, scope reads).
- **App Hosting config** — `apphosting.yaml`, `.firebaserc`, `firebase.json`.
- **Docs** — `AGENTS.md` (imported by `CLAUDE.md`), `docs/STATE.md`, this file,
  `README.md`, `.env.example`.

**To actually deploy and get a live URL** (one-time, console + CLI):

1. **Register a Web app:** Firebase console → `owely-c6c51` → Project settings →
   Your apps → add Web app. Copy `apiKey` and `appId`.
2. Paste them into `.env.local` (local dev) **and** `apphosting.yaml` (build).
3. **Service account:** Project settings → Service accounts → Generate new
   private key. Put the JSON (raw or base64) into `.env.local` as
   `FIREBASE_SERVICE_ACCOUNT_KEY`. For prod, create the App Hosting secret:
   `firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT_KEY`, then
   uncomment the secret block in `apphosting.yaml`.
4. **Push to GitHub** (create a repo for Owely first; this is a fresh local git
   repo with no remote yet).
5. **Create the backend:** `firebase apphosting:backends:create --project owely-c6c51`
   (or console → App Hosting → Get started) and connect the GitHub repo + branch.
   App Hosting builds on every push and gives a `*.hosted.app` URL.
6. **Deploy Firestore rules:** `firebase deploy --only firestore:rules --project owely-c6c51`.
7. **Enable Auth providers:** console → Authentication → Sign-in method → enable
   **Google** and **Phone**. For Phone OTP add your domain to the authorized
   list and set up reCAPTCHA.

**Decisions / notes**

- Stack says Vercel; switched deploy target to **Firebase App Hosting** per
  request (SSR-capable, matches the existing FitSplit setup).
- `create-next-app` installed **Next 16**, not the spec's 15. App Router APIs are
  unchanged; not pinned. Revisit if a Next-15-specific need arises.
- Firebase web config lives in `NEXT_PUBLIC_*` (not secret by design; security is
  enforced by rules + App Check, not key secrecy).
- Storage bucket assumed `owely-c6c51.firebasestorage.app` (new-project default).
  Confirm against the console; older projects use `.appspot.com`.

**Not yet built** (next, in priority order)

Auth flow UI + session cookie · `src/actions/` Server Actions skeleton · Group
CRUD + invite by phone · Add-expense UI (equal/unequal/percentage) · Settlement +
UPI deep link · templates · recurring (Cloud Function) · receipt OCR · PDF export.
