"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  getNotifications,
  markNotificationsRead,
  clearNotifications,
  type NotificationDTO,
} from "@/actions/notifications";
import { notificationTarget } from "@/lib/notification-routes";
import { cn } from "@/lib/utils";

export function NotificationBell({ initialUnreadCount }: { initialUnreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDTO[] | null>(null);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [, startTransition] = useTransition();

  function handleNotificationClick(n: NotificationDTO) {
    const target = notificationTarget(n.type, n.meta);
    if (target) router.push(target);
  }

  function handleClear(e: MouseEvent) {
    // Keep the dropdown open instead of letting the click bubble to a menu-item-style close.
    e.preventDefault();
    e.stopPropagation();
    setNotifications([]);
    setUnread(0);
    startTransition(async () => {
      await clearNotifications();
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !notifications) {
      startTransition(async () => {
        const data = await getNotifications();
        setNotifications(data);
      });
    }
    if (next && unread > 0) {
      startTransition(async () => {
        await markNotificationsRead();
      });
      setUnread(0);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <div className="flex items-center justify-between gap-2 px-1.5 py-1">
            <DropdownMenuLabel className="p-0 label-system-accent">System Notifications</DropdownMenuLabel>
            {notifications && notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <DropdownMenuSeparator />
          {!notifications ? (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">RETRIEVING...</div>
          ) : notifications.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">No notifications yet.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => {
                const hasTarget = notificationTarget(n.type, n.meta) !== null;
                return (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={hasTarget ? () => handleNotificationClick(n) : undefined}
                    className={cn(
                      "flex flex-col items-start gap-0.5 whitespace-normal py-2",
                      hasTarget ? "cursor-pointer" : "cursor-default opacity-90"
                    )}
                  >
                    <span className="heading-system text-xs">{n.title}</span>
                    {n.message && <span className="text-xs text-muted-foreground">{n.message}</span>}
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
