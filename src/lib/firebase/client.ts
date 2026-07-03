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
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  CustomProvider,
  type AppCheck,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function assertConfig(): void {
  // Treat empty AND unreplaced "TODO…" placeholders as missing, so a half-filled
  // .env.local fails with a clear setup error instead of a cryptic auth/* code.
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v || String(v).startsWith("TODO"))
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(
      `Firebase client config incomplete. Missing/placeholder: ${missing.join(", ")}. ` +
        `Fill the real values in .env.local (Firebase console → Project settings → ` +
        `Your apps), then restart \`npm run dev\`.`,
    );
  }
}

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  assertConfig();
  return initializeApp(firebaseConfig);
}

/**
 * Initialize Firebase App Check. Must be called before any Auth or Firestore
 * operation. Uses reCAPTCHA Enterprise in production and a debug token locally.
 *
 * To run locally:
 *  1. Set NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN to any UUID in .env.local
 *  2. Register that UUID as an allowed debug token in the Firebase console
 *     (App Check → Apps → your web app → Debug tokens).
 */
let appCheckInstance: AppCheck | null = null;
export function getAppCheck(): AppCheck {
  if (appCheckInstance) return appCheckInstance;
  const app = getFirebaseApp();
  const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (debugToken) {
    // Debug mode: use a static token registered in the Firebase console.
    // Never set this in production — the env var must be absent in prod builds.
    (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    appCheckInstance = initializeAppCheck(app, {
      provider: new CustomProvider({ getToken: async () => ({ token: debugToken, expireTimeMillis: Date.now() + 3_600_000 }) }),
      isTokenAutoRefreshEnabled: true,
    });
  } else if (siteKey) {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else {
    console.warn(
      "[owely] App Check is not configured. Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY " +
        "(production) or NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN (local dev). " +
        "Auth and Firestore will work but are unprotected.",
    );
    // Return a stub so callers don't need to null-check.
    return {} as AppCheck;
  }

  return appCheckInstance;
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
