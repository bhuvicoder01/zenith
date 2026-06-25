"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Heart, Trash2, Link2, FileText, Image as ImageIcon, Send, Loader2, Plus, 
  ExternalLink, Sparkles, MessageSquare, AlertCircle, File, LogOut, LayoutDashboard, Globe, Share2,
  Edit2, Eye, CornerDownRight, Video, Play, Pause, Volume2, VolumeX, Maximize, Minimize
} from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import PublicNavbar from "@/components/PublicNavbar";
import api from "@/lib/api";
import { toast } from "sonner";
import MentionInput from "@/components/MentionInput";
import GifStickerPicker from "@/components/GifStickerPicker";
import { ClickableMedia } from "@/components/ImageLightbox";
import PostCard, { Post } from "@/components/PostCard";

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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Previews
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Sharing states
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [searchConnQuery, setSearchConnQuery] = useState("");
  const [sentConnections, setSentConnections] = useState<Set<string>>(new Set());


  useEffect(() => {
    fetchFeed(0, true);
    if (isAuthenticated) {
      fetchUserProfile();
    }
  }, [isAuthenticated]);

  // Real-time post count updates via WebSocket
  useEffect(() => {
    const handlePostUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.postId) return;

      if (detail.commentsCount !== undefined) {
        // Fetch fresh post to update comments list and count
        api.get(`/posts/${detail.postId}`).then(res => {
          setPosts(prev => prev.map(p => p.id === detail.postId ? res.data : p));
        }).catch(() => {});
      } else {
        // Just update likes and reactions locally
        setPosts(prev => prev.map(p => {
          if (p.id !== detail.postId) return p;
          return {
            ...p,
            likesCount: detail.likesCount ?? p.likesCount,
            likedUserIds: detail.likedUserIds ?? p.likedUserIds,
            reactions: detail.reactions ?? p.reactions,
          };
        }));
      }
    };
    window.addEventListener('zenith-post-update', handlePostUpdate);
    return () => window.removeEventListener('zenith-post-update', handlePostUpdate);
  }, []);

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

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1 GB
      if (!file.type.startsWith("video/")) {
        toast.error("Only video files are supported (MP4, WebM, MOV, etc.)");
        return;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        toast.error("Video must be under 1 GB");
        return;
      }
      // Clear image attachment if a video is selected (mutually exclusive)
      if (mediaFile) {
        setMediaFile(null);
        setMediaPreview(null);
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      toast.success(`Video selected: ${(file.size / (1024 * 1024)).toFixed(1)} MB`);
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
    if (!content.trim() && !mediaFile && !videoFile && !pdfFile && !linkUrl.trim()) {
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
    if (videoFile) {
      formData.append("video", videoFile);
    }
    if (pdfFile) {
      formData.append("pdf", pdfFile);
    }

    try {
      const res = await api.post("/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent: any) => {
          if (videoFile && progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        },
        timeout: 600000 // 10 min timeout for large videos
      });
      toast.success("Post broadcasted successfully");
      
      // Reset Form
      setContent("");
      setLinkUrl("");
      setMediaFile(null);
      setPdfFile(null);
      setVideoFile(null);
      setMediaPreview(null);
      setVideoPreview(null);
      setShowLinkInput(false);
      setUploadProgress(0);

      // Prepend new post to the top of feed
      setPosts(prev => [res.data, ...prev]);
    } catch (err) {
      console.error("Failed to publish post:", err);
      toast.error("Post broadcast protocol failed");
    } finally {
      setPublishing(false);
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

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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
                    <MentionInput
                      placeholder="Share a career update, link, or project PDF..."
                      value={content}
                      onChange={(val) => setContent(val)}
                      rows={3}
                      className="w-full bg-transparent border-0 focus:ring-0 text-sm placeholder:text-muted-foreground/60 resize-none py-1 focus:outline-none text-foreground font-medium"
                    />
                  </div>
                </div>

                {/* Previews drawer */}
                {(mediaPreview || videoPreview || pdfFile || showLinkInput) && (
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

                    {videoPreview && (
                      <div className="relative w-full rounded-2xl overflow-hidden border border-border bg-black">
                        <video 
                          src={videoPreview}
                          controls
                          className="w-full max-h-64 object-contain"
                        />
                        <button 
                          type="button" 
                          onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-2 pointer-events-none">
                          <div className="flex items-center gap-2 text-[10px] text-white/90 font-bold">
                            <Video className="w-3.5 h-3.5" />
                            <span>{videoFile?.name}</span>
                            <span className="ml-auto">{videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` : ''}</span>
                          </div>
                        </div>
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
                    <label className={`p-2.5 rounded-full cursor-pointer transition-colors relative flex items-center justify-center ${mediaFile ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleMediaChange} 
                        className="hidden" 
                      />
                      <ImageIcon className="w-4.5 h-4.5" />
                    </label>

                    {/* Add Video */}
                    <label className={`p-2.5 rounded-full cursor-pointer transition-colors relative flex items-center justify-center ${videoFile ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}>
                      <input 
                        type="file" 
                        accept="video/*" 
                        onChange={handleVideoChange} 
                        className="hidden" 
                      />
                      <Video className="w-4.5 h-4.5" />
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

                  <div className="flex items-center gap-3">
                    {/* Upload progress */}
                    {publishing && videoFile && uploadProgress > 0 && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                        <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span>{uploadProgress}%</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={publishing || (!content.trim() && !mediaFile && !videoFile && !pdfFile && !linkUrl.trim())}
                      className="px-5 py-2.5 bg-foreground text-background text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:scale-100 transition-all shadow-sm"
                    >
                      {publishing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {videoFile ? `Uploading...` : 'Broadcasting...'}
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Broadcast
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TIMELINE LIST */}
            <div className="space-y-6">
              {posts.length > 0 ? (
                posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    userAvatar={profile?.profilePhotoUrl}
                    onDelete={(postId) => setPosts(prev => prev.filter(p => p.id !== postId))}
                    onShare={handleOpenShare}
                  />
                ))
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

// Autopause & Autoplay Video component — plays when centered in viewport, pauses when out,
// with custom modern glassmorphic controls and persistent mute settings.
function AutopauseVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Custom Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Sync mute state with localStorage
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
      // Before playing, ensure we set the correct muted state from localStorage
      const storedMute = typeof window !== "undefined" && localStorage.getItem("video_player_muted") === "false" ? false : true;
      video.muted = storedMute;
      video.play().catch(() => {});
    }
  };

  // Sync state with native events
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

  // Hide controls after 2.5 seconds of play inactivity
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

  // Fullscreen implementation
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

  // Listen to fullscreen change event
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Time scrubber click/drag
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

  // Viewport center autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Respect the persistent user mute state
            const storedMute = typeof window !== "undefined" && localStorage.getItem("video_player_muted") === "false" ? false : true;
            video.muted = storedMute;
            video.play().catch(() => {
              // Fallback to muted if browser blocks unmuted playback on scroll
              if (!storedMute) {
                video.muted = true;
                video.play().catch(() => {});
              }
            });
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

      {/* Large Center Play/Pause Indicator (Sleek Blur) */}
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

      {/* Sleek bottom control bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 pb-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end transition-all duration-300 transform ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        {/* Clickable Progress Slider */}
        <div 
          onClick={handleProgressClick}
          className="group/progress w-full h-1 hover:h-2 transition-all cursor-pointer relative mb-3 rounded-full bg-white/20"
        >
          <div 
            className="h-full bg-primary rounded-full relative"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Scrubber Handle Dot */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border border-white scale-0 group-hover/progress:scale-100 transition-transform shadow-md" />
          </div>
        </div>

        {/* Action Controls Panel */}
        <div className="flex items-center justify-between text-white font-medium text-xs">
          <div className="flex items-center gap-3">
            {/* Play/Pause icon button */}
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

            {/* Volume control with mute status */}
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

            {/* Time display */}
            <span className="text-[10px] text-white/80 font-mono tracking-tight">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Fullscreen button */}
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
