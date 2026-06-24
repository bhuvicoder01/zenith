"use client";

import { 
  Loader2, TrendingUp, ThumbsUp, MessageSquare, Eye, FileText, 
  ChevronRight, Calendar, ArrowUpRight, Search, Sparkles, User, BarChart3, Filter
} from "lucide-react";
import { useState, useEffect, useMemo, Suspense } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

interface PostAnalyticsResponse {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  posts: PostMetrics[];
}

function PostAnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPostId = searchParams.get("postId");

  const [data, setData] = useState<PostAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "views" | "likes" | "comments">("date");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"viewers" | "likers" | "commenters">("viewers");

  useEffect(() => {
    fetchAnalytics();
  }, [queryPostId]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/posts/analytics");
      setData(res.data);
      if (queryPostId) {
        setSelectedPostId(queryPostId);
      } else if (res.data.posts && res.data.posts.length > 0) {
        setSelectedPostId(res.data.posts[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      toast.error("Failed to load post analytics data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Format Date Helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Filter & Sort Posts
  const processedPosts = useMemo(() => {
    if (!data?.posts) return [];
    
    let result = [...data.posts];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(post => 
        post.contentSnippet.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "views") return b.viewsCount - a.viewsCount;
      if (sortBy === "likes") return b.likesCount - a.likesCount;
      if (sortBy === "comments") return b.commentsCount - a.commentsCount;
      
      // Default: date (newest first)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [data, searchTerm, sortBy]);

  // Selected Post Details
  const selectedPost = useMemo(() => {
    if (!data?.posts || !selectedPostId) return null;
    return data.posts.find(p => p.id === selectedPostId) || null;
  }, [data, selectedPostId]);

  // Get active tab list
  const activeTabUsers = useMemo(() => {
    if (!selectedPost) return [];
    if (activeTab === "viewers") return selectedPost.viewers || [];
    if (activeTab === "likers") return selectedPost.likers || [];
    if (activeTab === "commenters") return selectedPost.commenters || [];
    return [];
  }, [selectedPost, activeTab]);

  // SVG Chart Calculation
  const chartData = useMemo(() => {
    if (!data?.posts || data.posts.length === 0) return null;
    // We reverse to show oldest to newest left-to-right
    const reversed = [...data.posts].reverse().slice(-10); // Show last 10 posts
    const maxVal = Math.max(...reversed.map(p => Math.max(p.viewsCount, p.likesCount * 3, p.commentsCount * 5)), 10);
    
    const width = 600;
    const height = 150;
    const padding = 25;
    
    const pointsViews: string[] = [];
    const pointsLikes: string[] = [];
    const pointsComments: string[] = [];
    
    reversed.forEach((post, i) => {
      const x = padding + (i * (width - padding * 2)) / Math.max(reversed.length - 1, 1);
      const yViews = height - padding - (post.viewsCount * (height - padding * 2)) / maxVal;
      const yLikes = height - padding - (post.likesCount * (height - padding * 2)) / maxVal;
      const yComments = height - padding - (post.commentsCount * (height - padding * 2)) / maxVal;
      
      pointsViews.push(`${x},${yViews}`);
      pointsLikes.push(`${x},${yLikes}`);
      pointsComments.push(`${x},${yComments}`);
    });
    
    return {
      width,
      height,
      padding,
      pointsViews: pointsViews.join(" "),
      pointsLikes: pointsLikes.join(" "),
      pointsComments: pointsComments.join(" "),
      posts: reversed,
      maxVal
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-border p-8 md:p-10 shadow-lg">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="relative z-10 space-y-4 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-[0.15em] text-primary">
              Performance Control
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Post Analytics
            </h1>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Track engagement levels, identify key audience members, and optimize your outreach on Zenith.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="p-6 bg-card border border-border rounded-3xl relative overflow-hidden group shadow-sm transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-[4rem]" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Posts</span>
          </div>
          <div className="text-3xl font-black text-foreground">{data?.totalPosts ?? 0}</div>
        </div>

        <div className="p-6 bg-card border border-border rounded-3xl relative overflow-hidden group shadow-sm transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-bl-[4rem]" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Views</span>
          </div>
          <div className="text-3xl font-black text-foreground">{data?.totalViews ?? 0}</div>
        </div>

        <div className="p-6 bg-card border border-border rounded-3xl relative overflow-hidden group shadow-sm transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-bl-[4rem]" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
              <ThumbsUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Likes</span>
          </div>
          <div className="text-3xl font-black text-foreground">{data?.totalLikes ?? 0}</div>
        </div>

        <div className="p-6 bg-card border border-border rounded-3xl relative overflow-hidden group shadow-sm transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-[4rem]" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comments</span>
          </div>
          <div className="text-3xl font-black text-foreground">{data?.totalComments ?? 0}</div>
        </div>
      </div>

      {/* Chart Representation */}
      {chartData && (
        <div className="p-6 md:p-8 bg-card border border-border rounded-[2rem] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-black uppercase tracking-tight">Recent Engagement Trend</h3>
            </div>
            <div className="flex gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block" />
                <span className="text-muted-foreground">Views</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block" />
                <span className="text-muted-foreground">Likes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" />
                <span className="text-muted-foreground">Comments</span>
              </div>
            </div>
          </div>
          
          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="min-w-[600px] h-[170px] relative">
              <svg 
                viewBox={`0 0 ${chartData.width} ${chartData.height}`} 
                className="w-full h-full overflow-visible"
              >
                {/* Grid Lines */}
                <line x1={chartData.padding} y1={chartData.padding} x2={chartData.width - chartData.padding} y2={chartData.padding} stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1={chartData.padding} y1={(chartData.height) / 2} x2={chartData.width - chartData.padding} y2={(chartData.height) / 2} stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1={chartData.padding} y1={chartData.height - chartData.padding} x2={chartData.width - chartData.padding} y2={chartData.height - chartData.padding} stroke="currentColor" className="text-border" strokeWidth="0.5" />
                
                {/* Views Path */}
                <polyline
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chartData.pointsViews}
                  className="transition-all duration-500"
                />
                
                {/* Likes Path */}
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chartData.pointsLikes}
                  className="transition-all duration-500"
                />

                {/* Comments Path */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chartData.pointsComments}
                  className="transition-all duration-500"
                />

                {/* Data Points / Circles */}
                {chartData.posts.map((post, idx) => {
                  const segmentCount = Math.max(chartData.posts.length - 1, 1);
                  const x = chartData.padding + (idx * (chartData.width - chartData.padding * 2)) / segmentCount;
                  const yViews = chartData.height - chartData.padding - (post.viewsCount * (chartData.height - chartData.padding * 2)) / chartData.maxVal;
                  
                  return (
                    <g key={post.id} className="group/point">
                      <circle
                        cx={x}
                        cy={yViews}
                        r="4"
                        fill="#6366f1"
                        className="transition-all duration-200 group-hover/point:r-6 cursor-pointer"
                        onClick={() => setSelectedPostId(post.id)}
                      />
                      <rect 
                        x={x - 20} 
                        y={chartData.height - 18} 
                        width="40" 
                        height="18" 
                        fill="transparent" 
                      />
                      <text
                        x={x}
                        y={chartData.height - 5}
                        textAnchor="middle"
                        className="text-[9px] font-black fill-muted-foreground uppercase"
                      >
                        P{chartData.posts.length - idx}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Posts List Component */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" /> Your Content
            </h3>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border bg-card rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1.5 border border-border bg-card rounded-xl px-3 py-2 shrink-0">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-bold focus:outline-none text-foreground cursor-pointer"
                >
                  <option value="date" className="bg-card text-foreground">Newest</option>
                  <option value="views" className="bg-card text-foreground">Views</option>
                  <option value="likes" className="bg-card text-foreground">Likes</option>
                  <option value="comments" className="bg-card text-foreground">Comments</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {processedPosts.length > 0 ? (
              processedPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPostId(post.id)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col gap-4 relative overflow-hidden ${
                    selectedPostId === post.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:bg-secondary/40"
                  }`}
                >
                  {selectedPostId === post.id && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                  )}
                  
                  {/* Post Header Info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground line-clamp-2 leading-relaxed">
                        {post.contentSnippet || "Untitled / Media Post"}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold shrink-0">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>

                  {/* Micro-Metrics Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex gap-6">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs font-bold text-foreground">{post.viewsCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold text-foreground">{post.likesCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold text-foreground">{post.commentsCount}</span>
                      </div>
                    </div>
                    
                    <Link
                      href={`/posts/${post.id}`}
                      className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all flex items-center justify-center"
                      title="View Post Details"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center border-2 border-dashed border-border bg-card rounded-[2rem] flex flex-col items-center justify-center gap-4">
                <FileText className="w-12 h-12 text-muted-foreground/30 animate-pulse" />
                <div className="space-y-1">
                  <h4 className="font-black uppercase tracking-tight">No Content Found</h4>
                  <p className="text-xs text-muted-foreground max-w-sm px-4">
                    {searchTerm ? "No posts match your search query." : "Write your first post to begin tracking reader analytics."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Audience Breakdown Panel */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" /> Audience Insights
          </h3>

          <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm flex flex-col min-h-[450px]">
            {selectedPost ? (
              <>
                {/* Tabs selection */}
                <div className="grid grid-cols-3 border-b border-border bg-secondary/20">
                  <button
                    onClick={() => setActiveTab("viewers")}
                    className={`py-3.5 text-[10px] font-black uppercase tracking-wider text-center transition-all ${
                      activeTab === "viewers"
                        ? "bg-card text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Viewers ({selectedPost.viewers?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab("likers")}
                    className={`py-3.5 text-[10px] font-black uppercase tracking-wider text-center transition-all ${
                      activeTab === "likers"
                        ? "bg-card text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Likers ({selectedPost.likers?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab("commenters")}
                    className={`py-3.5 text-[10px] font-black uppercase tracking-wider text-center transition-all ${
                      activeTab === "commenters"
                        ? "bg-card text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Replies ({selectedPost.commenters?.length || 0})
                  </button>
                </div>

                {/* Tab Content Users List */}
                <div className="flex-1 p-5 overflow-y-auto max-h-[420px] no-scrollbar space-y-3.5">
                  {activeTabUsers.length > 0 ? (
                    activeTabUsers.map((person, idx) => (
                      <Link
                        key={`${person.userId}-${idx}`}
                        href={`/public/profiles/${person.username || person.userId}`}
                        className="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-secondary/40 border border-transparent hover:border-border/30 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-xl overflow-hidden border border-border group-hover:border-primary/50 relative shrink-0 transition-colors">
                          {person.profilePhotoUrl ? (
                            <img
                              src={person.profilePhotoUrl}
                              alt={person.fullName}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-secondary flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black text-foreground truncate flex items-center gap-1">
                            {person.fullName}
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                          </div>
                          <div className="text-[10px] font-medium text-muted-foreground truncate">
                            {person.headline || "Zenith Member"}
                          </div>
                          {person.username && (
                            <div className="text-[8px] font-mono text-primary truncate mt-0.5">
                              @{person.username}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                      <User className="w-9 h-9 text-muted-foreground/20" />
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                        No {activeTab} yet
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
                <BarChart3 className="w-10 h-10 text-muted-foreground/30 animate-pulse" />
                <p className="text-xs font-bold text-muted-foreground max-w-[200px]">
                  Select a post from the feed list to view detailed audience analytics.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function PostAnalyticsDashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PostAnalyticsContent />
    </Suspense>
  );
}
