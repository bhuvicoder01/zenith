"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import PublicNavbar from "@/components/PublicNavbar";
import PostCard from "@/components/PostCard";
import api from "@/lib/api";
import { toast } from "sonner";

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

export default function HashtagFeedPage() {
  const { tag } = useParams();
  const router = useRouter();
  
  const decodedTag = tag ? decodeURIComponent(tag as string) : "";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (!decodedTag) return;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const res = await api.get(`/posts?tag=${encodeURIComponent(decodedTag)}&page=${pageNum}&size=15`);
      const newPosts = res.data.content || [];
      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      setPage(pageNum);
      setHasMore(!res.data.last);
    } catch (err) {
      console.error("Failed to fetch posts for tag:", err);
      toast.error("Could not load broadcasts for this hashtag");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [decodedTag]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchPosts(page + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, page, fetchPosts]);

  useEffect(() => {
    fetchPosts(0, true);
  }, [decodedTag, fetchPosts]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <PublicNavbar />
      
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        {/* Header Block */}
        <div className="flex flex-col gap-4 mb-8">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground self-start transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight bg-gradient-to-r from-indigo-500 to-primary bg-clip-text text-transparent">
              #{decodedTag}
            </h1>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-secondary px-3 py-1 rounded-full border border-border">
              {posts.length} {posts.length === 1 ? "Broadcast" : "Broadcasts"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-xl">
            Viewing updates and community activity tagged with <span className="font-bold text-foreground">#{decodedTag}</span>.
          </p>
        </div>

        {/* Timeline Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Retrieving updates...</p>
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                onDelete={(postId) => setPosts(prev => prev.filter(p => p.id !== postId))}
              />
            ))}

            {/* Infinite Scroll Sentinel & Loader */}
            <div ref={lastPostElementRef} className="py-6 flex justify-center items-center">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Synching timeline...
                </div>
              ) : hasMore ? (
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 animate-pulse">
                  Scanning for older updates...
                </div>
              ) : (
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
                  Transmission complete. You have read all updates.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-[2rem] p-12 text-center shadow-sm space-y-4">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-black uppercase tracking-tight text-foreground">No updates found</h3>
            <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
              No broadcasts have been tagged with <span className="font-bold text-foreground">#{decodedTag}</span> yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
