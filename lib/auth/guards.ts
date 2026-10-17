import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { auth } from "@/auth";

/**
 * Page/layout guard: requires any signed-in user. No session -> /auth/login.
 *
 * `cache` dedupes the auth() call within a single render pass, so a page and
 * its layout only verify the session once.
 */
export const requireUser = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return session.user;
});

/**
 * Page/layout guard: requires an ADMIN. No session -> /auth/login; signed in
 * but not an admin -> /account.
 */
export const requireAdmin = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/account");
  }

  return session.user;
});

/**
 * Route-handler guard. Returns the session on success, or a JSON response
 * (401 when signed out, 403 when signed in without the admin role) that the
 * handler should return as-is.
 *
 * The proxy does not run for route handlers here, so every admin handler must
 * call this.
 */
export async function assertAdmin(): Promise<Session | NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return session;
}

export interface AdminTenant {
  userId: string;
  tenantId: string;
}

/**
 * Guard for tenant-scoped management routes. Same as `assertAdmin`, but also
 * requires the account to be bound to a tenant (D8: tenant identity comes from
 * the session, never from the request body). Returns 409 when the admin has no
 * tenant.
 */
export async function assertAdminTenant(): Promise<
  AdminTenant | NextResponse
> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: "This account is not bound to a tenant" },
      { status: 409 }
    );
  }

  return { userId: session.user.id, tenantId };
}
