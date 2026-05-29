"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Users, MessageSquare, User } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import { useState, useEffect } from "react";

export default function MobileFooterTabs() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [hasActiveChat, setHasActiveChat] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for active chat on mobile (so we can hide the footer to prevent keyboard overlapping)
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

  if (!mounted) return null;

  // Do not show navigation footer on auth pages, admin section, or when inside an active chat window
  const isAuthPage = pathname.startsWith("/auth");
  const isAdminPage = pathname.startsWith("/admin");
  
  if (isAuthPage || isAdminPage || hasActiveChat) return null;

  const tabs = [
    {
      label: "Jobs",
      href: isAuthenticated ? "/dashboard/jobs" : "/public/jobs",
      icon: Briefcase,
      activePattern: ["/public/jobs", "/dashboard/jobs"],
    },
    {
      label: "Profiles",
      href: "/public/profiles",
      icon: Users,
      activePattern: ["/public/profiles"],
    },
    {
      label: "Messages",
      href: "/dashboard/messages",
      icon: MessageSquare,
      activePattern: ["/dashboard/messages"],
    },
    {
      label: "Profile",
      href: isAuthenticated ? "/dashboard/profile" : "/auth/login",
      icon: User,
      activePattern: isAuthenticated ? ["/dashboard/profile"] : ["/auth/login", "/auth/register"],
    },
  ];

  const isTabActive = (tab: typeof tabs[0]) => {
    return tab.activePattern.some((pattern) => pathname.startsWith(pattern));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/80 backdrop-blur-xl border-t border-border/40 px-6 py-2 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.08)] animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const active = isTabActive(tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className="flex flex-col items-center justify-center py-1.5 px-3 min-w-[64px] rounded-2xl relative transition-all duration-300 active:scale-95 group"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-all duration-300 ${
                    active
                      ? "text-primary scale-110"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                {/* Active indicator dot */}
                {active && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-black uppercase tracking-widest transition-all duration-300 ${
                  active
                    ? "text-foreground"
                    : "text-muted-foreground/60 group-hover:text-foreground"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
