import { Timestamp } from "firebase-admin/firestore";
import type {
  Expense,
  Group,
  MonthlyClosure,
  OwnExpense,
  RecurringExpense,
  RelationshipCategory,
  Settlement,
  SplitTemplate,
  User,
} from "@/types";

type DocData = FirebaseFirestore.DocumentData;

/** Coerce a Firestore timestamp-ish value into epoch millis. */
function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return 0;
}

export function mapClosure(id: string, d: DocData): MonthlyClosure {
  return {
    id,
    groupId: d.groupId,
    month: d.month ?? 0,
    year: d.year ?? 0,
    status: d.status ?? "closed",
    carryForward: d.carryForward ?? {},
    closedBy: d.closedBy,
    closedAt: toMillis(d.closedAt),
  };
}

export function mapUser(uid: string, d: DocData): User {
  return {
    uid,
    displayName: d.displayName ?? "",
    email: d.email ?? null,
    phone: d.phone ?? null,
    photoURL: d.photoURL ?? null,
    upiId: d.upiId,
    tier: d.tier ?? "free",
    currency: d.currency ?? "INR",
    createdAt: toMillis(d.createdAt),
  };
}

export function mapGroup(id: string, d: DocData): Group {
  return {
    id,
    type: d.type ?? "group",
    name: d.name ?? "",
    createdBy: d.createdBy,
    members: d.members ?? [],
    memberDetails: d.memberDetails ?? {},
    categoryId: d.categoryId,
    categoryName: d.categoryName,
    categoryKind: d.categoryKind,
    directPairKey: d.directPairKey,
    directPeerUids: d.directPeerUids,
    simplifiedDebts: (d.simplifiedDebts ?? []) as Settlement[],
    baseCurrency: d.baseCurrency ?? "INR",
    expenseCount: d.expenseCount,
    groupMode: d.groupMode,
    debtThreshold: d.debtThreshold,
    debtRoundTo: d.debtRoundTo,
    monthlyCloseEnabled: d.monthlyCloseEnabled,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
}

export function mapRelationshipCategory(id: string, d: DocData): RelationshipCategory {
  return {
    id,
    ownerUid: d.ownerUid,
    name: d.name ?? "",
    color: d.color ?? "accent",
    icon: d.icon ?? "tag",
    appliesTo: d.appliesTo ?? "both",
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
}

export function mapSplitTemplate(id: string, d: DocData): SplitTemplate {
  return {
    id,
    ownerUid: d.ownerUid,
    groupId: d.groupId,
    name: d.name ?? "",
    splitType: d.splitType ?? "equal",
    participants: d.participants ?? [],
    weights: d.weights,
    category: d.category,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
}

export function mapExpense(id: string, d: DocData): Expense {
  return {
    id,
    groupId: d.groupId,
    title: d.title ?? "",
    amount: d.amount ?? 0,
    currency: d.currency ?? "INR",
    paidBy: d.paidBy,
    splits: d.splits ?? {},
    category: d.category ?? "general",
    receiptURL: d.receiptURL,
    clientId: d.clientId,
    recurringId: d.recurringId,
    createdBy: d.createdBy,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
    isRecurring: d.isRecurring ?? false,
    recurrenceRule: d.recurrenceRule,
  };
}

export function mapOwnExpense(id: string, d: DocData): OwnExpense {
  return {
    id,
    ownerUid: d.ownerUid,
    title: d.title ?? "",
    amount: d.amount ?? 0,
    currency: d.currency ?? "INR",
    category: d.category ?? "general",
    clientId: d.clientId,
    recurringId: d.recurringId,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
}

export function mapRecurring(id: string, d: DocData): RecurringExpense {
  return {
    id,
    scope: d.scope,
    ownerUid: d.ownerUid,
    groupId: d.groupId,
    title: d.title ?? "",
    amount: d.amount ?? 0,
    currency: d.currency ?? "INR",
    category: d.category ?? "general",
    paidBy: d.paidBy,
    splits: d.splits,
    dayOfMonth: d.dayOfMonth ?? 1,
    active: d.active ?? true,
    lastRunMonth: d.lastRunMonth,
    createdBy: d.createdBy,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
}

export function mapSettlement(id: string, d: DocData): Settlement {
  return {
    id,
    groupId: d.groupId,
    from: d.from,
    to: d.to,
    amount: d.amount ?? 0,
    method: d.method,
    upiId: d.upiId,
    status: d.status ?? "pending",
    paymentRef: d.paymentRef,
    settledBy: d.settledBy,
    settledAt: d.settledAt != null ? toMillis(d.settledAt) : undefined,
    createdAt: toMillis(d.createdAt),
  };
}
