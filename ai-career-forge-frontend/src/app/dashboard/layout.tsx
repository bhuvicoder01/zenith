"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Bell,
  Briefcase,
  CheckCircle2,
  Compass,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sparkles,
  Sun,
  UserRound,
  Users,
  X,
  ArrowUpRight,
} from "lucide-react";
import ZenithBrand from "@/components/ZenithBrand";
import useAuthStore from "@/store/useAuthStore";
import useSyncStore from "@/store/useSyncStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";

const careerLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Your profile", icon: UserRound },
  { href: "/dashboard/jobs", label: "Discover roles", icon: Compass },
  {
    href: "/dashboard/applications",
    label: "Application tracker",
    icon: CheckCircle2,
  },
  { href: "/dashboard/portfolio", label: "Your portfolio", icon: FileText },
];
const connectLinks = [
  { href: "/community", label: "Community", icon: Users },
  { href: "/dashboard/connections", label: "Connections", icon: Users },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { syncStatus, connect, disconnect } = useSyncStore();
  const {
    notifications,
    unreadMessageCount,
    prepStatus,
    showPrepDialog,
    setShowPrepDialog,
  } = useWebSocketStore();
  const unread = notifications.filter((item) => !item.read).length;
  useEffect(() => {
    setMounted(true);
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  const currentPage =
    [...careerLinks, ...connectLinks].find((link) => link.href === pathname)
      ?.label ||
    (pathname.includes("/prep") ? "Application documents" : "Role details");
  const active = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  const sidebarContent = (
    <>
      <ZenithBrand light />
      <span className="z-sidebar-label">YOUR NEXT CHAPTER</span>
      <nav aria-label="Career navigation">
        {careerLinks.map((link) => (
          <Link
            href={link.href}
            key={link.href}
            className={active(link.href) ? "is-active" : ""}
            aria-current={active(link.href) ? "page" : undefined}
          >
            <link.icon size={18} />
            {link.label}
          </Link>
        ))}
      </nav>
      <span className="z-sidebar-label">STAY CONNECTED</span>
      <nav aria-label="Community navigation">
        {connectLinks.map((link) => (
          <Link
            href={link.href}
            key={link.href}
            className={active(link.href) ? "is-active" : ""}
            aria-current={active(link.href) ? "page" : undefined}
          >
            <link.icon size={17} />
            {link.label}
            {link.href.endsWith("/messages") && unreadMessageCount > 0 && (
              <small>{unreadMessageCount}</small>
            )}
            {link.href.endsWith("/notifications") && unread > 0 && (
              <small>{unread}</small>
            )}
          </Link>
        ))}
      </nav>
      <div className="z-app-sidebar-bottom">
        <Link href="/dashboard/profile" className="z-app-profile">
          <span className="z-avatar">
            {(user?.name || "Your profile")
              .split(" ")
              .map((word) => word[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span>
            <strong>{user?.name || "Your profile"}</strong>
            <small>Personal workspace</small>
          </span>
        </Link>
        <div>
          <button
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label="Toggle color theme"
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun size={15} />
            ) : (
              <Moon size={15} />
            )}{" "}
            Theme
          </button>
          <button
            onClick={() => {
              logout();
              router.push("/auth/login");
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </>
  );
  return (
    <div className="z-app-shell">
      <a href="#workspace-content" className="z-skip-link">
        Skip to workspace
      </a>
      <aside className="z-app-sidebar">{sidebarContent}</aside>
      <div className="z-app-body">
        <header className="z-app-topbar">
          <div className="z-app-topbar-title">
            <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <Dialog.Trigger asChild>
                <button
                  className="z-app-menu"
                  aria-label="Open workspace navigation"
                >
                  <Menu size={21} />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="z-app-overlay" />
                <Dialog.Content className="z-app-sidebar is-open">
                  <Dialog.Title className="sr-only">
                    Workspace navigation
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Move between your profile, opportunities, documents, and
                    community.
                  </Dialog.Description>
                  <Dialog.Close
                    className="absolute right-3 top-3 p-2"
                    aria-label="Close navigation"
                  >
                    <X size={18} />
                  </Dialog.Close>
                  {sidebarContent}
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <span>Workspace /</span>
            {currentPage}
          </div>
          <div className="z-app-topbar-links">
            <Link href="/demo">
              Explore demo <ArrowUpRight className="inline" size={13} />
            </Link>
            <Link
              href="/dashboard/notifications"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            >
              <Bell size={18} />
            </Link>
          </div>
        </header>
        <main
          id="workspace-content"
          className={`z-app-main ${pathname === "/dashboard/messages" ? "!p-0" : ""}`}
        >
          {(syncStatus.status === "SYNCING" ||
            syncStatus.status === "MATCHING") && (
            <div className="z-app-sync" role="status">
              <Loader2 size={17} className="animate-spin" />
              <span>
                {syncStatus.status === "MATCHING"
                  ? "Refreshing relevance scores"
                  : "Updating job sources"}
                {syncStatus.currentSkill ? ` · ${syncStatus.currentSkill}` : ""}
              </span>
              <span className="ml-auto">
                {syncStatus.progress}/{syncStatus.total}
              </span>
            </div>
          )}
          {children}
        </main>
      </div>
      {showPrepDialog && prepStatus?.step && (
        <aside className="z-prep-notice" aria-live="polite">
          <div>
            <span className="flex items-center gap-2">
              <Sparkles size={16} /> Document preparation
            </span>
            <button
              onClick={() => setShowPrepDialog(false)}
              aria-label="Dismiss preparation progress"
            >
              <X size={16} />
            </button>
          </div>
          <p>
            {prepStatus.company && (
              <strong>
                {prepStatus.company}
                <br />
              </strong>
            )}
            {prepStatus.message}
          </p>
          {prepStatus.step === "FAILED" && (
            <p role="alert">
              Preparation could not finish. You can retry from the tracker.
            </p>
          )}
          {prepStatus.step !== "COMPLETED" && prepStatus.step !== "FAILED" && (
            <Loader2 size={16} className="animate-spin" />
          )}
          {prepStatus.step === "COMPLETED" && (
            <Link href="/dashboard/applications">
              Review your documents <ArrowUpRight size={14} />
            </Link>
          )}
        </aside>
      )}
    </div>
  );
}
