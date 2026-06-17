/**
 * Session-cookie constants with no heavy imports, so the edge `proxy` can read
 * them without pulling in the Admin SDK / `server-only` (which would break the
 * edge bundle).
 */

export const SESSION_COOKIE = "__session";

/** 14 days, in seconds — the max Firebase session-cookie lifetime. */
export const SESSION_MAX_AGE = 14 * 24 * 60 * 60;
