import type { DefaultSession } from "next-auth";

import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

// The `token` in the jwt/session callbacks is typed from @auth/core's JWT
// (re-exported by "next-auth/jwt"), so the JWT fields must be augmented there.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}

export {};
