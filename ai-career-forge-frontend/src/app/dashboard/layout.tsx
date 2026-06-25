"use client";

import Link from "next/link";
import { 
  User, Briefcase, FileText, CheckCircle, LogOut, Menu, X, Sparkles,
  LayoutDashboard, ClipboardList, BrainCircuit, Loader2, Sun, Moon, TrendingUp, Settings,
  Users, Bell, MessageSquare, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import useAuthStore from "@/store/useAuthStore";

import AuthGuard from "@/components/AuthGuard";

import useSyncStore from "@/store/useSyncStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import api, { BACKEND_URL } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const getPhotoUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) {
      return url;
    }
    const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
    return `${BACKEND_URL}/public/assets/${cleanUrl}`;
  };

  // Global SSE connection for sync status
  const { syncStatus, connect, disconnect } = useSyncStore();
  const isSyncing = syncStatus.status === 'SYNCING' || syncStatus.status === 'MATCHING';

  // Global WebSocket connection for notifications & messages
  const { 
    connect: connectWebSocket, 
    disconnect: disconnectWebSocket,
    loadSavedNotifications,
    notifications,
    unreadMessageCount,
    prepStatus,
    setPrepStatus,
    showPrepDialog,
    setShowPrepDialog
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
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
    };
    
    handleResize();
    
    // Set default collapse state on mount
    const width = window.innerWidth;
    if (width > 768 && width <= 1024) {
      setIsCollapsed(true);
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
          <nav 
            className={`flex navbar ${isMobile ? 'flex-row items-center px-4 py-3 w-full border-b' : 'flex-col border-r'} justify-between bg-card border-border transition-all duration-300`}
            style={!isMobile ? { '--navbar-width': isCollapsed ? '80px' : '260px' } as React.CSSProperties : {}}
          >
          
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
                <h1 className="text-xl font-black italic tracking-tight uppercase leading-none text-foreground">
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
            <div className={`pt-6 pb-2 flex ${isCollapsed ? 'flex-col gap-6 px-2' : 'px-8 flex-row'} items-center justify-between w-full`}>
              <Link href="/" className="flex nav-logo items-center gap-3 hover:opacity-80 transition-opacity group">
                {isCollapsed ? (
                  <div className="w-8 h-8 relative group-hover:scale-110 transition-transform duration-500">
                    <Image 
                      src="/zenith-icon.png" 
                      alt="Zenith" 
                      width={32} 
                      height={32} 
                      className="w-auto h-auto"
                      priority
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-[100px] group-hover:scale-105 transition-transform duration-500">
                    <Image 
                      src={mounted && resolvedTheme === 'dark' ? "/zenith-dark.png" : "/zenith-light.png"} 
                      alt="Zenith" 
                      width={100} 
                      height={38} 
                      className="w-auto h-auto" 
                      priority
                    />
                  </div>
                )}
              </Link>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-xl bg-secondary/40 hover:bg-foreground hover:text-background text-muted-foreground border border-border/40 hover:border-transparent transition-all duration-300 active:scale-95 group shrink-0 flex items-center justify-center shadow-sm"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-0.5" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 transition-transform duration-500 group-hover:-translate-x-0.5" />
                )}
              </button>
            </div>
          )}

          {!isMobile && (
            <>
              {/* Scrollable nav links */}
              <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar mt-6 space-y-1.5 nav-links px-2 w-full">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href}
                    href={link.href} 
                    className={`relative flex items-center gap-3 rounded-xl transition-all font-bold border group ${
                      isCollapsed ? "justify-center p-3" : "px-4 py-2.5"
                    } ${
                      pathname === link.href 
                        ? "bg-foreground text-background border-transparent shadow-lg" 
                        : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground border-transparent"
                    }`}
                  >
                    <link.icon className="w-5 h-5 shrink-0" /> 
                    {!isCollapsed && <span>{link.label}</span>}
                    
                    {isCollapsed && (
                      <span className="absolute left-full ml-4 px-2 py-1 bg-foreground text-background text-xs rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-[1200] shadow-md font-bold">
                        {link.label}
                      </span>
                    )}
                    
                    {link.href === "/dashboard/notifications" && unreadCount > 0 && (
                      isCollapsed ? (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
                      ) : (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse transition-colors ${
                          pathname === link.href 
                            ? "bg-background text-foreground" 
                            : "bg-primary text-background"
                        }`}>
                          {unreadCount}
                        </span>
                      )
                    )}
                    {link.href === "/dashboard/connections" && pendingCount > 0 && (
                      isCollapsed ? (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                      ) : (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
                          pathname === link.href 
                            ? "bg-background text-foreground" 
                            : "bg-primary text-background"
                        }`}>
                          {pendingCount}
                        </span>
                      )
                    )}
                    {link.href === "/dashboard/messages" && unreadMessageCount > 0 && (
                      isCollapsed ? (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
                      ) : (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
                          pathname === link.href 
                            ? "bg-background text-foreground" 
                            : "bg-primary text-background"
                        }`}>
                          {unreadMessageCount}
                        </span>
                      )
                    )}
                  </Link>
                ))}
              </div>
              
              {/* Sticky Footer */}
              <div className="mt-auto space-y-4 pt-4 pb-4 border-t border-border/50 w-full px-2 shrink-0">
                <Link 
                  href="/dashboard/profile"
                  className={`flex items-center gap-3 rounded-2xl hover:bg-secondary/50 transition-all group relative ${
                    isCollapsed ? 'justify-center p-2' : 'p-2'
                  }`}
                  title={isCollapsed ? (profile?.fullName || user?.name || "ZENITH User") : undefined}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-border group-hover:border-primary/50 transition-colors relative shrink-0">
                    {profile?.profilePhotoUrl ? (
                      <Image 
                        src={getPhotoUrl(profile.profilePhotoUrl)} 
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
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black truncate text-foreground">{profile?.fullName || user?.name || "ZENITH User"}</div>
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">{profile?.headline || "Professional"}</div>
                    </div>
                  )}
                  {isCollapsed && (
                    <span className="absolute left-full ml-4 px-2 py-1 bg-foreground text-background text-xs rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-[1200] shadow-md font-bold">
                      {profile?.fullName || user?.name || "ZENITH User"}
                    </span>
                  )}
                </Link>

                <div className={`flex ${isCollapsed ? 'flex-col items-center gap-4' : 'items-center justify-between px-2 w-full'}`}>
                  <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-muted-foreground shrink-0" />
                      {!isCollapsed && (
                        <div>
                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Ops</div>
                            <div className="text-xl font-black text-foreground">{apps.filter(a => a.status === 'APPLIED' || a.status === 'INTERVIEW').length}</div>
                        </div>
                      )}
                  </div>
                  
                  {isCollapsed && (
                    <div className="text-[10px] font-black text-foreground bg-secondary px-2 py-0.5 rounded-full" title="Active Ops">
                      {apps.filter(a => a.status === 'APPLIED' || a.status === 'INTERVIEW').length}
                    </div>
                  )}
                  
                  <button 
                    onClick={handleLogout}
                    className="p-3 rounded-xl hover:bg-destructive/10 text-destructive transition-colors shrink-0"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
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
              className={`fixed left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-[#0a0a0a] border-r border-border p-6 flex flex-col overflow-y-auto no-scrollbar transition-transform duration-300 ease-in-out ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
                  <div className="flex items-center justify-between mb-6 shrink-0">
                    <Link href="/" className="hover:opacity-80 transition-opacity block w-fit">
                      <Image 
                        src={mounted && resolvedTheme === 'dark' ? "/zenith-dark.png" : "/zenith-light.png"} 
                        alt="Zenith" 
                        width={100} 
                        height={38} 
                        className="w-auto h-auto" 
                        priority
                      />
                    </Link>
                    <button
                      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                      className="p-2.5 rounded-xl bg-secondary/50 border border-border text-foreground hover:bg-secondary transition-all active:scale-95 flex items-center justify-center shadow-sm"
                      title="Switch Theme"
                    >
                      {resolvedTheme === "dark" ? (
                        <Sun className="w-4 h-4 text-orange-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-blue-500" />
                      )}
                    </button>
                  </div>

              <div className="flex flex-col space-y-4">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href}
                    href={link.href} 
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold border ${
                        pathname === link.href 
                          ? "bg-foreground text-background border-transparent shadow-lg" 
                          : "hover:bg-secondary text-muted-foreground hover:text-foreground border-transparent"
                      }`}
                  >
                    <link.icon className="w-6 h-6" /> 
                    <span>{link.label}</span>
                    {link.href === "/dashboard/notifications" && unreadCount > 0 && (
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black transition-colors ${
                        pathname === link.href
                          ? "bg-background text-foreground"
                          : "bg-primary text-background"
                      }`}>
                        {unreadCount}
                      </span>
                    )}
                    {link.href === "/dashboard/connections" && pendingCount > 0 && (
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black transition-colors ${
                        pathname === link.href
                          ? "bg-background text-foreground"
                          : "bg-primary text-background"
                      }`}>
                        {pendingCount}
                      </span>
                    )}
                    {link.href === "/dashboard/messages" && unreadMessageCount > 0 && (
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black transition-colors ${
                        pathname === link.href
                          ? "bg-background text-foreground"
                          : "bg-primary text-background"
                      }`}>
                        {unreadMessageCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-border flex flex-col gap-6">
                <Link 
                  href="/dashboard/profile"
                  className="flex items-center gap-3 p-2 rounded-2xl bg-secondary/40 border border-border/50"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-border relative">
                    {profile?.profilePhotoUrl ? (
                      <Image 
                        src={getPhotoUrl(profile.profilePhotoUrl)} 
                        alt="Profile" 
                        fill 
                        className="object-cover" 
                        sizes="40px"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black truncate text-foreground">{profile?.fullName || user?.name || "User"}</div>
                    <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest truncate">{profile?.headline || "Pro"}</div>
                  </div>
                </Link>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-muted-foreground" />
                      <div>
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active</div>
                          <div className="text-lg font-black text-foreground">{apps.filter(a => a.status === 'APPLIED' || a.status === 'INTERVIEW').length}</div>
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
            : `p-4 md:p-6 lg:p-8 ${isMobile ? 'pb-24' : ''} overflow-y-auto`
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

      {/* Floating Global Progress Card */}
      {showPrepDialog && prepStatus && prepStatus.step && (
        <div className="fixed bottom-6 right-6 z-[9999] w-[350px] bg-card/90 backdrop-blur-lg border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 border-zinc-200 dark:border-zinc-800">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-foreground fill-current animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-foreground">
                AI Tailoring Engine
              </span>
            </div>
            <button 
              onClick={() => setShowPrepDialog(false)}
              className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
              title="Dismiss tracker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-1">
            <h4 className="text-sm font-black text-foreground truncate">
              {prepStatus.company ? `Job: ${prepStatus.company}` : "Preparing Materials"}
            </h4>
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
              {prepStatus.step !== "COMPLETED" && prepStatus.step !== "FAILED" && (
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              )}
              {prepStatus.message}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  prepStatus.step === "FAILED" 
                    ? "bg-red-500" 
                    : prepStatus.step === "COMPLETED" 
                      ? "bg-green-500" 
                      : "bg-foreground dark:bg-white"
                }`}
                style={{ width: `${getPrepPercent(prepStatus.step)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-muted-foreground">
              <span>{prepStatus.step}</span>
              <span>{getPrepPercent(prepStatus.step)}%</span>
            </div>
          </div>

          {/* Error Message if Failed */}
          {prepStatus.step === "FAILED" && prepStatus.error && (
            <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-[10px] text-red-600 dark:text-red-400 font-bold leading-normal max-h-[80px] overflow-y-auto">
              {prepStatus.error}
            </div>
          )}

          {/* Actions */}
          {prepStatus.step === "COMPLETED" && (
            <button
              onClick={() => {
                setPrepStatus(null);
                router.push("/dashboard/applications");
              }}
              className="w-full bg-foreground hover:bg-foreground/90 text-background py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              View Application
            </button>
          )}
        </div>
      )}
    </>
  );

  function getPrepPercent(step: string) {
    switch (step) {
      case "STARTING": return 25;
      case "AI_GENERATION": return 50;
      case "PDF_RENDERING": return 75;
      case "COMPLETED": return 100;
      case "FAILED": return 100;
      default: return 10;
    }
  }
}
