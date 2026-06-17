/**
 * Owely domain types.
 *
 * Money convention (non-negotiable): every monetary value is an integer
 * number of **paise** (1 INR = 100 paise). Never store or compute money as a
 * float. Display layers divide by 100 at the very last moment.
 */

/** Firebase Auth uid. */
export type Uid = string;

/** ISO-4217 currency code. Users can change this in settings. */
export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | string;

/** A monetary amount in integer paise. Aliased for intent at call sites. */
export type Paise = number;

export interface User {
  uid: Uid;
  displayName: string;
  email: string | null;
  phone: string | null;
  photoURL: string | null;
  /** Optional UPI VPA used to receive settlements, e.g. "name@okaxis". */
  upiId?: string;
  /** Freemium tier limits max expenses and members. */
  tier: "free" | "paid";
  /** The user's preferred display currency. */
  currency: CurrencyCode;
  createdAt: number;
}

/** A member's denormalised profile snapshot stored on the group. */
export interface MemberDetail {
  name: string;
  phone: string | null;
  photoURL: string | null;
}

export type GroupType = "group" | "direct";
export type RelationshipCategoryScope = "group" | "direct" | "both";
export type RelationshipCategoryKind = "predefined" | "custom";

/**
 * User-owned custom category for organizing groups and 1:1 relationships.
 * Predefined categories live in code; custom categories live in Firestore.
 */
export interface RelationshipCategory {
  id: string;
  ownerUid: Uid;
  name: string;
  color: string;
  icon: string;
  appliesTo: RelationshipCategoryScope;
  createdAt: number;
  updatedAt: number;
}

export interface Group {
  id: string;
  /** `direct` is a 1:1 relationship backed by the same expense/debt engine. */
  type: GroupType;
  name: string;
  createdBy: Uid;
  members: Uid[];
  memberDetails: Record<Uid, MemberDetail>;
  /** Relationship/category metadata for organizing groups and 1:1 people. */
  categoryId?: string;
  categoryName?: string;
  categoryKind?: RelationshipCategoryKind;
  /**
   * Deterministic sorted uid pair key for `direct` groups. Used to dedupe a
   * 1:1 relationship without making either UID the Firestore document ID.
   */
  directPairKey?: string;
  /** Viewer uid -> other member uid, denormalized for direct relationship lists. */
  directPeerUids?: Record<Uid, Uid>;
  /** Minimal set of transfers that settles the group, recomputed on writes. */
  simplifiedDebts: Settlement[];
  /** Group base currency used for all expenses in the group. */
  baseCurrency?: CurrencyCode;
  /** Monthly expense count to enforce free tier limits. Reset monthly. */
  expenseCount?: number;
  createdAt: number;
  updatedAt: number;
}

export type SplitType = "equal" | "unequal" | "percentage";

export type ExpenseCategory =
  | "general"
  | "food"
  | "groceries"
  | "rent"
  | "utilities"
  | "transport"
  | "entertainment"
  | "travel"
  | "shopping"
  | "health"
  | "other";

export interface RecurrenceRule {
  frequency: "monthly";
  /** 1-28 to stay valid in every month (avoids 29/30/31 drift). */
  dayOfMonth: number;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  /** Total amount in paise. Always equals the sum of `splits`. */
  amount: Paise;
  currency: CurrencyCode;
  paidBy: Uid;
  /** Paise owed per participant. Keys are participants only. Sums to `amount`. */
  splits: Record<Uid, Paise>;
  category: ExpenseCategory;
  receiptURL?: string;
  /**
   * Client-generated idempotency key. Used as the document ID so an expense
   * queued offline and replayed on reconnect is created exactly once (never
   * double-counted). Absent for expenses created server-side (e.g. recurring).
   */
  clientId?: string;
  /** Set when this expense was auto-generated from a `RecurringExpense`. */
  recurringId?: string;
  createdBy: Uid;
  createdAt: number;
  updatedAt: number;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
}

/**
 * A user's **own** (personal, un-split) expense — bills they pay alone and want
 * to track but never split, e.g. insurance or a solo utility. Lives under the
 * user, never in a group, and has no splits. The shared/group `Expense` above
 * is the product's focus; this is a personal-tracking companion.
 */
export interface OwnExpense {
  id: string;
  ownerUid: Uid;
  title: string;
  amount: Paise;
  currency: CurrencyCode;
  category: ExpenseCategory;
  /** Idempotency key for offline replay (see `Expense.clientId`). */
  clientId?: string;
  recurringId?: string;
  createdAt: number;
  updatedAt: number;
}

/** Whether a recurring definition generates a shared (group) or own expense. */
export type RecurringScope = "shared" | "own";

/**
 * A recurring-expense **definition**. A scheduled job clones it into a real
 * `Expense` (shared) or `OwnExpense` (own) on its `dayOfMonth`, once per month
 * (guarded by `lastRunMonth`). Stores the resolved split so generation is
 * deterministic and always reconciles.
 */
export interface RecurringExpense {
  id: string;
  scope: RecurringScope;
  /** The creator/owner. For `own` scope, also whose expense it generates. */
  ownerUid: Uid;
  /** Target group — `shared` scope only. */
  groupId?: string;
  title: string;
  amount: Paise;
  currency: CurrencyCode;
  category: ExpenseCategory;
  /** Payer — `shared` scope only. */
  paidBy?: Uid;
  /** Resolved paise split — `shared` scope only; sums to `amount`. */
  splits?: Record<Uid, Paise>;
  /** Day of month to generate on, 1–28 (avoids 29/30/31 drift). */
  dayOfMonth: number;
  /** Paused definitions are skipped by the generator. */
  active: boolean;
  /** `"YYYY-MM"` of the last generation — prevents duplicate runs in a month. */
  lastRunMonth?: string;
  createdBy: Uid;
  createdAt: number;
  updatedAt: number;
}

export type SettlementStatus = "pending" | "completed" | "disputed";

export interface Settlement {
  id: string;
  groupId: string;
  from: Uid;
  to: Uid;
  amount: Paise;
  upiId?: string;
  status: SettlementStatus;
  /**
   * Payment reference captured when the payer marks this settled — the UPI
   * transaction reference / UTR they paste in. Optional because a user may
   * confirm a cash payment with no UPI ref. Stored so the payee can verify and
   * the record is auditable.
   */
  paymentRef?: string;
  /** Who flipped it to completed/disputed, and when. */
  settledBy?: Uid;
  settledAt?: number;
  createdAt: number;
}
