/**
 * `ActionResult<T>` — the single shape every Server Action returns.
 *
 * Server Actions must never throw across the client boundary (a thrown error
 * in a Server Action surfaces to the client as an opaque, unhelpful digest in
 * production). Instead they return this discriminated union: callers narrow on
 * `ok` and get either typed data or a user-readable message plus an optional
 * machine-readable `code` and field-level `fieldErrors` for form display.
 */

export interface ActionFailure {
  ok: false;
  /** User-readable, already mapped from any raw Firebase/Zod error. */
  error: string;
  /** Optional stable code for the client to branch on (e.g. "unauthorized"). */
  code?: string;
  /** Field → messages, for inline form validation display. */
  fieldErrors?: Record<string, string[]>;
}

export interface ActionSuccess<T> {
  ok: true;
  data: T;
}

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function success<T>(data: T): ActionSuccess<T> {
  return { ok: true, data };
}

export function failure(
  error: string,
  options?: { code?: string; fieldErrors?: Record<string, string[]> },
): ActionFailure {
  return { ok: false, error, ...options };
}
