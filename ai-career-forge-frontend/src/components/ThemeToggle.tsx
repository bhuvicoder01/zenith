"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || pathname === "/dashboard/messages") return null;

  return (
    <div className="fixed bottom-6 left-6 z-[2000]">
      <button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="p-3 rounded-full bg-background border border-border shadow-2xl hover:bg-secondary transition-all active:scale-95 group focus:outline-none focus:ring-2 focus:ring-foreground/20"
        title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      >
        {resolvedTheme === "dark" ? (
          <Sun className="w-5 h-5 text-orange-400 animate-in spin-in-180 duration-500" />
        ) : (
          <Moon className="w-5 h-5 text-blue-500 animate-in spin-in-180 duration-500" />
        )}
      </button>
    </div>
  );
}
