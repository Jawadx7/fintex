import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validation";

// A valid-shaped bcrypt hash that never matches, used so a missing account and
// a wrong password take a similar amount of time.
const INVALID_PASSWORD_HASH =
  "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        // Always run a comparison so a missing account and a wrong password
        // take a similar amount of time.
        const passwordMatches = await verifyPassword(
          password,
          user?.passwordHash ?? INVALID_PASSWORD_HASH
        );

        if (!user || !passwordMatches) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        };
      },
    }),
  ],
});
