import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { paths } from "@/lib/firebase/collections";
import { directPairKey } from "@/lib/relationship-categories";
import type { MemberDetail } from "@/types";

export function directGroupIdForPair(pairKey: string): string {
  return `direct_${createHash("sha256").update(pairKey).digest("hex").slice(0, 32)}`;
}

export function directGroupName(a: MemberDetail, b: MemberDetail): string {
  return `${a.name} + ${b.name}`;
}

export async function ensureDirectGroup(
  db: Firestore,
  uidA: string,
  detailA: MemberDetail,
  uidB: string,
  detailB: MemberDetail,
): Promise<{ groupId: string; existing: boolean }> {
  const pairKey = directPairKey(uidA, uidB);
  const ref = db.doc(paths.group(directGroupIdForPair(pairKey)));
  let existing = false;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      existing = true;
      return;
    }
    tx.set(ref, {
      type: "direct",
      name: directGroupName(detailA, detailB),
      createdBy: uidA,
      members: [uidA, uidB],
      memberDetails: {
        [uidA]: detailA,
        [uidB]: detailB,
      },
      directPairKey: pairKey,
      directPeerUids: {
        [uidA]: uidB,
        [uidB]: uidA,
      },
      simplifiedDebts: [],
      baseCurrency: "INR",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { groupId: ref.id, existing };
}
