import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isSafeRelativePath, resolvePostLoginPath } from "@/lib/auth/redirects";

// Always read the session per-request.
export const dynamic = "force-dynamic";

// Single landing route every sign-in flow is sent to. It decides between the
// caller's safe callbackUrl and the role's default page, so role-based routing
// lives in exactly one place.
export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    const params = new URLSearchParams();
    if (isSafeRelativePath(callbackUrl)) {
      params.set("callbackUrl", callbackUrl as string);
    }
    const query = params.toString();
    redirect(`/auth/login${query ? `?${query}` : ""}`);
  }

  const target = resolvePostLoginPath(session.user.role, callbackUrl);

  redirect(target);
}
