import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { paths } from "@/lib/firebase/collections";
import type { MemberDetail } from "@/types";

type GuestMergeExpensePatch = Partial<{
  paidBy: string;
  splits: Record<string, number>;
}>;

type GuestMergeSettlementPatch = Partial<{
  from: string;
  to: string;
}>;

export async function mergeGuestToUser(
  db: Firestore,
  groupId: string,
  guestUid: string,
  actualUid: string,
  actualDetail: MemberDetail,
): Promise<void> {
  const groupRef = db.doc(paths.group(groupId));

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists) return;

    const members = (snap.get("members") as string[]) ?? [];
    const updatedMembers = members.filter((m) => m !== guestUid);
    if (!updatedMembers.includes(actualUid)) {
      updatedMembers.push(actualUid);
    }

    const memberDetails = (snap.get("memberDetails") as Record<string, MemberDetail>) ?? {};
    const guestDetail = memberDetails[guestUid];
    const finalDetail = {
      ...guestDetail,
      ...actualDetail,
    };

    delete memberDetails[guestUid];
    memberDetails[actualUid] = finalDetail;

    tx.update(groupRef, {
      members: updatedMembers,
      memberDetails,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  const batch = db.batch();
  const expensesSnap = await db.collection(paths.expenses(groupId)).get();
  for (const doc of expensesSnap.docs) {
    const data = doc.data();
    const updatePayload: GuestMergeExpensePatch = {};

    if (data.paidBy === guestUid) {
      updatePayload.paidBy = actualUid;
    }

    if (data.splits && guestUid in data.splits) {
      const newSplits = { ...data.splits };
      const share = newSplits[guestUid];
      delete newSplits[guestUid];
      newSplits[actualUid] = share;
      updatePayload.splits = newSplits;
    }

    if (Object.keys(updatePayload).length > 0) {
      batch.update(doc.ref, updatePayload);
    }
  }

  const settlementsSnap = await db.collection(paths.settlements(groupId)).get();
  for (const doc of settlementsSnap.docs) {
    const data = doc.data();
    const updatePayload: GuestMergeSettlementPatch = {};

    if (data.from === guestUid) updatePayload.from = actualUid;
    if (data.to === guestUid) updatePayload.to = actualUid;

    if (Object.keys(updatePayload).length > 0) {
      batch.update(doc.ref, updatePayload);
    }
  }

  await batch.commit();
}
