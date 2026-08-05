"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboardIcon,
  TrendingUpIcon,
  BookOpenIcon,
  BarChart2Icon,
  BookmarkIcon,
  BellIcon,
  SettingsIcon,
  ZapIcon,
  LogOutIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",   label: "Dashboard",     icon: LayoutDashboardIcon },
  { href: "/props",       label: "Props",         icon: ZapIcon },
  { href: "/picks",       label: "Picks",         icon: TrendingUpIcon },
  { href: "/odds",        label: "Odds",          icon: BarChart2Icon },
  { href: "/books",       label: "Books",         icon: BookOpenIcon },
  { href: "/watchlist",   label: "Watchlist",     icon: BookmarkIcon },
  { href: "/alerts",      label: "Alerts",        icon: BellIcon },
  { href: "/admin",       label: "Admin",         icon: SettingsIcon, adminOnly: true },
];

interface SidebarUser {
  name?: string | null;
  email?: string | null;
  role?: string;
}

interface SidebarProps {
  isAdmin?: boolean;
  user?: SidebarUser | null;
}

export function Sidebar({ isAdmin = false, user }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-border bg-[#12121A]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
          <ZapIcon className="w-4 h-4 text-black" />
        </div>
        <span className="font-display font-semibold text-base text-foreground tracking-tight">
          PropEdge
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70",
                isActive
                  ? "bg-amber-500/15 text-amber-400 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="p-3 border-t border-border">
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-foreground truncate">{user.name ?? user.email}</p>
            <p className="text-xs text-muted-foreground/60 truncate">
              {user.role === "ADMIN" ? "Admin" : user.role === "MEMBER_FULL" ? "Full access" : "Read only"}
            </p>
          </div>
        )}
        <button
          type="button"
          aria-label="Sign out"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
        >
          <LogOutIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
