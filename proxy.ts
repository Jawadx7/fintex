import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { getPostLoginPath } from "@/lib/auth/redirects";

// Uses the DB-free config on purpose: the proxy only needs to read the session
// JWT, so it never loads Prisma or bcrypt. This is an optimistic check -- the
// admin layout and route handlers re-verify the session server-side.
const { auth } = NextAuth(authConfig);

const AUTH_ROUTES = ["/auth/login", "/auth/signup"];

export const proxy = auth((request) => {
  const { nextUrl } = request;

  // Server Actions POST to the page that defines them (e.g. the signup step-2
  // action posts to /auth/signup). Those requests must reach the action, whose
  // own guard runs server-side; treating them as navigations would redirect the
  // POST and surface "an unexpected response was received from the server".
  if (request.headers.get("next-action")) {
    return NextResponse.next();
  }

  const user = request.auth?.user;
  const isLoggedIn = Boolean(user);
  // Normalise so a trailing slash can't defeat the route checks.
  const path = nextUrl.pathname.replace(/\/+$/, "") || "/";
  const isAuthRoute = AUTH_ROUTES.includes(path);
  const isAdminRoute = path === "/admin" || path.startsWith("/admin/");

  // Auth entry points stay reachable when signed out, and bounce an already
  // signed-in user to their role-appropriate landing page.
  if (isAuthRoute) {
    return isLoggedIn
      ? NextResponse.redirect(new URL(getPostLoginPath(user?.role), nextUrl))
      : NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signed in but not an admin: keep non-staff out of /admin.
  if (isAdminRoute && user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/account", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // /admin/* and /account are the guarded routes the brief calls out. The auth
  // entry points are included so an already signed-in user is bounced away from
  // login/signup. /error/payment_error preserves the earlier brief's behaviour.
  // The legacy /application/* URLs are redirected in next.config before the
  // proxy runs.
  matcher: [
    "/admin/:path*",
    "/account",
    "/error/payment_error",
    "/auth/login",
    "/auth/signup",
  ],
};
