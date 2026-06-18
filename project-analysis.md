# Owely Project Analysis & Improvement Recommendations

This analysis covers the full codebase (31 tests passing, typecheck and lint clean) across the core engine, actions, components, and deployment configuration. Recommendations are grouped by severity and effort.

---

## 🔴 Critical — Security & Correctness Bugs

### 1. Hardcoded admin credentials (`admin/admin`) with no server-side session enforcement
**Location:** `src/features/admin/actions.ts:20`  
**Issue:** The admin panel uses a trivial hardcoded password. Even though the page has its own `isAdminAuthenticated` cookie check, the credentials are guessable and the cookie is not bound to the Firebase session. Anyone who guesses the password can view all user data and modify user tiers.  
**Fix:** Replace with Firebase custom claims (`admin: true`) set via the Firebase console or a secure bootstrap script. Gate `/admin` in `proxy.ts` to redirect unauthenticated users to login. The admin cookie should only be set after verifying the signed-in user's custom claim.

### 2. `isMonthClosed` timezone mismatch — server timezone vs IST
**Location:** `src/features/groups/closures.ts:19-36`  
**Issue:** `currentMonthKey()` correctly derives the month in IST (`Asia/Kolkata`), but `isMonthClosed()` uses `d.getFullYear()` and `d.getMonth()` which operate in the server's local timezone (UTC-4/5 for `us-east4`). A month closure created at 11 PM IST on the 31st will be evaluated as the *previous* month on the server for ~9.5 hours, causing write locks to apply to the wrong month.  
**Fix:** Make `isMonthClosed` also derive month/year using IST explicitly, consistent with `currentMonthKey`:
```ts
const ist = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
const year = ist.getFullYear();
const month = ist.getMonth() + 1;
```

### 3. `mapGroup` silently drops new fields added to the Group type
**Location:** `src/lib/firebase/mapping.ts:36-55`  
**Issue:** The `Group` type includes `groupMode`, `debtThreshold`, `debtRoundTo`, and `monthlyCloseEnabled`, but `mapGroup` does not map them. This means group settings like round-off and thresholds are read from Firestore but never surfaced to the UI or passed to the debt engine. The `simplifyFromNet` call in `recompute.ts` uses `groupSnap.get("debtThreshold")` and `groupSnap.get("debtRoundTo")` directly, which works, but the mapped `Group` object returned to components is missing these fields.  
**Fix:** Add the missing fields to `mapGroup` so the UI can display and edit them consistently.

### 4. `fetchClosures` bypasses the mapping layer and casts raw data
**Location:** `src/features/groups/closures.ts:101-109`  
**Issue:** `fetchClosures` returns `doc.data() as MonthlyClosure` instead of using a mapping function. This means Firestore timestamps remain as `Timestamp` objects instead of being converted to epoch millis, which will break any code expecting `number` for `closedAt`.  
**Fix:** Create a `mapClosure` helper in `mapping.ts` and use it here.

### 5. `addBatchExpenses` increments `group.expenseCount` but the freemium counter is in `counters/{YYYY-MM}`
**Location:** `src/features/expenses/actions.ts:245-247`  
**Issue:** `addBatchExpenses` manually increments `expenseCount` on the group document, but `addExpense` uses `incrementCounterInTx` which writes to `groups/{groupId}/counters/{YYYY-MM}`. The `group.expenseCount` field is never read by the freemium limit check (`checkFreemiumLimit`). This is dead code.  
**Fix:** Remove the manual `expenseCount` increment from `addBatchExpenses` and use `incrementCounterInTx` instead, consistent with `addExpense`.

### 6. `proxy.ts` does not protect `/admin` from unauthenticated visitors
**Location:** `src/proxy.ts:15-53`  
**Issue:** The `PROTECTED` array and `matcher` config only cover `/groups`, `/people`, `/settings`, and `/own`. `/admin` is reachable by anyone. While `admin/page.tsx` has its own `isAdminAuthenticated` check, the login form itself is exposed and can be brute-forced.  
**Fix:** Add `/admin` to `PROTECTED` and the `matcher` config.

---

## 🟠 High — Performance & Scalability Risks

### 7. N+1 user profile queries on every group page load
**Location:** `src/app/(app)/groups/[groupId]/page.tsx:65`  
**Issue:** `Promise.all(group.members.map((uid) => fetchUser(uid)))` fires one Firestore read per member. A 20-person group triggers 20 separate network round-trips.  
**Fix:** Chunk member UIDs into batches of 10 and use `db.collection("users").where(FieldPath.documentId(), "in", chunk).get()`. `findRegisteredUsers` already demonstrates this pattern with phone numbers.

### 8. Admin panel fetches the entire user database into memory
**Location:** `src/app/admin/page.tsx:21-35`  
**Issue:** `db.collection(Collections.users).orderBy("createdAt", "desc").get()` loads every user document. At 10,000 users this will exhaust App Hosting memory (512 MiB) and hit the 60-second request timeout.  
**Fix:** Add pagination with `limit(100)` and a `startAfter` cursor. The admin table should be paginated or use server-side search.

### 9. Debt engine recomputes from scratch on every write (O(n) history)
**Location:** `src/lib/recompute.ts:44-90`  
**Issue:** Every expense add/edit/delete/settlement reads **all** expenses and **all** settlements for the group, then rebuilds net balances from zero. For a group with 3 years of daily expenses (~1,000 docs), this becomes expensive and slow inside a Firestore transaction. The transaction has a 10-second timeout limit and a 20-second overall limit.  
**Fix:** Consider a rolling net balance approach. Store `memberNetBalances` on the group document, updated incrementally per expense (add: credit payer, debit splits; delete: reverse). Then `simplifyFromNet` only reads the cached net balances, not the full history. This is a significant refactor but the only path to scale for large groups. As a short-term mitigation, add a warning when a group exceeds 200 expenses suggesting a monthly close.

### 10. No pagination on expense feed or settlement history
**Location:** `src/features/expenses/queries.ts` and `src/features/settlements/queries.ts` (assumed)  
**Issue:** All historical expenses and settlements are fetched for every group page load. The `ExpenseFeed` component receives the full list.  
**Fix:** Add `limit(50)` with "Load more" pagination, or at minimum pagination for the server-side initial render. The client subscription (`onSnapshot`) can stay for real-time, but the initial render should be bounded.

### 11. No rate limiting on OCR or PDF export routes
**Location:** `src/app/api/receipts/ocr/route.ts` and `src/app/api/groups/[groupId]/export/pdf/route.ts`  
**Issue:** Both paid routes can be hammered by authenticated users. The OCR route calls Google Cloud Vision, which is billed per request. A malicious or buggy client could rack up costs.  
**Fix:** Add a simple in-memory rate limiter (e.g., 5 OCR requests per user per minute) or use Firebase App Check to verify request authenticity. At minimum, add a Cloud Armor policy or Cloudflare rate limiting rule at the edge.

---

## 🟡 Medium — Code Quality & Architecture

### 12. `SettlePanel` and `GuestSettlePanel` are ~90% duplicated code
**Location:** `src/components/SettlePanel.tsx` and `src/components/GuestSettlePanel.tsx`  
**Issue:** Both components define identical `DebtCard`, `HistoryRow`, `cleanPhone`, UPI link building logic, and UI structure. The only real differences are the action imported (`settleUp` vs `guestSettleUp`) and the absence of `canDispute` in the guest history row.  
**Fix:** Extract a shared `SettlementPanel` component that accepts the action and a `canDispute` flag as props. This eliminates ~250 lines of duplication and prevents future drift.

### 13. `settleUp` and `guestSettleUp` actions are nearly identical
**Location:** `src/features/settlements/actions.ts:41-109` and `:150-227`  
**Issue:** Both actions duplicate the full validation, debt lookup, and Firestore write logic. The only differences are how the payer UID is derived (session vs guest cookie) and the path revalidation.  
**Fix:** Extract a shared `recordSettlement` function that accepts `payerUid`, `group`, and the input. The two actions should only differ in auth resolution.

### 14. `README.md` and `AGENTS.md` reference stale `src/actions/` path
**Location:** `README.md:68` and `AGENTS.md`  
**Issue:** The docs say Server Actions live in `src/actions/`, but the actual code is in `src/features/*/actions.ts`. This will confuse new developers or agent sessions.  
**Fix:** Update the docs to reflect the `src/features/` architecture.

### 15. `closeMonth` uses `Date.now()` instead of `FieldValue.serverTimestamp()`
**Location:** `src/features/groups/closures.ts:84`  
**Issue:** All other writes use `FieldValue.serverTimestamp()` for timestamps, but `closeMonth` uses `Date.now()` for `closedAt`. This creates a minor inconsistency where closure times come from the server clock rather than Firestore's atomic timestamp.  
**Fix:** Use `FieldValue.serverTimestamp()` for `closedAt` and convert it to millis in the mapping layer if needed. Or, if the client needs a predictable epoch value for the closure ID, store `closedAtEpoch` separately.

### 16. `mapSettlement` defaults `method` to `"upi"` for legacy data
**Location:** `src/lib/firebase/mapping.ts:149`  
**Issue:** Settlements created before the `method` field was added will display as UPI, which may be incorrect. This misleads users viewing historical settlements.  
**Fix:** Default to `undefined` or `null` instead of `"upi"`. The UI should render a generic label when the method is unknown.

### 17. Missing `not-found.tsx` and `error.tsx` boundaries in app routes
**Location:** `src/app/(app)/`  
**Issue:** While `groupId/page.tsx` calls `notFound()`, there are no custom `not-found.tsx` or `error.tsx` boundaries in the app routes. A Firestore read failure in a Server Component will crash the entire page with the default Next.js error screen.  
**Fix:** Add a branded `not-found.tsx` and `error.tsx` inside `src/app/(app)/` and `src/app/(app)/groups/`. The error boundary should offer a "Retry" button.

### 18. No composite Firestore indexes configured
**Location:** `firestore.indexes.json` (missing or empty)  
**Issue:** Queries like `invites.where("groupId", "==", x).where("status", "==", "pending")` and `recurring.where("ownerUid", "==", x).where("active", "==", true)` will fail at scale without composite indexes. Firestore will throw a `FAILED_PRECONDITION` error requiring manual index creation.  
**Fix:** Define all necessary composite indexes in `firestore.indexes.json` so they can be deployed with `firebase deploy --only firestore:indexes`.

---

## 🟢 Low — Product Polish & Operations

### 19. `CRON_SECRET` is commented out in `apphosting.yaml`
**Location:** `apphosting.yaml:57-60`  
**Issue:** The recurring expense cron job is disabled in production because the secret is not bound. Recurring expenses will never generate.  
**Fix:** Uncomment the secret block, create the secret via `firebase apphosting:secrets:set CRON_SECRET`, and wire Cloud Scheduler to hit the endpoint daily.

### 20. Guest invite links have no expiration
**Location:** `src/app/api/groups/[groupId]/guest-login/route.ts`  
**Issue:** Guest invite tokens are valid forever (or until accepted). A leaked guest link could grant read access to a group's ledger indefinitely.  
**Fix:** Add an `expiresAt` field to invites (e.g., 30 days) and reject expired tokens in the guest-login route.

### 21. No App Check integration
**Issue:** The Firebase client config is public. Without App Check, malicious clients can instantiate the Firebase SDK and read data within the scope of the security rules.  
**Fix:** Enable Firebase App Check (reCAPTCHA v3 or Play Integrity for Android) and enforce it in Firestore rules with `request.appCheck != null`.

### 22. The `groupId/page.tsx` does 8 parallel fetches but has no loading skeleton
**Location:** `src/app/(app)/groups/[groupId]/page.tsx`  
**Issue:** The page does 8 parallel Firestore reads before rendering anything. On slow connections or cold Admin SDK instances, the user sees a blank white screen for several seconds.  
**Fix:** Add a `loading.tsx` in the route segment with a skeleton matching the group header and tab layout. Alternatively, use `React.Suspense` boundaries around the expensive data sections (expenses, settlements, recurring) so the shell renders immediately.

### 23. `BatchExpenseForm` doesn't check freemium limits per-row
**Location:** `src/components/BatchExpenseForm.tsx` (assumed)  
**Issue:** While `addBatchExpenses` checks the limit once before the transaction, a batch of 50 expenses will succeed or fail atomically. If the user is at 95 expenses and tries to add 10, the entire batch fails. This is correct behavior, but the UI should pre-check and warn the user how many they can still add.  
**Fix:** The batch form should display remaining free-tier capacity before submission.

### 24. Test coverage is thin for the action layer
**Issue:** Only 4 test files (31 tests) cover the money engine, debt engine, UPI builder, and OCR extraction. There are zero tests for Server Actions, the recompute transaction, the freemium counter, or the validation layer.  
**Fix:** Add Vitest tests for `computeSplits`, `checkFreemiumLimit`, `isMonthClosed`, and at least one integration test for the recompute transaction using a mocked Firestore instance or the Firebase emulator.

### 25. `groupId/page.tsx` builds UPI links inline instead of using `src/lib/upi.ts`
**Location:** `src/app/(app)/groups/[groupId]/page.tsx`  
**Issue:** The `amountRupees` for the settle panel is computed inline as `(t.amount / 100).toFixed(2)`. This is the same conversion that `buildUpiLink` and friends do. The `DebtCard` components also reimplement `cleanPhone`.  
**Fix:** Move `amountRupees` generation into the `upi.ts` module or a shared helper, and ensure `cleanPhone` is only defined in `upi.ts`.

---

## Summary Table

| # | Issue | Severity | Effort | File |
|---|-------|----------|--------|------|
| 1 | Hardcoded admin credentials | 🔴 Critical | Medium | `features/admin/actions.ts` |
| 2 | `isMonthClosed` timezone bug | 🔴 Critical | Small | `features/groups/closures.ts` |
| 3 | `mapGroup` drops new fields | 🔴 Critical | Small | `lib/firebase/mapping.ts` |
| 4 | `fetchClosures` bypasses mapping | 🔴 Critical | Small | `features/groups/closures.ts` |
| 5 | Batch expense count mismatch | 🔴 Critical | Small | `features/expenses/actions.ts` |
| 6 | `/admin` not in proxy | 🔴 Critical | Small | `proxy.ts` |
| 7 | N+1 profile queries | 🟠 High | Medium | `app/groups/[groupId]/page.tsx` |
| 8 | Admin fetches all users | 🟠 High | Medium | `app/admin/page.tsx` |
| 9 | Debt engine O(n) recompute | 🟠 High | Large | `lib/recompute.ts` |
| 10 | No pagination on feeds | 🟠 High | Medium | `features/*/queries.ts` |
| 11 | No rate limiting on paid routes | 🟠 High | Small | `api/receipts/ocr`, `api/groups/*/pdf` |
| 12 | Duplicated settle panels | 🟡 Medium | Medium | `components/SettlePanel.tsx`, `GuestSettlePanel.tsx` |
| 13 | Duplicated settle actions | 🟡 Medium | Medium | `features/settlements/actions.ts` |
| 14 | Stale docs paths | 🟡 Medium | Small | `README.md`, `AGENTS.md` |
| 15 | `closeMonth` timestamp inconsistency | 🟡 Medium | Small | `features/groups/closures.ts` |
| 16 | `mapSettlement` default method | 🟡 Medium | Small | `lib/firebase/mapping.ts` |
| 17 | Missing error boundaries | 🟡 Medium | Medium | `app/(app)/` |
| 18 | Missing Firestore indexes | 🟡 Medium | Small | `firestore.indexes.json` |
| 19 | CRON_SECRET disabled | 🟢 Low | Small | `apphosting.yaml` |
| 20 | Guest links never expire | 🟢 Low | Small | `api/groups/*/guest-login` |
| 21 | No App Check | 🟢 Low | Medium | `lib/firebase/client.ts` |
| 22 | No loading skeletons | 🟢 Low | Medium | `app/groups/[groupId]/` |
| 23 | Batch freemium UX gap | 🟢 Low | Small | `components/BatchExpenseForm.tsx` |
| 24 | Thin test coverage | 🟢 Low | Large | `*.test.ts` |
| 25 | Inline UPI amount formatting | 🟢 Low | Small | `app/groups/[groupId]/page.tsx` |

**Top 5 to fix first:** #1 (admin security), #2 (timezone bug), #9 (debt engine scalability), #7 (N+1), #8 (admin pagination). These are the ones that will either break correctness or cause operational pain at scale.
