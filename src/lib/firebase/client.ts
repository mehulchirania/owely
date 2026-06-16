/**
 * Firebase client SDK (browser).
 *
 * Used for Auth UI flows (Google sign-in, Phone OTP) and for Firestore
 * **reads** with offline persistence. All Firestore *writes* go through Server
 * Actions (Admin SDK), never directly from here — see `src/actions/`.
 *
 * Config comes from `NEXT_PUBLIC_*` env vars. These are not secrets (Firebase
 * web config is public by design); access is governed by Firestore security
 * rules + App Check, not by hiding the API key.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function assertConfig(): void {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(
      `Firebase client config incomplete. Missing: ${missing.join(", ")}. ` +
        `Set the corresponding NEXT_PUBLIC_FIREBASE_* vars in .env.local.`,
    );
  }
}

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  assertConfig();
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

/**
 * Firestore with persistent IndexedDB cache and multi-tab coordination, so the
 * app keeps working offline (a core requirement for an India-first app on
 * patchy mobile data). `initializeFirestore` must run before any `getFirestore`
 * call, so we route all access through here.
 */
let firestoreInstance: Firestore | null = null;
export function getFirebaseDb(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  firestoreInstance = initializeFirestore(getFirebaseApp(), {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  return firestoreInstance;
}

export const googleAuthProvider = new GoogleAuthProvider();
