"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getNotifications, markNotificationsRead, type NotificationDTO } from "@/actions/notifications";

export function NotificationBell({ initialUnreadCount }: { initialUnreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDTO[] | null>(null);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [, startTransition] = useTransition();

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
        <DropdownMenuLabel className="label-system-accent">System Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!notifications ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">RETRIEVING...</div>
        ) : notifications.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">No notifications yet.</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 whitespace-normal py-2">
                <span className="heading-system text-xs">{n.title}</span>
                {n.message && <span className="text-xs text-muted-foreground">{n.message}</span>}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
