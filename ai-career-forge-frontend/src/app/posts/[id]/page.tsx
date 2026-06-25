"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import PublicNavbar from "@/components/PublicNavbar";
import api from "@/lib/api";
import { toast } from "sonner";
import PostCard, { Post } from "@/components/PostCard";

export default function PostDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const { user, isAuthenticated } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserProfile();
    }
  }, [isAuthenticated]);

  const fetchUserProfile = async () => {
    try {
      const res = await api.get("/profile");
      setProfile(res.data);
    } catch (err) {
      console.error("Failed to load user profile:", err);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  // Real-time post count updates via WebSocket
  useEffect(() => {
    const handlePostUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.postId || detail.postId !== postId) return;
      setPost(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          likesCount: detail.likesCount ?? prev.likesCount,
          likedUserIds: detail.likedUserIds ?? prev.likedUserIds,
          reactions: detail.reactions ?? prev.reactions,
        };
      });
      // Re-fetch full post to get updated comments list
      if (detail.commentsCount !== undefined) {
        api.get(`/posts/${postId}`).then(res => {
          setPost(res.data);
        }).catch(() => {});
      }
    };
    window.addEventListener('zenith-post-update', handlePostUpdate);
    return () => window.removeEventListener('zenith-post-update', handlePostUpdate);
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      // Record view and retrieve post data
      const res = await api.post(`/posts/${postId}/view`);
      setPost(res.data);
    } catch (err) {
      console.warn("Failed to record post view, falling back to direct GET fetch:", err);
      try {
        const res = await api.get(`/posts/${postId}`);
        setPost(res.data);
      } catch (getErr) {
        console.error("Failed to fetch post details:", getErr);
        toast.error("Failed to load post details");
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background font-sans pb-24 md:pb-0">
      <PublicNavbar />

      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-10 pb-20">
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Timeline
        </Link>

        {loading ? (
          <div className="flex justify-center items-center py-20 gap-2 text-muted-foreground text-xs font-bold bg-card border border-border rounded-[2rem]">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            Syncing post data...
          </div>
        ) : post ? (
          <div className="space-y-6">
            <PostCard 
              post={post}
              initialCommentsExpanded={true}
              userAvatar={profile?.profilePhotoUrl}
              onDelete={() => router.push("/")}
            />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-[2.5rem] p-12 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Post Not Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                The requested broadcast node could not be loaded or does not exist.
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
