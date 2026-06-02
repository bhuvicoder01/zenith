"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, X, Briefcase, Users, LayoutDashboard, LogOut } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import Image from "next/image";

export default function PublicNavbar() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const { isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (!mounted) {
    return (
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50 h-20">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-muted" />
            <span className="text-xl font-black tracking-tighter uppercase">ZENITH</span>
          </div>
        </div>
      </nav>
    );
  }

  const logoSrc = resolvedTheme === "dark" ? "/zenith-dark.png" : "/zenith-light.png";

  return (
    <nav className={`border-b border-border sticky top-0 z-50 transition-colors duration-200 ${
      isOpen ? "bg-background" : "bg-background/80 backdrop-blur-xl"
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
            <Image 
              src={logoSrc} 
              alt="Zenith" 
              width={40} 
              height={40} 
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">ZENITH</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          {pathname === "/about" && (
            <a href="#features" className="hover:text-foreground transition-colors">
              Agents
            </a>
          )}
          <Link 
            href="/about" 
            className={`transition-colors ${pathname === "/about" ? "text-foreground" : "hover:text-foreground"}`}
          >
            About
          </Link>
          <Link 
            href="/public/jobs" 
            className={`transition-colors ${pathname === "/public/jobs" ? "text-foreground" : "hover:text-foreground"}`}
          >
            Explore Jobs
          </Link>
          <Link 
            href="/public/profiles" 
            className={`transition-colors ${pathname === "/public/profiles" ? "text-foreground" : "hover:text-foreground"}`}
          >
            Explore Profiles
          </Link>
        </div>

        {/* Desktop Auth/Dashboard Actions */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <Link 
              href="/dashboard" 
              className="px-5 py-2.5 bg-foreground text-background rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link 
                href="/auth/login" 
                className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/auth/register" 
                className="px-5 py-2.5 bg-foreground text-background rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Hamburger Menu Icon (Mobile) */}
        <div className="flex md:hidden items-center gap-4">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl hover:bg-secondary text-foreground transition-colors flex items-center justify-center"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 top-20 z-40 bg-white dark:bg-[#0a0a0a] md:hidden animate-in fade-in duration-200">
          <div className="flex flex-col p-6 space-y-6 h-[calc(100vh-5rem)] overflow-y-auto">
            
            {/* Primary navigation links */}
            <div className="flex flex-col space-y-2">
              {pathname === "/about" && (
                <a 
                  href="#features"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold border text-sm hover:bg-secondary/40 text-foreground border-transparent"
                >
                  <span className="w-5 h-5 flex items-center justify-center font-bold">🎯</span>
                  <span>Agents</span>
                </a>
              )}
              <Link 
                href="/about"
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold border text-sm ${
                  pathname === "/about" 
                    ? "bg-foreground text-background border-transparent" 
                    : "hover:bg-secondary/40 text-foreground border-transparent"
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center font-bold">ℹ️</span>
                <span>About</span>
              </Link>
              <Link 
                href="/public/jobs"
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold border text-sm ${
                  pathname === "/public/jobs" 
                    ? "bg-foreground text-background border-transparent" 
                    : "hover:bg-secondary/40 text-foreground border-transparent"
                }`}
              >
                <Briefcase className="w-5 h-5" />
                <span>Explore Jobs</span>
              </Link>

              <Link 
                href="/public/profiles"
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold border text-sm ${
                  pathname === "/public/profiles" 
                    ? "bg-foreground text-background border-transparent" 
                    : "hover:bg-secondary/40 text-foreground border-transparent"
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Explore Profiles</span>
              </Link>
            </div>

            {/* Auth / Account operations */}
            <div className="mt-auto pt-6 border-t border-border flex flex-col gap-4">
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/dashboard"
                    className="flex items-center justify-center gap-2 px-5 py-4 bg-foreground text-background rounded-2xl font-bold text-sm shadow-md"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Go to Dashboard</span>
                  </Link>
                  <button 
                    onClick={() => logout()}
                    className="flex items-center justify-center gap-2 px-5 py-4 bg-destructive/10 text-destructive rounded-2xl font-bold text-sm hover:bg-destructive hover:text-white transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Link 
                    href="/auth/login"
                    className="flex items-center justify-center py-4 bg-secondary text-foreground rounded-2xl font-bold text-sm border border-border/80 hover:bg-secondary/80 transition-all"
                  >
                    Login
                  </Link>
                  <Link 
                    href="/auth/register"
                    className="flex items-center justify-center py-4 bg-foreground text-background rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-sm"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </nav>
  );
}
