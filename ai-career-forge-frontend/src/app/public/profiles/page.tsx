"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Search, User, Briefcase, ArrowRight, Sparkles, Code } from "lucide-react";
import { useTheme } from "next-themes";
import { BACKEND_URL } from "@/lib/api";
import useAuthStore from "@/store/useAuthStore";
import PublicNavbar from "@/components/PublicNavbar";

interface PublicProfile {
  userId: string;
  username?: string;
  fullName: string;
  headline: string;
  bio: string;
  profilePhotoUrl: string;
  coverImageUrl: string;
  skills: string[];
}

export default function PublicProfilesPage() {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    fetchProfiles("");
  }, []);

  const fetchProfiles = async (query: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/profile/public/search`, {
        params: query ? { query } : {},
      });
      setProfiles(response.data);
    } catch (error) {
      console.error("Failed to fetch public profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProfiles(searchQuery);
  };

  // Helper to proxy or return profile photo URL
  const getPhotoUrl = (url: string) => {
    if (!url) return null;
    if (url.startsWith("http")) {
      return url;
    }
    return `${BACKEND_URL}/public/assets/${url}`;
  };

  // Helper for initials
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <PublicNavbar />

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight italic">
            Talent <span className="text-muted-foreground/30 not-italic">Showcase.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Discover outstanding developers, designers, and specialists who have tailored their identities with Zenith.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="max-w-xl flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search by name, title, skills (e.g. React)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/30 border border-border rounded-2xl pl-12 pr-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
          <button 
            type="submit" 
            className="px-6 py-4 bg-foreground text-background rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
          >
            Search
          </button>
        </form>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            <p className="text-muted-foreground animate-pulse text-sm">Searching our network for top matching profiles...</p>
          </div>
        ) : (
          <>
            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {profiles.map((profile) => {
                const photoUrl = getPhotoUrl(profile.profilePhotoUrl);
                return (
                  <div key={profile.userId} className="group relative bg-card border border-border rounded-3xl p-8 hover:shadow-2xl hover:shadow-primary/5 transition-all flex flex-col gap-6 overflow-hidden">
                    {/* Background glow micro-animation */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    <div className="flex items-start justify-between gap-4 relative z-10">
                      {/* Avatar */}
                      <div className="h-16 w-16 rounded-2xl border border-border overflow-hidden flex items-center justify-center bg-muted shadow-sm">
                        {photoUrl ? (
                          <img src={photoUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="font-bold text-lg text-muted-foreground">{getInitials(profile.fullName)}</div>
                        )}
                      </div>
                      <div className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-[10px] font-black uppercase tracking-widest border border-border">
                        Candidate
                      </div>
                    </div>

                    <div className="space-y-2 relative z-10">
                      <h3 className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors">
                        {profile.fullName}
                      </h3>
                      <p className="text-primary font-semibold text-sm tracking-tight flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-primary" /> {profile.headline || "Job Seeker"}
                      </p>
                    </div>

                    {profile.bio && (
                      <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed relative z-10">
                        {profile.bio}
                      </p>
                    )}

                    {/* Skills pills */}
                    {profile.skills && profile.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 relative z-10">
                        {profile.skills.slice(0, 5).map((skill, index) => (
                          <span 
                            key={index}
                            className="px-2.5 py-1 bg-secondary/50 text-muted-foreground rounded-lg text-xs font-medium border border-border/50"
                          >
                            {skill}
                          </span>
                        ))}
                        {profile.skills.length > 5 && (
                          <span className="px-2 py-1 text-muted-foreground rounded-lg text-xs font-bold">
                            +{profile.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between relative z-10">
                      <Link 
                        href={`/public/profiles/${profile.username || profile.userId}`}
                        className="flex-1 bg-foreground text-background text-center py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        View Profile <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {profiles.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl flex flex-col items-center gap-6">
                <User className="w-16 h-16 text-muted-foreground opacity-20" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold italic tracking-tight">No profiles found</h2>
                  <p className="text-muted-foreground">Try a different search term or invite your network to share their public link.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
