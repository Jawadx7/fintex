import { requireUser } from "@/lib/auth/guards";
import AppTopbar from "@/app/components/app-shell/app-topbar";

// Force per-request rendering so the account session is always verified.
export const dynamic = "force-dynamic";

// The account area currently has a single destination, so it renders the shared
// themed top bar header-only (no sidebar) per the shell brief.
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-svh flex-col bg-chrome">
      <AppTopbar
        name={user.name ?? ""}
        email={user.email ?? ""}
        homeHref="/account"
        showMenuTrigger={false}
      />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
