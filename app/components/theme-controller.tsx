"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { isAppArea } from "@/lib/theme/scope";

const STORAGE_KEY = "fintex-theme";

// Layout effect on the client (runs before paint, no light/dark flash on soft
// navigation), plain effect on the server where layout effects warn.
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function prefersDark(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
  } catch {
    // Storage can be unavailable (private mode); fall through to OS pref.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Keeps the `.dark` class on <html> in sync with the current route so portaled
 * UI (Select, Sheet, Tooltip, Sonner) is themed correctly inside the app, while
 * landing/auth pages stay light-only. The pre-hydration script in the root
 * layout handles the initial hard load; this handles client-side navigation.
 */
export default function ThemeController() {
  const pathname = usePathname();

  useIsoLayoutEffect(() => {
    const root = document.documentElement;
    if (isAppArea(pathname) && prefersDark()) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [pathname]);

  return null;
}
