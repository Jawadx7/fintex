import type { DefaultSession } from "next-auth";

import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    tenantId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      // Null for accounts that are not bound to a tenant (e.g. a platform
      // admin). Tenant-scoped routes reject a null tenant.
      tenantId: string | null;
    } & DefaultSession["user"];
  }
}

// The `token` in the jwt/session callbacks is typed from @auth/core's JWT
// (re-exported by "next-auth/jwt"), so the JWT fields must be augmented there.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    tenantId?: string | null;
  }
}

export {};
