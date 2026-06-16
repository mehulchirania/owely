# Owely — Architecture (for review)

Status: **proposal, pre-implementation.** Foundation in place (types, money +
debt engines, Firebase SDK layer). This doc defines how the rest fits together.

## 1. Layers

1. **Clients** — Web (Next.js PWA, installable, offline) + Android (a Trusted Web
   Activity shell over the same PWA; one codebase). React Native is *not*
   planned.
2. **Next.js App Router** (Firebase App Hosting, SSR) — Server Components (reads),
   Client Components (interactive + live/offline data), Server Actions (the only
   write path), Middleware (session gate).
3. **Domain layer** — pure/server-only logic: auth guards, Zod validation, the
   money engine, the debt-simplify engine. No React, no UI.
4. **Firebase** — Auth (Google + Phone OTP), Firestore, Storage (receipts),
   Cloud Functions (recurring expenses, OCR trigger).
5. **External** — UPI apps (deep link), Google Vision (OCR).

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

This split is the main thing I want your sign-off on (see Decision 2).

## 3. Directory structure (target)

```
src/
  app/
    (marketing)/                  public landing, about, privacy, terms
    (auth)/login/                 Google + Phone OTP screens
    (app)/                        authenticated shell (middleware-gated)
      page.tsx                    groups list
      groups/[groupId]/
        page.tsx                  group dashboard (RSC) + live feed (client)
        expenses/new/             add-expense flow
        settle/                   settlement + UPI deep link
      settings/
    api/auth/session/route.ts     set/clear the session cookie
  actions/                        Server Actions — the write path
    auth.ts  groups.ts  expenses.ts  settlements.ts  templates.ts
  lib/
    money.ts  simplify-debts.ts          (done)
    firebase/{client,admin,collections}  (done)
    session.ts                    requireSession() / requireMember(groupId)
    validation.ts                 Zod schemas + parseActionData()
    upi.ts                        UPI deep-link builder (paise → rupees)
    result.ts                     ActionResult<T> success/failure union
  components/                     UI (server + client)
  types/                          (done)
  middleware.ts                   route protection
functions/                        Cloud Functions (recurring, OCR)
```

## 4. Auth flow

1. Client signs in with Google or Phone OTP (Firebase client SDK).
2. Client sends the resulting **ID token** to `POST /api/auth/session`.
3. Route Handler verifies it (Admin SDK) and sets a **`__session` HttpOnly,
   Secure, SameSite=Lax cookie** (Firebase session cookie, 14-day max).
4. `middleware.ts` checks the cookie presence to gate `(app)/*` routes.
5. Server Components and Server Actions resolve the user via
   `cookies()` + `verifySessionCookie()` in `lib/session.ts`. **Middleware is
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

## 6. Settlement / UPI

- A settlement creates a `Settlement{status:'pending'}` and returns a deep link:
  `upi://pay?pa={upiId}&pn={name}&am={amount}&cu=INR`.
- **`am` is in rupees** (UPI expects rupees) — convert paise→rupees at the link
  boundary only.
- **UPI P2P gives no payment callback**, so Owely cannot auto-confirm. The
  settlement is **manually marked complete** (see Decision 4 for who confirms).
- Owely never holds or moves funds — deliberately staying outside
  payment-aggregator regulation.

## 7. Cross-cutting conventions

- **Money:** integer paise everywhere; divide by 100 only in display.
- **Validation:** Zod at every Server Action boundary.
- **Authorization:** `requireSession()` + `requireMember()` in every action.
- **Errors:** `ActionResult<T>` discriminated union (`{ok:true,data}` /
  `{ok:false,error}`); no thrown errors across the action boundary.
- **Types:** one TypeScript type per Firestore collection in `src/types`.

## 8. Decisions I need from you

1. **Android strategy** — recommend **PWA + TWA** (one codebase, Play Store
   listing) over Capacitor/React Native. Confirm?
2. **Read path** — recommend the **hybrid** in §2 (RSC initial render + client
   subscription for the live group feed). Alternative: all-server reads (simpler,
   no realtime) or all-client (realtime everywhere, heavier). Your call.
3. **Session** — Firebase **session cookie `__session`**, 14-day, verified in
   middleware + actions. Confirm, or prefer short-lived ID-token + refresh?
4. **Settlement confirmation UX** — since UPI can't call back: who marks a
   settlement complete — the **payer** ("I paid"), the **payee** ("I received"),
   or **either**? Recommend payer marks paid → payee can dispute.
5. **Group invites** — invite by phone creates a pending `invites/{id}`; the
   invitee is linked on first sign-in with that phone. Confirm phone is the
   primary join key (vs. shareable invite link).

## 9. Build order (once approved)

1. `lib/result.ts`, `lib/validation.ts`, `lib/session.ts` + `/api/auth/session` +
   `middleware.ts`
2. Auth screens (Google + Phone OTP) → working login
3. `actions/groups.ts` + group CRUD UI
4. `actions/expenses.ts` + add-expense UI (wires up money + simplify engines)
5. `actions/settlements.ts` + UPI settle flow
6. Templates → recurring (Functions) → OCR → PDF export
