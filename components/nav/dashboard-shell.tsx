"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { RankBadge } from "@/components/system/badges";
import { NotificationBell } from "@/components/system/notification-bell";
import type { Rank } from "@/types";

export function DashboardShell({
  children,
  playerName,
  level,
  rank,
  unreadCount,
}: {
  children: ReactNode;
  playerName: string;
  level: number;
  rank: string;
  unreadCount: number;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-border/60 bg-sidebar px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-8 px-2">
          <span className="font-heading text-xl font-bold tracking-[0.25em] text-glow-cyan">ASCEND</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-glow-cyan"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="heading-system tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span className="heading-system tracking-wide">Logout</span>
        </button>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="lg:hidden">
            <span className="font-heading text-lg font-bold tracking-[0.25em] text-glow-cyan">ASCEND</span>
          </div>
          <div className="hidden text-sm lg:block">
            <span className="label-system">Welcome back</span>
            <p className="heading-system text-foreground">{playerName.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <RankBadge rank={rank as Rank} size="sm" />
              <span className="label-system-accent hidden sm:inline">LV.{level}</span>
            </div>
            <NotificationBell initialUnreadCount={unreadCount} />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border/60 bg-sidebar/95 py-2 backdrop-blur-md lg:hidden">
        {NAV_ITEMS.filter((item) => item.mobile).map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[3.5rem] flex-col items-center gap-1 px-2 py-1.5 text-[10px] transition-colors",
                active ? "text-glow-cyan" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="heading-system tracking-wide">{item.mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
