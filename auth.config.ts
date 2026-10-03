import type { NextAuthConfig } from "next-auth";

// Kept free of Prisma/bcrypt so proxy.ts can import it without pulling the
// database driver into the proxy bundle. Providers that need a database are
// added in auth.ts instead.
export const authConfig = {
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
