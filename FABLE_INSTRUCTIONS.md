# Owely — Release Overhaul Instructions (Fable)

> Execution plan for taking Owely from "feature-complete web app" to
> "release-ready, mobile-first product". Written 2026-07-08. Work through the
> phases **in order** — each phase ends with a verification gate. Do not start
> the next phase until the gate passes.
>
> Read `AGENTS.md` first. Every rule there (paise money model, Server-Action-only
> writes, doc updates after every change, typecheck/test/build clean) applies to
> every task below. This file adds *what* to build; `AGENTS.md` governs *how*.

---

## 0. Ground rules for this overhaul

- **No rewrite.** `docs/AUDIT.md §8` verdict stands: the backend layering,
  integer-paise money model, and transactional recompute are correct. All work
  below is targeted change inside the existing structure.
- **Mobile is the primary target.** Design and verify every screen at **375px
  first** (Android is the launch platform; the web app will be wrapped as a TWA
  later). Desktop is the adaptation, not the other way around.
- **Design tokens only.** Use the existing dark-theme token classes
  (`bg-ink`, `bg-card`, `text-strong`, `text-dim`, `text-faint`, `text-accent`,
  `bg-accent`, `mint`, etc. — see `DESIGN.md`). Never introduce raw Tailwind
  palette colors.
- **Every async surface has three states** (loading / success / error), every
  destructive action confirms, every empty state is designed.
- **Verification gate (every phase):** `npm run typecheck` clean →
  `npm test` all passing → `npm run lint` zero errors → `npm run build` clean →
  manual pass of touched screens at 375px in devtools. Then update `README.md`,
  prepend `PROJECT_HANDOFF.md`, refresh `docs/STATE.md`.

---

## Phase 1 — Fix known issues (start here, small and mechanical)

These are confirmed-on-disk problems, not speculation.

### 1.1 `SettlePanel.tsx` money parsing + inline UPI links
`src/components/SettlePanel.tsx:89` computes
`Math.round(parseFloat(amountRupees || "0") * 100)` and hand-builds GPay/PhonePe
intent strings inline (line ~99 onward). The 2026-07-03 P3 fix only reached
`GuestSettlePanel`. Fix the main panel the same way:
- Client validation mirrors `rupeesToPaise` semantics (reject sub-paise,
  reject non-numeric) — reuse/extract the `parseRupees()` helper from
  `GuestSettlePanel` into a shared client-safe util.
- All deep links go through `buildUpiLink` / `buildGpayLink` /
  `buildPhonepeLink` / `buildPhoneUpiLink` from `src/lib/upi.ts`. Delete the
  inline template strings. Note the VPA-priority rule: if payee has `upiId`,
  every app button targets the VPA; only fall back to phone-derived handles
  when no VPA exists (current inline code does this — preserve the behavior,
  move it into or beside `upi.ts` so guest and member panels share it).

### 1.2 Remaining audit leftovers (`docs/AUDIT.md §7`)
- **P3-12:** allow settlement against real net balances, not only the stored
  simplified edges (partial settlements between a pair who net out through a
  third member currently can't be recorded cleanly).
- **Lint:** CI notes 1 ESLint error + 8 warnings. Drive to zero errors, and
  clear warnings where cheap.
- **Multi-currency honesty:** currency prefs are already off the paywall. Keep
  FX out of scope for this overhaul; make sure no UI copy still *sells*
  conversion. Pricing page and Settings must describe it as "display currency"
  only.

### 1.3 Console/ops items to re-verify (no code)
App Check enforcement (`docs/APP_CHECK_SETUP.md`), Cloud Scheduler hitting
`/api/cron/recurring`, Vision API enabled. Record status in `docs/STATE.md`.

**Gate:** standard verification gate. Add a regression test for the shared
`parseRupees` client validator.

---

## Phase 2 — Mobile-first UI/UX overhaul

Goal: the app should feel like a native Android app, not a website. Work
screen-by-screen; keep each screen's change a reviewable unit.

### 2.1 App shell
- **Bottom nav (`src/components/BottomNav.tsx`):** keep the 5-slot layout
  (Home / Groups / FAB / People / Me). Add: active-tab transition (respecting
  `prefers-reduced-motion`), a subtle top hairline shadow when content scrolls
  under it, and hide-on-scroll-down / show-on-scroll-up so content gets the
  full viewport during long lists.
- **FAB:** on group detail it already deep-links to add-expense — good. On
  Home/Groups, open a **bottom-sheet quick menu** (Add expense → pick group /
  New group / Settle up) instead of navigating to `/groups`.
- **Page transitions:** lightweight slide/fade between app routes via a shared
  template; skip entirely under reduced motion.
- **Safe areas:** audit every fixed element for `env(safe-area-inset-*)`
  (BottomNav already does the bottom inset).
- **Pull-to-refresh** on Home, Groups, People, and group detail (touch-only,
  triggers `router.refresh()`).

### 2.2 Loading + perceived speed
- **Skeleton screens** (`loading.tsx`) for every app route — shaped like the
  real content (list rows, balance cards), not spinners.
- **Optimistic UI** for expense add/edit/delete and settlement record: update
  the visible list immediately via `useOptimistic`/transition state, reconcile
  on server response, roll back with a toast on failure. The backend already
  supports offline replay via `clientId` idempotency — the UI should exploit it.
- **Toast system:** one small shared toast/snackbar component (success /
  error / undo-style info). Replace ad-hoc inline success messages where a
  transient confirmation is more appropriate.

### 2.3 Screen-by-screen pass (375px first)
For each screen: hierarchy, spacing rhythm, 44×44 touch targets, thumb-zone
placement of primary actions, designed empty states, and AA contrast.

1. **Home (`/home`):** lead with the single number people open the app for —
   net position ("you are owed ₹X / you owe ₹Y") as a hero card, then
   per-group balance chips, then recent activity. Primary CTA = settle or add
   expense based on state.
2. **Groups list:** balance-forward rows (group name, your net in that group,
   member avatars), category filter chips scrollable horizontally.
3. **Group detail:** the busiest screen. Keep inline tabs
   (Expenses / Balances & Settle / Members) but make them sticky under the
   header. Expense feed: day-grouped, avatar + "Priya paid ₹540 · you owe ₹135"
   phrasing, category icon. Balances tab leads with *your* edges before the
   full matrix.
4. **Expense form:** biggest UX win available. Convert to a mobile flow:
   amount-first entry with a large numeric display, then title/category,
   then split editor. Split editor gets live per-person preview chips and
   inline reconciliation feedback (already required by AGENTS.md — show
   mismatch before submit). Keep OCR/template affordances as secondary rows.
5. **Settle screen:** see Phase 3 — it gets its own overhaul.
6. **People (`/people`):** same balance-forward treatment as groups.
7. **Settings ("Me"):** profile (name, photo, **UPI ID — promote this field**,
   since it improves everyone's payment links to you), plan card, currency,
   categories, sign out. Add **"Delete account"** (see Phase 6 — Play Store
   requires it).
8. **Onboarding:** after first login, a 2–3 step sheet: name → UPI ID
   (skippable) → create first group or add first person. Currently minimal.

### 2.4 Accessibility & motion
- Systematic 44×44 pass (audit flagged `h-9` chips; some remain outside the
  guest flow).
- Focus-visible on every interactive element; AA contrast check on
  dim/faint text over `bg-ink`/`bg-card`.
- All new animation behind a `prefers-reduced-motion` check — add one shared
  `useReducedMotion()` hook instead of per-component media queries.

**Gate:** standard gate + manual walkthrough of all 8 screens at 375px and at
one desktop width. Screenshot set saved for the handoff entry.

---

## Phase 3 — Smooth transactions (settle flow + PhonePe/GPay)

The deep-link builders exist (`src/lib/upi.ts`, tested). This phase is about
the *flow* around them.

### 3.1 Pay sheet
Replace the current settle card internals with a bottom-sheet flow launched
from any debt row:

1. **Sheet opens** with payee avatar/name, amount pre-filled (editable,
   validated by the shared `parseRupees`), and over-settlement still blocked
   against the active debt.
2. **App buttons:** GPay, PhonePe, and "Other UPI app" (generic `upi://`) —
   large 56px rows with brand icons, links from `lib/upi.ts` only. Buttons
   render only when a target exists (VPA or phone); otherwise show "Ask
   {name} to add a UPI ID" with a share-nudge action.
3. **Awaiting-payment state:** after tapping an app link, the sheet switches
   to "Complete the payment in {app}, then come back". Use a
   `visibilitychange` listener to re-focus the sheet when the user returns.
   Do **not** navigate away (AGENTS.md rule).
4. **Confirmation step:** "I've paid" → optional payment ref (UTR) →
   `settleUp` action (unchanged payer-confirms model) → optimistic history row
   + success state. "I didn't pay" resets the sheet.
5. **Cash path:** same sheet, method toggle, no deep link — straight to
   confirm. Cash remains the only non-UPI method; do not add anything else.

### 3.2 Desktop fallback: QR
UPI intent links are dead on desktop. Render a **UPI QR code** (encode the same
`upi://pay?...` string; add a small dependency-free QR generator or a tiny
vetted lib) so desktop users can scan with their phone. Boundary rule
unchanged: rupees conversion only inside `upi.ts`.

### 3.3 Reminders / nudges (India-first)
- "Remind" button on any debt owed *to* you: composes a prefilled message
  (amount, group, guest/app link) via the Web Share API, falling back to a
  `https://wa.me/?text=` WhatsApp share link. No SMS sending from server —
  client-side share only, zero cost, zero spam surface.
- Keep it manual (user-triggered). No automated reminder infra in this phase.

**Gate:** standard gate + real-device test on Android: GPay opens with VPA,
PhonePe opens, generic chooser opens, desktop shows QR. Unit tests for any new
pure helpers (QR payload, share-message builder).

---

## Phase 4 — Contacts integration (find friends on Owely)

Backend primitives exist: `findRegisteredUsers` (E.164-normalizing, capped at
50 numbers/call, uid stripped) and `addMembersByPhone` in
`src/features/groups/actions.ts`. This phase builds the client and the
Firestore contact store.

### 4.1 Client: Contact Picker
- Use the **Contact Picker API** (`navigator.contacts.select(['name','tel'],
  {multiple:true})`) — available on Android Chrome in secure contexts, which
  is exactly the launch target. Feature-detect; on unsupported browsers
  (desktop, iOS Safari) fall back to the existing manual name+phone form.
- Entry points: group Members tab ("Add from contacts"), People page ("Add
  person"), and onboarding step 3.
- The picker is one-shot by design (no standing permission) — that's fine and
  is the privacy story: Owely only ever sees contacts the user explicitly
  selects.

### 4.2 Firestore store + matching
- New collection **`users/{uid}/contacts/{contactId}`** (subcollection keeps
  it owner-scoped and cascade-deletable): `{ name, phone (E.164), phoneHash
  (SHA-256 of E.164, for future privacy-preserving matching), onOwely:
  boolean, matchedName?, matchedPhotoURL?, createdAt, lastSyncedAt }`.
  `contactId` = deterministic hash of E.164 so re-imports dedupe.
- Add a corresponding type in `src/types/`, the collection path in
  `lib/firebase/collections.ts`, and a **security rule in the same change**:
  reads scoped to the owner, client writes denied (writes only through the
  new Server Action).
- New Server Action `syncContacts` (`src/features/contacts/actions.ts`):
  session-verified, accepts ≤50 contacts per call (client chunks larger
  picks), normalizes via the existing E.164 validation, runs
  `findRegisteredUsers` matching server-side, upserts contact docs with match
  results. Return a typed summary `{ added, matched, invalid }`.
- **Consent + retention:** a one-line explanation before first pick ("Owely
  stores the contacts you select to show who's already here. Remove them any
  time in Settings."). Settings gets a "Clear imported contacts" destructive
  action (confirming, deletes the subcollection in batched writes).

### 4.3 Surfacing matches
- "On Owely" badge in add-member/add-person flows; matched contacts sort
  first and link directly (`addMembersByPhone` for groups, direct-link action
  for People).
- Unmatched contacts get an "Invite" action → existing phone-invite path plus
  the Phase 3 share-message nudge.
- **Abuse guard:** `syncContacts` inherits the enumeration concerns of S7 —
  add a simple per-uid daily quota (e.g. 500 numbers/day, counter doc) so the
  contact store can't be scripted into a phone-number oracle.

**Gate:** standard gate + rules test that a client cannot read another user's
contacts + Android Chrome manual test of the picker; fallback form verified on
desktop.

---

## Phase 5 — Good-to-have features (pick all; ordered by value)

1. **Activity feed (free):** a unified reverse-chron feed on Home — expenses
   added/edited/deleted, settlements recorded/disputed, members joined —
   across all your groups. Read model composes from existing collections
   (denormalize the fields list views need onto the docs; don't add a new
   collection unless composition proves too slow).
2. **Search (free):** client-side filter within a group's expenses (title,
   member, category, amount) — the data is already on screen; no index needed.
   Global search can wait.
3. **Spending insights (Pro):** monthly totals by category and by group,
   simple bar/donut rendered with inline SVG (no chart library). Personal
   ledger (`/own`) gets the same monthly view. Server-computed in queries;
   paise → display at the edge.
4. **Settle-all shortcut:** on Home, "Settle up" opens a sheet listing every
   simplified edge you owe across groups, each opening the Phase 3 pay sheet.
5. **Expense detail niceties:** notes field already exists on the form —
   surface notes + payment refs in the feed row expansion; add "duplicate
   expense" (prefills the form).
6. **Data export (free tier CSV):** per-group CSV of expenses via a new
   authenticated route — cheap goodwill counterpart to the paid PDF.

Skip (already decided in `AGENTS.md` — do not build): payment aggregation,
wallets, cards; friend graph outside groups/direct; standalone IOU tracking.

**Gate:** standard gate; new queries covered by tests where they contain
arithmetic (insights aggregation must reconcile with expense sums exactly).

---

## Phase 6 — PWA + release readiness (Android via TWA)

### 6.1 PWA completion
- `manifest.json` exists (icons, name). Add: `display: "standalone"`,
  `theme_color`/`background_color` matching `bg-ink`, maskable icon variant,
  `shortcuts` (Add expense, Settle up).
- **Service worker:** precache the app shell + static assets; runtime
  network-first for pages. Firestore offline persistence already handles
  data. Keep it minimal — no background sync in v1.
- **Install prompt:** capture `beforeinstallprompt`, show a dismissible
  "Add Owely to your home screen" card on Home after ~2 sessions.

### 6.2 TWA groundwork (the "convert to Android app later" path)
- Serve `/.well-known/assetlinks.json` (placeholder now; real SHA-256 cert
  fingerprint when the Bubblewrap/PWABuilder package is generated).
- Document the TWA packaging steps in `docs/ANDROID.md`: Bubblewrap init
  against the live `*.hosted.app` URL, signing key handling, Play Console
  listing checklist. The Contact Picker and UPI intents both work inside TWA.

### 6.3 Play Store compliance (blockers if missing)
- **Account deletion:** in-app "Delete my account" (Settings) + a public web
  deletion path — Play requires both for apps with accounts. Server Action:
  re-auth (fresh OTP), then delete/anonymize user doc, remove from groups
  (reassign or tombstone their expense participation as a named-but-inactive
  member so group math stays conserved), revoke sessions, delete auth user.
  **This touches the money model — plan the tombstone design and get
  confirmation before coding it** (AGENTS.md complexity rule).
- **Privacy policy + ToS pages** (`/privacy`, `/terms`) — must cover contacts
  storage (Phase 4), payments (Owely never holds funds), data deletion.
  Linked from landing footer, Settings, and the Play listing.

### 6.4 Test coverage (audit P4 — the biggest blind spot)
Integration tests for: entitlement enforcement incl. trip-pass expiry (exists
— extend), freemium cap inside the transaction, webhook signature +
idempotency, `recomputeSimplified` under concurrent writes, guest read-only
enforcement, and the new `syncContacts` quota.

### 6.5 Ops checklist (console, one-time)
- App Check **enforced** (not just wired).
- Cloud Scheduler job hitting `/api/cron/recurring` daily with `CRON_SECRET`.
- Firestore composite indexes deployed for every query in
  `features/*/queries.ts` (run each screen against production rules/indexes).
- Razorpay live keys + webhook URL on the production domain.
- Firebase Auth authorized domains include the final domain.

**Gate:** full regression: typecheck, tests, lint, build, Lighthouse PWA
audit ≥ 90, manual Android device pass (install → onboard → create group →
contact-pick → add expense → settle via GPay → export).

---

## Suggested execution order & sizing

| Phase | Scope | Rough size |
|-------|-------|-----------|
| 1 | Known fixes | Small — 1 session |
| 2 | Mobile UI/UX overhaul | Large — several sessions, screen-by-screen |
| 3 | Pay sheet + QR + nudges | Medium |
| 4 | Contacts | Medium |
| 5 | Features | Medium — items independent, ship 1–2 at a time |
| 6 | PWA/TWA + compliance + tests | Medium-large |

Phases 3 and 4 are independent of each other and can swap. Phase 2 should land
before 3 (the pay sheet builds on the new sheet/toast primitives). Account
deletion (6.3) is the only item requiring a design confirmation before code.
