import type { NextAuthConfig, User } from "next-auth";

// Kept free of Prisma/bcrypt so proxy.ts can import it without pulling the
// database driver into the proxy bundle. Providers that need a database are
// added in auth.ts instead.
//
// The jwt/session callbacks live here (not in auth.ts) so the proxy, which
// builds its own NextAuth instance from this config, can read `req.auth.user`
// including the role.
export const authConfig = {
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // `user` is `User | AdapterUser`; the AdapterUser variant has no role or
        // tenant, so read them off our augmented User type.
        token.role = (user as User).role;
        token.tenantId = (user as User).tenantId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role;
      session.user.tenantId = (token.tenantId as string | null) ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
