"use client";

/**
 * FirebaseInit — call this once at the root of the client tree to initialize
 * Firebase App Check before any Auth or Firestore operation fires.
 *
 * App Check must be initialized BEFORE the first call to getAuth() or
 * getFirestore(), otherwise the first request goes out unprotected. Placing
 * this as the first child of <body> in the root layout guarantees that order.
 *
 * Production: set NEXT_PUBLIC_RECAPTCHA_SITE_KEY (reCAPTCHA Enterprise key).
 * Local dev:  set NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN (any UUID you register
 *             in Firebase console → App Check → your web app → Debug tokens).
 */

import { useEffect } from "react";
import { getAppCheck } from "@/lib/firebase/client";

export function FirebaseInit() {
  useEffect(() => {
    // Initialize App Check. Safe to call multiple times — the singleton
    // guard in getAppCheck() ensures only one initialization happens.
    getAppCheck();
  }, []);

  return null;
}
