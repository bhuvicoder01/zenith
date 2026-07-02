"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, Users, MessageSquare, Bell, User, LayoutDashboard } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocketStore } from "@/store/useWebSocketStore";

interface Tab {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  activePattern: string[];
  isExact?: boolean;
}

export default function MobileFooterTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { unreadMessageCount, notifications } = useWebSocketStore();
  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const [mounted, setMounted] = useState(false);
  const [hasActiveChat, setHasActiveChat] = useState(false);
  const [centerTabIndex, setCenterTabIndex] = useState(2); // Default to Dashboard (index 2)
  const [slideOffset, setSlideOffset] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Swipe tracking
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isSwiping = useRef(false);
  const preventClick = useRef(false);
  const centerIndex = 3; // Middle of 7 tabs (0-indexed)

  useEffect(() => {
    setMounted(true);
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
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

  // All available tabs in order
  const allTabs: Tab[] = [
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
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      activePattern: ["/dashboard"],
      isExact: true,
    },
    {
      label: "Messages",
      href: "/dashboard/messages",
      icon: MessageSquare,
      activePattern: ["/dashboard/messages"],
    },
    {
      label: "Alerts",
      href: "/dashboard/notifications",
      icon: Bell,
      activePattern: ["/dashboard/notifications"],
    },
    {
      label: "Profile",
      href: isAuthenticated ? "/dashboard/profile" : "/auth/login",
      icon: User,
      activePattern: isAuthenticated ? ["/dashboard/profile"] : ["/auth/login", "/auth/register"],
    },
  ];

  const VISIBLE_COUNT = 5;

  const isTabActive = useCallback((tab: Tab) => {
    if (tab.isExact) {
      return tab.activePattern.some((pattern) => pathname === pattern);
    }
    return tab.activePattern.some((pattern) => pathname.startsWith(pattern));
  }, [pathname]);

  // Auto-update center index when pathname or authentication state changes
  useEffect(() => {
    const activeIndex = allTabs.findIndex(t => isTabActive(t));
    if (activeIndex >= 0) {
      setCenterTabIndex(activeIndex);
    }
    // Route navigation completed, clear loading state
    setIsRouteLoading(false);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
  }, [pathname, isAuthenticated, isTabActive]);

  const getShortestOffset = useCallback((from: number, to: number, total: number) => {
    let diff = to - from;
    if (diff > total / 2) {
      diff -= total;
    } else if (diff < -total / 2) {
      diff += total;
    }
    return diff;
  }, []);

  const handleTabClick = (e: React.MouseEvent, tab: Tab, visibleIndex: number) => {
    e.preventDefault();
    if (isTransitioning || isRouteLoading) return;

    const offset = visibleIndex - centerIndex; // visibleIndex - 3
    if (offset === 0) {
      router.push(tab.href);
      return;
    }

    const len = allTabs.length;
    const newCenter = (centerTabIndex + offset + len) % len;

    setIsTransitioning(true);
    setSlideOffset(offset);

    setTimeout(() => {
      setIsTransitioning(false);
      setCenterTabIndex(newCenter);
      setSlideOffset(0);
      setDragOffset(0);

      // Start page load tracking
      setIsRouteLoading(true);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(() => {
        setIsRouteLoading(false);
      }, 8000); // 8 seconds fail-safe fallback

      router.push(tab.href);
    }, 350);
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    isSwiping.current = true;
    preventClick.current = false;
    setIsTransitioning(false); // disable transitions while dragging
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    const currentX = e.touches[0].clientX;
    touchEndX.current = currentX;

    const diffPx = touchStartX.current - currentX;
    const width = typeof window !== "undefined" ? window.innerWidth : 375;
    const diffPercent = (diffPx / width) * 100;

    // Clamp the drag offset to ±30% to keep it responsive
    const clampedPercent = Math.max(-30, Math.min(30, diffPercent));
    setDragOffset(clampedPercent);
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    isSwiping.current = false;

    const threshold = 10; // 10% of viewport width
    const len = allTabs.length;

    let offset = 0;
    if (dragOffset > threshold) {
      preventClick.current = true;
      offset = 1;
    } else if (dragOffset < -threshold) {
      preventClick.current = true;
      offset = -1;
    }

    // If it's a tap or negligible drag (less than 2% viewport width), treat as pure tap
    if (offset === 0 && Math.abs(dragOffset) < 2) {
      setDragOffset(0);
      return;
    }

    const newCenter = (centerTabIndex + offset + len) % len;

    setIsTransitioning(true);
    setSlideOffset(offset);
    setDragOffset(0);

    setTimeout(() => {
      setIsTransitioning(false);
      setCenterTabIndex(newCenter);
      setSlideOffset(0);
      setDragOffset(0);
      if (newCenter !== centerTabIndex) {
        const centerTab = allTabs[newCenter];
        if (centerTab) {
          // Start page load tracking
          setIsRouteLoading(true);
          if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = setTimeout(() => {
            setIsRouteLoading(false);
          }, 8000); // 8 seconds fail-safe fallback

          router.push(centerTab.href);
        }
      }
    }, 350);
  };

  if (!mounted) return null;

  // Do not show navigation footer on auth pages, admin section, or when inside an active chat window
  const isAuthPage = pathname.startsWith("/auth");
  const isAdminPage = pathname.startsWith("/admin");

  if (isAuthPage || isAdminPage || hasActiveChat || !isAuthenticated) return null;

  const len = allTabs.length;
  const visibleTabs = [
    allTabs[(centerTabIndex - 3 + len) % len],
    allTabs[(centerTabIndex - 2 + len) % len],
    allTabs[(centerTabIndex - 1 + len) % len],
    allTabs[centerTabIndex],
    allTabs[(centerTabIndex + 1) % len],
    allTabs[(centerTabIndex + 2) % len],
    allTabs[(centerTabIndex + 3) % len],
  ];

  const renderTab = (tab: Tab, visibleIndex: number) => {
    const active = isTabActive(tab);
    const Icon = tab.icon;
    
    // During active transition/drag, target index determines which tab is highlighted/raised
    const isCenter = visibleIndex === (centerIndex + slideOffset);
    const showRevolvingGlow = isCenter && (isTransitioning || isRouteLoading);

    return (
      <Link
        key={`${tab.label}-${visibleIndex}`}
        href={tab.href}
        onClick={(e) => handleTabClick(e, tab, visibleIndex)}
        className="flex flex-col items-center justify-center relative transition-all duration-300 w-[14.285%] shrink-0 group active:scale-95"
      >
        {/* Glow & Circular Container wrapper */}
        <div className={`relative flex items-center justify-center transition-all duration-300 ${
          isCenter ? "-translate-y-2 h-[52px]" : "translate-y-0 h-[36px]"
        }`}>
          {/* Outer glow ring */}
          <div className={`absolute rounded-full transition-all duration-500 ${
            isCenter ? "w-[60px] h-[60px]" : "w-0 h-0"
          } ${
            active && isCenter ? "bg-primary/10 scale-110" : "bg-transparent scale-0"
          }`} />

          {/* Icon background circle */}
          <div className={`relative rounded-full flex items-center justify-center transition-all duration-300 ${
            isCenter
              ? "w-[52px] h-[52px] bg-background border-[3px] shadow-lg"
              : "w-[36px] h-[36px] bg-transparent border-0 shadow-none"
          } ${
            isCenter
              ? active ? "border-primary shadow-primary/20" : "border-border shadow-foreground/5 group-hover:border-foreground/30"
              : ""
          }`}>
            <Icon
              className={`transition-all duration-300 ${
                isCenter ? "w-[21px] h-[21px]" : "w-[18px] h-[18px]"
              } ${
                active
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              } ${
                active && !isCenter ? "scale-110" : "scale-100"
              }`}
            />

            {/* Badges on active / unread states */}
            {tab.label === "Messages" && unreadMessageCount > 0 && (
              <span className={`absolute bg-primary text-background rounded-full text-[8.5px] font-black leading-none animate-pulse shadow-sm transition-all duration-300 ${
                isCenter ? "-top-1 -right-1 px-1.5 py-0.5" : "-top-1 -right-1.5 px-1.5 py-0.5"
              }`}>
                {unreadMessageCount}
              </span>
            )}
            {tab.label === "Alerts" && unreadNotifCount > 0 && (
              <span className={`absolute bg-primary text-background rounded-full text-[8.5px] font-black leading-none animate-pulse shadow-sm transition-all duration-300 ${
                isCenter ? "-top-1 -right-1 px-1.5 py-0.5" : "-top-1 -right-1.5 px-1.5 py-0.5"
              }`}>
                {unreadNotifCount}
              </span>
            )}

            {/* Active indicator dot for regular tab */}
            {active && !isCenter && !(tab.label === "Messages" && unreadMessageCount > 0) && !(tab.label === "Alerts" && unreadNotifCount > 0) && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            )}

            {/* Revolving border loading overlay */}
            {showRevolvingGlow && (
              <div className="absolute inset-0 rounded-full border-[3px] border-t-primary border-r-primary/40 border-b-transparent border-l-transparent animate-spin pointer-events-none" />
            )}
          </div>
        </div>

        {/* Tab Label */}
        <span
          className={`text-[8px] font-black uppercase tracking-wider transition-all duration-300 select-none ${
            isCenter ? "mt-1.5" : "mt-1"
          } ${
            active
              ? "text-foreground"
              : "text-muted-foreground/60 group-hover:text-foreground"
          }`}
        >
          {tab.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/80 backdrop-blur-xl border-t border-border/40 px-3 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.08)] animate-in slide-in-from-bottom-2 duration-300">
      {/* Scrollable clipping container */}
      <div className="w-full overflow-hidden h-[88px] -mt-[32px] pt-[34px] relative max-w-lg mx-auto">
        {/* Sliding Track */}
        <div
          className="flex items-end w-[140%] max-w-[140%] absolute bottom-0 left-0"
          style={{
            transform: `translateX(-${(1 + slideOffset) * 14.2857 + (dragOffset / 1.4)}%)`,
            transition: isTransitioning ? "transform 350ms cubic-bezier(0.16, 1, 0.3, 1)" : "none",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {visibleTabs.map((tab, i) => renderTab(tab, i))}
        </div>
      </div>

      {/* Position indicator dots */}
      <div className="flex justify-center items-center gap-1.5 pb-2 mt-1">
        {allTabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => {
              if (isTransitioning || isRouteLoading) return;
              const shortestOffset = getShortestOffset(centerTabIndex, i, len);
              if (shortestOffset === 0) return;

              setIsTransitioning(true);
              setSlideOffset(shortestOffset);

              setTimeout(() => {
                setIsTransitioning(false);
                setCenterTabIndex(i);
                setSlideOffset(0);
                setDragOffset(0);

                // Start page load tracking
                setIsRouteLoading(true);
                if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = setTimeout(() => {
                  setIsRouteLoading(false);
                }, 8000); // 8 seconds fail-safe fallback

                router.push(tab.href);
              }, 350);
            }}
            className={`rounded-full transition-all duration-300 ${
              i === centerTabIndex
                ? "w-4 h-1 bg-primary"
                : "w-1.5 h-1.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
