"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Eye, ThumbsUp, MessageSquare, Loader2, User, ArrowUpRight, BarChart3, Sparkles
} from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import PublicNavbar from "@/components/PublicNavbar";
import api from "@/lib/api";
import { toast } from "sonner";

interface UserProfileInfo {
  userId: string;
  fullName: string;
  username?: string;
  profilePhotoUrl?: string;
  headline?: string;
}

interface PostMetrics {
  id: string;
  contentSnippet: string;
  createdAt?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  viewers: UserProfileInfo[];
  likers: UserProfileInfo[];
  commenters: UserProfileInfo[];
}

export default function IndividualPostAnalytics() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const { user, isAuthenticated } = useAuthStore();
  const [postMetrics, setPostMetrics] = useState<PostMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"viewers" | "likers" | "commenters">("viewers");

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please log in to view post analytics");
      router.push("/auth/login");
      return;
    }
    if (postId) {
      fetchPostAnalytics();
    }
  }, [postId, isAuthenticated]);

  const fetchPostAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/posts/analytics");
      const allPostsMetrics: PostMetrics[] = res.data.posts || [];
      const match = allPostsMetrics.find(p => p.id === postId);
      
      if (match) {
        setPostMetrics(match);
      } else {
        toast.error("Analytics not found or you are not the author of this post.");
        router.push(`/posts/${postId}`);
      }
    } catch (err) {
      console.error("Failed to fetch post analytics:", err);
      toast.error("Failed to load post analytics.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeTabUsers = useMemo(() => {
    if (!postMetrics) return [];
    if (activeTab === "viewers") return postMetrics.viewers || [];
    if (activeTab === "likers") return postMetrics.likers || [];
    if (activeTab === "commenters") return postMetrics.commenters || [];
    return [];
  }, [postMetrics, activeTab]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    } catch {
      return "N/A";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PublicNavbar />
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Retrieving Metrics Node...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background font-sans pb-24 md:pb-0">
      <PublicNavbar />

      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-10 pb-20 space-y-8">
        
        {/* Back Link */}
        <Link 
          href={`/posts/${postId}`} 
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Post
        </Link>

        {postMetrics ? (
          <div className="space-y-8">
            {/* Header / Post Snippet */}
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-border p-6 md:p-8 shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.15),transparent_70%)]" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-[0.15em] text-primary flex items-center gap-1.5 animate-pulse">
                    <BarChart3 className="w-3.5 h-3.5" /> Post Analytics
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold">
                    Broadcasted: {formatDate(postMetrics.createdAt)}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-foreground/90 font-medium leading-relaxed italic border-l-2 border-indigo-500/40 pl-4">
                    "{postMetrics.contentSnippet || "Untitled / Media Post"}"
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-3 gap-4 md:gap-6">
              <div className="p-5 bg-card border border-border rounded-3xl relative overflow-hidden group shadow-sm transition-all hover:shadow-md flex flex-col gap-2">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-bl-[3rem]" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="w-4.5 h-4.5 text-indigo-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Views</span>
                </div>
                <div className="text-2xl md:text-3xl font-black text-foreground">{postMetrics.viewsCount}</div>
              </div>

              <div className="p-5 bg-card border border-border rounded-3xl relative overflow-hidden group shadow-sm transition-all hover:shadow-md flex flex-col gap-2">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-bl-[3rem]" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ThumbsUp className="w-4 h-4 text-rose-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Likes</span>
                </div>
                <div className="text-2xl md:text-3xl font-black text-foreground">{postMetrics.likesCount}</div>
              </div>

              <div className="p-5 bg-card border border-border rounded-3xl relative overflow-hidden group shadow-sm transition-all hover:shadow-md flex flex-col gap-2">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-[3rem]" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Comments</span>
                </div>
                <div className="text-2xl md:text-3xl font-black text-foreground">{postMetrics.commentsCount}</div>
              </div>
            </div>

            {/* Audience Detailed Insight lists */}
            <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm flex flex-col min-h-[400px]">
              {/* Tab Selector */}
              <div className="grid grid-cols-3 border-b border-border bg-secondary/20">
                <button
                  onClick={() => setActiveTab("viewers")}
                  className={`py-4 text-xs font-black uppercase tracking-wider text-center transition-all ${
                    activeTab === "viewers"
                      ? "bg-card text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Viewed By ({postMetrics.viewers?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("likers")}
                  className={`py-4 text-xs font-black uppercase tracking-wider text-center transition-all ${
                    activeTab === "likers"
                      ? "bg-card text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Liked By ({postMetrics.likers?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("commenters")}
                  className={`py-4 text-xs font-black uppercase tracking-wider text-center transition-all ${
                    activeTab === "commenters"
                      ? "bg-card text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Replies By ({postMetrics.commenters?.length || 0})
                </button>
              </div>

              {/* Tab Content Users List */}
              <div className="flex-1 p-6 overflow-y-auto max-h-[500px] no-scrollbar space-y-4">
                {activeTabUsers.length > 0 ? (
                  activeTabUsers.map((person, idx) => (
                    <Link
                      key={`${person.userId}-${idx}`}
                      href={`/public/profiles/${person.username || person.userId}`}
                      className="flex items-center gap-4 p-3 rounded-2xl hover:bg-secondary/40 border border-transparent hover:border-border/30 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-border group-hover:border-primary/50 relative shrink-0 transition-colors">
                        {person.profilePhotoUrl ? (
                          <img
                            src={person.profilePhotoUrl}
                            alt={person.fullName}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-secondary flex items-center justify-center">
                            <User className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-foreground truncate flex items-center gap-1">
                          {person.fullName}
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                        </div>
                        <div className="text-xs font-medium text-muted-foreground truncate">
                          {person.headline || "Zenith Member"}
                        </div>
                        {person.username && (
                          <div className="text-[10px] font-mono text-primary truncate mt-0.5">
                            @{person.username}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                    <User className="w-12 h-12 text-muted-foreground/20 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                        No activity recorded
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 max-w-xs mx-auto">
                        No users have triggered the {activeTab} action on this post yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-[2.5rem] p-12 text-center space-y-4">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Access Denied / Post Not Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                You do not have access to view analytics for this post, or the post does not exist.
              </p>
            </div>
            <Link 
              href="/"
              className="inline-block px-5 py-2.5 bg-foreground text-background text-xs font-black uppercase tracking-widest rounded-full hover:opacity-90 transition-all"
            >
              Return Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
