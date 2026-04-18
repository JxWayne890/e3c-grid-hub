import { useState } from "react";
import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { Notification } from "@shared/types";

function fmtAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: unread } = trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 15000 });
  const { data: list } = trpc.notifications.list.useQuery({ limit: 10 }, { enabled: open });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
        <Bell className="w-4 h-4" />
        {!!unread && unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
            style={{ background: "oklch(0.65 0.20 25)" }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-surface border border-border shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-foreground text-sm font-semibold">Notifications</span>
              {!!unread && unread > 0 && (
                <button onClick={() => markAllRead.mutate()} className="text-muted-foreground hover:text-foreground text-xs">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!list || list.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-8">No notifications yet.</p>
              ) : (list as Notification[]).map((n) => (
                <button key={n.id}
                  onClick={() => { if (!n.read) markRead.mutate({ notificationId: n.id }); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 border-b border-border hover:bg-white/5 transition-colors ${
                    n.read ? "" : "bg-primary/5"
                  }`}>
                  <div className="flex items-start gap-2">
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-xs font-semibold">{n.title}</p>
                      {n.body && <p className="text-muted-foreground text-[11px] mt-0.5">{n.body}</p>}
                      <p className="text-muted-foreground text-[10px] mt-1">{fmtAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
