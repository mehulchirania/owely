# Owely — Architecture & Product Design

Owely is designed as a fast, clean, mobile-first shared-expense product with a strong India-first UPI settlement experience, friendly social metaphors (like WhatsApp for shared money), and smart group modes.

---

## 1. Product Positioning & Differentiators

**Tagline:** Shared expenses without limits, ads, or awkwardness.  
**Alternative:** Owely — split expenses faster, settle smarter.

### Primary Differentiators:
1. **Extreme Entry Speed:** Quick-add NLP input (e.g. `₹850 dinner @ Goa Trip`) and smart defaults.
2. **Generous Free Usage:** Unlimited basic expenses (see Conflicts section for current implementation).
3. **India-First UPI Settlement:** Normalised phone-intent links (GPay, PhonePe, generic UPI) and QR copy.
4. **Guest Share Links:** Share a read-only/settlement link to friends so they view/settle without downloading the app.
5. **Smart Group Modes:** Custom workflows for Trips, Roommates, Couples, Office Lunches, Friends, and Family.
6. **Trip Batch Mode:** Single-screen spreadsheet-card hybrid for adding multiple trip expenses at once.
7. **Monthly Closing:** Freezing past roommate/utilities months and carrying pending balances forward.
8. **Audit Trail & Restore:** Full edit history tracking and restoring of deleted items.
9. **Fairness Insights:** Smart prompts like "Who paid last?", "Who owes most?", and "Who has not settled in a long time?".
10. **Modern UI:** Dynamic glassmorphism details, responsive design (375px mobile first), and smooth motion.

---

## 2. Architecture Layers

1. **Clients** — Web (Next.js PWA, installable, offline) + Android/iOS (Capacitor wrapper over the same PWA; single codebase).
2. **Next.js App Router** (Firebase App Hosting, SSR) — Server Components for initial page load, Client Components for interactive feeds, and Server Actions as the single write path.
3. **Domain Layer** — Pure utilities: paise money arithmetic, greedy debt-simplification engine, Zod validators.
4. **Firebase Platform** — Auth (Google + Phone OTP), Firestore (Offline-persistent cache), Cloud Storage (receipt images), and Cloud Functions (heavy async PDF exports/OCR processes).

---

## 3. Data Flow & Paths

**Write Path (Single, Enforced):**  
`Client → Server Action → [Guard → Validate → Reconcile] → Admin SDK → Firestore`  
Client-side writes are blocked in `firestore.rules` (`allow write: if false`). Server Actions verify the session and check group membership.

**Read Path (Hybrid):**  
- **Server Components:** Read via Admin SDK for fast initial render (Dashboard, group overview).
- **Client Components:** Subscribe via client SDK (IndexedDB persistent offline cache) for live updates (e.g. live Expense Feed).

---

## 4. Smart Group Modes & Defaults

- **Trip Group:** Tracks start/end dates, trip members, multi-currency base, per-person trip costs, daily spend summaries, and batch expense entry.
- **Roommates Group:** Monthly carry-forward balances, rent/utility categories, monthly close/freeze actions.
- **Couple Group:** Private mode, softer/non-debt-heavy language, and simplified shared ledger.
- **Office Lunch Group:** Round-robin payer suggestion ("Who paid last/Who should pay next").
- **Friends/Family Group:** Simple shared expenses, active timeline feed, and quick settle-up.

---

## 5. Core Features Design

### A. Authentication & Onboarding
- Google Sign-In and Phone OTP (using session cookie authentication).
- Post-signup onboarding asks: "What are you splitting?" (Trip, Roommates, Couple, Friends, Office Lunch, Family, Other) to set up group defaults.

### B. Quick Add & Natural Language Input
- User can input shorthand natural language: `₹850 dinner @ Goa Trip`.
- Parsed via regex/NLP: amount = `850`, title = `dinner`, group = `Goa Trip`, payer = current user, split = equal.
- Default splits pre-fill to "Paid by me and split equally" using the last active group/payer context.

### C. Batch Expense Entry
- Tabular card/spreadsheet hybrid interface designed for trips.
- Input fields for title, amount, payer, split type, and date on multiple rows.
- Recalculates and saves in a single transaction.

### D. Guest Links & Friend Invites
- Shareable invitation tokens. Unregistered users join groups as "Guests".
- Guest share link grants limited read access: view individual balance, view group summary, and record/confirm cash/UPI settlements.

### E. Monthly Closures
- Allows roommates/couples to "freeze" a calendar month.
- Once frozen, no modifications are allowed. Carry-forward balances are automatically logged for the next month.

### F. Audit Feed & Discussion Comments
- Every expense tracks modifications: `createdBy`, `previousAmount`, `previousSplit`, `changeReason`.
- Deleted items can be restored.
- Lightweight comment threads on individual expense detail panels.

---

## 6. UPI Settlement & QR Recording

- Intent deep-linking constructs pay links based on the payee's registered phone or explicit VPA (UPI ID).
- Payer can mark as settled, paste transaction reference (UTR), copy settlement message, or upload a payment screenshot.
- Payee gets a notification to confirm/approve cash or UPI settlements, or mark them disputed.

---

## 7. Pricing Model Design

- **Free Tier:** Up to 100 expenses per group/month, unlimited groups, basic splits, UPI settlements.
- **Pro Tier (Subscription):** AI receipt scanner, monthly PDF exports, advanced charts, trip budget mode, and multi-currency auto-conversion.
- **Trip Pass (One-Time):** Pay ₹49 or ₹99 to unlock all premium features for a single group/trip ledger for 30 days.

