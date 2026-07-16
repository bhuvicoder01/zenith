"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Search, User, Hash, ArrowRight, Loader2, Users, FileText, ChevronRight, MessageSquare
} from "lucide-react";
import api from "@/lib/api";
import PublicNavbar from "@/components/PublicNavbar";
import PostCard from "@/components/PostCard";

interface Comment {
  id: string;
  userId: string;
  authorName: string;
  authorUsername?: string;
  authorAvatar?: string;
  authorHeadline?: string;
  content: string;
  createdAt: string;
  parentCommentId?: string;
  replyToUserId?: string;
  replyToUserName?: string;
  likedUserIds: string[];
}

interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorUsername?: string;
  authorAvatar?: string;
  authorHeadline?: string;
  content?: string;
  mediaUrls?: string[];
  pdfUrl?: string;
  pdfName?: string;
  videoUrl?: string;
  linkUrl?: string;
  createdAt: string;
  likesCount: number;
  viewsCount: number;
  likedUserIds: string[];
  comments?: Comment[];
  reactions?: Record<string, string>;
}

// Sub-component that consumes searchParams
function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [matchingTags, setMatchingTags] = useState<string[]>([]);

  useEffect(() => {
    if (!query.trim()) return;

    const performSearch = async () => {
      setLoading(true);
      try {
        const cleanQuery = query.trim().replace(/^[@#]/, "");
        
        // 1. Fetch matching profiles
        const profilesRes = await api.get(`/profile/public/search?query=${encodeURIComponent(cleanQuery)}`);
        const filteredProfiles = (profilesRes.data || []).filter((p: any) => p.username && p.username.trim() !== "");
        setProfiles(filteredProfiles);

        // 2. Fetch matching posts/broadcasts using the backend query parameter
        const postsRes = await api.get(`/posts?query=${encodeURIComponent(cleanQuery)}&page=0&size=50`);
        const filteredPosts = postsRes.data?.content || [];
        setPosts(filteredPosts);

        // 3. Fetch hashtags and filter client-side
        const tagsRes = await api.get("/hashtags");
        const allTagsList: any[] = tagsRes.data || [];
        const allTags: string[] = allTagsList.map((h: { name: string }) => h.name || "");
        const filteredTags = allTags.filter(tag => 
          tag.toLowerCase().includes(cleanQuery.toLowerCase())
        );
        setMatchingTags(filteredTags);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  const cleanQueryDisplay = query.trim();

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
          Search Workspace
        </div>
        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-foreground">
          Matches for <span className="text-primary font-black">"{cleanQueryDisplay}"</span>
        </h1>
        <p className="text-xs text-muted-foreground font-semibold">
          Discovered {profiles.length} members, {posts.length} posts, and {matchingTags.length} hashtags
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Scanning Zenith database...</p>
        </div>
      ) : (
        <>
          {/* Usernames Matched on Top */}
          {profiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Matched Profiles
                </h3>
                <span className="text-[10px] bg-secondary text-muted-foreground font-bold px-2 py-0.5 rounded-full">
                  {profiles.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profiles.map((profile) => {
                  const getInitials = (name: string) => {
                    return name
                      ? name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
                      : "U";
                  };
                  return (
                    <div 
                      key={profile.userId || profile.username || profile.id}
                      className="bg-card border border-border/80 hover:border-primary/45 rounded-3xl p-4 transition-all duration-300 shadow-sm flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-black uppercase border border-border overflow-hidden relative">
                          {(profile.profilePhotoUrl || profile.avatar) ? (
                            <img 
                              src={(profile.profilePhotoUrl || profile.avatar).startsWith("http") 
                                ? (profile.profilePhotoUrl || profile.avatar) 
                                : `${api.defaults.baseURL?.replace("/api", "") || "http://localhost:8080"}${profile.profilePhotoUrl || profile.avatar}`} 
                              alt={profile.fullName} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            getInitials(profile.fullName)
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black uppercase tracking-tight text-foreground truncate">{profile.fullName}</h4>
                          <p className="text-[10px] text-muted-foreground font-bold truncate">@{profile.username}</p>
                          <p className="text-[9px] text-muted-foreground font-semibold truncate leading-none mt-0.5">
                            {profile.headline || "Zenith Community Member"}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/public/profiles/${profile.username}`}
                        className="p-2 bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground border border-border hover:border-primary rounded-xl transition-all flex items-center justify-center shrink-0 shadow-sm"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matching Hashtags (Horizontal Pills) */}
          {matchingTags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Related Hashtags</h4>
              <div className="flex flex-wrap gap-2">
                {matchingTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${tag}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/60 hover:bg-primary/10 border border-border/80 hover:border-primary/20 rounded-full text-[10px] font-bold text-muted-foreground hover:text-primary transition-all uppercase tracking-wider"
                  >
                    <Hash className="w-3 h-3 text-primary/60" /> {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Matching Posts Section (Underneath) */}
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Matching Broadcasts & Posts
              </h3>
              <span className="text-[10px] bg-secondary text-muted-foreground font-bold px-2 py-0.5 rounded-full">
                {posts.length}
              </span>
            </div>

            {posts.length === 0 ? (
              <div className="border border-border/65 bg-card rounded-[2rem] p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
                <div className="w-16 h-16 mx-auto rounded-full bg-secondary/30 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-tight text-foreground">No Broadcasts Found</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    No posts or shared articles match the keyword search query.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard 
                    key={post.id}
                    post={post}
                    onDelete={(postId) => setPosts(prev => prev.filter(p => p.id !== postId))}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <PublicNavbar />
      <main className="max-w-4xl mx-auto px-4 pt-8 pb-24 md:pb-8 sm:px-6">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading Search Workspace...</p>
          </div>
        }>
          <SearchResultsContent />
        </Suspense>
      </main>
    </div>
  );
}
