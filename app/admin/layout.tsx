import type { CSSProperties } from "react";
import { cookies } from "next/headers";

import { requireAdmin } from "@/lib/auth/guards";
import AppSidebar from "@/app/components/app-shell/app-sidebar";
import AppTopbar from "@/app/components/app-shell/app-topbar";
import { SidebarInset, SidebarProvider } from "@/app/components/ui/sidebar";

// Force per-request rendering so the admin session is always verified.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  // Persist the collapsed/expanded rail across reloads with no layout jump.
  const defaultOpen =
    (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className="flex-col"
      style={{ "--sidebar-width-icon": "4rem" } as CSSProperties}
    >
      <AppTopbar name={user.name ?? ""} email={user.email ?? ""} />

      <div className="flex w-full flex-1">
        <AppSidebar />
        <SidebarInset className="bg-chrome">
          <div className="flex min-w-0 flex-1 flex-col bg-panel md:rounded-tl-xl">
            <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
