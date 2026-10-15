import Image from "next/image";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth/guards";
import AdminNav from "@/app/components/admin/AdminNav";
import AdminUserMenu from "@/app/components/admin/AdminUserMenu";
import { Badge } from "@/app/components/ui/badge";
import logo from "@/public/images/logo.ico";

// Force per-request rendering so the admin session is always verified.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-lg font-semibold text-primary"
          >
            <Image src={logo} alt="Fintex logo" width={30} height={30} />
            <span>Fintex</span>
          </Link>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Synthetic demo data
          </Badge>
        </div>

        <AdminUserMenu name={user.name ?? ""} email={user.email ?? ""} />
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-8 px-6 py-8">
        <aside className="hidden w-48 shrink-0 md:block">
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
