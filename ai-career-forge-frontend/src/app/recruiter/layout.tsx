"use client";

import Link from "next/link";
import { 
  Users, Briefcase, LayoutDashboard, LogOut, Menu, X, 
  Settings, Bell, Search, PlusCircle, PieChart, PanelLeftClose, PanelLeftOpen,
  Sun, Moon
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import useAuthStore from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
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
    { href: "/recruiter/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/recruiter/jobs", label: "My Postings", icon: Briefcase },
    { href: "/recruiter/applicants", label: "Talent Pool", icon: Users },
    { href: "/recruiter/analytics", label: "Insights", icon: PieChart },
    { href: "/recruiter/settings", label: "Settings", icon: Settings },
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
              <Link href="/recruiter/dashboard" className="hover:opacity-80 transition-opacity">
                <Image 
                  src="/zenith-icon.png" 
                  alt="Zenith" 
                  width={32} 
                  height={32} 
                  className="w-auto h-auto dark:invert-0 invert"
                />
              </Link>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div>
                  <Link href="/recruiter/dashboard" className="flex items-center gap-3">
                    <Image 
                      src={resolvedTheme === 'dark' ? "/zenith-dark.png" : "/zenith-light.png"} 
                      alt="Zenith" 
                      width={120} 
                      height={40} 
                      className="w-auto h-auto"
                    />
                  </Link>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2">Recruitment Terminal</p>
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
                    ? "bg-foreground text-background border-transparent shadow-lg" 
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

          <div className="mt-auto pt-4 border-t border-border w-full shrink-0">
            <div className={`flex items-center gap-3 rounded-2xl bg-secondary/30 mb-4 ${
              isCollapsed ? 'justify-center p-2' : 'p-3'
            }`} title={isCollapsed ? (user?.name || "Recruiter") : undefined}>
              <div className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center font-black shrink-0">
                {user?.name?.[0] || 'R'}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate text-foreground">{user?.name || "Recruiter"}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest truncate">Talent Acquisition</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleLogout}
              className={`flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm ${
                isCollapsed ? 'p-3 w-12 h-12 mx-auto' : 'w-full gap-2 py-3 text-xs font-black uppercase tracking-widest'
              }`}
              title="Terminate Session"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Terminate Session</span>}
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
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary"
            >
              {isSidebarOpen ? <X /> : <Menu />}
            </button>
            <div className="hidden md:flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl border border-border w-64 lg:w-96">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search candidates or jobs..." 
                className="bg-transparent border-none focus:outline-none text-sm w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
             <button className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>
             </button>
             <Link 
               href="/recruiter/jobs/new"
               className="hidden md:flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-foreground/10"
             >
                <PlusCircle className="w-4 h-4" /> Post New Mission
             </Link>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8 w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
