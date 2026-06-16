/**
 * Map Firebase Auth error codes to user-readable messages. Never surface a raw
 * `auth/...` code to the UI. Anything unmapped falls back to a generic line.
 */

const MESSAGES: Record<string, string> = {
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and try again.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/invalid-phone-number": "That phone number doesn't look right.",
  "auth/missing-phone-number": "Enter a phone number first.",
  "auth/invalid-verification-code": "That code is incorrect. Check it and try again.",
  "auth/code-expired": "That code expired. Request a new one.",
  "auth/quota-exceeded": "SMS limit reached for now. Try again later or use Google sign-in.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/operation-not-allowed": "This sign-in method isn't enabled in the Firebase console.",
  // Common setup/config failures — usually a console or env step is missing.
  "auth/configuration-not-found":
    "Sign-in isn't configured yet. Enable the provider in Firebase Auth and register a Web app.",
  "auth/unauthorized-domain": "This domain isn't authorized in Firebase Auth settings.",
  "auth/invalid-api-key": "The Firebase API key is invalid — check NEXT_PUBLIC_FIREBASE_API_KEY.",
  "auth/api-key-not-valid": "The Firebase API key is invalid — check NEXT_PUBLIC_FIREBASE_API_KEY.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    "The Firebase API key is invalid — check NEXT_PUBLIC_FIREBASE_API_KEY.",
  "auth/invalid-app-credential":
    "Phone sign-in app check failed. Enable Phone auth and add this as a test number, or check reCAPTCHA.",
  "auth/billing-not-enabled": "Phone sign-in needs billing enabled on the project.",
};

interface CodedError {
  code?: string;
}

export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as CodedError).code
      : undefined;
  if (code && MESSAGES[code]) return MESSAGES[code];
  // Surface the raw code so an unmapped failure is diagnosable, not opaque.
  return code
    ? `Couldn't sign in (${code}). Check the Firebase setup.`
    : "Something went wrong signing in. Please try again.";
}
