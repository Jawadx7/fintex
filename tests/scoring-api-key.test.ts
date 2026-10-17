import { describe, expect, it } from "vitest";

import {
  API_KEY_PREFIX,
  extractKeyPrefix,
  generateApiKey,
  hashApiKey,
  parseBearerToken,
} from "@/lib/scoring/api-key-format";

describe("hashApiKey", () => {
  it("is deterministic SHA-256 hex", () => {
    expect(hashApiKey("fxk_abc_def")).toBe(hashApiKey("fxk_abc_def"));
    expect(hashApiKey("fxk_abc_def")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey("fxk_abc_def")).not.toBe(hashApiKey("fxk_abc_deg"));
  });
});

describe("generateApiKey", () => {
  it("produces a fxk_<prefix>_<secret> key with a matching prefix and hash", () => {
    const { key, prefix, hash } = generateApiKey();
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(prefix).toBe(extractKeyPrefix(key));
    expect(prefix).not.toBeNull();
    expect(prefix).not.toContain(key.slice(prefix!.length + 1));
    expect(key).toMatch(/^fxk_[A-Za-z0-9_-]+_[A-Za-z0-9_-]{40,}$/);
    expect(hash).toBe(hashApiKey(key));
  });

  it("produces unique keys", () => {
    expect(generateApiKey().key).not.toBe(generateApiKey().key);
  });
});

describe("extractKeyPrefix", () => {
  it("returns the non-secret fxk_<prefix> id", () => {
    expect(extractKeyPrefix("fxk_ABCDEFG_secretvalue")).toBe("fxk_ABCDEFG");
  });

  it("returns null for malformed keys", () => {
    expect(extractKeyPrefix("ftx_ABCDEFGHIJKLMNOP")).toBeNull();
    expect(extractKeyPrefix("fxk_onlyprefix")).toBeNull();
    expect(extractKeyPrefix("")).toBeNull();
  });
});

describe("parseBearerToken", () => {
  it("parses a well-formed header", () => {
    expect(parseBearerToken("Bearer fxk_a_b")).toBe("fxk_a_b");
    expect(parseBearerToken("  bearer   fxk_a_b  ")).toBe("fxk_a_b");
  });

  it("rejects missing or malformed headers", () => {
    expect(parseBearerToken(null)).toBeNull();
    expect(parseBearerToken("")).toBeNull();
    expect(parseBearerToken("Basic abc")).toBeNull();
    expect(parseBearerToken("Bearer")).toBeNull();
  });
});
