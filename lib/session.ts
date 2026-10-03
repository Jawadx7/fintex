import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";

/**
 * Server-side session guard. `cache` dedupes the auth() call within a single
 * render pass, so a page and its layout only verify the session once.
 *
 * proxy.ts already redirects unauthenticated users; this is the authoritative
 * check that runs before any private data is read.
 */
export const requireUser = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return session.user;
});
