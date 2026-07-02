"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWebSocketStore } from "@/store/useWebSocketStore";

export default function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { connect, disconnect, loadSavedNotifications } = useWebSocketStore();

  useEffect(() => {
    loadSavedNotifications();
    connect((url: string) => router.push(url));
    return () => disconnect();
  }, [connect, disconnect, loadSavedNotifications, router]);

  return <>{children}</>;
}
