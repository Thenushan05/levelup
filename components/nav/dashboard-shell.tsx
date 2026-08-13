"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Shield, ClipboardCheck, Menu, UserCog, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { RankBadge } from "@/components/system/badges";
import { NotificationBell } from "@/components/system/notification-bell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Rank } from "@/types";

function NavLink({
  href,
  active,
  icon: Icon,
  children,
  badge,
  tone = "cyan",
  onClick,
}: {
  href: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  badge?: ReactNode;
  tone?: "cyan" | "violet";
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-md py-2.5 pr-3 pl-4 text-sm transition-colors",
        active
          ? tone === "violet"
            ? "bg-secondary/10 text-glow-violet"
            : "bg-primary/10 text-glow-cyan"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {active && (
        <span
          className={cn(
            "absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r",
            tone === "violet" ? "bg-secondary" : "bg-primary"
          )}
          style={{
            boxShadow: `0 0 10px 1px ${tone === "violet" ? "var(--secondary)" : "var(--primary)"}`,
          }}
        />
      )}
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        <span className="heading-system tracking-wide">{children}</span>
      </span>
      {badge}
    </Link>
  );
}

/** Kept in one place so the desktop sidebar and the mobile "More" sheet can never drift apart. */
function AdminNavLinks({
  isActive,
  pendingApprovalCount,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  pendingApprovalCount: number;
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-2 space-y-1 pt-3" style={{ borderTop: "1px solid oklch(0.6 0.23 296 / 20%)" }}>
      <p className="label-system px-4 pb-1 text-glow-violet">Admin</p>
      <NavLink href="/admin/templates" active={isActive("/admin/templates")} icon={Shield} tone="violet" onClick={onNavigate}>
        Templates
      </NavLink>
      <NavLink
        href="/admin/approvals"
        active={isActive("/admin/approvals")}
        icon={ClipboardCheck}
        tone="violet"
        onClick={onNavigate}
        badge={
          pendingApprovalCount > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {pendingApprovalCount > 99 ? "99+" : pendingApprovalCount}
            </span>
          ) : null
        }
      >
        Approvals
      </NavLink>
      <NavLink href="/admin/users" active={isActive("/admin/users")} icon={UserCog} tone="violet" onClick={onNavigate}>
        Users
      </NavLink>
      <NavLink href="/admin/parties" active={isActive("/admin/parties")} icon={Users} tone="violet" onClick={onNavigate}>
        Parties
      </NavLink>
    </div>
  );
}

export function DashboardShell({
  children,
  playerName,
  level,
  rank,
  unreadCount,
  isAdmin,
  pendingApprovalCount,
}: {
  children: ReactNode;
  playerName: string;
  level: number;
  rank: string;
  unreadCount: number;
  isAdmin: boolean;
  pendingApprovalCount: number;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Belt-and-suspenders: also close the sheet on any route change (back button,
  // programmatic navigation, etc.), not just the in-sheet link clicks below.
  // Adjusted during render (not an effect) per React's "adjusting state when a
  // prop changes" pattern — avoids the extra render pass an effect would cost.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMoreOpen(false);
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // The bottom tab bar only has room for a handful of items (see spec: Home/Quest/
  // Progress/Party/Player) — everything else (plus Admin) lives behind "MORE" so
  // every page stays reachable on mobile instead of only existing in the desktop
  // sidebar.
  const primaryItems = NAV_ITEMS.filter((item) => item.mobile);
  const overflowItems = NAV_ITEMS.filter((item) => !item.mobile);
  const moreActive = overflowItems.some((item) => isActive(item.href)) || isActive("/admin");
  const closeMore = () => setMoreOpen(false);

  return (
    <div className="min-h-screen">
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col bg-sidebar px-3 py-6 lg:flex"
        style={{ boxShadow: "1px 0 0 0 oklch(0.83 0.17 213 / 18%), 8px 0 24px -12px oklch(0.83 0.17 213 / 30%)" }}
      >
        <Link href="/dashboard" className="mb-1 px-3">
          <span className="font-heading text-2xl font-black tracking-[0.2em] text-glow-cyan animate-hud-flicker">
            ASCEND
          </span>
        </Link>
        <p className="label-system mb-7 px-3 text-[10px]">Level Up Your Training</p>

        {/* This middle section scrolls on its own when the nav list (main +
            admin) is taller than the viewport — logo/tagline above and
            Logout below stay pinned, so nothing (like the Admin block) can
            ever get silently pushed off the bottom of a shorter screen. */}
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href} active={isActive(item.href)} icon={item.icon}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {isAdmin && <AdminNavLinks isActive={isActive} pendingApprovalCount={pendingApprovalCount} />}
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 rounded-md px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span className="heading-system tracking-wide">Logout</span>
        </button>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="lg:hidden">
              <span className="font-heading text-lg font-black tracking-[0.2em] text-glow-cyan">ASCEND</span>
            </div>
            <div className="hidden items-center gap-2.5 lg:flex">
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-primary" style={{ boxShadow: "0 0 8px 1px var(--primary)" }} />
              <span className="label-system">System Online ·</span>
              <p className="heading-system text-sm text-foreground">{playerName.toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <RankBadge rank={rank as Rank} size="sm" />
                <span className="label-system-accent hidden sm:inline">LV.{level}</span>
              </div>
              <NotificationBell initialUnreadCount={unreadCount} />
            </div>
          </div>
          <div className="scanline-divider" />
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border/60 bg-sidebar/95 py-2 backdrop-blur-md lg:hidden">
        {primaryItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-w-[3.5rem] flex-col items-center gap-1 px-2 py-1.5 text-[10px] transition-colors",
                active ? "text-glow-cyan" : "text-muted-foreground"
              )}
            >
              {active && (
                <span
                  className="absolute -top-2 h-1 w-1 rounded-full bg-primary"
                  style={{ boxShadow: "0 0 8px 2px var(--primary)" }}
                />
              )}
              <Icon className="h-5 w-5" />
              <span className="heading-system tracking-wide">{item.mobileLabel}</span>
            </Link>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger
            className={cn(
              "relative flex min-w-[3.5rem] flex-col items-center gap-1 px-2 py-1.5 text-[10px] transition-colors",
              moreActive ? "text-glow-cyan" : "text-muted-foreground"
            )}
          >
            {moreActive && (
              <span
                className="absolute -top-2 h-1 w-1 rounded-full bg-primary"
                style={{ boxShadow: "0 0 8px 2px var(--primary)" }}
              />
            )}
            <Menu className="h-5 w-5" />
            <span className="heading-system tracking-wide">MORE</span>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[75vh] overflow-y-auto rounded-t-2xl border-border/60 bg-sidebar/98 px-3 pb-6"
          >
            <SheetHeader className="px-1 pb-0">
              <SheetTitle className="label-system-accent">Navigation</SheetTitle>
            </SheetHeader>
            <nav className="space-y-1 px-1">
              {overflowItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  active={isActive(item.href)}
                  icon={item.icon}
                  onClick={closeMore}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {isAdmin && (
              <AdminNavLinks isActive={isActive} pendingApprovalCount={pendingApprovalCount} onNavigate={closeMore} />
            )}

            <button
              type="button"
              onClick={() => {
                closeMore();
                signOut({ callbackUrl: "/login" });
              }}
              className="flex items-center gap-3 rounded-md px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="heading-system tracking-wide">Logout</span>
            </button>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
