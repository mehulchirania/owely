/**
 * Firebase Admin SDK (server-only).
 *
 * The privileged path: all Firestore writes and session-cookie verification go
 * through here, inside Server Actions and route handlers. The Admin SDK bypasses
 * Firestore security rules, so authorization is enforced in our action layer
 * (verify the session, check membership) — never assume the rules will catch it.
 *
 * Credentials come from a service-account env var. On Vercel set
 * FIREBASE_SERVICE_ACCOUNT_KEY to the full JSON (or base64 of it). Locally, put
 * it in .env.local (never commit it).
 */

import "server-only";
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const APP_NAME = "owely-admin";

/** True when admin credentials are present. Lets us no-op gracefully in dev. */
export function hasAdminConfig(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add the service-account JSON " +
        "(raw or base64) to .env.local for the owely-c6c51 project.",
    );
  }
  const json = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(json) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    // Env vars collapse newlines to the literal "\n"; restore them.
    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;
  return initializeApp(
    {
      credential: cert(loadServiceAccount()),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "owely-c6c51",
    },
    APP_NAME,
  );
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
