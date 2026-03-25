"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bell, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { format } from "date-fns";

interface AppNavProps {
  children?: React.ReactNode;
}

export function AppNav({ children }: AppNavProps) {
  const { data: session } = useSession();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: notifications, refetch: refetchNotifications } = trpc.notification.list.useQuery(
    { limit: 20 },
    { enabled: notificationsOpen }
  );

  const markAsRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
    },
  });

  const markAllAsRead = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
    },
  });

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xl font-bold hover:opacity-80">
            BuildFlow
          </Link>
          {children}
        </div>
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount && unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>Notifications</SheetTitle>
                  {unreadCount && unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllAsRead.mutate()}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <SheetDescription>
                  Stay updated on your tasks and projects.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                {notifications?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No notifications
                  </p>
                ) : (
                  notifications?.map((notification: { id: string; title: string; message: string | null; read: boolean; createdAt: Date | string }) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border ${
                        notification.read ? "bg-gray-50" : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead.mutate({ id: notification.id })}
                          >
                            Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          <span className="text-sm text-muted-foreground">
            {session?.user?.email}
          </span>
          <Link href="/settings/team">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <form action="/api/auth/signout" method="POST">
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
