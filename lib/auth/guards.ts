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
