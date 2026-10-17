// Pure API-key encoding helpers. Kept free of Prisma/server-only so they can be
// unit-tested and reused by scripts. The database-facing verification lives in
// ./api-keys.ts.
//
// A key looks like `fxk_<prefix>_<secret>`, where `prefix` is a short non-secret
// lookup id and `secret` is a base64url string carrying at least 32 bytes of
// entropy. Only a SHA-256 hash of the full key is stored. `fxk_<prefix>` is a
// non-secret lookup id with a unique index, so verification is a single indexed
// read plus a constant-time compare.

import { createHash, randomBytes } from "node:crypto";

export const API_KEY_PREFIX = "fxk_";
const PREFIX_BYTES = 6;
const SECRET_BYTES = 32;

export interface GeneratedApiKey {
  /** The full secret; shown to the caller exactly once. */
  key: string;
  /** Non-secret lookup id (`fxk_<prefix>`, without the secret). */
  prefix: string;
  /** SHA-256 hex of the full key. */
  hash: string;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Extract the non-secret lookup id (`fxk_<prefix>`) from a full key, or null when
 * the key is malformed. Only the middle segment is retained, so a leaked prefix
 * reveals nothing about the secret.
 */
export function extractKeyPrefix(key: string): string | null {
  const match = /^(fxk_[A-Za-z0-9_-]{1,32})_[A-Za-z0-9_-]{1,}$/.exec(key);
  return match ? match[1] : null;
}

export function generateApiKey(): GeneratedApiKey {
  const id = randomBytes(PREFIX_BYTES).toString("base64url");
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const key = `${API_KEY_PREFIX}${id}_${secret}`;
  const prefix = `${API_KEY_PREFIX}${id}`;
  return { key, prefix, hash: hashApiKey(key) };
}

/** Parse a `Bearer <key>` Authorization header, or return null. */
export function parseBearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}
