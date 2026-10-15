// Route-scoping for the dark theme. Pure and dependency-free so the client
// controller and unit tests can share exactly one definition.

const APP_PREFIXES = ["/admin", "/account"];

/** True for the signed-in app areas (/admin/**, /account/**) only. */
export function isAppArea(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
