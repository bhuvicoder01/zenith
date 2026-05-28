"use client";

import Link from "next/link";
import { 
  User, Briefcase, FileText, CheckCircle, LogOut, Menu, X,
  LayoutDashboard, ClipboardList, BrainCircuit, Loader2, Sun, Moon, TrendingUp, Settings,
  Users, Bell, MessageSquare
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import useAuthStore from "@/store/useAuthStore";

import AuthGuard from "@/components/AuthGuard";

import useSyncStore from "@/store/useSyncStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import api from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  // Global SSE connection for sync status
  const { syncStatus, connect, disconnect } = useSyncStore();
  const isSyncing = syncStatus.status === 'SYNCING' || syncStatus.status === 'MATCHING';

  // Global WebSocket connection for notifications & messages
  const { 
    connect: connectWebSocket, 
    disconnect: disconnectWebSocket,
    loadSavedNotifications,
    notifications,
    unreadMessageCount
  } = useWebSocketStore();

  const unreadCount = notifications.filter(n => !n.read).length;
  const [pendingCount, setPendingCount] = useState(0);

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch and fetch data
  useEffect(() => {
    setMounted(true);
    fetchApps();
    fetchProfile();
  }, []);

  const fetchApps = async () => {
    try {
      const res = await api.get("/applications");
      setApps(res.data);
    } catch (err) {
      console.error("DashboardLayout: Failed to fetch apps:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile");
      setProfile(res.data);
    } catch (err) {
      console.error("DashboardLayout: Failed to fetch profile:", err);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Connect SSE stream once at layout level — survives page navigation
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Connect WebSocket channel once at layout level
  useEffect(() => {
    loadSavedNotifications();
    connectWebSocket((url: string) => router.push(url));
    return () => disconnectWebSocket();
  }, [connectWebSocket, disconnectWebSocket, loadSavedNotifications, router]);

  // Fetch pending connection count on mount and when connection notifications change
  useEffect(() => {
    const fetchPendingConnectionsCount = async () => {
      try {
        const res = await api.get("/connections/pending");
        setPendingCount(res.data.length);
      } catch (err) {
        console.error("Failed to fetch pending connections:", err);
      }
    };

    fetchPendingConnectionsCount();
  }, [notifications]);

  // Close sidebar when clicking a link (on mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Listen for custom toggle-sidebar events
  useEffect(() => {
    const handleToggle = () => {
      setIsSidebarOpen(prev => !prev);
    };
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/connections", label: "Connections", icon: Users },
    { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/jobs", label: "Job Matches", icon: Briefcase },
    { href: "/dashboard/applications", label: "Tracker", icon: CheckCircle },
    // { href: "/dashboard/profile", label: "Profile", icon: User },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const [hasActiveChat, setHasActiveChat] = useState(false);

  useEffect(() => {
    const checkChat = () => {
      if (typeof window !== "undefined") {
        const query = new URLSearchParams(window.location.search);
        setHasActiveChat(pathname === "/dashboard/messages" && !!query.get("userId"));
      }
    };
    checkChat();
    const interval = setInterval(checkChat, 100);
    return () => clearInterval(interval);
  }, [pathname]);

  const getPageTitle = () => {
    if (pathname === "/dashboard/messages") return "Conversations";
    if (pathname === "/dashboard/profile") return "Profile";
    const currentLink = navLinks.find(link => link.href === pathname);
    return currentLink ? currentLink.label : "Dashboard";
  };

  return (
    <>
      <div className={`flexbox ${isMobile ? 'flex-col' : ''}`}>
        {/* Desktop Sidebar / Mobile Top Bar */}
        {!(isMobile && pathname === "/dashboard/messages" && hasActiveChat) && (
          <nav className={`flex navbar ${isMobile ? 'flex-row items-center px-4 py-3 w-full border-b' : 'flex-col border-r'} justify-between bg-card border-border`}>
          
          {isMobile ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-xl hover:bg-secondary text-foreground transition-colors flex items-center justify-center"
                  aria-label="Toggle Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-black italic tracking-tight uppercase leading-none">
                  {getPageTitle()}
                </h1>
              </div>
              <Link href="/" className="max-w-[80px] hover:opacity-80 transition-opacity flex items-center justify-center shrink-0">
                <Image 
                  src={mounted && resolvedTheme === 'dark' ? "/zenith-dark.png" : "/zenith-light.png"} 
                  alt="Zenith" 
                  width={70} 
                  height={26} 
                  className="w-auto h-auto opacity-70" 
                  priority
                />
              </Link>
            </div>
          ) : (
            <div className="pt-10 px-8 pb-4">
              <Link href="/" className="flex nav-logo items-center gap-3 hover:opacity-80 transition-opacity group">
                <div className="w-full max-w-[120px] group-hover:scale-105 transition-transform duration-500">
                  <Image 
                    src={mounted && resolvedTheme === 'dark' ? "/zenith-dark.png" : "/zenith-light.png"} 
                    alt="Zenith" 
                    width={100} 
                    height={38} 
                    className="w-auto h-auto" 
                    priority
                  />
                </div>
              </Link>
            </div>
          )}

          {!isMobile && (
            <div className="flex flex-col flex-1 mt-10 space-y-3 nav-links px-2">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold border ${
                    pathname === link.href 
                      ? "bg-foreground text-background border-transparent shadow-lg" 
                      : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground border-transparent"
                  }`}
                >
                  <link.icon className="w-5 h-5" /> 
                  <span>{link.label}</span>
                  {link.href === "/dashboard/notifications" && unreadCount > 0 && (
                    <span className="ml-auto px-2 py-0.5 bg-primary text-background rounded-full text-[10px] font-black animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                  {link.href === "/dashboard/connections" && pendingCount > 0 && (
                    <span className="ml-auto px-2 py-0.5 bg-primary text-background rounded-full text-[10px] font-black">
                      {pendingCount}
                    </span>
                  )}
                  {link.href === "/dashboard/messages" && unreadMessageCount > 0 && (
                    <span className="ml-auto px-2 py-0.5 bg-primary text-background rounded-full text-[10px] font-black">
                      {unreadMessageCount}
                    </span>
                  )}
                </Link>
              ))}
              
              <div className="mt-auto space-y-6 pt-6 border-t border-border/50">
                <Link 
                  href="/dashboard/profile"
                  className="flex items-center gap-3 p-2 rounded-2xl hover:bg-secondary/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-border group-hover:border-primary/50 transition-colors relative">
                    {profile?.profilePhotoUrl ? (
                      <Image 
                        src={profile.profilePhotoUrl} 
                        alt="Profile" 
                        fill 
                        className="object-cover" 
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black truncate text-foreground">{profile?.fullName || user?.name || "ZENITH User"}</div>
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">{profile?.headline || "Professional"}</div>
                    </div>
                </Link>

                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-muted-foreground" />
                      <div>
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Ops</div>
                          <div className="text-xl font-black text-foreground">{apps.filter(a => a.status === 'APPLIED' || a.status === 'INTERVIEW').length}</div>
                      </div>
                  </div>
                  
                  <button 
                    onClick={handleLogout}
                    className="p-3 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </nav>
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && (
          <div 
            className={`fixed inset-0 z-[1100] transition-opacity duration-300 ${
              isSidebarOpen ? 'bg-black/40 backdrop-blur-sm opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsSidebarOpen(false)}
          >
            <div 
              className={`fixed left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-[#0a0a0a] border-r border-border p-6 flex flex-col transition-transform duration-300 ease-in-out ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
                  <Link href="/" className="hover:opacity-80 transition-opacity block mb-6 shrink-0 w-fit">
                    <Image 
                      src={mounted && resolvedTheme === 'dark' ? "/zenith-dark.png" : "/zenith-light.png"} 
                      alt="Zenith" 
                      width={100} 
                      height={38} 
                      className="w-auto h-auto" 
                    />
                  </Link>

              <div className="flex flex-col space-y-4">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href}
                    href={link.href} 
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold border ${
                      pathname === link.href 
                        ? "bg-foreground text-background border-transparent shadow-lg" 
                        : "hover:bg-white/5 text-secondary-foreground/70 border-transparent"
                    }`}
                  >
                    <link.icon className="w-6 h-6" /> 
                    <span>{link.label}</span>
                    {link.href === "/dashboard/notifications" && unreadCount > 0 && (
                      <span className="ml-auto px-2 py-0.5 bg-white text-black dark:bg-black dark:text-white rounded-full text-[9px] font-black">
                        {unreadCount}
                      </span>
                    )}
                    {link.href === "/dashboard/connections" && pendingCount > 0 && (
                      <span className="ml-auto px-2 py-0.5 bg-white text-black dark:bg-black dark:text-white rounded-full text-[9px] font-black">
                        {pendingCount}
                      </span>
                    )}
                    {link.href === "/dashboard/messages" && unreadMessageCount > 0 && (
                      <span className="ml-auto px-2 py-0.5 bg-white text-black dark:bg-black dark:text-white rounded-full text-[9px] font-black">
                        {unreadMessageCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-6">
                <Link 
                  href="/dashboard/profile"
                  className="flex items-center gap-3 p-2 rounded-2xl bg-white/5"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 relative">
                    {profile?.profilePhotoUrl ? (
                      <Image 
                        src={profile.profilePhotoUrl} 
                        alt="Profile" 
                        fill 
                        className="object-cover" 
                        sizes="40px"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <User className="w-5 h-5 text-white/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black truncate text-white">{profile?.fullName || user?.name || "User"}</div>
                    <div className="text-[8px] font-black text-white/40 uppercase tracking-widest truncate">{profile?.headline || "Pro"}</div>
                  </div>
                </Link>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-white/50" />
                      <div>
                          <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active</div>
                          <div className="text-lg font-black text-white">{apps.filter(a => a.status === 'APPLIED' || a.status === 'INTERVIEW').length}</div>
                      </div>
                  </div>
                  
                  <button 
                    onClick={handleLogout}
                    className="p-3 rounded-xl bg-red-500/10 text-red-500 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        <main className={`flex-1 bg-background w-full ${
          pathname === "/dashboard/messages" 
            ? "p-0 overflow-hidden" 
            : `${isMobile ? 'p-4' : 'p-8'} overflow-y-auto`
        }`}>
          {/* Global sync status indicator */}
          {isSyncing && (
            <div className="mb-6 flex position-sticky items-center gap-3 bg-secondary border border-border text-foreground px-5 py-3 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-black">
                  {syncStatus.status === 'MATCHING' ? 'Skill Matching Engine' : 'Agent Synchronization'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {syncStatus.status === 'MATCHING' ? 'Matching ' : 'Syncing '} 
                  {syncStatus.currentSkill || 'roles'}... ({syncStatus.progress}/{syncStatus.total})
                </p>
              </div>
              <div className="text-xs font-mono bg-foreground/5 px-2 py-1 rounded-lg border border-border">
                {syncStatus.progress}/{syncStatus.total}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

    </>
  );
}
