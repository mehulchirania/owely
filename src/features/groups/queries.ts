import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections, paths } from "@/lib/firebase/collections";
import { mapGroup } from "@/lib/firebase/mapping";
import { fetchExpenses } from "@/features/expenses/queries";
import { fetchSettlements } from "@/features/settlements/queries";
import type { Group } from "@/types";

export async function fetchGroup(groupId: string): Promise<Group | null> {
  const snap = await getAdminDb().doc(paths.group(groupId)).get();
  return snap.exists ? mapGroup(snap.id, snap.data()!) : null;
}

/** Every group the user belongs to, newest activity first. */
export async function fetchUserGroups(uid: string): Promise<Group[]> {
  const snap = await getAdminDb()
    .collection(Collections.groups)
    .where("members", "array-contains", uid)
    .get();
  return snap.docs
    .map((doc) => mapGroup(doc.id, doc.data()))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Non-direct groups the user belongs to, newest activity first. */
export async function fetchStandardGroups(uid: string): Promise<Group[]> {
  const groups = await fetchUserGroups(uid);
  return groups.filter((group) => group.type !== "direct");
}

/** 1:1 direct relationships the user belongs to, newest activity first. */
export async function fetchDirectGroups(uid: string): Promise<Group[]> {
  const groups = await fetchUserGroups(uid);
  return groups.filter((group) => group.type === "direct");
}

export interface ActivityItem {
  id: string;
  type: "expense" | "settlement";
  groupId: string;
  groupName: string;
  title: string;
  amount: number;
  currency: string;
  createdAt: number;
  paidBy?: string;
  from?: string;
  to?: string;
}

/** Aggregate and sort the most recent activities (expenses and settlements) across all groups the user is in. */
export async function fetchUserActivity(uid: string, limitCount = 10): Promise<ActivityItem[]> {
  const groups = await fetchUserGroups(uid);
  if (groups.length === 0) return [];

  const promises = groups.map(async (group) => {
    const [expenses, settlements] = await Promise.all([
      fetchExpenses(group.id),
      fetchSettlements(group.id),
    ]);
    return { group, expenses, settlements };
  });

  const results = await Promise.all(promises);
  const items: ActivityItem[] = [];

  for (const { group, expenses, settlements } of results) {
    for (const exp of expenses) {
      items.push({
        id: exp.id,
        type: "expense",
        groupId: group.id,
        groupName: group.name,
        title: exp.title,
        amount: exp.amount,
        currency: exp.currency,
        createdAt: exp.createdAt,
        paidBy: exp.paidBy,
      });
    }
    for (const set of settlements) {
      items.push({
        id: set.id,
        type: "settlement",
        groupId: group.id,
        groupName: group.name,
        title: "Settlement",
        amount: set.amount,
        currency: group.baseCurrency || "INR",
        createdAt: set.createdAt,
        from: set.from,
        to: set.to,
      });
    }
  }

  return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, limitCount);
}
