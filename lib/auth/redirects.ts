// Client-safe (no prisma/bcrypt/server-only here) because it is imported by
// both the proxy and client components.

// Single source of truth for where a signed-in user lands by default: staff
// go to the compliance dashboard, everyone else to their account.
export function getPostLoginPath(role?: string | null): string {
  return role === "ADMIN" ? "/admin/compliance" : "/account";
}

/**
 * Accept only same-origin relative paths. Anything absolute, protocol-relative
 * (`//evil.com`) or scheme-based (`https:`) is rejected so `callbackUrl` can
 * never be used for an open redirect.
 */
export function isSafeRelativePath(path: string | null | undefined): boolean {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.startsWith("/\\")) return false;
  // Backslashes can be treated as slashes by some browsers.
  if (path.includes("\\")) return false;
  return true;
}

/**
 * Resolve the post-login destination, preferring a safe `callbackUrl` and
 * otherwise falling back to the role's default landing page.
 */
export function resolvePostLoginPath(
  role: string | null | undefined,
  callbackUrl?: string | null
): string {
  if (isSafeRelativePath(callbackUrl) && callbackUrl) {
    return callbackUrl;
  }
  return getPostLoginPath(role);
}
