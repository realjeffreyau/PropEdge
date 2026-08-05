"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon, MenuIcon, ZapIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReadOnlyBanner } from "./ReadOnlyBanner";
import { MockModeBanner } from "./MockModeBanner";
import { NAV_ITEMS } from "./Sidebar";
import { cn } from "@/lib/utils";

interface TopNavUser {
  name?: string | null;
  email?: string | null;
}

interface TopNavProps {
  isReadOnly?: boolean;
  isMockMode?: boolean;
  lastRefreshed?: string | null;
  isAdmin?: boolean;
  user?: TopNavUser | null;
}

export function TopNav({ isReadOnly, isMockMode, lastRefreshed, isAdmin, user }: TopNavProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const formattedTime = lastRefreshed
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(lastRefreshed))
    : null;
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  useEffect(() => {
    // The drawer must close after client-side navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header className="flex items-center justify-between gap-4 px-4 lg:px-6 py-3 border-b border-border bg-[#0A0A0F]/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex min-w-0 items-center gap-2 lg:hidden">
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation-drawer"
          onClick={() => setIsMenuOpen(true)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
        >
          <MenuIcon className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500">
          <ZapIcon className="h-3.5 w-3.5 text-black" aria-hidden="true" />
        </div>
        <span className="truncate font-display text-sm font-semibold text-foreground">PropEdge</span>
      </div>

      {/* Spacer on desktop */}
      <div className="hidden lg:block flex-1" />

      {/* Right side */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 lg:flex-none">
        {isMockMode && <MockModeBanner />}
        {isReadOnly && <ReadOnlyBanner />}

        {formattedTime && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-data">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Updated {formattedTime}
          </span>
        )}

        {/* Mobile sign-out (sidebar handles desktop) */}
        <button
          type="button"
          aria-label="Sign out"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 lg:hidden"
          title="Sign out"
        >
          <LogOutIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent
          id="mobile-navigation-drawer"
          showCloseButton
          className="!fixed !inset-y-0 !left-0 !top-0 !flex !h-full !w-80 !max-w-[calc(100%-2rem)] !translate-x-0 !translate-y-0 !flex-col !gap-0 !rounded-none !rounded-r-2xl !bg-[#12121A] !p-0 !shadow-2xl sm:!max-w-[calc(100%-2rem)]"
        >
          <div className="border-b border-border px-5 py-5 pr-14">
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500">
                <ZapIcon className="h-4 w-4 text-black" aria-hidden="true" />
              </span>
              PropEdge
            </DialogTitle>
            <DialogDescription className="sr-only">
              Navigate to a PropEdge page.
            </DialogDescription>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Mobile navigation">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70",
                    isActive
                      ? "bg-amber-500/15 font-medium text-amber-400"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border p-3">
            {user && (
              <div className="mb-1 px-3 py-2">
                <p className="truncate text-xs font-medium text-foreground">{user.name ?? user.email}</p>
                <p className="truncate text-xs text-muted-foreground/60">Mobile navigation</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
            >
              <LogOutIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
