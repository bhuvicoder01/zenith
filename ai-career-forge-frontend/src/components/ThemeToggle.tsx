"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPeelingAllTheWay, setIsPeelingAllTheWay] = useState(false);
  const [peelActive, setPeelActive] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || pathname === "/dashboard/messages") return null;

  const isDark = resolvedTheme === "dark";
  
  // Normal corner hover fold size
  const peelPercent = isHovered ? 100 : 32;

  // Since we switch theme instantly on click, resolvedTheme becomes the NEW theme.
  // So if the new theme is dark, the old theme was light.
  const oldThemeBgClass = isDark ? "bg-amber-100 dark:bg-amber-50" : "bg-zinc-950";

  const handleStartPagePeel = () => {
    if (isPeelingAllTheWay) return;
    
    // Switch theme instantly so layout content adapts immediately under the peel cover
    setTheme(isDark ? "light" : "dark");
    
    setIsPeelingAllTheWay(true);
    
    // Tiny delay to let the browser mount full screen elements before starting transition
    setTimeout(() => {
      setPeelActive(true);
    }, 30);

    // Clean up once transition completes (1450ms)
    setTimeout(() => {
      setIsPeelingAllTheWay(false);
      setPeelActive(false);
      setIsHovered(false);
    }, 1450);
  };

  return (
    <>
      {/* 1. Normal Corner Page Toggle (Visible when not actively peeling full-screen) */}
      {!isPeelingAllTheWay && (
        <div 
          className="hidden md:block fixed top-0 right-0 z-[2000] w-20 h-20 cursor-pointer select-none group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleStartPagePeel}
          title={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
          {/* Revealed Underlay (Exposed region showing the new theme icon) */}
          <div 
            className={`absolute inset-0 transition-colors duration-355 ${
              isDark ? "bg-amber-100 dark:bg-amber-50" : "bg-zinc-950"
            }`}
            style={{
              clipPath: `polygon(100% 0, 100% ${peelPercent}%, ${100 - peelPercent}% 0)`,
              transition: "clip-path 300ms cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          >
            {/* Target theme icon inside the exposed region */}
            <div 
              className="absolute top-2 right-2 flex items-center justify-center"
              style={{
                opacity: isHovered ? 1 : 0.5,
                transform: isHovered ? "scale(1) rotate(0deg)" : "scale(0.65) rotate(-45deg)",
                transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-orange-500 animate-pulse" />
              ) : (
                <Moon className="w-4 h-4 text-blue-400 animate-pulse" />
              )}
            </div>
          </div>

          {/* Folded Flap Wrapper (Applying drop shadow on the clipped path) */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              filter: isHovered 
                ? "drop-shadow(-3px 3px 4px rgba(0,0,0,0.3))" 
                : "drop-shadow(-1.5px 1.5px 1.5px rgba(0,0,0,0.2))",
              transition: "filter 300ms cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          >
            {/* The Folded Flap Triangle (revolving back page background) */}
            <div 
              className="w-full h-full bg-gradient-to-br from-zinc-100 via-zinc-250 to-zinc-350 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900"
              style={{
                clipPath: `polygon(${100 - peelPercent}% 0, 100% ${peelPercent}%, ${100 - peelPercent}% ${peelPercent}%)`,
                transition: "clip-path 300ms cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            />
          </div>
        </div>
      )}

      {/* 2. Full-Screen Page Curl Transition Overlay */}
      {isPeelingAllTheWay && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen pointer-events-none overflow-hidden select-none">
          {/* Old Theme Cover (Solid block covering the bottom-left area, peeling away to reveal active page content) */}
          <div 
            className={`absolute inset-0 ${oldThemeBgClass}`}
            style={{
              clipPath: peelActive
                ? "polygon(-120% 0, -20% 120%, -20% 120%, 100% 220%, -120% 0)"
                : "polygon(0 0, 0 100%, 100% 100%, 100% 0, 100% 0)",
              transition: "clip-path 1400ms cubic-bezier(0.25, 1, 0.5, 1)"
            }}
          />

          {/* Folded Flap Wrapper (carrying heavy elevation drop-shadow) */}
          <div 
            className="absolute inset-0"
            style={{
              filter: peelActive 
                ? "drop-shadow(-8px 8px 12px rgba(0,0,0,0.45))" 
                : "drop-shadow(-1px 1px 1px rgba(0,0,0,0.1))",
              transition: "filter 1400ms cubic-bezier(0.25, 1, 0.5, 1)"
            }}
          >
            {/* The Peeling Flap (back page texture) */}
            <div 
              className="w-full h-full bg-gradient-to-br from-zinc-100 via-zinc-250 to-zinc-350 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900"
              style={{
                clipPath: peelActive
                  ? "polygon(-120% 0, 100% 220%, -120% 220%)"
                  : "polygon(100% 0, 100% 0%, 100% 0%)",
                transition: "clip-path 1400ms cubic-bezier(0.25, 1, 0.5, 1)"
              }}
            />
          </div>

          {/* SVG crease line sweep */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line 
              x1={peelActive ? "-120%" : "100%"} 
              y1="0" 
              x2="100%" 
              y2={peelActive ? "220%" : "0%"} 
              className="stroke-zinc-400 dark:stroke-zinc-650"
              style={{
                strokeWidth: 2,
                transition: "all 1400ms cubic-bezier(0.25, 1, 0.5, 1)"
              }}
            />
          </svg>
        </div>
      )}
    </>
  );
}
