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
  const expensesRef = db.collection(paths.expenses(groupId));
  const settlementsRef = db.collection(paths.settlements(groupId));

  // Read all docs outside the transaction first to check volume — Firestore
  // transactions work best when reads and writes are interleaved predictably.
  // We read expenses/settlements here so we can check doc count before entering.
  const [expensesSnap, settlementsSnap] = await Promise.all([
    expensesRef.get(),
    settlementsRef.get(),
  ]);

  // Safety: group doc + 1 write per expense + 1 write per settlement + 1 group write
  const totalDocs = 1 + expensesSnap.size + settlementsSnap.size + 1;
  if (totalDocs > 400) {
    console.error(
      `[mergeGuestToUser] too many documents to merge atomically (${totalDocs}). ` +
        `groupId=${groupId} guestUid=${guestUid}. Aborting to avoid silent partial merge.`,
    );
    throw new Error("MERGE_TOO_LARGE");
  }

  await db.runTransaction(async (tx) => {
    // Pin the transaction on the group doc.
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) return;

    // --- Group membership ---
    const members = (groupSnap.get("members") as string[]) ?? [];
    const updatedMembers = members.filter((m) => m !== guestUid);
    if (!updatedMembers.includes(actualUid)) {
      updatedMembers.push(actualUid);
    }

    const memberDetails = (groupSnap.get("memberDetails") as Record<string, MemberDetail>) ?? {};
    const guestDetail = memberDetails[guestUid];
    const finalDetail = { ...guestDetail, ...actualDetail };
    delete memberDetails[guestUid];
    memberDetails[actualUid] = finalDetail;

    tx.update(groupRef, {
      members: updatedMembers,
      memberDetails,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // --- Expenses ---
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
        tx.update(doc.ref, updatePayload);
      }
    }

    // --- Settlements ---
    for (const doc of settlementsSnap.docs) {
      const data = doc.data();
      const updatePayload: GuestMergeSettlementPatch = {};

      if (data.from === guestUid) updatePayload.from = actualUid;
      if (data.to === guestUid) updatePayload.to = actualUid;

      if (Object.keys(updatePayload).length > 0) {
        tx.update(doc.ref, updatePayload);
      }
    }
  });
}
