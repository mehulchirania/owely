/**
 * Session-cookie constants with no heavy imports, so the edge `proxy` can read
 * them without pulling in the Admin SDK / `server-only` (which would break the
 * edge bundle).
 */

export const SESSION_COOKIE = "__session";

/** 1 day, in seconds — short session lifetime to mitigate missing revocation checks. */
export const SESSION_MAX_AGE = 24 * 60 * 60;
