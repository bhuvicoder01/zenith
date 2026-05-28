"use client";

import { useState } from "react";
import { 
  Bell, Trash2, Check, CheckSquare, BellOff, ArrowRight, Sparkles, UserPlus, UserCheck, MessageSquare
} from "lucide-react";
import { useWebSocketStore, NotificationItem } from "@/store/useWebSocketStore";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const router = useRouter();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAll 
  } = useWebSocketStore();

  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread") return !n.read;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "CONNECTION_REQUEST":
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case "CONNECTION_ACCEPTED":
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      case "NEWS":
        return <Sparkles className="w-5 h-5 text-violet-500" />;
      case "NEW_MESSAGE":
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const getBorderColor = (type: string, read: boolean) => {
    if (read) return "border-border/50 bg-card/40 opacity-75";
    switch (type) {
      case "CONNECTION_REQUEST":
        return "border-blue-500/20 bg-blue-500/5 shadow-md shadow-blue-500/5";
      case "CONNECTION_ACCEPTED":
        return "border-emerald-500/20 bg-emerald-500/5 shadow-md shadow-emerald-500/5";
      case "NEWS":
        return "border-violet-500/20 bg-violet-500/5 shadow-md shadow-violet-500/5";
      case "NEW_MESSAGE":
        return "border-blue-500/20 bg-blue-500/5 shadow-md shadow-blue-500/5";
      default:
        return "border-primary/20 bg-primary/5 shadow-md shadow-primary/5";
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return "";
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    if (item.type === "CONNECTION_REQUEST" && item.data?.requester?.userId) {
      router.push(`/public/profiles/${item.data.requester.userId}`);
    } else if (item.type === "CONNECTION_ACCEPTED" && item.data?.user?.userId) {
      router.push(`/public/profiles/${item.data.user.userId}`);
    } else if (item.type === "CONNECTION_REQUEST" || item.type === "CONNECTION_ACCEPTED") {
      router.push("/dashboard/connections");
    } else if (item.type === "NEW_MESSAGE" && item.data?.senderId) {
      router.push(`/dashboard/messages?userId=${item.data.senderId}`);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight italic">
            Transmission <span className="text-muted-foreground/30 not-italic">Feed.</span>
          </h1>
          <p className="text-muted-foreground font-medium text-sm md:text-base">
            Review incoming activity alerts, network invitations, and broadcast system news.
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={markAllAsRead}
              className="px-4 py-2.5 bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm"
            >
              <CheckSquare className="w-4 h-4" /> Mark all read
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-6 border-b border-border pb-1">
        <button
          onClick={() => setFilter("all")}
          className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative ${
            filter === "all"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          All Inbox ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative ${
            filter === "unread"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Unread ({notifications.filter(n => !n.read).length})
        </button>
      </div>

      {/* Inbox List */}
      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`group flex items-start gap-4 p-5 border rounded-2xl cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 ${getBorderColor(
                n.type,
                n.read
              )}`}
            >
              {/* Icon indicator */}
              <div className="p-3 bg-card border border-border/80 rounded-xl shrink-0">
                {getIcon(n.type)}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <h4 className={`font-black text-base truncate leading-tight ${n.read ? 'text-foreground/80' : 'text-foreground'}`}>
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-muted-foreground font-semibold shrink-0">
                    {formatTime(n.timestamp)}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${n.read ? 'text-muted-foreground' : 'text-foreground/90 font-medium'}`}>
                  {n.message}
                </p>
                
                {(n.type === "CONNECTION_REQUEST" || n.type === "CONNECTION_ACCEPTED") && (
                  <div className="pt-2 flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-primary group-hover:underline">
                    Action required <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Control Triggers */}
              <div className="flex items-center gap-2 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                {!n.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(n.id);
                    }}
                    className="p-2 hover:bg-foreground/5 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Mark as read"
                  >
                    <Check className="w-4.5 h-4.5" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id);
                  }}
                  className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center border border-dashed border-border rounded-[2.5rem] flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center">
              <BellOff className="w-8 h-8 text-muted-foreground opacity-40" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold italic tracking-tight">Transmission feed empty</h2>
              <p className="text-muted-foreground text-xs max-w-sm mx-auto">
                No alerts detected. Once your Zenith connection gets request alerts or news broadcasts, they will show up here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
