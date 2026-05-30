"use client";

import { useEffect } from "react";

export default function OrientationLock() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.screen && window.screen.orientation) {
      const lockOrientation = async () => {
        try {
          // Attempt to lock to portrait
          await (window.screen.orientation as any).lock("portrait-primary");
        } catch (error) {
          console.debug("Screen orientation lock API not supported or ignored:", error);
        }
      };
      lockOrientation();
    }
  }, []);

  return (
    <div className="portrait-lock-overlay fixed inset-0 z-[9999] bg-background flex-col items-center justify-center p-6 text-center space-y-6 animate-in fade-in duration-300 select-none">
      <div className="relative">
        <div className="w-16 h-28 border-[4px] border-foreground rounded-2xl animate-rotate-device relative flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-foreground rounded-full absolute bottom-2"></div>
          <div className="w-8 h-1 bg-foreground rounded-full absolute top-2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-black uppercase tracking-widest text-foreground font-display">Portrait Required</h2>
        <p className="text-xs text-muted-foreground max-w-xs font-medium uppercase tracking-wider leading-relaxed">
          This career terminal is optimized exclusively for portrait mode. Please rotate your device.
        </p>
      </div>
    </div>
  );
}
