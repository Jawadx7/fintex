import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const firstName = user.name?.trim().split(" ")[0] || "there";

  return (
    <div className="rounded-xl border bg-panel p-8">
      <h1 className="text-2xl font-semibold text-foreground">
        Welcome back, {firstName}
      </h1>
      <p className="mt-3 text-muted-foreground">
        Your transaction dashboard is being rebuilt and will arrive in a later
        release.
      </p>
    </div>
  );
}
