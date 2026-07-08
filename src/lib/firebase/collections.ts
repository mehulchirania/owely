/**
 * Canonical Firestore collection names. Import these instead of writing string
 * literals at call sites, so a rename is a one-line change and typos are caught.
 *
 * Layout (flat top-level collections; expenses/settlements are subcollections
 * of their group so a group read never fans out across the whole database):
 *
 *   users/{uid}
 *   users/{uid}/contacts/{contactId}
 *   groups/{groupId}
 *   groups/{groupId}/expenses/{expenseId}
 *   groups/{groupId}/settlements/{settlementId}
 *   groups/{groupId}/counters/{YYYY-MM}  (monthly expense counters)
 *   invites/{inviteId}          (phone-based group invites)
 *   templates/{templateId}      (saved split templates, scoped by ownerUid)
 *   categories/{categoryId}     (custom group/direct categories, ownerUid-scoped)
 */
export const Collections = {
  users: "users",
  groups: "groups",
  expenses: "expenses",
  settlements: "settlements",
  invites: "invites",
  templates: "templates",
  categories: "categories",
  /** Explicitly imported contacts: users/{uid}/contacts/{contactId}. */
  contacts: "contacts",
  /** Per-user sync quota counters: users/{uid}/contactSyncCounters/{YYYY-MM-DD}. */
  contactSyncCounters: "contactSyncCounters",
  /** Per-user personal (un-split) expenses: users/{uid}/ownExpenses/{id}. */
  ownExpenses: "ownExpenses",
  /** Recurring-expense definitions (shared + own), top-level: recurring/{id}. */
  recurring: "recurring",
  /** Per-group monthly closures: groups/{groupId}/closures/{id}. */
  closures: "closures",
  /** Processed payment IDs for idempotency: webhookEvents/{paymentId}. */
  webhookEvents: "webhookEvents",
} as const;

export type CollectionName =
  (typeof Collections)[keyof typeof Collections];

export const paths = {
  user: (uid: string) => `${Collections.users}/${uid}`,
  group: (groupId: string) => `${Collections.groups}/${groupId}`,
  expenses: (groupId: string) =>
    `${Collections.groups}/${groupId}/${Collections.expenses}`,
  expense: (groupId: string, expenseId: string) =>
    `${Collections.groups}/${groupId}/${Collections.expenses}/${expenseId}`,
  settlements: (groupId: string) =>
    `${Collections.groups}/${groupId}/${Collections.settlements}`,
  settlement: (groupId: string, settlementId: string) =>
    `${Collections.groups}/${groupId}/${Collections.settlements}/${settlementId}`,
  closures: (groupId: string) =>
    `${Collections.groups}/${groupId}/${Collections.closures}`,
  closure: (groupId: string, closureId: string) =>
    `${Collections.groups}/${groupId}/${Collections.closures}/${closureId}`,
  ownExpenses: (uid: string) =>
    `${Collections.users}/${uid}/${Collections.ownExpenses}`,
  ownExpense: (uid: string, expenseId: string) =>
    `${Collections.users}/${uid}/${Collections.ownExpenses}/${expenseId}`,
  contacts: (uid: string) =>
    `${Collections.users}/${uid}/${Collections.contacts}`,
  contact: (uid: string, contactId: string) =>
    `${Collections.users}/${uid}/${Collections.contacts}/${contactId}`,
  contactSyncCounter: (uid: string, dayKey: string) =>
    `${Collections.users}/${uid}/${Collections.contactSyncCounters}/${dayKey}`,
  recurring: () => Collections.recurring,
  recurringDoc: (recurringId: string) =>
    `${Collections.recurring}/${recurringId}`,
  category: (categoryId: string) =>
    `${Collections.categories}/${categoryId}`,
  template: (templateId: string) =>
    `${Collections.templates}/${templateId}`,
  /** Per-group monthly expense counter: groups/{groupId}/counters/{YYYY-MM}. */
  groupCounter: (groupId: string, monthKey: string) =>
    `${Collections.groups}/${groupId}/counters/${monthKey}`,
} as const;
