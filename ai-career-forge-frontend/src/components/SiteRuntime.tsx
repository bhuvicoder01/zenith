"use client";
import { usePathname } from "next/navigation";
import AuthGuard from "./AuthGuard";
import WebSocketProvider from "./WebSocketProvider";
import AssistantWidget from "./AssistantWidget";
import MobileFooterTabs from "./MobileFooterTabs";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
export default function SiteRuntime({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Keep the public showcase isolated from account state, push subscriptions,
  // sockets, AI providers, and analytics, including for signed-in visitors.
  if (pathname === "/demo" || pathname === "/") return <>{children}</>;
  return (
    <AuthGuard>
      <WebSocketProvider>
        {children}
        <AssistantWidget />
        <MobileFooterTabs />
        <Toaster richColors closeButton position="top-center" />
        <Analytics />
        <SpeedInsights />
      </WebSocketProvider>
    </AuthGuard>
  );
}
