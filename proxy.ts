import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { getPostLoginPath } from "@/lib/auth/redirects";

// Uses the DB-free config on purpose: the proxy only needs to read the session
// JWT, so it never loads Prisma or bcrypt. This is an optimistic check -- the
// private layout re-verifies the session server-side before rendering data.
const { auth } = NextAuth(authConfig);

const AUTH_ROUTES = ["/auth/login", "/auth/signup"];

export default auth((request) => {
  const { nextUrl } = request;
  const isLoggedIn = Boolean(request.auth?.user);
  // Normalise so a trailing slash can't defeat the membership check.
  const path = nextUrl.pathname.replace(/\/+$/, "") || "/";
  const isAuthRoute = AUTH_ROUTES.includes(path);

  // Auth entry points stay reachable when signed out, and bounce to the
  // account home when signed in.
  if (isAuthRoute) {
    return isLoggedIn
      ? NextResponse.redirect(new URL(getPostLoginPath(), nextUrl))
      : NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // The private account home, plus the auth entry points so an already
  // signed-in user is bounced away from login/signup instead of seeing a dead
  // form. The legacy /application/* URLs are redirected in next.config before
  // the proxy runs.
  matcher: ["/account", "/error/payment_error", "/auth/login", "/auth/signup"],
};
