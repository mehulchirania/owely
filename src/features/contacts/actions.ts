"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { authorizeUser } from "@/features/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections, paths } from "@/lib/firebase/collections";
import {
  contactQuotaKey,
  normalizeImportedContact,
  type NormalizedContactInput,
} from "@/lib/contacts";
import { logActionError } from "@/lib/log";
import { failure, success, type ActionResult } from "@/lib/result";
import { parseInput, SyncContactsSchema } from "@/lib/validation";
import type { SyncContactsSummary, SyncedContactResult } from "@/features/contacts/types";

const DAILY_CONTACT_SYNC_LIMIT = 500;

interface MatchedUser {
  phone: string;
  name: string;
  photoURL: string | null;
}

async function reserveContactQuota(uid: string, requested: number): Promise<ActionResult<null>> {
  const db = getAdminDb();
  const dayKey = contactQuotaKey();
  const ref = db.doc(paths.contactSyncCounter(uid, dayKey));

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const used = snap.exists ? snap.get("count") ?? 0 : 0;
      if (used + requested > DAILY_CONTACT_SYNC_LIMIT) {
        throw new Error("quota-exceeded");
      }
      tx.set(
        ref,
        {
          count: FieldValue.increment(requested),
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: snap.exists ? snap.get("createdAt") : FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
    return success(null);
  } catch (error) {
    if (error instanceof Error && error.message === "quota-exceeded") {
      return failure("Contact sync limit reached for today. Try again tomorrow.", { code: "quota-exceeded" });
    }
    logActionError("reserveContactQuota", error);
    return failure("Could not sync contacts right now.");
  }
}

async function findMatches(phones: string[]): Promise<Map<string, MatchedUser>> {
  const out = new Map<string, MatchedUser>();
  const db = getAdminDb();
  for (let i = 0; i < phones.length; i += 30) {
    const chunk = phones.slice(i, i + 30);
    const snap = await db.collection(Collections.users).where("phone", "in", chunk).get();
    for (const doc of snap.docs) {
      const phone = doc.get("phone") as string | undefined;
      if (!phone) continue;
      out.set(phone, {
        phone,
        name: doc.get("displayName") ?? "Owely user",
        photoURL: doc.get("photoURL") ?? null,
      });
    }
  }
  return out;
}

function dedupeContacts(contacts: NormalizedContactInput[]): NormalizedContactInput[] {
  const seen = new Set<string>();
  const out: NormalizedContactInput[] = [];
  for (const contact of contacts) {
    if (seen.has(contact.phone)) continue;
    seen.add(contact.phone);
    out.push(contact);
  }
  return out;
}

export async function syncContacts(input: unknown): Promise<ActionResult<SyncContactsSummary>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(SyncContactsSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  const normalized = dedupeContacts(
    parsed.data.contacts
      .map((contact) => normalizeImportedContact(contact))
      .filter((contact): contact is NormalizedContactInput => contact !== null),
  );
  const invalid = parsed.data.contacts.length - normalized.length;
  if (normalized.length === 0) {
    return success({ added: 0, matched: 0, invalid, contacts: [] });
  }

  const quota = await reserveContactQuota(auth.data.uid, parsed.data.contacts.length);
  if (!quota.ok) return quota;

  try {
    const db = getAdminDb();
    const matches = await findMatches(normalized.map((contact) => contact.phone));
    const writer = db.bulkWriter();
    let added = 0;
    const contacts: SyncedContactResult[] = [];

    for (const contact of normalized) {
      const match = matches.get(contact.phone);
      const ref = db.doc(paths.contact(auth.data.uid, contact.contactId));
      const existing = await ref.get();
      if (!existing.exists) added += 1;
      writer.set(
        ref,
        {
          ownerUid: auth.data.uid,
          name: contact.name,
          phone: contact.phone,
          phoneHash: contact.phoneHash,
          onOwely: Boolean(match),
          ...(match
            ? { matchedName: match.name, matchedPhotoURL: match.photoURL }
            : { matchedName: FieldValue.delete(), matchedPhotoURL: FieldValue.delete() }),
          createdAt: existing.exists ? existing.get("createdAt") ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
          lastSyncedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      contacts.push({
        name: contact.name,
        phone: contact.phone,
        onOwely: Boolean(match),
        matchedName: match?.name,
        matchedPhotoURL: match?.photoURL,
      });
    }

    await writer.close();
    revalidatePath("/people");
    revalidatePath("/settings");
    return success({
      added,
      matched: contacts.filter((contact) => contact.onOwely).length,
      invalid,
      contacts,
    });
  } catch (error) {
    logActionError("syncContacts", error);
    return failure("Could not sync contacts right now.");
  }
}

export async function clearImportedContacts(): Promise<ActionResult<{ deleted: number }>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;

  try {
    const db = getAdminDb();
    const snap = await db.collection(paths.contacts(auth.data.uid)).get();
    const writer = db.bulkWriter();
    for (const doc of snap.docs) writer.delete(doc.ref);
    await writer.close();
    revalidatePath("/people");
    revalidatePath("/settings");
    return success({ deleted: snap.size });
  } catch (error) {
    logActionError("clearImportedContacts", error);
    return failure("Could not clear imported contacts.");
  }
}
