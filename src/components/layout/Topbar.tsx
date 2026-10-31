import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Command, LogOut, Menu, Moon, PanelLeft, Search, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useAppStore } from "@/store/useAppStore";
import { leaveApi, type NotificationItem } from "@/api/leave";
import { parseServerDate } from "@/components/leave/leave-ui";

export function Topbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { darkMode, toggleDarkMode, toggleSidebar, user, logout } = useAppStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const qc = useQueryClient();
  const notificationsQ = useQuery({
    queryKey: ["leave", "notifications"],
    queryFn: leaveApi.notifications,
    enabled: !!user,
    refetchInterval: 60_000,
    retry: false,
  });
  const notifications = notificationsQ.data?.items ?? [];
  const unread = notificationsQ.data?.unread ?? 0;

  const openNotification = async (n: NotificationItem) => {
    try {
      if (!n.read) await leaveApi.readNotification(n.id);
    } catch {
      // Marking as read is best-effort; navigation should still happen.
    }
    qc.invalidateQueries({ queryKey: ["leave", "notifications"] });
    if (n.link?.startsWith("/")) navigate({ to: n.link });
  };

  const readAll = async () => {
    try {
      await leaveApi.readAllNotifications();
    } finally {
      qc.invalidateQueries({ queryKey: ["leave", "notifications"] });
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="glass-panel sticky top-0 z-30 flex h-16 items-center gap-3 rounded-none border-x-0 border-t-0 px-4 md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobile}>
        <Menu className="size-5" />
      </Button>
      <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={toggleSidebar}>
        <PanelLeft className="size-5" />
      </Button>

      <form
        className="relative hidden max-w-md flex-1 md:block"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) navigate({ to: "/people" });
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="global-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, cameras, events…"
          className="bg-background/60 pr-16 pl-9"
        />
        <kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground lg:flex">
          <Command className="size-3" />K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} aria-label="Toggle theme">
          {darkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-5" />
              {unread > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span className="flex items-center gap-2">Notifications <Badge variant="secondary">{unread}</Badge></span>
              {unread > 0 && (
                <button type="button" className="text-xs font-normal text-primary hover:underline" onClick={readAll}>Mark all read</button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {notificationsQ.isError ? "Notifications unavailable" : "You're all caught up"}
                </p>
              )}
              {notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5" onClick={() => openNotification(n)}>
                  <span className={`text-sm ${n.read ? "text-muted-foreground" : "font-medium"}`}>{n.title}</span>
                  {n.message && <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>}
                  <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(parseServerDate(n.created_at), { addSuffix: true })}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-full border bg-background/60 py-1 pr-3 pl-1 transition-colors hover:bg-accent">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {user?.name?.slice(0, 2).toUpperCase() ?? "OP"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm">{user?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{user?.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <User className="mr-2 size-4" /> Account settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="mr-2 size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}