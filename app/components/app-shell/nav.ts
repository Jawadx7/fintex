import { ShieldCheck, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Single source of truth for the admin sidebar. Adding a destination here is
// all that is needed to surface it in the shell.
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/compliance", label: "Compliance", icon: ShieldCheck },
];
