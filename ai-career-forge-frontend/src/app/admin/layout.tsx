"use client";

import Link from "next/link";
import { 
  ShieldCheck, Users, Settings, LogOut, Menu, X, 
  Database, Activity, Lock, Search, Bell, Grid, PanelLeftClose, PanelLeftOpen,
  Sun, Moon, Briefcase
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import useAuthStore from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const { setTheme, resolvedTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
    };
    
    handleResize();
    
    // Set default collapse state on mount for medium/tablet screens
    const width = window.innerWidth;
    if (width >= 1024 && width <= 1280) {
      setIsCollapsed(true);
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const navLinks = [
    { href: "/admin/dashboard", label: "Control Center", icon: Grid },
    { href: "/admin/users", label: "User Directory", icon: Users },
    { href: "/admin/jobs", label: "Job Nexus", icon: Briefcase },
    { href: "/admin/security", label: "Access Protocols", icon: Lock },
    { href: "/admin/system", label: "Core Services", icon: Database },
    { href: "/admin/logs", label: "Activity Logs", icon: Activity },
    { href: "/admin/settings", label: "Global Settings", icon: Settings },
  ];

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background font-sans">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="flex flex-col h-full p-6">
          <div className={`mb-6 flex ${isCollapsed ? 'flex-col gap-6 items-center' : 'flex-row items-center justify-between'} w-full shrink-0`}>
            {isCollapsed ? (
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-blue-500" />
                  <div>
                     <p className="text-sm font-black uppercase tracking-tighter text-foreground">ZENITH Admin</p>
                     <div className="flex items-center gap-1.5 pt-0.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Root Authority</span>
                     </div>
                  </div>
                </div>
                <button
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="lg:hidden p-2.5 rounded-xl bg-secondary/50 border border-border text-foreground hover:bg-secondary transition-all active:scale-95 flex items-center justify-center shadow-sm"
                  title="Switch Theme"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="w-4 h-4 text-orange-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-blue-500" />
                  )}
                </button>
              </div>
            )}
            {!isMobile && (
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
            )}
          </div>

          <nav className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 w-full my-2 py-1">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-3 rounded-xl transition-all font-bold border group ${
                  isCollapsed ? "justify-center p-3" : "px-4 py-2.5"
                } ${
                  pathname === link.href 
                    ? "bg-blue-600 text-white border-transparent shadow-lg shadow-blue-600/20" 
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground border-transparent"
                }`}
              >
                <link.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{link.label}</span>}
                
                {isCollapsed && (
                  <span className="absolute left-full ml-4 px-2 py-1 bg-foreground text-background text-xs rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-[1200] shadow-md font-bold">
                    {link.label}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-4 w-full shrink-0">
            <button 
              onClick={handleLogout}
              className={`flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm ${
                isCollapsed ? 'p-3 w-12 h-12 mx-auto' : 'w-full gap-2 py-2.5 text-xs font-black uppercase tracking-widest shadow-sm'
              }`}
              title="Deauthorize"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Deauthorize</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div 
        className="flex-1 w-full overflow-hidden transition-all duration-300"
        style={{ paddingLeft: isMobile ? '0px' : (isCollapsed ? '80px' : '288px') }}
      >
        <header className="h-20 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 lg:px-8 flex items-center justify-between">
           <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary"
            >
              {isSidebarOpen ? <X /> : <Menu />}
            </button>
            <div className="flex-1 max-w-xl mx-4 hidden md:block">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search global directory (UID, Email, IP)..." 
                    className="w-full bg-secondary/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
               </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">System Status</p>
                  <p className="text-xs font-black text-green-500 uppercase">Optimal Performance</p>
               </div>
               <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-background">3</span>
               </div>
            </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8 w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
