/**
 * Server-side error logging for the action layer.
 *
 * Every Server Action wraps its Firestore work in a `try` and returns a
 * user-readable `ActionResult` failure on error. Before this helper those
 * `catch` blocks discarded the original exception entirely, which made
 * permission errors, validation edge cases, and transient Firestore failures
 * indistinguishable in production. `logActionError` writes the real error to
 * stderr (App Hosting captures it) before the action returns the generic
 * message, with a stable scope label so logs are greppable.
 *
 * Keep the user-facing message in the action; this only adds observability.
 */

import "server-only";

/** Log an action-layer failure with a stable scope label. Never throws. */
export function logActionError(scope: string, error: unknown): void {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[owely:${scope}] ${detail}`);
}
