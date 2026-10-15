import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted so the module mocks below can close over them safely.
const { findUnique, create } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
}));

// `server-only` throws outside an RSC graph; stub it.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique, create } },
}));

// actions/auth.ts imports this for its other actions; avoid pulling in @/auth.
vi.mock("@/lib/auth/guards", () => ({
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  assertAdmin: vi.fn(),
}));

vi.mock("@/auth", () => ({
  signIn: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

// Bare `next-auth` pulls in next/server, which Vitest can't resolve as ESM.
// actions/auth.ts only needs the AuthError class from it.
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));

vi.mock("@/lib/auth/password", () => ({
  BCRYPT_ROUNDS: 10,
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

import { registerUser } from "@/app/actions/auth";

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("registerUser privilege-escalation hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "user_1" });
  });

  it("ignores a client-supplied role and creates a plain user", async () => {
    const result = await registerUser(
      {},
      formData({
        firstName: "Mallory",
        lastName: "Attacker",
        email: "mallory@example.com",
        password: "sup3rsecret",
        confirmPassword: "sup3rsecret",
        // Attempted escalation: must never reach the database.
        role: "ADMIN",
      })
    );

    expect(result).toEqual({ success: true });
    expect(create).toHaveBeenCalledTimes(1);

    const data = create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data).not.toHaveProperty("role");
    expect(Object.keys(data).sort()).toEqual(
      ["email", "firstName", "lastName", "passwordHash"].sort()
    );
  });
});
