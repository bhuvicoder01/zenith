"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import useAuthStore from "@/store/useAuthStore";

export default function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { connect, disconnect, loadSavedNotifications } = useWebSocketStore();
  const { isAuthenticated, token } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnect();
      return;
    }
    loadSavedNotifications();
    connect((url: string) => router.push(url));
    return () => disconnect();
  }, [connect, disconnect, loadSavedNotifications, router, isAuthenticated, token]);

  return <>{children}</>;
}
