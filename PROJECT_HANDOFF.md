# Owely — Project Handoff

Prepend a new dated entry at the top after every change. Newest first.

---

## 2026-06-18 — Backend hardening continuation

Continued the feature audit after the expense-write and own-recurring fixes.

- Group deletion/invalid direct-ledger cleanup now removes top-level documents
  that `recursiveDelete(groups/{id})` cannot see: shared recurring definitions,
  templates, and pending group invites.
- Recurring generation now derives month/day in `Asia/Kolkata` instead of UTC,
  and each due rule is claimed inside a Firestore transaction before the
  generated own/shared expense is written. Concurrent cron calls no longer
  double-report generation or overwrite deterministic monthly docs.
- Monthly close now uses an IST cutoff and `tx.create` for the closure doc, so
  concurrent close attempts cannot silently overwrite the same month.
- Custom category edits/deletes now propagate denormalized group metadata:
  renamed categories update `group.categoryName`, and deleted categories clear
  `categoryId/categoryName/categoryKind` from affected groups.
- Production admin login no longer accepts hardcoded `admin/admin`; production
  requires `OWELY_ADMIN_USERNAME` and `OWELY_ADMIN_PASSWORD`. Local development
  still falls back to `admin/admin` when those env vars are unset.
- Sign-out now attempts Firebase refresh-token revocation before clearing the
  session cookie, matching the route comment and reducing stale-session risk.
- Group-scoped paid API routes now verify group membership before entitlement
  checks.
- `apphosting.yaml` now binds `CRON_SECRET` plus admin credential secrets, and
  `.env.example` documents the admin env vars.
- ESLint now ignores generated `design-handoff/**` assets, restoring lint to
  product-code scope.

Verification is green: `npm run typecheck`, `npm run lint`, `npm test`, and
`npm run build`.

---

## 2026-06-18 — Fix expense Firestore writes and own recurring UI

Fixed the shared expense write failure caused by the simplified-debt recompute
transaction writing the triggering expense/settlement before reading the
expenses and settlements collections. Firestore transactions reject
read-after-write ordering, so `src/lib/recompute.ts` now reads the group,
expenses, and settlements first, applies the pending write, projects that write
into the in-memory recompute state, and then updates `group.simplifiedDebts`.

Updated `src/features/expenses/actions.ts` to use the new mutation contract for
single and batch expense creation. Idempotent client IDs now skip existing docs
before quota checks and inside the recompute transaction, batch requests count
only genuinely new expense IDs against the free monthly cap, and the monthly
freemium counter only bumps for newly-created expenses.

Exposed personal recurring expenses on `/own`: the page now fetches own
recurring definitions and user tier, and `OwnExpenseManager` lets paid users
create, pause/resume, and delete monthly personal rules with a 1-28
day-of-month selector (for SIPs, insurance, subscriptions, etc.).

Verification is green: `npm run typecheck`, `npm run lint`, `npm test`, and
`npm run build`.

---

## 2026-06-18 — Backend feature-module refactor continued

Continued the backend structure cleanup after the flat `src/actions` removal.
Moved group internals out of the oversized `src/features/groups/actions.ts`
file into focused server-only modules:

- `src/features/groups/member-profiles.ts` for member/user profile lookup.
- `src/features/groups/direct-groups.ts` for deterministic direct group IDs and
  idempotent direct group creation.
- `src/features/groups/invites.ts` for invite/link orchestration, including a
  batched `addMembersByPhone` path that chunks phone lookups and avoids one user
  query per person.
- `src/features/groups/guest-merge.ts` for guest-to-user migration of group
  membership, expense splits, payer fields, and settlement parties.

Also migrated app/routes/components off legacy `@/lib/session`,
`@/lib/session-cookie`, `@/lib/firebase/auth-errors`, `@/lib/read-model`, and
`@/actions` imports. They now consume feature-owned auth/actions/query modules
directly.

Verification is green: `npm run typecheck`, `npm run lint`, `npm test`, and
`npm run build`.

---

## 2026-06-17 — Easy win bug fixes: timezone, mapping, counter, proxy, docs

Fixed 10 small correctness and consistency issues discovered during a full codebase audit. All gates green: `typecheck` clean, **32 tests pass**, `build` clean, `lint` clean.

- **isMonthClosed timezone bug** (`src/features/groups/closures.ts`): `isMonthClosed` now derives month/year in IST (`Asia/Kolkata`) via `toLocaleString`, matching `currentMonthKey()` in `freemium.ts`. Previously the server timezone (UTC-4/5) caused write locks to apply to the wrong month near month boundaries.
- **mapGroup dropped new fields** (`src/lib/firebase/mapping.ts`): Added `groupMode`, `debtThreshold`, `debtRoundTo`, `monthlyCloseEnabled` to `mapGroup` so group settings are correctly surfaced to the UI and passed through the type system.
- **fetchClosures bypassed mapping** (`src/features/groups/closures.ts`): Replaced raw `doc.data() as MonthlyClosure` with a new `mapClosure` helper in `mapping.ts` that converts Firestore timestamps to epoch millis consistently.
- **addBatchExpenses incremented wrong counter** (`src/features/expenses/actions.ts`): Removed the dead `group.expenseCount` increment and replaced it with `incrementCounterInTx(groupId)` so batch writes correctly consume the freemium monthly quota (consistent with `addExpense`).
- **/admin exposed in proxy** (`src/proxy.ts`): Added `/admin` to `PROTECTED` and the `matcher` config so the admin login form is no longer publicly reachable without a session cookie.
- **closeMonth timestamp inconsistency** (`src/features/groups/closures.ts`): Changed `closedAt: Date.now()` to `FieldValue.serverTimestamp()` so all writes use the same atomic Firestore timestamp mechanism.
- **mapSettlement default method** (`src/lib/firebase/mapping.ts`): Changed the fallback from `"upi"` to `undefined` for legacy settlements that predate the `method` field, preventing misleading UPI labels on historical records.
- **Stale docs paths** (`README.md`, `AGENTS.md`): Updated the architecture diagram and agent context to reflect the actual `src/features/*/actions.ts` structure instead of the old `src/actions/` path.
- **Firestore composite indexes** (`firestore.indexes.json`): Added composite indexes for `invites` (phone+status, groupId+status) and `recurring` (ownerUid+active) so these queries don't throw `FAILED_PRECONDITION` at scale.
- **Inline paise→rupees cleanup** (`src/lib/money.ts`, `src/lib/upi.ts`, `page.tsx`, `SettlePanel`, `GuestSettlePanel`): Added `paiseToRupees` to `money.ts` (with test), exported `cleanPhone` from `upi.ts`, and removed duplicated `cleanPhone` definitions and inline `(amount/100).toFixed(2)` formatting from the settle components and group page.

---

## 2026-06-17 — Fix Firebase App Hosting auth environment

Remote sign-in was failing while local sign-in worked because the deployed App
Hosting config still inlined placeholder Firebase Web values and did not inject
the Admin SDK service-account secret at runtime. Updated `apphosting.yaml` with
the public Firebase Web `apiKey` and `appId`, and enabled the
`FIREBASE_SERVICE_ACCOUNT_KEY` runtime secret binding.

Before the next live deploy, create the App Hosting secret with
`firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT_KEY` and add the live
`<backend>--owely-c6c51.<region>.hosted.app` host to Firebase Authentication >
Settings > Authorized domains. Without the secret, `/api/auth/session` cannot
mint the server session cookie after Firebase client sign-in.

Completed in Firebase: created `FIREBASE_SERVICE_ACCOUNT_KEY` secret version 1,
granted App Hosting access, and added
`owely--owely-c6c51.us-east4.hosted.app` to Firebase Auth authorized domains.

---

## 2026-06-17 — Implemented Phase B — Differentiators (Smart Modes, Guest Links, Batch Add, & Closures)

Completed implementation and verification of Phase B deliverables:

- **Group Mode Selector**: Added selection dropdown for Trip, Roommates, Couple, Lunch, Friends, Family, and Custom in standard group creation form.
- **Debt Round-off & Thresholds**: Integrated `debtRoundTo` and `debtThreshold` filters in `simplifyFromNet`. Fixed infinite loop edge cases by using dynamic limits and updated Vitest coverage.
- **Batch Expense Entry**: Implemented `addBatchExpenses` Server Action and the BatchExpenseForm client UI at `/groups/[groupId]/expenses/batch` to quickly log multiple expenses.
- **Monthly Closures**: Implemented `closeMonth` action, locking helper `isMonthClosed`, and MonthlyClosePanel UI tab. Added write locks blocking new/edited/deleted expenses or settlements in closed months.
- **Zero-friction Guest Ledger**: Generated guest members immediately (`guest_[uuid]`) on invite and linked them to invite tokens. Added guest-login Route Handler to set secure cookies, and `/groups/[groupId]/guest` page for read-only viewing and payment confirmations.
- **Guest-to-User Merge**: Added complete migration path in `acceptInvite` action to merge a guest's history, balances, and settlements to their actual authenticated user account upon sign-up.
- **Fairness Insights**: Created a widget displaying contributor ratios and round-robin payment suggestions on the group Balances tab.

All gates are green: `typecheck` clean, all 31 unit tests pass, and `build` compiles successfully.

---

## 2026-06-17 — Update Architecture and Phased Build Roadmap with Premium Differentiators

Aligned the design specifications and roadmaps with the user's detailed product notes.

- **Updated ARCHITECTURE.md**: Documented positioning taglines ("WhatsApp for shared money"), guest sharing link token patterns, NLP quick add parsing concepts, roommate/couple monthly close carry-forward rules, smart group modes (Trip, Roommates, Couples, Office Lunch), and pricing plans (Pro tier subscription + single-use Trip Pass).
- **Updated PHASES.md**: Expanded the future roadmap milestones (adding R10 through R14) to explicitly schedule the onboarding flows, group-specific dashboards, guest views, batch inputs, NLP parser, audit feeds, comments, and FCM notifications.
- **Confirmed Free Tier Limit**: Confirmed keeping the 100 expenses/month limit per group on the Free Tier, removing any conflict indicators.

---

## 2026-06-17 — Custom Category Management, Dashboard Filters, Category Tagging, & Private Personal Ledger (/own)

Implemented the user-facing UI for relationship categories and the un-shared private personal ledger.

- **Private Personal Ledger (`/own`)**: Created the Server Component container (`src/app/(app)/own/page.tsx`) and the Client controller (`src/components/OwnExpenseManager.tsx`). Users can now track private expenses with a monthly spent total summary, full CRUD forms, and category styling icons.
- **Category Management UI**: Integrated a custom relationship category management dashboard panel (`src/components/CustomCategoriesManager.tsx`) in `/settings` allowing users to view predefined categories and create, edit, or delete custom categories.
- **Group/Relationship Category Tagging**: Created a dropdown Category picker (`src/components/CategoryPicker.tsx`) integrated in the group details page header. Users can assign standard/custom categories or clear tags from standard groups and direct 1:1 relationships.
- **Dynamic Category Filtering**: Replaced static dashboard lists with dynamic category-filtered list wrappers (`src/components/FilteredGroupsList.tsx` and `src/components/FilteredPeopleList.tsx`) filtering standard groups and direct relationships instantly on the client side using category chips.
- **App Shell Navigation**: Added a "Personal" menu item in `layout.tsx` (sidebar + mobile tabs) and protected the `/own` routes in `src/proxy.ts`.

---

## 2026-06-17 — Admin Page Redesign, Inline User Editing, Donut SVG Chart, PWA & Cloud Function Trigger

Updated the admin page at `/admin` to add inline user editing, an interactive SVG donut chart, and remove group membership widgets. Also bootstrapped Progressive Web App (PWA) assets and template Firebase triggers.

- Created `src/app/admin/page.tsx` as a standalone Server Component, bypassing edge middleware configuration.
- Created `src/components/AdminLoginForm.tsx` lock screen requiring `admin/admin` credentials.
- Created `src/components/AdminUserRow.tsx` supporting seamless inline spreadsheet-like editing for user Display Name, Phone number, and Tier (Free/Paid).
- Created a `updateUserAdmin` Server Action inside `src/actions/admin.ts` to write admin updates directly to Firestore.
- Added a visual **SVG Donut Chart** widget in `/admin` dashboard illustrating Free vs Paid member distribution with an active legend (percentages + counts).
- Completely removed standard groups and membership editing widgets from the admin panel, deleting `AdminGroupController.tsx` and unused `addGroupMemberAdmin` / `removeGroupMemberAdmin` Server Actions.
- Bootstrapped PWA setup by creating a web manifest (`public/manifest.json`), generating a custom circular owl app icon image (`public/icon.png`), and linking it within Next.js root layout metadata (`src/app/layout.tsx`).
- Created a Cloud Function auth trigger template (`scripts/cloud-function-user-trigger.ts`) which auto-seeds new user profiles in Firestore on signup to prevent first-login latency and cold starts.

---

## 2026-06-17 - Recurring expense management UI

Continued the paid-feature buildout by making shared recurring definitions
usable from group/direct ledgers.

- Added `src/components/RecurringPanel.tsx`.
- Added a `Recurring` tab to `groups/[groupId]`.
- Paid users can create monthly equal-split recurring expenses with title,
  amount, payer, category, participants, and day-of-month.
- Paid users can pause/resume and delete saved recurring rules.
- Free users see a Pro affordance instead of calling paid-only actions.
- `updateRecurring` and `deleteRecurring` now revalidate the affected group or
  own-expense path after changes.
- The recurring tab strip is horizontally scroll-safe on narrow mobile widths.

Generation still depends on the existing `/api/cron/recurring` route and
production Scheduler/`CRON_SECRET` configuration.

Verified with `npm run typecheck`, `npm run build`, `npm test`, and
`npm run lint`.

---

## 2026-06-17 - Receipt OCR upload UI

Continued the paid-feature buildout by making the existing OCR backend usable
from the add-expense flow.

- Added a receipt OCR panel to `ExpenseForm` for new expenses.
- Paid users can upload an image receipt; the form calls
  `POST /api/receipts/ocr` and prefills the title and amount when the OCR route
  returns confident hints.
- Free users see a Pro affordance that routes to Settings instead of hitting the
  paid route.
- OCR remains prefill-only: no expense is written until the user confirms the
  normal expense form, preserving paise validation and split reconciliation.
- Kept OCR hidden on edit-expense for now to avoid accidental overwrite of an
  existing expense.

Verified with `npm run typecheck`, `npm run build`, `npm test`, and
`npm run lint`.

---

## 2026-06-17 - Settlement method + overpay guard

Continued the product-gap buildout with the settlement trust slice.

- Added explicit settlement method capture: `upi` or `cash`.
- Updated `settleUp` to reject attempts to record a settlement when the payer has
  no active debt to that payee.
- Capped recorded settlement amounts to the current simplified debt amount, with
  both server-side enforcement and client-side inline validation.
- Updated settlement history and PDF export rows to show UPI/Cash plus any
  reference or cash note.
- Kept `method` optional on the shared `Settlement` type because the same type is
  also used for pending suggested transfers in `group.simplifiedDebts`.

Verified with `npm run typecheck`, `npm run build`, `npm test`, and
`npm run lint`.

---

## 2026-06-17 - Pro export entry point + balance display alignment

Started the product-gap buildout from the audit with a low-risk UI slice.

- Added a paid PDF export entry point on `groups/[groupId]`:
  - Paid users get a direct download link to `/api/groups/{groupId}/export/pdf`.
  - Free users see a Pro export affordance that routes to Settings instead of
    hitting the paid route and receiving raw JSON.
- Added a Settings plan/tools panel showing the stored user tier, display
  currency, monthly free limit, and Pro feature availability.
- Updated the group member balance display to read from stored simplified
  transfers via `netPositionFromSettlements`, keeping the visible balance state
  aligned with completed settlements and disputes.
- Pinned ESLint back to the compatible 9.x line for `eslint-config-next@16.2.9`
  so `npm run lint` can execute under the current Next config.

Verified with `npm run typecheck`, `npm run build`, `npm test`, and
`npm run lint`.

---

## 2026-06-17 — Dashboard Layout + Phone-First UPI Flow

Completed redesign of onboarding layout, dashboard, group detail inline tabs, and phone-first UPI flow.

- Redesigned `/groups` page to act as a proper **Dashboard** containing responsive inline tabs (Groups / People / Activity).
  - Groups tab: grid of standard groups.
  - People tab: grid of 1:1 relationships.
  - Activity tab: recent aggregated activity list across all groups.
- Redesigned `groups/[groupId]/page.tsx` with **inline tabs** (Expenses / Balances & Settle / Members).
  - Settle panel and simplified balances transfers are shown directly inside the "Balances & Settle" tab, removing the need to navigate to separate settle page.
- Created `src/components/DashboardTabs.tsx` to handle client tab switching using URL search parameters (tab is bookmarkable and shareable).
- Implemented **phone-first UPI flows** inside `SettlePanel.tsx`:
  - Shows Google Pay, PhonePe, and generic UPI app deep-link buttons using registered phone numbers with app intent schemes (`intent://...`).
  - Added an **amount input** inside `DebtCard` allowing custom payment/settlement amounts (e.g. for partial settlements) instead of only settling full amounts.
  - Falls back to VPA/UPI ID if the payee has set one in their profile.
- Redesigned `/onboarding` page to feature a professional, responsive two-column grid layout on desktop screens.
- Updated `src/app/(app)/layout.tsx` to show a premium left sidebar navigation on desktop screens (>=1024px) and fallback to standard header/tabs on mobile.
- Updated docs `docs/STATE.md` and `AGENTS.md`.
- Created `scripts/seed-mock-data.ts` to seed mock data for users (`8888888888`, `9999999999`, and `7777777777`), 1:1 direct relationship coffee/lunch expenses, and a standard group Goa trip with shared expenses.

---

## 2026-06-17 — Paid receipt OCR backend

Added the backend prefill path for paid receipt OCR.

- Installed `@google-cloud/vision`.
- Added `src/lib/vision-ocr.ts` using the existing Firebase service-account
  credentials to call Google Vision server-side.
- Added `src/lib/receipt-ocr.ts` with pure extraction of amount/date/merchant
  hints from OCR text, plus Vitest coverage.
- Added `POST /api/receipts/ocr`: requires session + paid `ocr` entitlement,
  accepts image uploads up to 8 MB, optionally checks `groupId` membership, and
  returns raw text plus structured hints.
- The route does not write an expense. Users must confirm through the existing
  expense action so paise reconciliation and debt recompute stay centralized.

Docs updated in `README.md`, `docs/STATE.md`, and `docs/PHASES.md`.
Ops note: enable the Google Cloud Vision API for `owely-c6c51` before using the
route in production. `apphosting.yaml` now also includes the commented
`CRON_SECRET` runtime secret block for the recurring scheduler.

---

## 2026-06-17 — Paid multi-currency metadata backend

Added the backend settings surface for paid multi-currency without changing the
paise money engine.

- Added `src/lib/currency.ts` with the supported currency code list.
- Added Zod schemas for display/base currency updates.
- Added `src/actions/currency.ts`:
  `updateDisplayCurrency` and `setGroupBaseCurrency`.
- Both writes require the paid `multi-currency` entitlement. Group base currency
  is creator-only because it affects everyone in the ledger.
- New groups/direct ledgers now persist `baseCurrency:"INR"` and legacy reads
  default missing `baseCurrency` to `INR`.

Docs updated in `README.md`, `docs/STATE.md`, and `docs/PHASES.md`.
Important boundary: expenses still use integer paise and INR inputs. Non-INR
expense creation/conversion should wait for an explicit no-FX/FX policy.

---

## 2026-06-17 — Paid PDF export backend

Added the backend route for paid group/direct PDF exports.

- Installed `pdfkit` + types.
- Added `GET /api/groups/[groupId]/export/pdf`.
- The route verifies the session, checks group membership, requires the paid
  `pdf-export` entitlement, then renders a downloadable PDF with members,
  current simplified balances, expenses, and settlement history.
- Kept PDF amounts as `INR 0.00` text for built-in font compatibility.

Docs updated in `README.md`, `docs/STATE.md`, and `docs/PHASES.md`.
Remaining work: add the paid export button/UI and decide if richer branding is
needed in the PDF layout.

---

## 2026-06-17 — Paid entitlement guards for backend actions

Added server-side paid feature enforcement so UI paywalls cannot be bypassed by
calling Server Actions directly.

- Added `src/lib/entitlements.ts` with `requirePaidFeature(uid, feature)`.
- Wired paid guards into template create/update and recurring create/update
  actions. Delete actions remain allowed so users can clean up existing paid
  data after a downgrade.
- The guard reads `users/{uid}.tier` and returns `code:"paid-required"` for free
  users.

Docs updated in `README.md`, `AGENTS.md`, `docs/STATE.md`, and
`docs/PHASES.md`. Remaining monetization backend: real subscription/provider
state when billing is chosen; current guard uses the existing `tier` field.

---

## 2026-06-17 — Paid templates backend

Added the backend write/read path for paid split templates; no UI yet.

- Added `SplitTemplate` / `TemplateSplitType` to `src/types/index.ts`.
- Added `paths.template()` and `fetchGroupTemplates(ownerUid, groupId)`.
- Added Zod schemas for create/update/delete template inputs.
- Added `src/actions/templates.ts`:
  `createTemplate`, `updateTemplate`, `deleteTemplate`.
- Templates are owner-scoped and group-specific. They store participants and
  optional basis-point weights, never money amounts. Percentage templates must
  sum to exactly 10000 basis points; applying them later should still go through
  the normal expense action so paise reconciliation remains centralized.

Docs updated in `README.md`, `docs/STATE.md`, and `docs/PHASES.md`.
Remaining template work: paid gating and UI on the add-expense screen.

---

## 2026-06-17 — New motion-rich marketing landing page (`/`)

Replaced the old app-preview home (`src/app/page.tsx`) with the dark, playful,
motion-rich marketing landing page from the Claude Design handoff bundle
(`Owely Landing.dc.html`). `typecheck` + `lint` clean, `build` clean, `/`
prerenders as static content.

- **New `src/components/landing/`**: `LandingMotion.tsx` (the only client
  component — a single `requestAnimationFrame` ambient-motion engine plus
  IntersectionObserver scroll-reveals, count-ups, nav/progress scroll state,
  hero mouse-parallax + spotlight, and magnetic buttons; all attach to `data-*`
  hooks). Section components (server-rendered): `Nav`, `Hero`, `Marquee`,
  `HowItWorks`, `Features` (bento), `Simplify` (before/after debt graphs),
  `Compare` (7-row "Owely vs the rest" table), `Pricing` (Free ₹0 / Pro ₹99 —
  **₹99 is a placeholder**), `ValueBand` (count-ups), `Cta`, `Footer`. Shared
  SVGs in `icons.tsx`.
- **Progressive enhancement / a11y**: content is always visible server-side;
  motion only enhances. The engine fully no-ops under
  `prefers-reduced-motion` (no rAF, parallax, or magnet listeners; reveals and
  counters resolve to their final state instantly). Keyboard focus rings +
  hover states live in scoped `#owely-landing` CSS in `globals.css`; added
  `scroll-behavior:smooth` (reset to `auto` under reduced motion).
- **No new tokens** — reused the existing design-system tokens
  (`accent`/`accent2`/`mint`/`coral`/surfaces/text). All CTAs route to
  `/login`; in-page nav uses hash anchors. Responsive headings use `clamp()`
  and sections collapse to single-column so the page holds at 375px.

---

## 2026-06-17 — Completed the half-built category write path + user tier init

Picked up two backend pieces that were left mid-flight by the
direct-relationships / freemium work. `typecheck` + `lint` clean, **23 tests
pass**, `build` clean.

- **Categories had a read side but no write side.** The `categories/{id}`
  collection, its rule, `mapRelationshipCategory` + `fetchUserCategories`, the
  predefined constants, and `Group.category*` fields all existed — but nothing
  could create or assign a category. Added `src/actions/categories.ts`:
  `createCategory` / `updateCategory` / `deleteCategory` (owner-scoped) and
  `setGroupCategory` (tags a group/1:1 with a predefined id or an owned custom
  category, or clears it; denormalises name + kind onto the group). Added the
  matching Zod schemas (`CreateCategorySchema`, `UpdateCategorySchema`,
  `DeleteCategorySchema`, `SetGroupCategorySchema`) in `validation.ts`. Category
  management UI is still the open Phase 6 item.
- **`ensureUser` didn't persist the now-required `tier`/`currency`.** The `User`
  type made these required and `mapUser` defaults them on read, but new user
  docs were written without them. `ensureUser` now sets `tier:"free"` +
  `currency:"INR"` for new users only (existing plans/currency untouched).
- Cleared stale lint from the in-flight refactor (unescaped apostrophe in
  `people/page.tsx`, an unused `eslint-disable` in `log.ts`, dead `gid` in
  `deleteExpense`) so the build is lint-clean again.

---

## 2026-06-16 - Phase 6 UI: People page for 1:1 ledgers

Added the first user-facing direct relationship UI.

- New protected `/people` route lists `type: "direct"` groups only, with net
  balance per person and an add-person form.
- `CreateDirectRelationshipForm` calls `createDirectRelationship`; existing
  users route straight into the deduped ledger, while unregistered numbers get a
  pending invite message.
- Added primary Groups/People navigation in the authenticated shell and protected
  `/people` in `src/proxy.ts`.
- Split read-model helpers into `fetchStandardGroups` and `fetchDirectGroups`;
  `/groups` now excludes direct ledgers.
- Existing `/groups/{groupId}` detail route now presents direct ledgers as 1:1
  people, links back to `/people`, and hides group-only invite/menu controls.

Docs updated in `README.md`, `docs/STATE.md`, `docs/ARCHITECTURE.md`, and
`docs/PHASES.md`. Remaining Phase 6 work: category filters and category
management UI.

---

## 2026-06-16 - Phase 6 backend: direct relationship actions

Added the backend action path for 1:1/direct relationships while keeping direct
expenses on the existing group expense/debt engine.

- Added `createDirectRelationship` in `src/actions/groups.ts`.
  - If the phone belongs to an existing Owely user, it creates or returns the
    deduped direct group immediately.
  - If the phone is unregistered, it creates a pending direct invite instead.
- Direct group document IDs are deterministic opaque SHA-256 hashes of the
  sorted UID pair, so repeated creation attempts resolve to the same ledger
  without exposing UIDs/phones as document IDs.
- Updated `acceptInvite` and first-sign-in invite linking in `src/actions/auth.ts`
  so pending direct invites create a two-member direct group when claimed.
- Corrected direct peer metadata from a single `directPeerUid` to
  `directPeerUids` because each viewer has a different peer.
- Updated `docs/STATE.md`, `docs/ARCHITECTURE.md`, `docs/PHASES.md`,
  `README.md`, and `AGENTS.md`. People UI and category management UI remain the
  next Phase 6 slice.

---

## 2026-06-16 - Phase 6 started: direct people + categories foundation

Started the core 1:1/direct expense and organization phase. Direct expenses will
be modeled as `type: "direct"` groups with exactly two members, so Owely keeps
one expense, settlement, and debt simplification engine instead of introducing a
parallel IOU model.

Implemented the foundation:

- `Group.type` (`group`/`direct`) plus optional `directPairKey`,
  `directPeerUids`, and category metadata fields in `src/types/index.ts`.
- `RelationshipCategory` type for owner-scoped custom categories.
- `categories/{categoryId}` collection constant/path and owner-scoped read rule;
  writes remain Server Action only.
- Read-model mapping for new group/category fields and
  `fetchRelationshipCategories`.
- `src/lib/relationship-categories.ts` with predefined categories and
  `directPairKey` helper.
- New groups now persist `type: "group"` explicitly.
- Landing metadata/copy and Firebase Admin comments now say Firebase App Hosting
  and UPI/cash settlement consistently.

Docs updated in `README.md`, `AGENTS.md`, `docs/STATE.md`,
`docs/ARCHITECTURE.md`, and `docs/PHASES.md`. Remaining Phase 6 work: direct
relationship actions, People UI, and category management UI.

---

## 2026-06-16 - Docs aligned: Firebase-only deploy, paid features, UPI/cash settlement

Updated the shared docs to match the current product decisions:

- Firebase App Hosting is the only deployment target. Removed stale alternate
  host guidance.
- Settlements are UPI or cash only. Do not add cards, wallets, payment gateways,
  payment aggregation, or stored-value flows.
- Multi-currency, OCR receipt capture, PDF export, templates, recurring UI, and
  unlimited usage belong to the paid tier.

Touched `README.md`, `AGENTS.md`, `docs/STATE.md`, `docs/ARCHITECTURE.md`, and
`docs/PHASES.md`. No application code changed.

---

## 2026-06-16 - Login redesign matched to post-login web app

Redesigned `/login` from the earlier centered onboarding screen into a dark
desktop-app style window inspired by the logged-in Goa Trip dashboard. The page
now has the macOS-like top chrome, `app.owely.in/login` address pill, preview
sidebar/groups, dashboard metrics, expense rows, settle-up preview, and a
compact sign-in card that preserves the existing Google + Phone OTP flow.

Touched `src/app/(auth)/login/page.tsx` and tightened `LoginForm` control
styling so the auth form fits the same surface language. No auth behavior was
changed.

Verification: `npm run typecheck`, `npm run build`, `npm test`, and
`npm run lint` all clean. Browser checked `/login` at desktop and 375px mobile;
both render without horizontal overflow.

---

## 2026-06-16 - Owely.dc.html design handoff completed across app UI

Completed the in-flight Claude Design implementation from
`Expense Sharing SaaS-handoff.zip` / `Owely.dc.html` without replacing the real
data-backed flows. The remaining scaffold-looking surfaces now use the Owely
dark design system: create group, invite member, group menu, add/edit expense
page chrome, settings/profile, app error state, and the settle-up / UPI panel.

The settle-up flow now matches the prototype more closely: debt cards show the
payee avatar, large amount, UPI ID when available, a primary UPI deep-link CTA
that opens in a new context, and a separate explicit "mark as settled" step with
optional UTR capture. Settlement history now uses Owely status chips.

Verification: `npm run typecheck`, `npm run build`, `npm test`, and
`npm run lint` all clean.

---

## 2026-06-16 — Backend: contacts, offline-idempotent + own + recurring expenses

Backend only (no UI for these yet). `typecheck` clean, **23 tests pass**,
`build` clean (lint: 2 pre-existing warnings from the in-flight UI redesign's
unused imports, not errors).

**Contacts / member add** (`src/actions/groups.ts`)
- `findRegisteredUsers(phones[])` — normalises raw contact numbers to E.164 and
  returns which already have Owely accounts (the "who's already with us" check).
  Chunks into Firestore `in` queries of ≤30.
- `addMembersByPhone(groupId, people[])` — batch add by name+phone; registered
  users join immediately, others get pending invites. Dedups within the batch.
- Refactored the link-or-invite logic into a shared `linkOrInvite` helper used by
  both `inviteByPhone` (one) and the batch action; also skips duplicate pending
  invites. (Contact Picker UI is a future client task — Android/TWA only.)

**Offline-idempotent expense writes**
- `Expense.clientId` (+ `OwnExpense.clientId`): a client-generated key used as
  the doc ID. `addExpense` / `addOwnExpense` no-op if a doc with that id already
  exists, so an offline-queued write replayed on reconnect is created exactly
  once — never double-counted. (The client replay queue itself is a future UI
  task; the backend guarantee is in place.)

**Own (personal, un-split) expenses** — the "two sections per profile" ask
- New `OwnExpense` type, `users/{uid}/ownExpenses` subcollection, rule, and
  `src/actions/own-expenses.ts` (add/edit/delete). No splits, no group, no debt
  recompute — a personal ledger for bills the user pays alone (insurance, solo
  utility). Shared/group expenses remain the product focus.

**Recurring expenses** (monthly auto-logging)
- New `RecurringExpense` type + top-level `recurring/{id}` collection (+ rule).
- `src/actions/recurring.ts` — `createSharedRecurring` (stores the resolved
  paise split so generation always reconciles), `createOwnRecurring`,
  `updateRecurring` (pause/reschedule), `deleteRecurring`. Owner-scoped.
- `src/lib/recurring.ts` `generateDueRecurring(now)` — clones due definitions
  into real expenses on their `dayOfMonth`, once per month. Idempotent two ways:
  `lastRunMonth` guard + deterministic generated doc id `{recurringId}_{YYYY-MM}`.
  Recomputes simplified debts for affected groups.
- `POST /api/cron/recurring` — secret-guarded (`CRON_SECRET`, Bearer header) for
  Cloud Scheduler to hit daily. Added `CRON_SECRET` to `.env.example` + local
  `.env.local`.

**Refactors / supporting**
- Extracted `computeSplits` into `src/lib/expense-splits.ts` (pure) so the
  expense action and the recurring generator build splits identically.
- Read-model: `fetchOwnExpenses`, `fetchOwnedRecurring`, `fetchGroupRecurring`;
  `clientId`/`recurringId` now mapped on expenses.
- `firestore.rules`: added `ownExpenses` (owner-only read) and `recurring`
  (owner or shared-group-member read); both write-denied (Admin only).

**Copy**: removed "free forever / no paywalls / no ads / not selling your data"
claims from the landing page, login page, and root metadata.

**Setup note**: Cloud Scheduler isn't wired in the console yet — recurring
generation won't run until a daily `POST /api/cron/recurring` with the
`CRON_SECRET` Bearer header is scheduled (or call it manually to test).

---

## 2026-06-16 — Phases 1–5 built: full app end-to-end

The core product is now functional: sign in → create a group → invite by phone →
add expenses (3 split types) → see simplified debts → settle over UPI/cash. All gates
green: `typecheck` clean, **23 tests pass**, `build` clean, `lint` clean.

**Phase 1 — server plumbing**
- `src/lib/result.ts` — `ActionResult<T>` discriminated union (`success`/`failure`,
  with `code` + `fieldErrors`). Actions never throw across the client boundary.
- `src/lib/validation.ts` — Zod schemas for every action input + `parseInput` /
  `parseActionData`. `PhoneSchema` normalises to E.164 `+91…`. Money stays out of
  Zod (the action converts via `rupeesToPaise`). Added `zod` to deps.
- `src/lib/session.ts` — `getSessionUser` / `requireSession` (redirect) and
  `authorizeUser` / `authorizeMember` (return `ActionResult`). Verifies the
  `__session` cookie via Admin `verifySessionCookie`.
- `src/lib/session-cookie.ts` — cookie constants with **no heavy imports** so the
  edge proxy can read them without pulling in the Admin SDK.
- `src/lib/read-model.ts` — all Admin reads + the single `Timestamp → millis`
  conversion; shapes docs into domain types.
- `src/app/api/auth/session/route.ts` — `POST` mints the session cookie from an
  ID token, `DELETE` clears it.
- **`src/proxy.ts`** — Next 16 renamed Middleware → **Proxy** (`middleware.ts` is
  deprecated; `export function proxy()`). Gates `/groups` + `/settings` on cookie
  presence only.

**Phase 2 — auth + shell**
- `src/actions/auth.ts` — `ensureUser` (upserts `users/{uid}`, links pending phone
  invites on first sign-in), `updateProfile` (display name + UPI ID).
- `LoginForm` (Google popup + Phone OTP w/ invisible reCAPTCHA), `SignOutButton`,
  `(auth)/login`, server-guarded `(app)/layout.tsx`. No global AuthProvider —
  the server session cookie is the source of truth; client auth is transient.

**Phase 3 — groups**
- `src/actions/groups.ts` — create / rename / delete (creator only, recursive) /
  leave (hands off creator role; deletes empty group) / `inviteByPhone` (links an
  existing user immediately, else pending invite) / `acceptInvite`.
- `(app)/groups` list (net position read off stored `simplifiedDebts`),
  `(app)/groups/[groupId]` dashboard, `CreateGroupForm`, `InviteMemberForm`,
  `GroupMenu`.

**Phase 4 — expenses**
- `src/actions/expenses.ts` — `addExpense` / `editExpense` / `deleteExpense`.
  Pipeline: authorize → validate → build integer-paise splits (`splitEqual` /
  `splitByWeights` / `assertExactSplit`) → Admin write → recompute → revalidate.
- `ExpenseForm` (equal / unequal / percentage tabs, **inline reconciliation**
  before submit), `ExpenseFeed` (client `onSnapshot` live + offline, server
  initial), new + edit routes. Edit reopens as exact "unequal" (split type isn't
  stored; exact paise reproduces any split losslessly).

**Phase 5 — settlements + UPI**
- `src/lib/upi.ts` (+ tests) — `buildUpiLink` (paise→rupees at the boundary).
- `src/actions/settlements.ts` — `settleUp` (payer records a completed payment +
  optional UTR — collapses the record/mark two-step into one payer action) and
  `disputeSettlement` (payee only). `(app)/groups/[groupId]/settle` + `SettlePanel`.
- `src/lib/recompute.ts` — shared recompute used by expense + settlement actions.
  Engine refactored: `simplifyFromNet` + `netWithSettlements` fold **completed**
  settlements into net balances, so paid debts don't reappear and disputes
  restore them.

**Notable deviations from the original plan**
- `middleware.ts` → `proxy.ts` (Next 16 breaking change; confirmed in bundled docs).
- Settlement flow uses one payer-confirmed `settleUp` action.
- No `AuthProvider` context (not needed with server-side session).
- `/settings` profile page added (UPI ID is required for the settle deep link).

**Deferred (not built):** direct people/categories UI, paid features (templates ·
recurring UI · multi-currency · OCR · PDF), and PWA polish
(PWA + a11y sweep). Console setup (API key, App ID, service-account key) still
blocks a live deploy — see below.

---

## 2026-06-16 — Phased build plan documented (no code)

- Added **`docs/PHASES.md`** — the whole app broken into phases with
  deliverables + acceptance per phase. Phase 0 (foundation) is done; later phases
  are planned and tracked. Build order and cross-phase invariants captured there.
- Recorded the 5 reviewed architecture decisions as **confirmed** (see
  `docs/ARCHITECTURE.md` and `docs/PHASES.md` header).
- **Decision 4 changed the data model:** settlements now capture a payment
  reference. `Settlement` gained `paymentRef?`, `settledBy?`, `settledAt?`, and a
  `"disputed"` status (`src/types/index.ts`). Payer marks paid + pastes the UPI
  UTR; payee can dispute. No engine/action code written yet.
- No application code built this session — documentation + the one type change
  only. Next actionable: **Phase 1 (server plumbing)**, tracked as task #1.

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

- Original brief had another SSR host; switched deploy target to
  **Firebase App Hosting** per
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
UPI/cash settlement · paid templates · paid recurring UI · paid multi-currency ·
paid receipt OCR · paid PDF export.
