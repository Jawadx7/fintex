import { describe, expect, it } from "vitest";

import { isAppArea } from "@/lib/theme/scope";

describe("isAppArea", () => {
  it("treats the admin and account trees as themed app areas", () => {
    expect(isAppArea("/admin")).toBe(true);
    expect(isAppArea("/admin/")).toBe(true);
    expect(isAppArea("/admin/compliance")).toBe(true);
    expect(isAppArea("/admin/compliance/abc")).toBe(true);
    expect(isAppArea("/account")).toBe(true);
    expect(isAppArea("/account/settings")).toBe(true);
  });

  it("keeps public routes light, including near-miss prefixes", () => {
    expect(isAppArea("/")).toBe(false);
    expect(isAppArea("/login")).toBe(false);
    expect(isAppArea("/auth/login")).toBe(false);
    expect(isAppArea("/auth/signup")).toBe(false);
    expect(isAppArea("/administrator")).toBe(false);
    expect(isAppArea("/accounts")).toBe(false);
    expect(isAppArea("/about")).toBe(false);
  });

  it("is safe for missing pathnames", () => {
    expect(isAppArea(null)).toBe(false);
    expect(isAppArea(undefined)).toBe(false);
    expect(isAppArea("")).toBe(false);
  });
});
