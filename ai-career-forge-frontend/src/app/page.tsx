"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Heart, Trash2, Link2, FileText, Image as ImageIcon, Send, Loader2, Plus, 
  ExternalLink, Sparkles, MessageSquare, AlertCircle, File, LogOut, LayoutDashboard, Globe, Share2,
  Edit2, Eye, CornerDownRight
} from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import PublicNavbar from "@/components/PublicNavbar";
import api from "@/lib/api";
import { toast } from "sonner";
import MentionInput from "@/components/MentionInput";

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
  linkUrl?: string;
  createdAt: string;
  likesCount: number;
  viewsCount: number;
  likedUserIds: string[];
  comments?: any[];
  reactions?: Record<string, string>;
}

export default function HomeFeed() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  
  // Feed states
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // New Post Form states
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Previews
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // Sharing states
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [searchConnQuery, setSearchConnQuery] = useState("");
  const [sentConnections, setSentConnections] = useState<Set<string>>(new Set());

  // Inline Comment states
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [inlineCommentText, setInlineCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  
  // Mentions / Threading states for inline comments
  const [inlineCommentMentions, setInlineCommentMentions] = useState<Record<string, string[]>>({});
  const [replyingToCommentId, setReplyingToCommentId] = useState<Record<string, string | null>>({}); // postId -> rootCommentId
  const [replyContent, setReplyContent] = useState<Record<string, string>>({}); // rootCommentId -> text
  const [replyMentions, setReplyMentions] = useState<Record<string, string[]>>({}); // rootCommentId -> userIds
  const [replyTargetUser, setReplyTargetUser] = useState<Record<string, { id: string; name: string; username?: string } | null>>({}); // rootCommentId -> target
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({}); // rootCommentId -> boolean

  // Editing states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [activeReactionPostId, setActiveReactionPostId] = useState<string | null>(null);
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchFeed(0, true);
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

  const fetchFeed = async (pageNum: number, reset: boolean = false) => {
    try {
      setLoadingFeed(true);
      const res = await api.get(`/posts?page=${pageNum}&size=15`);
      const newPosts = res.data.content || [];
      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      setPage(pageNum);
      setHasMore(!res.data.last);
    } catch (err) {
      console.error("Failed to fetch posting feed:", err);
      toast.error("Failed to load feed updates");
    } finally {
      setLoadingFeed(false);
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Only image media is supported currently");
        return;
      }
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        toast.error("File must be a PDF document");
        return;
      }
      setPdfFile(file);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile && !pdfFile && !linkUrl.trim()) {
      toast.error("Post cannot be completely empty");
      return;
    }

    setPublishing(true);
    const formData = new FormData();
    formData.append("content", content);
    if (linkUrl.trim()) {
      formData.append("linkUrl", linkUrl);
    }
    if (mediaFile) {
      formData.append("media", mediaFile);
    }
    if (pdfFile) {
      formData.append("pdf", pdfFile);
    }

    try {
      const res = await api.post("/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      toast.success("Post broadcasted successfully");
      
      // Reset Form
      setContent("");
      setLinkUrl("");
      setMediaFile(null);
      setPdfFile(null);
      setMediaPreview(null);
      setShowLinkInput(false);

      // Prepend new post to the top of feed
      setPosts(prev => [res.data, ...prev]);
    } catch (err) {
      console.error("Failed to publish post:", err);
      toast.error("Post broadcast protocol failed");
    } finally {
      setPublishing(false);
    }
  };

  const REACTION_EMOJIS = ["👍", "❤️", "👏", "💡", "😆", "🤝"];

  const handleReact = async (postId: string, emoji: string) => {
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
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const isAlreadySelected = p.reactions?.[user?.id || ""] === emoji;
      const newReactions = { ...(p.reactions || {}) };
      let newLikes = [...(p.likedUserIds || [])];

      if (isAlreadySelected) {
        delete newReactions[user?.id || ""];
        newLikes = newLikes.filter(id => id !== user?.id);
      } else {
        newReactions[user?.id || ""] = emoji;
        if (!newLikes.includes(user?.id || "")) {
          newLikes.push(user?.id || "");
        }
      }

      return {
        ...p,
        reactions: newReactions,
        likedUserIds: newLikes,
        likesCount: newLikes.length
      };
    }));
    setActiveReactionPostId(null);

    try {
      const res = await api.post(`/posts/${postId}/react?emoji=${encodeURIComponent(emoji)}`);
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
    } catch (err) {
      console.error("Failed to react to post:", err);
      // Revert if failed (refetch from page)
      fetchFeed(0, true);
    }
  };

  const handleLikePost = async (postId: string) => {
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
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const hasLiked = p.likedUserIds?.includes(user?.id || "") || false;
      let newLikes = [...(p.likedUserIds || [])];
      const newReactions = { ...(p.reactions || {}) };

      if (hasLiked) {
        newLikes = newLikes.filter(id => id !== user?.id);
        delete newReactions[user?.id || ""];
      } else {
        newLikes.push(user?.id || "");
        newReactions[user?.id || ""] = "👍";
      }

      return {
        ...p,
        likedUserIds: newLikes,
        likesCount: newLikes.length,
        reactions: newReactions
      };
    }));

    try {
      await api.post(`/posts/${postId}/like`);
    } catch (err) {
      console.error("Failed to like post:", err);
      // Revert if failed (refetch from page)
      fetchFeed(0, true);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await api.delete(`/posts/${postId}`);
      toast.success("Post deleted successfully");
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error("Failed to delete post:", err);
      toast.error("Post deletion protocol failed");
    }
  };

  const handleOpenShare = async (post: Post) => {
    setSharingPost(post);
    setSentConnections(new Set());
    if (connections.length === 0) {
      try {
        setLoadingConnections(true);
        const res = await api.get("/connections");
        setConnections(res.data);
      } catch (err) {
        console.error("Failed to fetch connections:", err);
        toast.error("Failed to load connections list");
      } finally {
        setLoadingConnections(false);
      }
    }
  };

  const handleSendShare = async (connectionUserId: string) => {
    if (!sharingPost) return;
    try {
      const payload = JSON.stringify({
        type: "POST_SHARE",
        postId: sharingPost.id,
        postAuthor: sharingPost.authorName,
        postText: sharingPost.content || "",
        postImage: (sharingPost.mediaUrls && sharingPost.mediaUrls.length > 0) ? sharingPost.mediaUrls[0] : null
      });

      await api.post("/messages/send", {
        receiverId: connectionUserId,
        content: payload
      });

      setSentConnections(prev => {
        const next = new Set(prev);
        next.add(connectionUserId);
        return next;
      });
      toast.success("Post shared successfully");
    } catch (err) {
      console.error("Failed to share post:", err);
      toast.error("Failed to share post");
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const nextVal = !prev[postId];
      if (nextVal) {
        const post = posts.find(p => p.id === postId);
        if (post && user && post.userId !== user.id && !(inlineCommentText[postId] || "").trim()) {
          const handle = post.authorUsername || post.authorName.replace(/\s+/g, "_").toLowerCase();
          setInlineCommentText(prevText => ({
            ...prevText,
            [postId]: `@${handle} `
          }));
        }
      }
      return {
        ...prev,
        [postId]: nextVal
      };
    });
  };

  const handleAddInlineComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = inlineCommentText[postId] || "";
    if (!content.trim()) return;

    setSubmittingComment(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await api.post(`/posts/${postId}/comments`, { 
        content,
        mentionedUserIds: inlineCommentMentions[postId] || []
      });
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
      setInlineCommentText(prev => ({ ...prev, [postId]: "" }));
      setInlineCommentMentions(prev => ({ ...prev, [postId]: [] }));
      toast.success("Comment added successfully");
    } catch (err) {
      console.error("Failed to add inline comment:", err);
      toast.error("Failed to submit comment");
    } finally {
      setSubmittingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleAddInlineReply = async (postId: string, parentCommentId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = replyContent[parentCommentId] || "";
    const target = replyTargetUser[parentCommentId];
    if (!content.trim() || !target) return;

    setSubmittingReply(prev => ({ ...prev, [parentCommentId]: true }));
    try {
      const res = await api.post(`/posts/${postId}/comments`, {
        content,
        parentCommentId,
        replyToUserId: target.id,
        replyToUserName: target.name,
        mentionedUserIds: replyMentions[parentCommentId] || []
      });
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
      setReplyContent(prev => ({ ...prev, [parentCommentId]: "" }));
      setReplyMentions(prev => ({ ...prev, [parentCommentId]: [] }));
      setReplyTargetUser(prev => ({ ...prev, [parentCommentId]: null }));
      setReplyingToCommentId(prev => ({ ...prev, [postId]: null }));
      toast.success("Reply submitted successfully");
    } catch (err) {
      console.error("Failed to submit reply:", err);
      toast.error("Failed to submit reply");
    } finally {
      setSubmittingReply(prev => ({ ...prev, [parentCommentId]: false }));
    }
  };

  const handleDeleteInlineComment = async (postId: string, commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await api.delete(`/posts/${postId}/comments/${commentId}`);
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
      toast.success("Comment deleted successfully");
    } catch (err) {
      console.error("Failed to delete comment:", err);
      toast.error("Failed to delete comment");
    }
  };

  const startEditing = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content || "");
    setEditLinkUrl(post.linkUrl || "");
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditContent("");
    setEditLinkUrl("");
  };

  const handleSaveEdit = async (postId: string) => {
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
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
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
      const diffHours = Math.floor(diffMins / 6000);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${Math.floor(diffMins / 60)}h ago`;
      return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return "Recently";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background font-sans pb-24 md:pb-0">
      
      {/* Navbar */}
      <PublicNavbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR: USER LOGGED STATE */}
          <aside className="lg:col-span-3 space-y-6">
            {isAuthenticated ? (
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full border-2 border-primary/20 bg-secondary flex items-center justify-center text-2xl font-black uppercase text-foreground relative overflow-hidden">
                  {profile?.profilePhotoUrl ? (
                    <img 
                      src={profile.profilePhotoUrl} 
                      alt={profile?.fullName || user?.name || ""} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    getInitials(profile?.fullName || user?.name || "Zenith Candidate")
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">{profile?.fullName || user?.name}</h3>
                  <p className="text-xs text-muted-foreground font-semibold mt-1 max-w-[200px] leading-relaxed">
                    {profile?.headline || "Candidate | ZENITH Operative"}
                  </p>
                </div>
                
                <div className="w-full pt-4 border-t border-border space-y-2">
                  <Link 
                    href="/dashboard" 
                    className="w-full py-3 bg-foreground text-background text-xs font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link 
                    href="/dashboard/settings" 
                    className="w-full py-3 bg-secondary border border-border text-foreground text-xs font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all"
                  >
                    Configure Profile
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary w-fit">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Unlock Feed Network</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">
                    Log in to publish posts, upload PDF resumes/project documents, embed link cards, and engage with the career community.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Link 
                    href="/auth/login" 
                    className="w-full py-3 bg-foreground text-background text-xs font-black uppercase tracking-widest rounded-2xl text-center hover:opacity-90 transition-all"
                  >
                    Log In
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className="w-full py-3 bg-secondary border border-border text-foreground text-xs font-black uppercase tracking-widest rounded-2xl text-center hover:bg-secondary/80 transition-all"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            )}

            {/* Platform Stats Widget */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hidden lg:block space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">System Intel</h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Nodes Online</span>
                  <span className="font-mono text-emerald-500 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ACTIVE
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Matched Jobs</span>
                  <span className="font-bold">14,923</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Candidate Pool</span>
                  <span className="font-bold">4,120</span>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN STREAM: CREATION CARD & TIMELINE */}
          <main className="lg:col-span-6 space-y-6">
            
            {/* CREATE POST CARD */}
            {isAuthenticated && (
              <form onSubmit={handleCreatePost} className="bg-card border border-border rounded-[2rem] p-6 shadow-sm space-y-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-bold uppercase text-foreground relative overflow-hidden border border-border">
                    {profile?.profilePhotoUrl ? (
                      <img src={profile.profilePhotoUrl} alt={profile?.fullName || ""} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(profile?.fullName || user?.name || "")
                    )}
                  </div>
                  <div className="flex-1">
                    <textarea
                      placeholder="Share a career update, link, or project PDF..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={3}
                      className="w-full bg-transparent border-0 focus:ring-0 text-sm placeholder:text-muted-foreground/60 resize-none py-1 focus:outline-none text-foreground font-medium"
                    />
                  </div>
                </div>

                {/* Previews drawer */}
                {(mediaPreview || pdfFile || showLinkInput) && (
                  <div className="pt-4 border-t border-border space-y-3">
                    {mediaPreview && (
                      <div className="relative w-full max-h-60 rounded-2xl overflow-hidden border border-border">
                        <img src={mediaPreview} alt="Upload preview" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {pdfFile && (
                      <div className="flex items-center justify-between p-3.5 bg-secondary/40 border border-border rounded-2xl">
                        <div className="flex items-center gap-3 text-xs">
                          <FileText className="w-6 h-6 text-red-500" />
                          <div>
                            <p className="font-bold text-foreground truncate max-w-[200px]">{pdfFile.name}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold">{(pdfFile.size / 1024).toFixed(1)} KB • PDF Document</p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setPdfFile(null)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    )}

                    {showLinkInput && (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="url"
                            placeholder="https://example.com/project-link"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            className="w-full bg-secondary/30 border border-border rounded-xl pl-11 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground font-bold"
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setLinkUrl(""); setShowLinkInput(false); }}
                          className="px-3 bg-secondary text-muted-foreground rounded-xl border border-border hover:text-foreground text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Toolbar */}
                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <div className="flex gap-1.5">
                    {/* Add Image */}
                    <label className="p-2.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-full cursor-pointer transition-colors relative flex items-center justify-center">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleMediaChange} 
                        className="hidden" 
                      />
                      <ImageIcon className="w-4.5 h-4.5" />
                    </label>

                    {/* Add PDF */}
                    <label className="p-2.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-full cursor-pointer transition-colors relative flex items-center justify-center">
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        onChange={handlePdfChange} 
                        className="hidden" 
                      />
                      <FileText className="w-4.5 h-4.5" />
                    </label>

                    {/* Add Link */}
                    <button
                      type="button"
                      onClick={() => setShowLinkInput(!showLinkInput)}
                      className={`p-2.5 rounded-full transition-colors ${showLinkInput ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                      <Link2 className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={publishing || (!content.trim() && !mediaFile && !pdfFile && !linkUrl.trim())}
                    className="px-5 py-2.5 bg-foreground text-background text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:scale-100 transition-all shadow-sm"
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Broadcasting...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Broadcast
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TIMELINE LIST */}
            <div className="space-y-6">
              {posts.length > 0 ? (
                posts.map(post => {
                  const isPostLiked = post.likedUserIds.includes(user?.id || "");
                  return (
                    <article key={post.id} className="bg-card border border-border rounded-[2rem] p-6 shadow-sm space-y-4 hover:border-border/80 transition-all animate-in fade-in duration-300">
                      {/* Post Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-black uppercase border border-border/80 relative overflow-hidden">
                            {post.authorAvatar ? (
                              <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(post.authorName)
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-tight text-foreground leading-none">{post.authorName}</h4>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-1 leading-none">{post.authorHeadline || "Zenith Member"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-semibold">
                          <Link href={`/posts/${post.id}`} className="hover:underline">
                            {formatTimestamp(post.createdAt)}
                          </Link>
                          
                          {/* Edit / Delete capability if owner/admin */}
                          {(user?.id === post.userId || user?.role === 'ADMIN') && (
                            <div className="flex items-center gap-1.5">
                              {user?.id === post.userId && (
                                <button 
                                  onClick={() => startEditing(post)}
                                  className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                  title="Edit Post"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeletePost(post.id)}
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
                      {editingPostId === post.id ? (
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
                              onClick={() => handleSaveEdit(post.id)}
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
                          {/* Post Text Content */}
                          {post.content && (
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-line font-medium">
                              {post.content}
                            </p>
                          )}

                          {/* Embedded Image Attachment */}
                          {post.mediaUrls && post.mediaUrls.length > 0 && (
                            <div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-secondary/20">
                              <img 
                                src={post.mediaUrls[0]} 
                                alt="Post Attachment" 
                                className="w-full h-auto max-h-96 object-cover"
                              />
                            </div>
                          )}

                          {/* Embedded PDF Attachment */}
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

                          {/* Embedded Link */}
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

                      {/* Social Interactions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                        <div className="flex items-center gap-3">
                          <div 
                            className="relative"
                            onMouseEnter={() => setActiveReactionPostId(post.id)}
                            onMouseLeave={() => setActiveReactionPostId(null)}
                          >
                            {activeReactionPostId === post.id && (
                              <div className="absolute bottom-full left-0 pb-2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="flex items-center gap-2 bg-card border border-border p-2 rounded-2xl shadow-xl">
                                  {REACTION_EMOJIS.map(emoji => (
                                    <button 
                                      key={emoji} 
                                      type="button"
                                      onClick={() => handleReact(post.id, emoji)} 
                                      className="hover:scale-125 transition-transform text-lg p-1"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <button
                              onClick={() => handleLikePost(post.id)}
                              type="button"
                              className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-full transition-all ${
                                isPostLiked
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
                                return <Heart className={`w-4 h-4 transition-transform ${isPostLiked ? 'fill-current text-rose-500 scale-110' : ''}`} />;
                              })()}

                              <span>{post.likesCount}</span>
                            </button>
                          </div>

                          <button
                            onClick={() => toggleComments(post.id)}
                            className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-full transition-all ${
                              expandedComments[post.id] 
                                ? 'bg-primary/10 text-primary' 
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                            }`}
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>{post.comments?.length || 0}</span>
                          </button>

                          {/* Analytics Views Counter */}
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
                              title={`${post.viewsCount || 0} total node reads`}
                            >
                              <Eye className="w-4 h-4" />
                              <span>{post.viewsCount || 0}</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (!isAuthenticated) {
                              toast.error("Please login to share posts", {
                                action: {
                                  label: "Login",
                                  onClick: () => router.push("/auth/login")
                                }
                              });
                              return;
                            }
                            handleOpenShare(post);
                          }}
                          className="flex items-center gap-2 text-muted-foreground hover:bg-secondary hover:text-foreground font-bold px-3 py-1.5 rounded-full transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                      </div>

                      {/* Inline Comments Section */}
                      {expandedComments[post.id] && (
                        <div className="pt-4 border-t border-border/40 space-y-4 animate-in fade-in duration-200">
                          {/* Add comment inline form */}
                          {isAuthenticated ? (
                            <form onSubmit={(e) => handleAddInlineComment(post.id, e)} className="flex gap-3 items-center">
                              <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-bold uppercase text-foreground relative overflow-hidden border border-border">
                                {profile?.profilePhotoUrl ? (
                                  <img src={profile.profilePhotoUrl} alt={user?.name || ""} className="w-full h-full object-cover" />
                                ) : (
                                  getInitials(user?.name || "")
                                )}
                              </div>
                              <div className="flex-1 flex gap-2">
                                <MentionInput
                                  placeholder="Write a comment..."
                                  value={inlineCommentText[post.id] || ""}
                                  onChange={(val, mentions) => {
                                    setInlineCommentText(prev => ({ ...prev, [post.id]: val }));
                                    setInlineCommentMentions(prev => ({ ...prev, [post.id]: mentions }));
                                  }}
                                  initialMentions={post ? [{
                                    userId: post.userId,
                                    fullName: post.authorName,
                                    username: post.authorUsername,
                                    headline: post.authorHeadline,
                                    profilePhotoUrl: post.authorAvatar
                                  }] : []}
                                  rows={1}
                                  className="flex-1 bg-secondary/20 border border-border rounded-xl px-4 py-2 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground font-medium resize-none"
                                />
                                <button
                                  type="submit"
                                  disabled={submittingComment[post.id] || !(inlineCommentText[post.id] || "").trim()}
                                  className="p-2 bg-foreground text-background rounded-xl hover:opacity-90 disabled:opacity-50 disabled:scale-100 transition-all shrink-0 flex items-center justify-center h-[34px] w-[34px]"
                                >
                                  {submittingComment[post.id] ? (
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

                          {/* Comments List */}
                          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 font-medium text-xs">
                            {post.comments && post.comments.length > 0 ? (
                              (() => {
                                const rootComments = post.comments.filter(c => !c.parentCommentId) || [];
                                if (rootComments.length === 0) {
                                  return (
                                    <div className="text-center py-2 text-[10px] text-muted-foreground font-semibold">
                                      No top-level comments yet. Add yours!
                                    </div>
                                  );
                                }
                                return rootComments.map((comment: any) => {
                                  const replies = post.comments?.filter(c => c.parentCommentId === comment.id) || [];
                                  const isReplying = replyingToCommentId[post.id] === comment.id;
                                  return (
                                    <div key={comment.id} className="space-y-3">
                                      {/* Top-Level Comment */}
                                      <div className="flex gap-2 items-start text-xs">
                                        <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[10px] font-black uppercase border border-border/80 relative overflow-hidden">
                                          {comment.authorAvatar ? (
                                            <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full object-cover" />
                                          ) : (
                                            getInitials(comment.authorName)
                                          )}
                                        </div>
                                        <div className="flex-1 bg-secondary/10 rounded-xl p-3 border border-border/30 space-y-0.5">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <span className="font-black uppercase tracking-tight text-foreground">{comment.authorName}</span>
                                              {comment.authorHeadline && (
                                                <span className="text-[8px] text-muted-foreground font-semibold ml-1.5">
                                                  • {comment.authorHeadline}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-semibold font-sans">
                                              <span>{formatTimestamp(comment.createdAt)}</span>
                                              
                                              {isAuthenticated && (
                                                <button
                                                  onClick={() => {
                                                    setReplyingToCommentId(prev => ({ ...prev, [post.id]: comment.id }));
                                                    const handle = comment.authorUsername || comment.authorName.replace(/\s+/g, "_").toLowerCase();
                                                    setReplyContent(prev => ({ ...prev, [comment.id]: `@${handle} ` }));
                                                    setReplyTargetUser(prev => ({ ...prev, [comment.id]: { id: comment.userId, name: comment.authorName, username: comment.authorUsername || comment.authorName.replace(/\s+/g, "_").toLowerCase() } }));
                                                  }}
                                                  className="hover:underline font-bold text-muted-foreground hover:text-foreground"
                                                >
                                                  Reply
                                                </button>
                                              )}

                                              {(user?.id === comment.userId || user?.id === post.userId || user?.role === 'ADMIN') && (
                                                <button 
                                                  onClick={() => handleDeleteInlineComment(post.id, comment.id)}
                                                  className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          <p className="text-foreground leading-relaxed whitespace-pre-line font-medium select-text">
                                            {comment.content}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Replies List */}
                                      {replies.length > 0 && (
                                        <div className="pl-5 space-y-2.5">
                                          {replies.map((reply: any) => (
                                            <div key={reply.id} className="flex gap-2 items-start text-xs">
                                              <CornerDownRight className="w-3 h-3 text-muted-foreground/45 mt-1.5 flex-shrink-0" />
                                              <div className="w-6 h-6 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[8px] font-black uppercase border border-border/80 relative overflow-hidden">
                                                {reply.authorAvatar ? (
                                                  <img src={reply.authorAvatar} alt={reply.authorName} className="w-full h-full object-cover" />
                                                ) : (
                                                  getInitials(reply.authorName)
                                                )}
                                              </div>
                                              <div className="flex-1 bg-secondary/5 rounded-xl p-2.5 border border-border/20 space-y-0.5">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex flex-wrap items-center gap-x-1">
                                                    <span className="font-black uppercase tracking-tight text-foreground text-[10px]">{reply.authorName}</span>
                                                    {reply.authorHeadline && (
                                                      <span className="text-[7px] text-muted-foreground font-semibold">
                                                        • {reply.authorHeadline}
                                                      </span>
                                                    )}
                                                    {reply.replyToUserName && (
                                                      <span className="text-[7px] bg-secondary/85 px-1.5 py-0.5 rounded text-muted-foreground/80 font-bold uppercase tracking-wider">
                                                        Replying to @{reply.replyToUserName}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground font-semibold">
                                                    <span>{formatTimestamp(reply.createdAt)}</span>
                                                    
                                                    {isAuthenticated && (
                                                      <button
                                                        onClick={() => {
                                                          setReplyingToCommentId(prev => ({ ...prev, [post.id]: comment.id }));
                                                          const handle = reply.authorUsername || reply.authorName.replace(/\s+/g, "_").toLowerCase();
                                                          setReplyContent(prev => ({ ...prev, [comment.id]: `@${handle} ` }));
                                                          setReplyTargetUser(prev => ({ ...prev, [comment.id]: { id: reply.userId, name: reply.authorName, username: reply.authorUsername || reply.authorName.replace(/\s+/g, "_").toLowerCase() } }));
                                                        }}
                                                        className="hover:underline font-bold text-muted-foreground hover:text-foreground"
                                                      >
                                                        Reply
                                                      </button>
                                                    )}

                                                    {(user?.id === reply.userId || user?.id === post.userId || user?.role === 'ADMIN') && (
                                                      <button 
                                                        onClick={() => handleDeleteInlineComment(post.id, reply.id)}
                                                        className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
                                                      >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                                <p className="text-foreground leading-relaxed whitespace-pre-line font-medium select-text">
                                                  {reply.content}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Inline Reply Form for Root Comment */}
                                      {isReplying && (
                                        <div className="pl-5">
                                          <form onSubmit={(e) => handleAddInlineReply(post.id, comment.id, e)} className="flex gap-2 items-start bg-secondary/5 p-3 border border-border/30 rounded-xl">
                                            <div className="w-6 h-6 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[9px] font-black uppercase border border-border relative overflow-hidden">
                                              {profile?.profilePhotoUrl ? (
                                                <img src={profile.profilePhotoUrl} alt={user?.name || ""} className="w-full h-full object-cover" />
                                              ) : (
                                                getInitials(user?.name || "")
                                              )}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                              <div className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">
                                                Replying to <span className="text-foreground">@{replyTargetUser[comment.id]?.username || replyTargetUser[comment.id]?.name}</span>
                                              </div>
                                              <MentionInput
                                                placeholder="Write a reply..."
                                                value={replyContent[comment.id] || ""}
                                                onChange={(val, mentions) => {
                                                  setReplyContent(prev => ({ ...prev, [comment.id]: val }));
                                                  setReplyMentions(prev => ({ ...prev, [comment.id]: mentions }));
                                                }}
                                                initialMentions={replyTargetUser[comment.id] ? [{
                                                  userId: replyTargetUser[comment.id]!.id,
                                                  fullName: replyTargetUser[comment.id]!.name,
                                                  username: (replyTargetUser[comment.id] as any).username
                                                }] : []}
                                                rows={1}
                                                autoFocus={true}
                                                className="w-full bg-secondary/20 border border-border rounded-lg p-2 text-xs placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground font-medium"
                                              />
                                              <div className="flex justify-end gap-1.5 text-[9px]">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setReplyingToCommentId(prev => ({ ...prev, [post.id]: null }));
                                                    setReplyContent(prev => ({ ...prev, [comment.id]: "" }));
                                                    setReplyTargetUser(prev => ({ ...prev, [comment.id]: null }));
                                                  }}
                                                  className="px-2.5 py-1 bg-secondary border border-border text-foreground font-bold rounded-full hover:bg-secondary/80 transition-colors uppercase tracking-wider"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  type="submit"
                                                  disabled={submittingReply[comment.id] || !(replyContent[comment.id] || "").trim()}
                                                  className="px-3.5 py-1 bg-foreground text-background font-black rounded-full hover:opacity-90 disabled:opacity-50 transition-all uppercase tracking-widest flex items-center gap-1.5"
                                                >
                                                  {submittingReply[comment.id] ? (
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
                              <div className="text-center py-2 text-[10px] text-muted-foreground font-semibold">
                                No comments yet. Add yours!
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              ) : (
                !loadingFeed && (
                  <div className="bg-card border border-border rounded-[2.5rem] p-12 text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Timeline Empty</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                        No broadcasts have been established on this network yet. Log in to initialize the first post update!
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Feed Loader */}
              {loadingFeed && (
                <div className="flex justify-center items-center py-6 gap-2 text-muted-foreground text-xs font-bold">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Synching timeline...
                </div>
              )}

              {/* Load More Button */}
              {hasMore && !loadingFeed && (
                <button
                  onClick={() => fetchFeed(page + 1)}
                  className="w-full py-4 border border-dashed border-border hover:border-foreground/20 text-xs font-black uppercase tracking-widest rounded-2xl transition-all text-muted-foreground hover:text-foreground"
                >
                  Retrieve Older Intel
                </button>
              )}
            </div>
          </main>

          {/* RIGHT COLUMN: PLATFORM CONNECTIONS / TRENDING */}
          <aside className="lg:col-span-3 space-y-6 hidden lg:block">
            {/* Suggestions Box */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Trending Sectors</h4>
              <div className="space-y-3">
                {[
                  { tag: "Machine Learning", posts: "420 updates" },
                  { tag: "Fullstack Eng", posts: "891 updates" },
                  { tag: "Resume Optimization", posts: "128 updates" },
                  { tag: "Agentic Systems", posts: "305 updates" }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-foreground hover:underline cursor-pointer">#{item.tag.replace(/\s+/g, '')}</span>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{item.posts}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links Footer */}
            <div className="px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 space-y-2 leading-relaxed">
              <div className="flex gap-4">
                <Link href="/about" className="hover:text-foreground">About Zenith</Link>
                <Link href="/public/jobs" className="hover:text-foreground">Explore Jobs</Link>
              </div>
              <p>© 2026 ZENITH INTELLIGENCE.</p>
            </div>
          </aside>

        </div>
      {/* SHARE MODAL */}
      {sharingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-[2rem] w-full max-w-md p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Share Broadcast</h3>
              <button 
                onClick={() => setSharingPost(null)}
                className="p-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Post Summary Glance */}
            <div className="p-3 bg-secondary/20 border border-border/60 rounded-xl space-y-1 text-xs">
              <p className="font-black uppercase tracking-tight text-foreground">{sharingPost.authorName}</p>
              <p className="text-muted-foreground truncate font-medium">{sharingPost.content || "Attached media or link"}</p>
            </div>

            {/* Search filter */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search connections..."
                value={searchConnQuery}
                onChange={(e) => setSearchConnQuery(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground font-bold"
              />
            </div>

            {/* Connections list */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {loadingConnections ? (
                <div className="flex justify-center items-center py-6 gap-2 text-muted-foreground text-xs font-bold">
                  <Loader2 className="w-4.5 h-4.5 animate-spin text-primary" />
                  Loading connections...
                </div>
              ) : connections.filter(conn => 
                  conn.user?.fullName?.toLowerCase().includes(searchConnQuery.toLowerCase())
                ).length > 0 ? (
                connections
                  .filter(conn => conn.user?.fullName?.toLowerCase().includes(searchConnQuery.toLowerCase()))
                  .map(conn => {
                    const hasSent = sentConnections.has(conn.user.userId);
                    return (
                      <div key={conn.id} className="flex justify-between items-center p-2 hover:bg-secondary/20 rounded-xl transition-all border border-transparent hover:border-border/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-black uppercase border border-border relative overflow-hidden">
                            {conn.user.profilePhotoUrl ? (
                              <img src={conn.user.profilePhotoUrl} alt={conn.user.fullName} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(conn.user.fullName)
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight text-foreground leading-none">{conn.user.fullName}</p>
                            <p className="text-[9px] text-muted-foreground font-medium mt-0.5 leading-none truncate max-w-[180px]">{conn.user.headline || "Zenith Candidate"}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSendShare(conn.user.userId)}
                          disabled={hasSent}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                            hasSent 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                              : 'bg-foreground text-background hover:opacity-90'
                          }`}
                        >
                          {hasSent ? "Shared" : "Send"}
                        </button>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground font-semibold">
                  No active connections found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// Add simple close icon replacement
function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
