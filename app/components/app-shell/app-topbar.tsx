import Image from "next/image";
import Link from "next/link";

import ThemeToggle from "@/app/components/theme-toggle";
import { Badge } from "@/app/components/ui/badge";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import logo from "@/public/images/logo.ico";

import AppUserMenu from "./app-user-menu";

/**
 * Full-width app top bar shared by /admin and /account.
 *
 * `showMenuTrigger` renders the mobile sidebar hamburger; it is only set when
 * the surrounding tree is wrapped in a <SidebarProvider> (i.e. /admin).
 */
export default function AppTopbar({
  name,
  email,
  homeHref = "/admin",
  showMenuTrigger = true,
  fallbackLabel = "User",
}: {
  name: string;
  email: string;
  homeHref?: string;
  showMenuTrigger?: boolean;
  fallbackLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center gap-2 border-b bg-chrome px-3 sm:px-4">
      {showMenuTrigger ? <SidebarTrigger className="md:hidden" /> : null}

      <Link
        href={homeHref}
        className="flex items-center gap-2 text-base font-semibold text-primary"
      >
        <Image src={logo} alt="Fintex logo" width={26} height={26} />
        <span>Fintex</span>
      </Link>

      <Badge variant="secondary" className="hidden sm:inline-flex">
        Synthetic demo data
      </Badge>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <AppUserMenu name={name} email={email} fallbackLabel={fallbackLabel} />
      </div>
    </header>
  );
}
