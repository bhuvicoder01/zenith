"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Heart, Trash2, Link2, FileText, Send, Loader2, 
  ExternalLink, Sparkles, AlertCircle, File, ArrowLeft, MessageSquare,
  Edit2, Eye, CornerDownRight, BarChart3, Image as ImageIcon, Video
} from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import PublicNavbar from "@/components/PublicNavbar";
import api from "@/lib/api";
import { toast } from "sonner";
import MentionInput from "@/components/MentionInput";
import GifStickerPicker from "@/components/GifStickerPicker";
import { ClickableMedia } from "@/components/ImageLightbox";

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
  mentionedUserIds?: string[];
  likedUserIds?: string[];
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
  videoUrl?: string;
  linkUrl?: string;
  createdAt: string;
  likesCount: number;
  viewsCount: number;
  likedUserIds: string[];
  comments?: Comment[];
  reactions?: Record<string, string>;
}

export default function PostDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const { user, isAuthenticated } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [commentMentions, setCommentMentions] = useState<string[]>([]);
  const [showReactions, setShowReactions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Threading / Reply states
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyMentions, setReplyMentions] = useState<string[]>([]);
  const [replyTargetUser, setReplyTargetUser] = useState<{ id: string; name: string; username?: string } | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showCommentGifPicker, setShowCommentGifPicker] = useState(false);
  const [gifPickerParentCommentId, setGifPickerParentCommentId] = useState<string | null>(null);

  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const authorMention: any[] = [];

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

  const REACTION_EMOJIS = ["👍", "❤️", "👏", "💡", "😆", "🤝"];

  const handleReact = async (emoji: string) => {
    if (!isAuthenticated) {
      toast.error("Please login to react to posts", {
        action: {
          label: "Login",
          onClick: () => router.push("/auth/login")
        }
      });
      return;
    }
    if (!post) return;

    // Optimistic Update
    const isAlreadySelected = post.reactions?.[user?.id || ""] === emoji;
    const newReactions = { ...(post.reactions || {}) };
    let newLikes = [...(post.likedUserIds || [])];

    if (isAlreadySelected) {
      delete newReactions[user?.id || ""];
      newLikes = newLikes.filter(id => id !== user?.id);
    } else {
      newReactions[user?.id || ""] = emoji;
      if (!newLikes.includes(user?.id || "")) {
        newLikes.push(user?.id || "");
      }
    }

    setPost({
      ...post,
      reactions: newReactions,
      likedUserIds: newLikes,
      likesCount: newLikes.length
    });
    setShowReactions(false);

    try {
      const res = await api.post(`/posts/${postId}/react?emoji=${encodeURIComponent(emoji)}`);
      setPost(res.data);
    } catch (err) {
      console.error("Failed to react to post:", err);
      fetchPost(); // Revert
    }
  };

  const handleLikePost = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to react to posts", {
        action: {
          label: "Login",
          onClick: () => router.push("/auth/login")
        }
      });
      return;
    }
    if (!post) return;

    // Optimistic Update
    const hasLiked = post.likedUserIds?.includes(user?.id || "") || false;
    let newLikes = [...(post.likedUserIds || [])];
    const newReactions = { ...(post.reactions || {}) };

    if (hasLiked) {
      newLikes = newLikes.filter(id => id !== user?.id);
      delete newReactions[user?.id || ""];
    } else {
      newLikes.push(user?.id || "");
      newReactions[user?.id || ""] = "👍";
    }

    setPost({
      ...post,
      likedUserIds: newLikes,
      likesCount: newLikes.length,
      reactions: newReactions
    });

    try {
      await api.post(`/posts/${postId}/like`);
    } catch (err) {
      console.error("Failed to like post:", err);
      fetchPost(); // Revert
    }
  };

  const sendCommentGifOrSticker = async (url: string, type: "gif" | "sticker") => {
    if (!post) return;
    const content = type === "gif" ? `[GIF]${url}` : `[STICKER]${url}`;
    const parentCommentId = gifPickerParentCommentId;

    if (parentCommentId) {
      setSubmittingReply(true);
      try {
        const res = await api.post(`/posts/${postId}/comments`, {
          content,
          parentCommentId,
          replyToUserId: replyTargetUser?.id,
          replyToUserName: replyTargetUser?.name,
          mentionedUserIds: []
        });
        setPost(res.data);
        setReplyContent("");
        setReplyMentions([]);
        setReplyingToCommentId(null);
        setReplyTargetUser(null);
        toast.success("Reply submitted successfully");
      } catch (err) {
        console.error("Failed to add reply:", err);
        toast.error("Failed to submit reply");
      } finally {
        setSubmittingReply(false);
        setGifPickerParentCommentId(null);
      }
    } else {
      setSubmitting(true);
      try {
        const res = await api.post(`/posts/${postId}/comments`, { 
          content,
          mentionedUserIds: []
        });
        setPost(res.data);
        setNewComment("");
        setCommentMentions([]);
        toast.success("Comment added successfully");
      } catch (err) {
        console.error("Failed to add comment:", err);
        toast.error("Failed to submit comment");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/posts/${postId}/comments`, { 
        content: newComment,
        mentionedUserIds: commentMentions
      });
      setPost(res.data);
      setNewComment("");
      setCommentMentions([]);
      toast.success("Comment added successfully");
    } catch (err) {
      console.error("Failed to add comment:", err);
      toast.error("Failed to submit comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (parentCommentId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !replyTargetUser) return;

    setSubmittingReply(true);
    try {
      const res = await api.post(`/posts/${postId}/comments`, {
        content: replyContent,
        parentCommentId,
        replyToUserId: replyTargetUser.id,
        replyToUserName: replyTargetUser.name,
        mentionedUserIds: replyMentions
      });
      setPost(res.data);
      setReplyContent("");
      setReplyMentions([]);
      setReplyingToCommentId(null);
      setReplyTargetUser(null);
      toast.success("Reply submitted successfully");
    } catch (err) {
      console.error("Failed to add reply:", err);
      toast.error("Failed to submit reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await api.delete(`/posts/${postId}/comments/${commentId}`);
      setPost(res.data);
      toast.success("Comment deleted successfully");
    } catch (err) {
      console.error("Failed to delete comment:", err);
      toast.error("Comment deletion failed");
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      toast.error("Please log in to like comments");
      return;
    }
    try {
      const res = await api.post(`/posts/${postId}/comments/${commentId}/like`);
      setPost(res.data);
    } catch (err) {
      console.error("Failed to like comment:", err);
      toast.error("Failed to like comment");
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await api.delete(`/posts/${postId}`);
      toast.success("Post deleted successfully");
      router.push("/");
    } catch (err) {
      console.error("Failed to delete post:", err);
      toast.error("Failed to delete post");
    }
  };

  const startEditing = () => {
    if (!post) return;
    setIsEditing(true);
    setEditContent(post.content || "");
    setEditLinkUrl(post.linkUrl || "");
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditContent("");
    setEditLinkUrl("");
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      toast.error("Content cannot be empty");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await api.put(`/posts/${postId}`, {
        content: editContent,
        linkUrl: editLinkUrl
      });
      setPost(res.data);
      cancelEditing();
      toast.success("Post updated successfully");
    } catch (err) {
      console.error("Failed to update post:", err);
      toast.error("Failed to update post");
    } finally {
      setSavingEdit(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const past = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      };
      
      if (past.getFullYear() !== now.getFullYear()) {
        options.year = "numeric";
      }
      
      return past.toLocaleString(undefined, options);
    } catch (e) {
      return "Recently";
    }
  };

  const renderContentWithMentions = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <Link 
            key={idx} 
            href={`/public/profiles/${username}`}
            className="text-primary hover:underline font-bold"
          >
            {part}
          </Link>
        );
      }
      return part;
    });
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
            {/* Post Card */}
            <article className="bg-card border border-border rounded-[2rem] p-6 shadow-sm space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Link href={`/public/profiles/${post.authorUsername || post.userId}`} className="flex items-center gap-3 hover:opacity-85 transition-opacity group">
                  <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-black uppercase border border-border/80 relative overflow-hidden group-hover:border-primary/50 transition-colors">
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(post.authorName)
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight text-foreground leading-none group-hover:underline">{post.authorName}</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1 leading-none">{post.authorHeadline || "Zenith Member"}</p>
                  </div>
                </Link>

                <div className="flex items-center gap-3 text-xs text-muted-foreground font-semibold">
                  <span>{formatTimestamp(post.createdAt)}</span>
                  
                  {/* Delete capability if owner/admin */}
                  {(user?.id === post.userId || user?.role === 'ADMIN') && (
                    <div className="flex items-center gap-1.5">
                      {user?.id === post.userId && (
                        <>
                          <Link 
                            href={`/posts/${post.id}/analytics`}
                            className="p-1 text-muted-foreground hover:text-primary transition-colors flex items-center justify-center"
                            title="View Analytics"
                          >
                            <BarChart3 className="w-4.5 h-4.5 text-indigo-500" />
                          </Link>
                          <button 
                            onClick={startEditing}
                            className="p-1 text-muted-foreground hover:text-primary transition-colors"
                            title="Edit Post"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={handleDeletePost}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit state or standard view */}
              {isEditing ? (
                <div className="space-y-3 p-4 bg-secondary/15 rounded-2xl border border-border/60">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full bg-transparent border-0 focus:ring-0 text-sm focus:outline-none text-foreground font-medium resize-none placeholder:text-muted-foreground/60"
                    placeholder="Edit your broadcast update..."
                  />
                  <div className="relative">
                    <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="url"
                      value={editLinkUrl}
                      onChange={(e) => setEditLinkUrl(e.target.value)}
                      placeholder="https://example.com/edit-link"
                      className="w-full bg-secondary/30 border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground font-bold"
                    />
                  </div>
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3.5 py-2 bg-secondary border border-border text-foreground rounded-xl font-bold hover:bg-secondary/80"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={savingEdit || !editContent.trim()}
                      className="px-4 py-2 bg-foreground text-background rounded-xl font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {savingEdit ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving...
                        </>
                      ) : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Text content */}
                  {post.content && (
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-line font-medium">
                      {renderContentWithMentions(post.content)}
                    </p>
                  )}

                  {/* Image attachment */}
                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-secondary/20">
                      <img 
                        src={post.mediaUrls[0]} 
                        alt="Post Attachment" 
                        className="w-full h-auto max-h-[500px] object-cover"
                      />
                    </div>
                  )}

                  {/* Video attachment */}
                  {post.videoUrl && (
                    <div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-black relative">
                      <AutopauseVideo 
                        src={post.videoUrl} 
                        className="w-full h-auto max-h-[500px] object-contain"
                      />
                    </div>
                  )}

                  {/* PDF attachment */}
                  {post.pdfUrl && (
                    <div className="flex items-center justify-between p-4 bg-secondary/20 border border-border rounded-2xl">
                      <div className="flex items-center gap-3 text-xs">
                        <File className="w-8 h-8 text-red-500 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-foreground truncate max-w-[250px]">Project Document</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">Embedded PDF Attachment</p>
                        </div>
                      </div>
                      <a 
                        href={post.pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5"
                      >
                        View PDF
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Link attachment */}
                  {post.linkUrl && (
                    <a 
                      href={post.linkUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block p-4 border border-border bg-secondary/15 rounded-2xl hover:bg-secondary/30 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4.5 h-4.5 text-primary group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-foreground truncate max-w-[280px] group-hover:underline">{post.linkUrl}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </a>
                  )}
                </>
              )}

              {/* Interactions */}
              <div className="flex items-center gap-4 pt-2 border-t border-border/40 text-xs">
                <div 
                  className="relative"
                  onMouseEnter={() => setShowReactions(true)}
                  onMouseLeave={() => setShowReactions(false)}
                >
                  {showReactions && (
                    <div className="absolute bottom-full left-0 pb-2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="flex items-center gap-2 bg-card border border-border p-2 rounded-2xl shadow-xl">
                        {REACTION_EMOJIS.map(emoji => (
                          <button 
                            key={emoji} 
                            type="button"
                            onClick={() => handleReact(emoji)} 
                            className="hover:scale-125 transition-transform text-lg p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleLikePost}
                    type="button"
                    className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-full transition-all ${
                      post.likedUserIds?.includes(user?.id || "")
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {(() => {
                      const uniqueReactions = Array.from(new Set(Object.values(post.reactions || {}))).slice(0, 3);
                      if (uniqueReactions.length > 0) {
                        return (
                          <div className="flex -space-x-1 items-center mr-0.5">
                            {uniqueReactions.map((emoji, idx) => (
                              <span key={idx} className="text-xs select-none" style={{ zIndex: 10 - idx }}>
                                {emoji}
                              </span>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {(() => {
                      const userReaction = post.reactions?.[user?.id || ""];
                      if (userReaction) {
                        return <span className="text-sm select-none">{userReaction}</span>;
                      }
                      return <Heart className={`w-4 h-4 transition-transform ${post.likedUserIds?.includes(user?.id || "") ? 'fill-current text-rose-500 scale-110' : ''}`} />;
                    })()}

                    <span>{post.likesCount}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground font-bold px-3 py-1.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>
                    {post.comments?.length || 0} {post.comments?.length === 1 ? "Comment" : "Comments"}
                  </span>
                </div>

                {/* Analytics Views Counter */}
                {user?.id === post.userId ? (
                  <Link
                    href={`/posts/${post.id}/analytics`}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-indigo-500 font-bold px-3 py-1.5 transition-colors cursor-pointer"
                    title="View post analytics"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{post.viewsCount || 0} Views</span>
                  </Link>
                ) : (
                  <div 
                    className="flex items-center gap-1.5 text-muted-foreground font-bold px-3 py-1.5 select-none"
                    title={`${post.viewsCount || 0} total node reads`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>{post.viewsCount || 0} Views</span>
                  </div>
                )}
              </div>
            </article>

            {/* Comments Thread Section */}
            <div className="bg-card border border-border rounded-[2rem] p-6 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Discussion Thread</h3>

              {/* Add Comment Form */}
              {isAuthenticated ? (
                <form onSubmit={handleAddComment} className="flex gap-4 items-start">
                  <div className="w-9 h-9 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-bold uppercase text-foreground relative overflow-hidden border border-border">
                    {profile?.profilePhotoUrl ? (
                      <img src={profile.profilePhotoUrl} alt={user?.name || ""} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user?.name || "")
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <MentionInput
                      placeholder="Add to the discussion..."
                      value={newComment}
                      onChange={(val, mentions) => {
                        setNewComment(val);
                        setCommentMentions(mentions);
                      }}
                      initialMentions={authorMention}
                      rows={2}
                      className="w-full bg-secondary/20 border border-border rounded-2xl p-4 text-xs placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground font-medium"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGifPickerParentCommentId(null);
                          setShowCommentGifPicker(true);
                        }}
                        title="Add GIF or Sticker"
                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        GIF
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !newComment.trim()}
                        className="px-4 py-2 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:scale-100 transition-all shadow-sm"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Commenting...
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            Comment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="bg-secondary/20 border border-border rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                    <AlertCircle className="w-4.5 h-4.5 text-primary" />
                    Join the discussion on this broadcast node.
                  </div>
                  <Link 
                    href="/auth/login" 
                    className="px-4 py-2 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
                  >
                    Log In
                  </Link>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-6 pt-2 border-t border-border/40">
                {post.comments && post.comments.length > 0 ? (
                  (() => {
                    const rootComments = post.comments.filter(c => !c.parentCommentId) || [];
                    if (rootComments.length === 0) {
                      return (
                        <div className="text-center py-6 text-xs text-muted-foreground font-semibold">
                          No top-level comments yet. Start the conversation!
                        </div>
                      );
                    }
                    return rootComments.map((comment) => {
                      const replies = post.comments?.filter(c => c.parentCommentId === comment.id) || [];
                      return (
                        <div key={comment.id} className="space-y-4">
                          {/* Parent Comment */}
                          <div className="flex gap-3 items-start group">
                             <Link href={`/public/profiles/${comment.authorUsername || comment.userId}`} className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-xs font-black uppercase border border-border/80 relative overflow-hidden hover:opacity-85 transition-opacity">
                               {comment.authorAvatar ? (
                                 <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full object-cover" />
                               ) : (
                                 getInitials(comment.authorName)
                               )}
                             </Link>
                            <div className="flex-1 bg-secondary/15 rounded-2xl p-4 border border-border/40 space-y-1">
                              <div className="flex items-center justify-between">
                                <div>
                                   <Link href={`/public/profiles/${comment.authorUsername || comment.userId}`} className="text-xs font-black uppercase tracking-tight text-foreground hover:underline">
                                     {comment.authorName}
                                   </Link>
                                  {comment.authorHeadline && (
                                    <span className="text-[9px] text-muted-foreground font-semibold ml-2">
                                      • {comment.authorHeadline}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground font-semibold">
                                  <span>{formatTimestamp(comment.createdAt)}</span>

                                  <button
                                    onClick={() => handleLikeComment(comment.id)}
                                    className={`flex items-center gap-0.5 transition-colors hover:text-rose-500 ${
                                      comment.likedUserIds?.includes(user?.id || "") ? 'text-rose-500' : 'text-muted-foreground'
                                    }`}
                                    title="Like Comment"
                                  >
                                    <Heart className={`w-2.5 h-2.5 ${comment.likedUserIds?.includes(user?.id || "") ? 'fill-current' : ''}`} />
                                    <span>{comment.likedUserIds?.length || 0}</span>
                                  </button>
                                  
                                  {isAuthenticated && (
                                    <button
                                      onClick={() => {
                                        setReplyingToCommentId(comment.id);
                                        const handle = comment.authorUsername || comment.authorName.replace(/\s+/g, "_").toLowerCase();
                                        setReplyContent(`@${handle} `);
                                        setReplyTargetUser({ id: comment.userId, name: comment.authorName, username: comment.authorUsername || comment.authorName.replace(/\s+/g, "_").toLowerCase() });
                                      }}
                                      className="text-muted-foreground hover:text-foreground font-bold hover:underline"
                                    >
                                      Reply
                                    </button>
                                  )}

                                  {/* Delete Comment Button */}
                                  {(user?.id === comment.userId || user?.id === post.userId || user?.role === 'ADMIN') && (
                                    <button 
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
                                      title="Delete Comment"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                </div>
                                 {comment.content?.startsWith("[GIF]") ? (
                                   <ClickableMedia src={comment.content.slice(5)} alt="GIF" type="gif" />
                                 ) : comment.content?.startsWith("[STICKER]") ? (
                                   <ClickableMedia src={comment.content.slice(9)} alt="Sticker" type="sticker" />
                                 ) : (
                                   <p className="text-xs text-foreground leading-relaxed whitespace-pre-line font-medium">
                                     {renderContentWithMentions(comment.content)}
                                   </p>
                                 )}
                              </div>
                            </div>

                            {/* Nested Replies */}
                            {replies.length > 0 && (
                              <div className="pl-6 md:pl-10 space-y-3">
                                {replies.map((reply) => (
                                  <div key={reply.id} className="flex gap-2 items-start group">
                                    <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground/45 mt-2 flex-shrink-0" />
                                     <Link href={`/public/profiles/${reply.authorUsername || reply.userId}`} className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[10px] font-black uppercase border border-border/80 relative overflow-hidden hover:opacity-85 transition-opacity">
                                       {reply.authorAvatar ? (
                                         <img src={reply.authorAvatar} alt={reply.authorName} className="w-full h-full object-cover" />
                                       ) : (
                                         getInitials(reply.authorName)
                                       )}
                                     </Link>
                                    <div className="flex-1 bg-secondary/10 rounded-2xl p-3.5 border border-border/30 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <div className="flex flex-wrap items-center gap-x-1.5">
                                           <Link href={`/public/profiles/${reply.authorUsername || reply.userId}`} className="text-[11px] font-black uppercase tracking-tight text-foreground hover:underline">{reply.authorName}</Link>
                                          {reply.authorHeadline && (
                                            <span className="text-[8px] text-muted-foreground font-semibold">
                                              • {reply.authorHeadline}
                                            </span>
                                          )}
                                          {reply.replyToUserName && (
                                            <span className="text-[8px] bg-secondary/70 px-1.5 py-0.5 rounded text-muted-foreground/80 font-bold uppercase tracking-wider">
                                              Replying to @{reply.replyToUserName}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-semibold">
                                          <span>{formatTimestamp(reply.createdAt)}</span>

                                          <button
                                            onClick={() => handleLikeComment(reply.id)}
                                            className={`flex items-center gap-0.5 transition-colors hover:text-rose-500 ${
                                              reply.likedUserIds?.includes(user?.id || "") ? 'text-rose-500' : 'text-muted-foreground'
                                            }`}
                                            title="Like Reply"
                                          >
                                            <Heart className={`w-2 h-2 ${reply.likedUserIds?.includes(user?.id || "") ? 'fill-current' : ''}`} />
                                            <span>{reply.likedUserIds?.length || 0}</span>
                                          </button>
                                          
                                          {isAuthenticated && (
                                            <button
                                              onClick={() => {
                                                setReplyingToCommentId(comment.id);
                                                const handle = reply.authorUsername || reply.authorName.replace(/\s+/g, "_").toLowerCase();
                                                setReplyContent(`@${handle} `);
                                                setReplyTargetUser({ id: reply.userId, name: reply.authorName, username: reply.authorUsername || reply.authorName.replace(/\s+/g, "_").toLowerCase() });
                                              }}
                                              className="text-muted-foreground hover:text-foreground font-bold hover:underline"
                                          >
                                            Reply
                                          </button>
                                        )}

                                        {(user?.id === reply.userId || user?.id === post.userId || user?.role === 'ADMIN') && (
                                          <button 
                                            onClick={() => handleDeleteComment(reply.id)}
                                            className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                     {reply.content?.startsWith("[GIF]") ? (
                                       <ClickableMedia src={reply.content.slice(5)} alt="GIF" type="gif" />
                                     ) : reply.content?.startsWith("[STICKER]") ? (
                                       <ClickableMedia src={reply.content.slice(9)} alt="Sticker" type="sticker" />
                                     ) : (
                                       <p className="text-xs text-foreground leading-relaxed whitespace-pre-line font-medium">
                                         {renderContentWithMentions(reply.content)}
                                       </p>
                                     )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Inline Reply Form */}
                          {replyingToCommentId === comment.id && (
                            <div className="pl-6 md:pl-10">
                              <form onSubmit={(e) => handleAddReply(comment.id, e)} className="flex gap-3 items-start bg-secondary/5 p-4 border border-border/40 rounded-2xl">
                                <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[10px] font-black uppercase border border-border relative overflow-hidden">
                                  {profile?.profilePhotoUrl ? (
                                    <img src={profile.profilePhotoUrl} alt={user?.name || ""} className="w-full h-full object-cover" />
                                  ) : (
                                    getInitials(user?.name || "")
                                  )}
                                </div>
                                <div className="flex-1 space-y-3">
                                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Replying to <span className="text-foreground">@{replyTargetUser?.username || replyTargetUser?.name}</span>
                                  </div>
                                  <MentionInput
                                    placeholder="Write a reply..."
                                    value={replyContent}
                                    onChange={(val, mentions) => {
                                      setReplyContent(val);
                                      setReplyMentions(mentions);
                                    }}
                                    initialMentions={replyTargetUser ? [{
                                      userId: replyTargetUser.id,
                                      fullName: replyTargetUser.name,
                                      username: (replyTargetUser as any).username
                                    }] : []}
                                    rows={1.5}
                                    autoFocus={true}
                                    className="w-full bg-secondary/20 border border-border rounded-xl p-3 text-xs placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground font-medium"
                                  />
                                  <div className="flex justify-end gap-2 text-[10px]">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGifPickerParentCommentId(comment.id);
                                        setShowCommentGifPicker(true);
                                      }}
                                      title="Add GIF or Sticker"
                                      className="px-3.5 py-1.5 bg-secondary/40 hover:bg-secondary/70 border border-border text-muted-foreground hover:text-foreground font-bold rounded-full transition-colors flex items-center gap-1"
                                    >
                                      <ImageIcon className="w-3 h-3" />
                                      GIF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReplyingToCommentId(null);
                                        setReplyContent("");
                                        setReplyTargetUser(null);
                                      }}
                                      className="px-3.5 py-1.5 bg-secondary border border-border text-foreground font-bold rounded-full hover:bg-secondary/80 transition-colors uppercase tracking-wider"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={submittingReply || !replyContent.trim()}
                                      className="px-4.5 py-1.5 bg-foreground text-background font-black rounded-full hover:opacity-90 disabled:opacity-50 transition-all uppercase tracking-widest flex items-center gap-1.5"
                                    >
                                      {submittingReply ? (
                                        <>
                                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                          Replying...
                                        </>
                                      ) : "Reply"}
                                    </button>
                                  </div>
                                </div>
                              </form>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground font-semibold">
                    No comments yet. Start the conversation!
                  </div>
                )}
              </div>
            </div>
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
      {showCommentGifPicker && (
        <GifStickerPicker
          onSelect={(url, type) => {
            sendCommentGifOrSticker(url, type);
            setShowCommentGifPicker(false);
          }}
          onClose={() => {
            setShowCommentGifPicker(false);
            setGifPickerParentCommentId(null);
          }}
        />
      )}
      </div>
    </div>
  );
}

// Autopause & Autoplay Video component — plays muted when scrolled into view, pauses when out
function AutopauseVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            // Autoplay muted when scrolled into view
            video.muted = true;
            video.play().catch(() => {});
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.4) {
            video.pause();
          }
        });
      },
      {
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
      }
    );

    observer.observe(video);

    return () => {
      observer.unobserve(video);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      muted
      playsInline
      className={className}
      preload="metadata"
    />
  );
}
