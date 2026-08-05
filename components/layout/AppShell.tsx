"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

interface AppShellProps {
  children: React.ReactNode;
  isMockMode?: boolean;
  lastRefreshed?: string | null;
}

export function AppShell({ children, isMockMode = false, lastRefreshed }: AppShellProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "ADMIN";
  const isReadOnly = session?.user?.role === "MEMBER_READONLY";

  useEffect(() => {
    if (!pathname || ["/dashboard", "/props", "/books"].includes(pathname)) return;

    const routeTitle = pathname.startsWith("/props/")
      ? "Prop Detail"
      : pathname.startsWith("/books/")
      ? null
      : pathname === "/admin"
      ? "Admin"
      : pathname === "/alerts"
      ? "Alerts"
      : pathname === "/backtesting"
      ? "Backtesting"
      : pathname === "/odds"
      ? "Odds"
      : pathname === "/picks"
      ? "Picks"
      : pathname === "/watchlist"
      ? "Watchlist"
      : pathname.startsWith("/invite")
      ? "Invite"
      : null;

    if (routeTitle) document.title = `${routeTitle} · PropEdge`;
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isAdmin={isAdmin} user={session?.user ?? null} />

      <div className="flex flex-col flex-1 min-w-0">
        <TopNav
          isReadOnly={isReadOnly}
          isMockMode={isMockMode}
          isAdmin={isAdmin}
          lastRefreshed={lastRefreshed}
          user={session?.user ?? null}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
