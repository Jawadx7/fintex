import { requireUser } from "@/lib/auth/guards";

// Force every page in the (private) group to render per-request so the session
// is always verified against the incoming request, never a cached shell.
export const dynamic = "force-dynamic";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return <>{children}</>;
}
