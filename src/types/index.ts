/**
 * Owely domain types.
 *
 * Money convention (non-negotiable): every monetary value is an integer
 * number of **paise** (1 INR = 100 paise). Never store or compute money as a
 * float. Display layers divide by 100 at the very last moment.
 */

/** Firebase Auth uid. */
export type Uid = string;

/** ISO-4217 currency code. Only INR is exposed in the UI today. */
export type CurrencyCode = "INR";

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
  createdAt: number;
}

/** A member's denormalised profile snapshot stored on the group. */
export interface MemberDetail {
  name: string;
  phone: string | null;
  photoURL: string | null;
}

export interface Group {
  id: string;
  name: string;
  createdBy: Uid;
  members: Uid[];
  memberDetails: Record<Uid, MemberDetail>;
  /** Minimal set of transfers that settles the group, recomputed on writes. */
  simplifiedDebts: Settlement[];
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
  createdBy: Uid;
  createdAt: number;
  updatedAt: number;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
}

export type SettlementStatus = "pending" | "completed";

export interface Settlement {
  id: string;
  groupId: string;
  from: Uid;
  to: Uid;
  amount: Paise;
  upiId?: string;
  status: SettlementStatus;
  createdAt: number;
}
