"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Compass, FileCheck2, LayoutDashboard, UserRound } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
const tabs = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/jobs", label: "Discover", icon: Compass },
  { href: "/dashboard/applications", label: "Tracker", icon: FileCheck2 },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
];
export default function MobileFooterTabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  if (
    !authenticated ||
    !pathname.startsWith("/dashboard") ||
    pathname.startsWith("/dashboard/portfolio") ||
    (pathname === "/dashboard/messages" && params.get("userId"))
  )
    return null;
  return (
    <nav className="z-mobile-tabs" aria-label="Mobile workspace navigation">
      {tabs.map((tab) => {
        const active =
          tab.href === "/dashboard"
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
          >
            <tab.icon size={18} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
