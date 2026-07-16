"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Heart, Trash2, Link2, FileText, Image as ImageIcon, Loader2, 
  ExternalLink, MessageSquare, Edit2, Eye, Share2, CornerDownRight, Send, Pause, Play, Volume2, VolumeX, Minimize, Maximize, X, Video, Paperclip
} from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import api, { BACKEND_URL } from "@/lib/api";
import { toast } from "sonner";
import MentionInput from "./MentionInput";
import GifStickerPicker from "./GifStickerPicker";
import { ClickableMedia, ImageLightbox } from "./ImageLightbox";

const REACTION_EMOJIS = ["👍", "❤️", "👏", "💡", "😆", "🤝"];

export interface Comment {
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

export interface Post {
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

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
  onShare?: (post: Post) => void;
  initialCommentsExpanded?: boolean;
  userAvatar?: string;
}

export default function PostCard({ 
  post, 
  onDelete, 
  onShare, 
  initialCommentsExpanded = false,
  userAvatar
}: PostCardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  // Local Post States
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [likedUserIds, setLikedUserIds] = useState<string[]>(post.likedUserIds);
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [postContent, setPostContent] = useState(post.content || "");
  const [postLinkUrl, setPostLinkUrl] = useState(post.linkUrl || "");
  const [postMediaUrls, setPostMediaUrls] = useState<string[]>(post.mediaUrls || []);
  const [postPdfUrl, setPostPdfUrl] = useState(post.pdfUrl || "");
  const [postPdfName, setPostPdfName] = useState(post.pdfName || "");
  const [postVideoUrl, setPostVideoUrl] = useState(post.videoUrl || "");
  const [reactions, setReactions] = useState<Record<string, string>>(post.reactions || {});

  // UI States
  const [expanded, setExpanded] = useState(initialCommentsExpanded);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [editLinkUrl, setEditLinkUrl] = useState(post.linkUrl || "");
  const [editPdfName, setEditPdfName] = useState(post.pdfName || "");
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editMediaPreview, setEditMediaPreview] = useState<string | null>(null);
  const [editPdfPreview, setEditPdfPreview] = useState<string | null>(null);
  const [editVideoPreview, setEditVideoPreview] = useState<string | null>(null);
  const [deleteMedia, setDeleteMedia] = useState(false);
  const [deletePdf, setDeletePdf] = useState(false);
  const [deleteVideo, setDeleteVideo] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const startEditing = () => {
    setEditContent(postContent);
    setEditLinkUrl(postLinkUrl);
    setEditPdfName(postPdfName);
    setEditMediaFile(null);
    setEditPdfFile(null);
    setEditVideoFile(null);
    setEditMediaPreview(postMediaUrls[0] || null);
    setEditPdfPreview(postPdfUrl || null);
    setEditVideoPreview(postVideoUrl || null);
    setDeleteMedia(false);
    setDeletePdf(false);
    setDeleteVideo(false);
    setIsEditing(true);
  };

  const handleEditMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("File must be an image");
        return;
      }
      setEditMediaFile(file);
      setEditMediaPreview(URL.createObjectURL(file));
      setDeleteMedia(false);
    }
  };

  const handleEditPdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("File must be a PDF document");
        return;
      }
      setEditPdfFile(file);
      setEditPdfPreview(URL.createObjectURL(file));
      setDeletePdf(false);
    }
  };

  const handleEditVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        toast.error("File must be a video");
        return;
      }
      setEditVideoFile(file);
      setEditVideoPreview(URL.createObjectURL(file));
      setDeleteVideo(false);
    }
  };
  const [showReactions, setShowReactions] = useState(false);

  // Comments / Replies States
  const [commentText, setCommentText] = useState("");
  const [commentMentions, setCommentMentions] = useState<string[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCommentGifPicker, setShowCommentGifPicker] = useState(false);

  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyMentions, setReplyMentions] = useState<string[]>([]);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showReplyGifPicker, setShowReplyGifPicker] = useState(false);

  // Reacting Users Modal States
  const [showReactingUsersModal, setShowReactingUsersModal] = useState(false);
  const [pdfLightboxOpen, setPdfLightboxOpen] = useState(false);
  const [reactingUsers, setReactingUsers] = useState<any[]>([]);
  const [loadingReactingUsers, setLoadingReactingUsers] = useState(false);

  // Sync state when props change (in case of real-time WebSocket updates)
  useEffect(() => {
    setLikesCount(post.likesCount);
    setLikedUserIds(post.likedUserIds);
    setComments(post.comments || []);
    setPostContent(post.content || "");
    setPostLinkUrl(post.linkUrl || "");
    setPostMediaUrls(post.mediaUrls || []);
    setPostPdfUrl(post.pdfUrl || "");
    setPostPdfName(post.pdfName || "");
    setPostVideoUrl(post.videoUrl || "");
    setReactions(post.reactions || {});
  }, [post]);

  // Long-press and touch optimization for reactions on mobile
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const reactionContainerRef = useRef<HTMLDivElement>(null);

  const editMediaInputRef = useRef<HTMLInputElement>(null);
  const editPdfInputRef = useRef<HTMLInputElement>(null);
  const editVideoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      if (reactionContainerRef.current && !reactionContainerRef.current.contains(e.target as Node)) {
        setShowReactions(false);
      }
    };
    
    if (showReactions) {
      document.addEventListener("click", handleDocumentClick);
      document.addEventListener("touchstart", handleDocumentClick);
    }
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("touchstart", handleDocumentClick);
    };
  }, [showReactions]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Record starting touch coordinates
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressRef.current = false;

    // Start timer for long press
    touchTimeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowReactions(true);
      if (navigator.vibrate) {
        navigator.vibrate(50); // Premium haptic feedback
      }
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPosRef.current.x;
    const dy = touch.clientY - touchStartPosRef.current.y;
    // Cancel the timer if the finger moves significantly (e.g. scrolling)
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
    if (isLongPressRef.current) {
      // It was a long press, reactions tray is open. Prevent click triggering.
      e.preventDefault();
    } else {
      // Normal quick tap. Trigger like and prevent default click trigger to avoid double tap bug.
      e.preventDefault();
      handleLikePost();
    }
    touchStartPosRef.current = null;
  };

  const handleOpenReactingUsers = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to see who reacted", {
        action: {
          label: "Login",
          onClick: () => router.push("/auth/login")
        }
      });
      return;
    }
    
    setShowReactingUsersModal(true);
    setLoadingReactingUsers(true);
    try {
      const res = await api.get(`/posts/${post.id}/reacting-users`);
      setReactingUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch reacting users:", err);
      toast.error("Could not load reactions details");
    } finally {
      setLoadingReactingUsers(false);
    }
  };

  const getImageUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) {
      return url;
    }
    const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
    return `${BACKEND_URL}/public/assets/${cleanUrl}`;
  };

  const isPostLiked = likedUserIds.includes(user?.id || "");

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

    // Optimistic Update
    const isAlreadySelected = reactions[user?.id || ""] === emoji;
    const newReactions = { ...reactions };
    let newLikes = [...likedUserIds];

    if (isAlreadySelected) {
      delete newReactions[user?.id || ""];
      newLikes = newLikes.filter(id => id !== user?.id);
    } else {
      newReactions[user?.id || ""] = emoji;
      if (!newLikes.includes(user?.id || "")) {
        newLikes.push(user?.id || "");
      }
    }

    setReactions(newReactions);
    setLikedUserIds(newLikes);
    setLikesCount(newLikes.length);
    setShowReactions(false);

    try {
      const res = await api.post(`/posts/${post.id}/react?emoji=${encodeURIComponent(emoji)}`);
      setLikesCount(res.data.likesCount);
      setLikedUserIds(res.data.likedUserIds || []);
      setReactions(res.data.reactions || {});
    } catch (err) {
      console.error("Failed to react to post:", err);
      // Revert if failed
      setLikedUserIds(post.likedUserIds);
      setLikesCount(post.likesCount);
      setReactions(post.reactions || {});
      toast.error("Failed to update reaction");
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

    // Optimistic Update
    const originallyLiked = isPostLiked;
    const newReactions = { ...reactions };
    let newLikes = [...likedUserIds];

    if (originallyLiked) {
      newLikes = newLikes.filter(id => id !== user?.id);
      delete newReactions[user?.id || ""];
    } else {
      newLikes.push(user?.id || "");
      newReactions[user?.id || ""] = "👍";
    }

    setLikedUserIds(newLikes);
    setLikesCount(newLikes.length);
    setReactions(newReactions);

    try {
      await api.post(`/posts/${post.id}/like`);
    } catch (err) {
      // Revert on error
      setLikedUserIds(post.likedUserIds);
      setLikesCount(post.likesCount);
      setReactions(post.reactions || {});
      toast.error("Failed to update like status");
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await api.delete(`/posts/${post.id}`);
      toast.success("Post deleted successfully");
      if (onDelete) onDelete(post.id);
    } catch (err) {
      toast.error("Failed to delete post");
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    const formData = new FormData();
    formData.append("content", editContent);
    formData.append("linkUrl", editLinkUrl);
    formData.append("pdfName", editPdfName);

    if (editMediaFile) {
      formData.append("media", editMediaFile);
    }
    if (editPdfFile) {
      formData.append("pdf", editPdfFile);
    }
    if (editVideoFile) {
      formData.append("video", editVideoFile);
    }

    formData.append("deleteMedia", deleteMedia ? "true" : "false");
    formData.append("deletePdf", deletePdf ? "true" : "false");
    formData.append("deleteVideo", deleteVideo ? "true" : "false");

    try {
      const res = await api.put(`/posts/${post.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setPostContent(res.data.content || editContent);
      setPostLinkUrl(res.data.linkUrl || editLinkUrl);
      setPostMediaUrls(res.data.mediaUrls || []);
      setPostPdfUrl(res.data.pdfUrl || "");
      setPostPdfName(res.data.pdfName || "");
      setPostVideoUrl(res.data.videoUrl || "");
      setIsEditing(false);
      toast.success("Broadcast update saved");
    } catch (err) {
      toast.error("Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleComments = async () => {
    const nextState = !expanded;
    setExpanded(nextState);
    if (nextState) {
      try {
        const res = await api.get(`/posts/${post.id}`);
        setComments(res.data.comments || []);
      } catch (err) {
        console.error("Failed to sync comments list:", err);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/posts/${post.id}/comments`, {
        content: commentText,
        mentionedUserIds: commentMentions
      });
      setComments(res.data.comments || []);
      setCommentText("");
      setCommentMentions([]);
      toast.success("Comment added");
    } catch (err) {
      toast.error("Failed to submit comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSelectCommentGif = async (gifUrl: string) => {
    setSubmittingComment(true);
    try {
      const res = await api.post(`/posts/${post.id}/comments`, {
        content: gifUrl,
        mentionedUserIds: []
      });
      setComments(res.data.comments || []);
      setShowCommentGifPicker(false);
      toast.success("GIF added to comments");
    } catch (err) {
      toast.error("Failed to send GIF comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      toast.error("Please login to like comments");
      return;
    }
    // Optimistic Update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const liked = c.likedUserIds.includes(user?.id || "");
        return {
          ...c,
          likedUserIds: liked 
            ? c.likedUserIds.filter(id => id !== user?.id)
            : [...c.likedUserIds, user?.id || ""]
        };
      }
      return c;
    }));

    try {
      const res = await api.post(`/posts/${post.id}/comments/${commentId}/like`);
      setComments(res.data.comments || []);
    } catch (err) {
      toast.error("Failed to toggle comment like");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await api.delete(`/posts/${post.id}/comments/${commentId}`);
      setComments(res.data.comments || []);
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await api.post(`/posts/${post.id}/comments`, {
        content: replyText,
        parentCommentId: replyingTo.id,
        replyToUserId: replyingTo.userId,
        replyToUserName: replyingTo.authorName,
        mentionedUserIds: replyMentions
      });
      setComments(res.data.comments || []);
      setReplyText("");
      setReplyMentions([]);
      setReplyingTo(null);
      toast.success("Reply posted");
    } catch (err) {
      toast.error("Failed to submit reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleSelectReplyGif = async (gifUrl: string) => {
    if (!replyingTo) return;
    setSubmittingReply(true);
    try {
      const res = await api.post(`/posts/${post.id}/comments`, {
        content: gifUrl,
        parentCommentId: replyingTo.id,
        replyToUserId: replyingTo.userId,
        replyToUserName: replyingTo.authorName,
        mentionedUserIds: []
      });
      setComments(res.data.comments || []);
      setShowReplyGifPicker(false);
      setReplyingTo(null);
      toast.success("GIF added to reply");
    } catch (err) {
      toast.error("Failed to send GIF reply");
    } finally {
      setSubmittingReply(false);
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
    const parts = text.split(/(https?:\/\/[^\s]+|@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("http://") || part.startsWith("https://")) {
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline font-semibold break-all text-xs sm:text-sm"
          >
            {part}
          </a>
        );
      }
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <Link
            key={idx}
            href={`/public/profiles/${username}`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline font-bold"
          >
            {part}
          </Link>
        );
      }
      if (part.startsWith("#")) {
        const tag = part.slice(1);
        return (
          <Link
            key={idx}
            href={`/tags/${tag}`}
            onClick={(e) => e.stopPropagation()}
            className="text-indigo-500 dark:text-indigo-400 hover:underline font-bold"
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const renderCommentContent = (content: string) => {
    if (content.startsWith("[GIF]") || content.startsWith("[STICKER]")) {
      const url = content.replace(/^\[GIF\]|\[STICKER\]/, "");
      return (
        <div className="rounded-xl overflow-hidden max-w-[200px] mt-1 bg-secondary border border-border">
          <img src={url} alt="GIF comment" className="w-full h-auto object-contain" />
        </div>
      );
    }
    return <p className="leading-relaxed mt-0.5 whitespace-pre-line text-foreground/90">{renderContentWithMentions(content)}</p>;
  };

  const rootComments = comments.filter(c => !c.parentCommentId);
  const getReplies = (commentId: string) => comments.filter(c => c.parentCommentId === commentId);

  const oldestComment = rootComments.reduce((oldest, current) => {
    if (!oldest) return current;
    return new Date(current.createdAt).getTime() < new Date(oldest.createdAt).getTime() ? current : oldest;
  }, null as any);
  const firstCommentId = oldestComment?.id;

  return (
    <article className="bg-card border border-border rounded-[2rem] p-6 shadow-sm space-y-4 hover:border-border/80 transition-all animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/public/profiles/${post.authorUsername || post.userId}`} className="flex items-center gap-3 hover:opacity-85 transition-opacity group">
          <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-black uppercase border border-border/80 relative overflow-hidden group-hover:border-primary/50 transition-colors">
            {post.authorAvatar ? (
              <img src={getImageUrl(post.authorAvatar)} alt={post.authorName} className="w-full h-full object-cover" />
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
          <Link href={`/posts/${post.id}`} className="hover:underline">
            {formatTimestamp(post.createdAt)}
          </Link>
          
          {(user?.id === post.userId || user?.role === 'ADMIN') && (
            <div className="flex items-center gap-1.5">
              {user?.id === post.userId && (
                <button 
                  onClick={startEditing}
                  className="p-1 text-muted-foreground hover:text-primary transition-colors"
                  title="Edit Post"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
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

      {/* Editing State or View Mode */}
      {isEditing ? (
        <div className="space-y-4 p-4 bg-secondary/15 rounded-[2rem] border border-border/60">
          <MentionInput
            placeholder="Edit your broadcast update..."
            value={editContent}
            onChange={(val) => setEditContent(val)}
            rows={3}
            className="w-full bg-transparent border-0 focus:ring-0 text-sm focus:outline-none text-foreground font-medium resize-none placeholder:text-muted-foreground/60"
          />

          {/* Edit media previews */}
          <div className="space-y-3">
            {editMediaPreview && !deleteMedia && (
              <div className="relative rounded-2xl overflow-hidden border border-border bg-secondary/20 max-w-[200px]">
                <img src={editMediaPreview} alt="Image attachment" className="w-full h-auto max-h-[160px] object-cover" />
                <button
                  type="button"
                  onClick={() => { setDeleteMedia(true); setEditMediaFile(null); setEditMediaPreview(null); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {editVideoPreview && !deleteVideo && (
              <div className="relative rounded-2xl overflow-hidden border border-border bg-black max-w-[240px] p-2 flex items-center gap-2">
                <Video className="w-6 h-6 text-primary" />
                <span className="text-xs truncate max-w-[120px] font-bold text-foreground">
                  {editVideoFile ? editVideoFile.name : "Attached Video"}
                </span>
                <button
                  type="button"
                  onClick={() => { setDeleteVideo(true); setEditVideoFile(null); setEditVideoPreview(null); }}
                  className="ml-auto p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {editPdfPreview && !deletePdf && (
              <div className="border border-border rounded-2xl overflow-hidden bg-secondary/20">
                <div className="flex items-center justify-between px-3.5 py-2 bg-secondary/40 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs min-w-0">
                    <FileText className="w-5 h-5 text-red-500 shrink-0" />
                    <span className="font-bold text-foreground truncate max-w-[150px]">
                      {editPdfFile ? editPdfFile.name : "Attached PDF"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDeletePdf(true); setEditPdfFile(null); setEditPdfPreview(null); setEditPdfName(""); }}
                    className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-3.5 py-2 bg-secondary/10 border-b border-border/40 flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider shrink-0">Headline (Optional):</span>
                  <input
                    type="text"
                    placeholder="e.g. My Resume / Project Case Study"
                    value={editPdfName}
                    onChange={(e) => setEditPdfName(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none font-bold"
                  />
                </div>
                <iframe
                  src={editPdfPreview + "#view=FitH&toolbar=0&navpanes=0"}
                  className="w-full h-[200px] border-0"
                  title="Edit PDF Preview"
                />
              </div>
            )}
          </div>

          {/* Edit linkUrl */}
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

          {/* Media Attachments Toolbar inside edit state */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <input
              type="file"
              ref={editMediaInputRef}
              onChange={handleEditMediaChange}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={editPdfInputRef}
              onChange={handleEditPdfChange}
              accept="application/pdf"
              className="hidden"
            />
            <input
              type="file"
              ref={editVideoInputRef}
              onChange={handleEditVideoChange}
              accept="video/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => editMediaInputRef.current?.click()}
              className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider border border-border/40 bg-secondary/10"
              title="Add Image"
            >
              <ImageIcon className="w-4 h-4 text-emerald-500" />
              <span>Image</span>
            </button>

            <button
              type="button"
              onClick={() => editPdfInputRef.current?.click()}
              className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider border border-border/40 bg-secondary/10"
              title="Add PDF"
            >
              <FileText className="w-4 h-4 text-red-500" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => editVideoInputRef.current?.click()}
              className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider border border-border/40 bg-secondary/10"
              title="Add Video"
            >
              <Video className="w-4 h-4 text-indigo-500" />
              <span>Video</span>
            </button>

            <div className="flex ml-auto gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-2 bg-secondary border border-border text-foreground rounded-xl font-bold text-xs hover:bg-secondary/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit || !editContent.trim()}
                className="px-4 py-2 bg-foreground text-background rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Post Text Content */}
          {postContent && (
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-line font-medium">
              {renderContentWithMentions(postContent)}
            </p>
          )}

          {/* Image Attachment */}
          {postMediaUrls && postMediaUrls.length > 0 && (
            <div className="-mx-6 w-[calc(100%+3rem)] overflow-hidden border-y border-border/60 bg-secondary/20 rounded-none relative">
              <ClickableMedia 
                src={postMediaUrls[0]} 
                alt="Post attachment" 
                type="image"
                containerClassName="w-full max-w-none rounded-none border-none bg-transparent shadow-none mt-0"
                className="w-full h-auto max-h-[500px] object-cover transition-opacity duration-300 hover:opacity-95 cursor-zoom-in" 
              />
            </div>
          )}

          {/* Video Attachment */}
          {postVideoUrl && (
            <div className="-mx-6 w-[calc(100%+3rem)] overflow-hidden border-y border-border/60 bg-black relative rounded-none">
              <AutopauseVideo 
                src={postVideoUrl} 
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>
          )}

          {/* PDF Attachment */}
          {postPdfUrl && (
            <div className="border border-border rounded-2xl overflow-hidden bg-secondary/10">
              <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/30 border-b border-border/40">
                <div className="flex items-center gap-3 text-xs min-w-0">
                  <FileText className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <div className="min-w-0">
                    {postPdfName && (
                      <p className="font-bold text-foreground truncate max-w-[250px]">{postPdfName}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground font-semibold">Embedded PDF Attachment</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPdfLightboxOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors text-foreground"
                    title="Full Screen Preview"
                  >
                    <span className="hidden sm:inline">Full Screen</span> <Maximize className="w-3.5 h-3.5" />
                  </button>
                  <a 
                    href={postPdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors text-foreground"
                    title="Open Document"
                  >
                    <span className="hidden sm:inline">Open</span> <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              <iframe
                src={postPdfUrl + "#view=FitH&toolbar=0&navpanes=0"}
                className="w-full h-[400px] border-0"
                title="PDF Document"
              />
            </div>
          )}

          {pdfLightboxOpen && (
            <ImageLightbox
              src={postPdfUrl}
              alt={postPdfName || "PDF Document"}
              type="pdf"
              onClose={() => setPdfLightboxOpen(false)}
            />
          )}

          {/* Link Card Attachment */}
          {postLinkUrl && (
            <a 
              href={postLinkUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/15 rounded-2xl transition-colors group"
            >
              <div className="flex items-center gap-3 text-xs min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 flex-shrink-0">
                  <Link2 className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{postLinkUrl}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 uppercase">Reference Link</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mr-1" />
            </a>
          )}

          {/* Actions Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs font-semibold">
            <div className="flex items-center gap-3">
              {/* Like / Reactions */}
              <div 
                ref={reactionContainerRef}
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
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  type="button"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-full transition-all select-none ${
                    isPostLiked 
                      ? 'bg-rose-500/10 text-rose-500' 
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {(() => {
                    const uniqueReactions = Array.from(new Set(Object.values(reactions || {}))).slice(0, 3);
                    if (uniqueReactions.length > 0) {
                      return (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReactingUsers();
                          }}
                          className="flex -space-x-1 items-center mr-0.5 hover:scale-110 transition-transform cursor-pointer"
                          title="View who reacted"
                        >
                          {uniqueReactions.map((emoji, idx) => (
                            <span key={idx} className="text-xs select-none" style={{ zIndex: 10 - idx }}>
                              {emoji}
                            </span>
                          ))}
                        </span>
                      );
                    }
                    return null;
                  })()}

                  {(() => {
                    const userReaction = reactions?.[user?.id || ""];
                    if (userReaction) {
                      return <span className="text-sm select-none">{userReaction}</span>;
                    }
                    return <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isPostLiked ? "fill-rose-500 stroke-rose-500" : ""}`} />;
                  })()}

                  <span 
                    onClick={(e) => {
                      if (likesCount > 0) {
                        e.stopPropagation();
                        handleOpenReactingUsers();
                      }
                    }}
                    className={likesCount > 0 ? "hover:underline cursor-pointer px-0.5" : ""}
                    title={likesCount > 0 ? "View who reacted" : ""}
                  >
                    {likesCount}
                  </span>
                </button>
              </div>

              {/* Comments Toggle */}
              <button
                onClick={handleToggleComments}
                className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-full transition-all ${
                  expanded 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>
                  {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
                </span>
              </button>

              {/* Analytics Views */}
              {user?.id === post.userId ? (
                <Link
                  href={`/posts/${post.id}/analytics`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-indigo-500 font-bold px-3 py-1.5 transition-colors cursor-pointer"
                  title="View post analytics"
                >
                  <Eye className="w-4 h-4" />
                  <span>{post.viewsCount || 0}</span>
                </Link>
              ) : (
                <div 
                  className="flex items-center gap-1.5 text-muted-foreground font-bold px-3 py-1.5 select-none"
                  title={`${post.viewsCount || 0} total reads`}
                >
                  <Eye className="w-4 h-4" />
                  <span>{post.viewsCount || 0}</span>
                </div>
              )}
            </div>

            {/* Share */}
            {onShare && (
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.error("Please login to share broadcasts", {
                      action: {
                        label: "Login",
                        onClick: () => router.push("/auth/login")
                      }
                    });
                    return;
                  }
                  onShare(post);
                }}
                className="flex items-center gap-2 text-muted-foreground hover:bg-secondary hover:text-foreground font-bold px-3 py-1.5 rounded-full transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            )}
          </div>

          {/* Collapsible Comments Section */}
          {expanded && (
            <div className="pt-4 border-t border-border/40 space-y-4 animate-in fade-in duration-200">
              {/* Add Comment Form */}
              {isAuthenticated ? (
                <form onSubmit={handleAddComment} className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-bold uppercase text-foreground relative overflow-hidden border border-border">
                    {userAvatar ? (
                      <img src={getImageUrl(userAvatar)} alt={user?.name || ""} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user?.name || "")
                    )}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <MentionInput
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(val, mentions) => {
                        setCommentText(val);
                        setCommentMentions(mentions);
                      }}
                      initialMentions={[{
                        userId: post.userId,
                        fullName: post.authorName,
                        username: post.authorUsername,
                        headline: post.authorHeadline,
                        profilePhotoUrl: post.authorAvatar
                      }]}
                      rows={1}
                      className="flex-1 bg-secondary/20 border border-border rounded-xl px-4 py-2 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground font-medium resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCommentGifPicker(true)}
                      title="Add GIF or Sticker"
                      className="p-2 bg-secondary/40 hover:bg-secondary/70 border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all shrink-0 flex items-center justify-center h-[34px] w-[34px]"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="p-2 bg-foreground text-background rounded-xl hover:opacity-90 disabled:opacity-50 disabled:scale-100 transition-all shrink-0 flex items-center justify-center h-[34px] w-[34px]"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-secondary/10 border border-border/50 rounded-xl p-3 text-center text-xs text-muted-foreground font-semibold">
                  Please <Link href="/auth/login" className="text-primary hover:underline">login</Link> to join the discussion.
                </div>
              )}

              {/* GIF Selector for Comment */}
              {showCommentGifPicker && (
                <div className="mt-2 border border-border bg-card rounded-2xl overflow-hidden p-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center px-2 pb-2 border-b border-border/40 mb-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Search reaction media</p>
                    <button onClick={() => setShowCommentGifPicker(false)} className="text-[10px] font-black text-muted-foreground hover:text-foreground uppercase tracking-wider">Close</button>
                  </div>
                  <GifStickerPicker 
                    onSelect={(url) => handleSelectCommentGif(url)} 
                    onClose={() => setShowCommentGifPicker(false)} 
                  />
                </div>
              )}

              {/* Comments Listing */}
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 font-medium text-xs">
                {rootComments.length > 0 ? (
                  rootComments.map(comment => {
                    const isCommentLiked = comment.likedUserIds.includes(user?.id || "");
                    const replies = getReplies(comment.id);
                    return (
                      <div key={comment.id} className="space-y-3 group/comment border-l-2 border-border/30 pl-3.5 py-0.5">
                        <div className="flex items-start justify-between gap-3">
                          <Link href={`/public/profiles/${comment.authorUsername || comment.userId}`} className="flex items-center gap-2 hover:opacity-85 transition-opacity">
                            <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-bold uppercase text-[9px] text-foreground border border-border overflow-hidden">
                              {comment.authorAvatar ? (
                                <img src={getImageUrl(comment.authorAvatar)} alt={comment.authorName} className="w-full h-full object-cover" />
                              ) : (
                                getInitials(comment.authorName)
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-foreground hover:underline">{comment.authorName}</p>
                                {comment.id === firstCommentId && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[7px] font-black uppercase tracking-wider rounded-md">
                                    First Comment
                                  </span>
                                )}
                              </div>
                              <p className="text-[8px] text-muted-foreground font-semibold">@{comment.authorUsername || "zenith_member"}</p>
                            </div>
                          </Link>
                          
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-semibold">
                            <span>{formatTimestamp(comment.createdAt)}</span>
                            {(user?.id === comment.userId || user?.role === 'ADMIN') && (
                              <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover/comment:opacity-100 transition-opacity"
                                title="Delete Comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Comment Body */}
                        <div className="text-foreground font-semibold leading-relaxed pl-9">
                          {renderCommentContent(comment.content)}
                        </div>

                        {/* Comment Actions (Like, Reply triggers) */}
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground pl-9 font-bold">
                          <button 
                            onClick={() => handleLikeComment(comment.id)}
                            className={`flex items-center gap-1 hover:text-rose-500 transition-colors ${isCommentLiked ? "text-rose-500" : ""}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isCommentLiked ? "fill-rose-500 stroke-rose-500" : ""}`} />
                            <span>{comment.likedUserIds.length}</span>
                          </button>

                          {isAuthenticated && (
                            <button 
                              onClick={() => {
                                setReplyingTo(comment);
                                setReplyText("");
                                setReplyMentions([]);
                              }}
                              className="flex items-center gap-1 hover:text-primary transition-colors"
                            >
                              Reply
                            </button>
                          )}
                        </div>

                        {/* Reply Form */}
                        {replyingTo?.id === comment.id && (
                          <div className="pl-9 mt-3">
                            <form onSubmit={handleAddReply} className="flex gap-2 items-center bg-secondary/15 p-2 rounded-2xl border border-border/40">
                              <MentionInput
                                placeholder={`Reply to @${comment.authorUsername || comment.authorName}...`}
                                value={replyText}
                                onChange={(val, mentions) => {
                                  setReplyText(val);
                                  setReplyMentions(mentions);
                                }}
                                initialMentions={[{
                                  userId: comment.userId,
                                  fullName: comment.authorName,
                                  username: comment.authorUsername,
                                  headline: comment.authorHeadline,
                                  profilePhotoUrl: comment.authorAvatar
                                }]}
                                rows={1}
                                className="flex-1 bg-transparent border-0 focus:ring-0 text-xs focus:outline-none text-foreground placeholder:text-muted-foreground/50 font-medium resize-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowReplyGifPicker(true)}
                                className="p-1.5 hover:bg-secondary border border-border/80 rounded-xl text-muted-foreground hover:text-foreground transition-all shrink-0 flex items-center justify-center h-7 w-7"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="submit"
                                disabled={submittingReply || !replyText.trim()}
                                className="p-1.5 bg-foreground text-background rounded-xl hover:opacity-90 disabled:opacity-50 shrink-0 flex items-center justify-center h-7 w-7"
                              >
                                {submittingReply ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setReplyingTo(null)}
                                className="text-[10px] font-black uppercase text-muted-foreground hover:text-foreground px-1.5"
                              >
                                Cancel
                              </button>
                            </form>

                            {showReplyGifPicker && (
                              <div className="mt-2 border border-border bg-card rounded-2xl overflow-hidden p-2 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex justify-between items-center px-2 pb-2 border-b border-border/40 mb-2">
                                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Search replies media</p>
                                  <button onClick={() => setShowReplyGifPicker(false)} className="text-[10px] font-black text-muted-foreground hover:text-foreground uppercase tracking-wider">Close</button>
                                </div>
                                <GifStickerPicker 
                                  onSelect={(url) => handleSelectReplyGif(url)} 
                                  onClose={() => setShowReplyGifPicker(false)} 
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Nesting Replies */}
                        {replies.length > 0 && (
                          <div className="pl-9 space-y-3 mt-3">
                            {replies.map(reply => {
                              const isReplyLiked = reply.likedUserIds.includes(user?.id || "");
                              return (
                                <div key={reply.id} className="space-y-2 group/reply pl-3 border-l border-border/30">
                                  <div className="flex items-start justify-between gap-3">
                                    <Link href={`/public/profiles/${reply.authorUsername || reply.userId}`} className="flex items-center gap-2 hover:opacity-85 transition-opacity">
                                      <div className="w-6 h-6 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-bold uppercase text-[8px] text-foreground border border-border overflow-hidden">
                                        {reply.authorAvatar ? (
                                          <img src={getImageUrl(reply.authorAvatar)} alt={reply.authorName} className="w-full h-full object-cover" />
                                        ) : (
                                          getInitials(reply.authorName)
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-bold text-foreground hover:underline">
                                          {reply.authorName}
                                          {reply.replyToUserName && (
                                            <span className="text-[9px] text-muted-foreground font-semibold">
                                              {" "}replying to <span className="text-primary hover:underline font-black">@{reply.replyToUserName}</span>
                                            </span>
                                          )}
                                        </p>
                                        <p className="text-[8px] text-muted-foreground font-medium mt-0.5">@{reply.authorUsername || "zenith_member"}</p>
                                      </div>
                                    </Link>
                                    <div className="flex items-center gap-2 text-[8px] text-muted-foreground font-semibold">
                                      <span>{formatTimestamp(reply.createdAt)}</span>
                                      {(user?.id === reply.userId || user?.role === 'ADMIN') && (
                                        <button 
                                          onClick={() => handleDeleteComment(reply.id)}
                                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover/reply:opacity-100 transition-opacity"
                                          title="Delete Reply"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-foreground font-semibold leading-relaxed pl-8">
                                    {renderCommentContent(reply.content)}
                                  </div>

                                  <div className="flex items-center gap-4 text-[9px] text-muted-foreground pl-8 font-bold">
                                    <button 
                                      onClick={() => handleLikeComment(reply.id)}
                                      className={`flex items-center gap-1 hover:text-rose-500 transition-colors ${isReplyLiked ? "text-rose-500" : ""}`}
                                    >
                                      <Heart className={`w-3 h-3 ${isReplyLiked ? "fill-rose-500 stroke-rose-500" : ""}`} />
                                      <span>{reply.likedUserIds.length}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-muted-foreground font-semibold">
                    Be the first to share your thoughts on this update!
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* REACTING USERS MODAL */}
      {showReactingUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-[2rem] w-full max-w-sm p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Reactions</h3>
              <button 
                onClick={() => {
                  setShowReactingUsersModal(false);
                  setReactingUsers([]);
                }}
                className="p-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {loadingReactingUsers ? (
                <div className="flex justify-center items-center py-6 gap-2 text-muted-foreground text-xs font-bold">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Loading details...
                </div>
              ) : reactingUsers.length > 0 ? (
                reactingUsers.map((r) => (
                  <div key={r.userId} className="flex justify-between items-center p-2 hover:bg-secondary/20 rounded-xl transition-all border border-transparent">
                    <Link 
                      href={`/public/profiles/${r.username || r.userId}`}
                      onClick={() => setShowReactingUsersModal(false)}
                      className="flex items-center gap-3 flex-1 min-w-0 animate-in fade-in duration-200"
                    >
                      <div className="w-9 h-9 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-xs font-black uppercase border border-border relative">
                        {r.profilePhotoUrl ? (
                          <img src={getImageUrl(r.profilePhotoUrl)} alt={r.fullName} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(r.fullName)
                        )}
                        <span className="absolute -bottom-1 -right-1 bg-background rounded-full w-5 h-5 flex items-center justify-center text-xs border border-border shadow-sm">
                          {r.emoji}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-tight text-foreground leading-none hover:underline">{r.fullName}</p>
                        <p className="text-[9px] text-muted-foreground font-medium mt-1 leading-none truncate max-w-[160px]">{r.headline || "Zenith Candidate"}</p>
                      </div>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground font-semibold">
                  No active reactions found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// Reusable Video Player (AutopauseVideo)
function AutopauseVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedMute = localStorage.getItem("video_player_muted");
      const initialMute = storedMute === "false" ? false : true;
      setIsMuted(initialMute);
      if (videoRef.current) {
        videoRef.current.muted = initialMute;
      }
    }
  }, []);

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("video_player_muted", newMuted ? "true" : "false");
    }
  };

  const handlePlayToggle = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      const storedMute = typeof window !== "undefined" && localStorage.getItem("video_player_muted") === "false" ? false : true;
      video.muted = storedMute;
      video.play().catch(() => {});
    }
  };

  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);
  
  const onVolumeChange = () => {
    if (videoRef.current) {
      const videoMuted = videoRef.current.muted;
      setIsMuted(videoMuted);
      if (typeof window !== "undefined") {
        localStorage.setItem("video_player_muted", videoMuted ? "true" : "false");
      }
    }
  };

  const onTimeUpdate = () => {
    if (videoRef.current && !isScrubbing) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const onDurationChange = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }
    const handleTimeout = () => {
      setShowControls(false);
    };
    const timeoutId = setTimeout(handleTimeout, 2500);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, showControls]);

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const handleFullscreenToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    video.currentTime = percentage * duration;
    setCurrentTime(percentage * duration);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const storedMute = typeof window !== "undefined" && localStorage.getItem("video_player_muted") === "false" ? false : true;
            video.muted = storedMute;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      {
        rootMargin: "-35% 0px -35% 0px", // middle 30% of viewport
        threshold: 0.1,
      }
    );

    observer.observe(video);

    return () => {
      observer.unobserve(video);
    };
  }, []);

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="group/player w-full h-full relative flex items-center justify-center bg-black overflow-hidden select-none"
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        className={className}
        preload="metadata"
        onPlay={onPlay}
        onPause={onPause}
        onVolumeChange={onVolumeChange}
        onTimeUpdate={onTimeUpdate}
        onDurationChange={onDurationChange}
        onClick={() => handlePlayToggle()}
      />

      {(!isPlaying || showControls) && (
        <div 
          onClick={() => handlePlayToggle()}
          className="absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer transition-opacity duration-300"
        >
          <button 
            className="w-16 h-16 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-lg hover:bg-black/60"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayToggle();
            }}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 text-white fill-white" />
            ) : (
              <Play className="w-7 h-7 text-white fill-white translate-x-0.5" />
            )}
          </button>
        </div>
      )}

      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 pb-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end transition-all duration-300 transform ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <div 
          onClick={handleProgressClick}
          className="group/progress w-full h-1 hover:h-2 transition-all cursor-pointer relative mb-3 rounded-full bg-white/20"
        >
          <div 
            className="h-full bg-primary rounded-full relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border border-white scale-0 group-hover/progress:scale-100 transition-transform shadow-md" />
          </div>
        </div>

        <div className="flex items-center justify-between text-white font-medium text-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handlePlayToggle();
              }}
              className="text-white hover:text-primary transition-colors focus:outline-none"
            >
              {isPlaying ? (
                <Pause className="w-4.5 h-4.5 fill-white" />
              ) : (
                <Play className="w-4.5 h-4.5 fill-white translate-x-0.5" />
              )}
            </button>

            <button 
              onClick={handleMuteToggle}
              className="text-white hover:text-primary transition-colors focus:outline-none"
            >
              {isMuted ? (
                <VolumeX className="w-4.5 h-4.5" />
              ) : (
                <Volume2 className="w-4.5 h-4.5" />
              )}
            </button>

            <span className="text-[10px] text-white/80 font-mono tracking-tight">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleFullscreenToggle}
              className="text-white hover:text-primary transition-colors focus:outline-none"
            >
              {isFullscreen ? (
                <Minimize className="w-4.5 h-4.5" />
              ) : (
                <Maximize className="w-4.5 h-4.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
