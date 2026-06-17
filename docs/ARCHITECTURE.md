# Owely — Architecture

Status: **implemented core, extending organization layer.** Phases 1-5 are
built. Phase 6 adds 1:1/direct relationships plus predefined/custom categories
for people and groups. The paid feature layer follows after that.

## 1. Layers

1. **Clients** — Web (Next.js PWA, installable, offline) + Android (a Trusted Web
   Activity shell over the same PWA; one codebase). React Native is *not*
   planned.
2. **Next.js App Router** (Firebase App Hosting, SSR) — Server Components (reads),
   Client Components (interactive + live/offline data), Server Actions (the only
   write path), Proxy route gate.
3. **Domain layer** — pure/server-only logic: auth guards, Zod validation, the
   money engine, the debt-simplify engine. No React, no UI.
4. **Firebase** — Auth (Google + Phone OTP), Firestore, App Hosting, optional
   Storage for paid receipt/OCR flows.
5. **External** — UPI apps (deep link), cash records, and paid OCR provider.

## 2. The two paths through the system

**Write path (single, enforced):**
`Client → Server Action → [auth guard → Zod validate → money/simplify] → Admin
SDK → Firestore`. The client SDK can never write — `firestore.rules` denies all
client writes. Every Server Action re-verifies the session and group membership
itself, because the Admin SDK bypasses rules.

**Read path (hybrid):**
- **Server Components** read via the Admin SDK for the initial render (fast,
  no rules round-trip) — group list, dashboards, history.
- **Client Components** subscribe via the client SDK (governed by rules) for
  views that need realtime + offline — the live expense feed inside a group.

This split is confirmed and implemented.

## 3. Directory structure (target)

```
src/
  app/
    (marketing)/                  public landing, about, privacy, terms
    (auth)/login/                 Google + Phone OTP screens
    (app)/                        authenticated shell (proxy-gated)
      page.tsx                    groups list
      groups/[groupId]/
        page.tsx                  group/direct dashboard (RSC) + live feed (client)
        expenses/new/             add-expense flow
        settle/                   settlement + UPI/cash
      people/                     1:1 direct relationship list + add-person flow
      settings/
    api/auth/session/route.ts     set/clear the session cookie
  actions/                        Server Actions — the write path
    auth.ts  groups.ts  expenses.ts  settlements.ts  recurring.ts
    own-expenses.ts
  lib/
    money.ts  simplify-debts.ts          (done)
    firebase/{client,admin,collections}  (done)
    relationship-categories.ts           predefined group/direct categories
    session.ts                    requireSession() / requireMember(groupId)
    validation.ts                 Zod schemas + parseActionData()
    upi.ts                        UPI deep-link builder (paise → rupees)
    result.ts                     ActionResult<T> success/failure union
  components/                     UI (server + client)
  types/                          (done)
  proxy.ts                        route protection (Next 16 Middleware rename)
docs/                             current state, phases, architecture
```

## 4. Auth flow

1. Client signs in with Google or Phone OTP (Firebase client SDK).
2. Client sends the resulting **ID token** to `POST /api/auth/session`.
3. Route Handler verifies it (Admin SDK) and sets a **`__session` HttpOnly,
   Secure, SameSite=Lax cookie** (Firebase session cookie, 14-day max).
4. `proxy.ts` checks the cookie presence to gate `(app)/*` routes.
5. Server Components and Server Actions resolve the user via
   `cookies()` + `verifySessionCookie()` in `lib/session.ts`. **Proxy is
   routing only; every protected action re-verifies** (defense in depth).

## 5. Add-expense flow (the core loop)

```
form → addExpense (Server Action)
  → requireMember(groupId)
  → checkFreemiumLimits(groupId)                // Enforces 100 limit on Free Tier
  → parseActionData(form, ExpenseSchema)        // Zod
  → build splits in paise (splitEqual / splitByWeights / assertExactSplit)
  → Admin write: groups/{id}/expenses/{expenseId}
  → recompute simplifyDebts(allGroupExpenses, members) → group.simplifiedDebts
  → revalidate group paths
  → return ActionResult
```

`simplifyDebts` re-runs over the whole group on every add/edit/delete. For normal
group sizes (≤ ~50 members, hundreds of expenses) this is trivially fast; noted
as a future optimization if a group ever gets huge.

## 6. Groups, Direct Relationships, And Categories

- `groups/{groupId}.type` is `"group"` or `"direct"`.
- A `direct` group is exactly two members and represents a 1:1 relationship.
  It reuses the same expenses, settlements, reads, and debt simplification as a
  normal group.
- Direct groups use a deterministic opaque SHA-256-based document ID derived
  from the sorted UID pair. The raw sorted pair is stored as `directPairKey` for
  audits and dedupe. Do not use a UID, phone number, or email as the document ID.
- Categorization belongs to the group/direct relationship, not globally to a
  user. One person can be "Office" for one user and "Friends" for another.
- Predefined categories ship in code. Custom categories live in
  `categories/{categoryId}` and are owner-scoped.
- `/people` lists direct groups. Direct detail pages reuse `/groups/{groupId}`
  routes while hiding group-only invite/menu controls.

## 7. Settlement / UPI + Cash

- UPI settlement priority:
  1. Payee has `upiId` set → use VPA link: `upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR`
  2. Otherwise → use payee's phone number with app-specific intents:
     - GPay: `intent://upi/pay?pa={phone}@upi&...#Intent;scheme=tez;package=com.google.android.apps.nbu.paisa.user;end`
     - PhonePe: `intent://pay?pa={phone}@ybl&...#Intent;scheme=phonepe;package=com.phonepe.app;end`
     - Generic: `upi://pay?pa={phone}&pn={name}&am={amount}&cu=INR`
- **`am` is in rupees** (UPI expects rupees) — convert paise→rupees at the link boundary only.
- Cash settlement is a manual record using the same payer-confirmed `settleUp` flow.
- Owely never holds or moves funds — deliberately staying outside payment-aggregator regulation.
- Do not add card, wallet, stored-value, payment-gateway, or payment-aggregator settlement flows.

## 8. Tiers

- Free: core splitting and up to 100 expenses/month.
- Paid: unlimited expenses, multi-currency, OCR receipt capture, PDF export,
  templates, recurring-expense UI, and other advanced workflow features.

## 9. Cross-cutting conventions

- **Money:** integer paise everywhere; divide by 100 only in display.
- **Validation:** Zod at every Server Action boundary.
- **Authorization:** `requireSession()` + `requireMember()` in every action.
- **Errors:** `ActionResult<T>` discriminated union (`{ok:true,data}` /
  `{ok:false,error}`); no thrown errors across the action boundary.
- **Types:** one TypeScript type per Firestore collection in `src/types`.

## 10. Confirmed Decisions

1. Android strategy: PWA + TWA, one codebase.
2. Read path: hybrid server initial render + client realtime feed.
3. Session: Firebase `__session` cookie, verified in server reads/actions.
4. Settlement: UPI or cash only. Payer marks paid; payee can dispute.
5. Group invites: phone is the primary join key.
6. Deploy target: Firebase App Hosting only. No alternate SSR host target.
7. Direct expenses: model as `type: "direct"` groups, not a second debt engine.
8. Categories: predefined + owner-scoped custom categories for groups/direct
   relationships.
9. Paid tier: multi-currency, OCR, PDF export, templates, recurring UI, and
   unlimited usage.
