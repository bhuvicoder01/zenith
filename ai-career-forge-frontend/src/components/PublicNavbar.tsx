"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, X, Briefcase, Users, LayoutDashboard, LogOut, Search, Loader2 } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import Image from "next/image";
import api from "@/lib/api";

export default function PublicNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Mixed Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    profiles: any[];
    hashtags: string[];
  }>({ profiles: [], hashtags: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [allHashtags, setAllHashtags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
    setSearchQuery("");
    setShowDropdown(false);
  }, [pathname]);

  // Load all hashtags once on mount
  useEffect(() => {
    if (!mounted) return;
    const loadHashtags = async () => {
      try {
        const res = await api.get("/hashtags");
        if (res.data && Array.isArray(res.data)) {
          setAllHashtags(res.data.map((h: { name: string }) => h.name));
        }
      } catch (err) {
        console.error("Failed to load hashtags for search:", err);
      }
    };
    loadHashtags();
  }, [mounted]);

  // Mixed search debounced logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ profiles: [], hashtags: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const cleanQuery = searchQuery.trim().replace(/^[@#]/, "");
        
        // Profiles matching search query
        const profilesRes = await api.get(`/profile/public/search?query=${encodeURIComponent(cleanQuery)}`);
        const profiles = (profilesRes.data || []).filter((p: any) => p.username && p.username.trim() !== "");
        
        // Hashtags matching search query
        const hashtags = allHashtags.filter(tag => 
          tag.toLowerCase().includes(cleanQuery.toLowerCase())
        );

        setSearchResults({
          profiles: profiles.slice(0, 5),
          hashtags: hashtags.slice(0, 5)
        });
      } catch (err) {
        console.error("Mixed search error:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, allHashtags]);

  // Shortcut key Cmd + K / Ctrl + K
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  // Click outside to dismiss search results dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

        {/* Desktop Mixed Search Bar */}
        <div ref={dropdownRef} className="hidden md:block relative w-64 lg:w-80 xl:w-96">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="w-4 h-4 text-muted-foreground/80" />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search profiles or hashtags..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-secondary/40 border border-border/80 focus:border-primary/50 rounded-full pl-9 pr-12 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[9px] font-medium text-muted-foreground opacity-100">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </div>

          {showDropdown && (searchQuery.trim() || loading) && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-2 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              {loading && (
                <div className="flex items-center gap-2 justify-center p-3 text-xs text-muted-foreground font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  Scanning Zenith database...
                </div>
              )}

              {!loading && searchResults.profiles.length === 0 && searchResults.hashtags.length === 0 && (
                <div className="p-3 text-center text-xs text-muted-foreground font-semibold">
                  No matching profiles or hashtags found
                </div>
              )}

              {!loading && (searchResults.profiles.length > 0 || searchResults.hashtags.length > 0) && (
                <div className="space-y-3 p-1">
                  {/* Profiles */}
                  {searchResults.profiles.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2.5 py-1">Profiles</h5>
                      {searchResults.profiles.map((profile) => (
                        <Link
                          key={profile.userId}
                          href={`/public/profiles/${profile.username}`}
                          onClick={() => {
                            setSearchQuery("");
                            setShowDropdown(false);
                          }}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-secondary/60 text-xs font-semibold transition-colors text-foreground"
                        >
                          <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[10px] font-black uppercase border border-border/80 overflow-hidden">
                            {profile.profilePhotoUrl ? (
                              <img src={profile.profilePhotoUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                            ) : (
                              profile.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black uppercase tracking-tight text-foreground truncate">{profile.fullName}</p>
                            <p className="text-[9px] text-muted-foreground truncate font-medium">@{profile.username}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Hashtags */}
                  {searchResults.hashtags.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2.5 py-1">Hashtags</h5>
                      {searchResults.hashtags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/tags/${tag}`}
                          onClick={() => {
                            setSearchQuery("");
                            setShowDropdown(false);
                          }}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-secondary/60 text-xs font-bold transition-colors text-foreground"
                        >
                          <span className="text-indigo-500 font-bold text-sm">#</span>
                          <span className="text-foreground">{tag}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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
            
            {/* Mobile Search Bar */}
            <div className="relative w-full">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Search className="w-4 h-4 text-muted-foreground/80" />
                </span>
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  placeholder="Search profiles or hashtags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/80 focus:border-primary/50 rounded-full pl-9 pr-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>

              {searchQuery.trim() && (
                <div className="relative mt-2 bg-secondary/20 border border-border/60 rounded-2xl p-2 max-h-60 overflow-y-auto space-y-3">
                  {loading && (
                    <div className="flex items-center gap-2 justify-center p-3 text-xs text-muted-foreground font-semibold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      Scanning Zenith database...
                    </div>
                  )}

                  {!loading && searchResults.profiles.length === 0 && searchResults.hashtags.length === 0 && (
                    <div className="p-3 text-center text-xs text-muted-foreground font-semibold">
                      No matching profiles or hashtags found
                    </div>
                  )}

                  {!loading && (searchResults.profiles.length > 0 || searchResults.hashtags.length > 0) && (
                    <div className="space-y-3 p-1">
                      {/* Profiles */}
                      {searchResults.profiles.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2.5 py-1">Profiles</h5>
                          {searchResults.profiles.map((profile) => (
                            <Link
                              key={profile.userId}
                              href={`/public/profiles/${profile.username}`}
                              onClick={() => {
                                setSearchQuery("");
                                setIsOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-secondary/60 text-xs font-semibold transition-colors text-foreground"
                            >
                              <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[10px] font-black uppercase border border-border/80 overflow-hidden">
                                {profile.profilePhotoUrl ? (
                                  <img src={profile.profilePhotoUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  profile.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-black uppercase tracking-tight text-foreground truncate">{profile.fullName}</p>
                                <p className="text-[9px] text-muted-foreground truncate font-medium">@{profile.username}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Hashtags */}
                      {searchResults.hashtags.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2.5 py-1">Hashtags</h5>
                          {searchResults.hashtags.map((tag) => (
                            <Link
                              key={tag}
                              href={`/tags/${tag}`}
                              onClick={() => {
                                setSearchQuery("");
                                setIsOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-secondary/60 text-xs font-bold transition-colors text-foreground"
                            >
                              <span className="text-indigo-500 font-bold text-sm">#</span>
                              <span className="text-foreground">{tag}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

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
