"use client";

import { 
  BrainCircuit, UploadCloud, Loader2, CheckCircle2, 
  ArrowRight, Search, User, Sparkles, FileText, 
  BarChart3, Target, Briefcase, Zap, X, Save, Bell
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWebSocketStore, NotificationItem } from "@/store/useWebSocketStore";

interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

interface AcademicProject {
  title: string;
  technologies: string;
  description: string;
  link: string;
}

interface UserProfile {
  id?: string;
  fullName?: string;
  headline?: string;
  skills: string[];
  parsedGoals?: string;
  resumeS3Url?: string;
  experiences: Experience[];
  academicProjects: AcademicProject[];
  internships: any[];
  certifications: any[];
  bio?: string;
}

export default function DashboardProfile() {
  const router = useRouter();
  const { notifications, markAsRead } = useWebSocketStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [isResumeSyncModalOpen, setIsResumeSyncModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNotificationClick = (item: any) => {
    markAsRead(item.id);
    if (item.type === "CONNECTION_REQUEST" && item.data?.requester?.userId) {
      router.push(`/public/profiles/${item.data.requester.userId}`);
    } else if (item.type === "CONNECTION_ACCEPTED" && item.data?.user?.userId) {
      router.push(`/public/profiles/${item.data.user.userId}`);
    } else if ((item.type === "COMMENT" || item.type === "MENTION") && item.data?.postId) {
      router.push(`/posts/${item.data.postId}`);
    } else {
      router.push("/dashboard/notifications");
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/profile");
      setProfile(response.data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      setUploadStatus("idle");
      const response = await api.post("/profile/resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Store suggestions and open the confirmation modal
      setSuggestions(response.data);
      setIsResumeSyncModalOpen(true);
      setUploadStatus("success");
      setTimeout(() => setUploadStatus("idle"), 3000);
      toast.success("Resume analyzed by AI!");
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadStatus("error");
      toast.error("AI analysis failed");
    } finally {
      setIsUploading(false);
    }
  };

  const applySuggestions = async () => {
    if (!suggestions || !profile) return;
    
    const updatedProfile = {
      ...profile,
      fullName: suggestions.fullName || profile.fullName,
      headline: suggestions.headline || profile.headline,
      bio: suggestions.bio || profile.bio,
      skills: suggestions.skills && suggestions.skills.length > 0 ? suggestions.skills : profile.skills,
      experiences: suggestions.experiences && suggestions.experiences.length > 0 ? suggestions.experiences : profile.experiences,
      internships: suggestions.internships && suggestions.internships.length > 0 ? suggestions.internships : profile.internships,
      academicProjects: suggestions.academicProjects && suggestions.academicProjects.length > 0 ? suggestions.academicProjects : profile.academicProjects,
      certifications: suggestions.certifications && suggestions.certifications.length > 0 ? suggestions.certifications : profile.certifications,
    };

    setSaving(true);
    try {
      await api.put("/profile", updatedProfile);
      setProfile(updatedProfile);
      toast.success("Dashboard intel updated!");
      setIsResumeSyncModalOpen(false);
      setSuggestions(null);
    } catch (err) {
      toast.error("Failed to sync intel");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      uploadFile(file);
    } else {
      alert("Please upload a PDF file.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const calculateCompleteness = () => {
    if (!profile) return 0;
    let score = 0;
    if (profile.fullName) score += 20;
    if (profile.resumeS3Url) score += 30;
    if (profile.skills?.length > 0) score += 20;
    if (profile.experiences?.length > 0) score += 20;
    if (profile.headline) score += 10;
    return score;
  };

  const completeness = calculateCompleteness();

  return (
    <div className="space-y-10 pb-10">
      {/* Hero Welcome Section - Adaptive Elite Theme */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-zinc-50 via-zinc-100/50 to-zinc-50 dark:from-zinc-900 dark:via-stone-950 dark:to-zinc-900 border border-zinc-200 dark:border-white/5 p-10 md:p-14 shadow-2xl shadow-zinc-200/50 dark:shadow-none transition-all duration-500">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_80%_20%,rgba(0,0,0,0.03),transparent_70%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.05),transparent_70%)]" />
        <div className="relative z-10 space-y-6 max-w-2xl">
          <div className="flex items-center gap-3">
             <div className="px-3 py-1 bg-zinc-200/50 dark:bg-white/5 border border-zinc-300 dark:border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
               Career Nexus Engaged
             </div>
             {profile?.resumeS3Url && (
               <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 dark:bg-white/10 border border-primary/20 dark:border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-primary dark:text-white">
                 <Zap className="w-3 h-3 fill-current" /> Intel Active
               </div>
             )}
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-zinc-900 dark:text-white leading-none">
              Welcome Back, <span className="text-primary dark:text-zinc-100">{profile?.fullName?.split(' ')[0] || "Operative"}</span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-500 font-medium leading-relaxed">
              {profile?.headline || "Initialize your career profile to unlock AI-powered job matching."}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link 
              href="/dashboard/jobs" 
              className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/10 flex items-center gap-2 group"
            >
              Scan Job Market <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 bg-zinc-200/50 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 backdrop-blur-xl border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" /> Update Resume
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions & Status */}
        <div className="space-y-8 lg:col-span-1">
          {/* Readiness Tracker */}
          <section className="bg-card border border-border rounded-[2rem] p-8 space-y-6 shadow-xl">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-500/10 rounded-xl">
                      <BarChart3 className="w-5 h-5 text-amber-500" />
                   </div>
                   <h3 className="text-lg font-black uppercase tracking-tight">Readiness</h3>
                </div>
                <span className="text-2xl font-black text-amber-500">{completeness}%</span>
             </div>
             <div className="space-y-4">
                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden p-0.5 border border-border">
                   <div 
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${completeness}%` }}
                   />
                </div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
                   {completeness < 100 ? "Sync resume or fill profile fields to reach 100% mission readiness." : "Maximum readiness achieved. Deployment recommended."}
                </p>
             </div>
          </section>

          {/* Quick Action Grid */}
          <section className="grid grid-cols-2 gap-4">
             <Link href="/dashboard/profile" className="p-6 bg-card border border-border rounded-3xl hover:border-primary/50 transition-all group flex flex-col gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <User className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Edit Profile</span>
             </Link>
             <Link href="/dashboard/jobs" className="p-6 bg-card border border-border rounded-3xl hover:border-foreground/30 transition-all group flex flex-col gap-3">
                <div className="w-10 h-10 bg-foreground/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Search className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Find Jobs</span>
             </Link>
             <button onClick={() => fileInputRef.current?.click()} className="p-6 bg-card border border-border rounded-3xl hover:border-foreground/30 transition-all group flex flex-col gap-3 text-left">
                <div className="w-10 h-10 bg-foreground/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <FileText className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Sync Resume</span>
             </button>
             <Link href="/dashboard/profile" className="p-6 bg-card border border-border rounded-3xl hover:border-green-500/50 transition-all group flex flex-col gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Sparkles className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">AI Cover</span>
             </Link>
          </section>

          {/* Live Stream Notifications Feed */}
          <section className="bg-card border border-border rounded-[2rem] p-8 space-y-6 shadow-xl relative overflow-hidden group">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary/10 rounded-xl">
                      <Bell className="w-5 h-5 text-primary" />
                   </div>
                   <h3 className="text-lg font-black uppercase tracking-tight">Live Stream</h3>
                </div>
                 {notifications.filter((n: NotificationItem) => !n.read).length > 0 && (
                    <span className="px-2 py-0.5 bg-primary text-background rounded-full text-[9px] font-black animate-pulse">
                       {notifications.filter((n: NotificationItem) => !n.read).length} NEW
                    </span>
                 )}
             </div>

             <div className="space-y-4">
                {notifications.length > 0 ? (
                   notifications.slice(0, 3).map((n: NotificationItem) => (
                      <div 
                         key={n.id}
                         onClick={() => handleNotificationClick(n)}
                         className={`block p-4 border rounded-2xl hover:bg-secondary/40 transition-all cursor-pointer ${
                            n.read ? 'border-border/60 opacity-80' : 'border-primary/20 bg-primary/5'
                         }`}
                      >
                         <div className="flex items-center justify-between gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-wide truncate ${
                               n.type === 'CONNECTION_REQUEST' ? 'text-blue-500' :
                               n.type === 'CONNECTION_ACCEPTED' ? 'text-emerald-500' :
                               n.type === 'NEWS' ? 'text-violet-500' : 'text-primary'
                            }`}>
                               {n.type.replace('_', ' ')}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-semibold">
                               {new Date(n.timestamp).toLocaleDateString()}
                            </span>
                         </div>
                         <h5 className="font-bold text-xs truncate mt-1">{n.title}</h5>
                         <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{n.message}</p>
                      </div>
                   ))
                ) : (
                   <div className="py-8 text-center border-2 border-dashed border-border rounded-2xl flex flex-col items-center gap-3">
                      <Bell className="w-8 h-8 text-muted-foreground opacity-20" />
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Systems Nominal</p>
                   </div>
                )}

                {notifications.length > 0 && (
                   <Link 
                      href="/dashboard/notifications" 
                      className="w-full py-3 bg-secondary hover:bg-secondary/80 border border-border text-foreground text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                   >
                      View All Transmission <ArrowRight className="w-3.5 h-3.5" />
                   </Link>
                )}
             </div>
          </section>
        </div>

        {/* Elite Intel Overview */}
        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Skills Intelligence */}
              <section className="bg-card border border-border rounded-[2.5rem] p-8 space-y-6 shadow-xl relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-primary/10 rounded-xl">
                          <BrainCircuit className="w-5 h-5 text-primary" />
                       </div>
                       <h3 className="text-lg font-black uppercase tracking-tight">Arsenal</h3>
                    </div>
                    {isUploading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                 </div>
                 
                 <div className="flex flex-wrap gap-2 relative z-10">
                    {profile?.skills && profile.skills.length > 0 ? (
                      (showAllSkills ? profile.skills : profile.skills.slice(0, 12)).map(s => (
                        <span key={s} className="px-3 py-1.5 text-[10px] rounded-lg bg-secondary/80 text-foreground border border-border font-black uppercase shadow-sm">
                          {s}
                        </span>
                      ))
                    ) : (
                      <div className="py-10 flex flex-col items-center justify-center w-full gap-4 border-2 border-dashed border-border rounded-2xl">
                         <Zap className="w-8 h-8 text-muted-foreground/30" />
                         <p className="text-[10px] font-black uppercase text-muted-foreground">Awaiting Skill Extraction</p>
                      </div>
                    )}
                    {profile?.skills && profile.skills.length > 12 && (
                       <button 
                         onClick={() => setShowAllSkills(!showAllSkills)}
                         className="px-3 py-1.5 text-[10px] rounded-lg bg-primary/10 text-primary font-black uppercase hover:bg-primary/20 transition-colors"
                       >
                          {showAllSkills ? "Show Less" : `+${profile.skills.length - 12} More`}
                       </button>
                    )}
                 </div>
              </section>

              {/* Mission Objectives */}
              <section className="bg-card border border-border rounded-[2.5rem] p-8 space-y-6 shadow-xl relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-violet-500/10 rounded-xl">
                       <Target className="w-5 h-5 text-violet-500" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Objectives</h3>
                 </div>
                 <div className="relative z-10">
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium line-clamp-6">
                      {profile?.parsedGoals || "No objectives defined. Ingest a resume to initialize AI-generated mission objectives and align with top-tier opportunities."}
                    </p>
                 </div>
              </section>
           </div>

           {/* Resume Dropzone Mini */}
           <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`bg-card border-2 border-dashed rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center gap-4 cursor-pointer transition-all ${
                isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/30'
              }`}
           >
              <input 
                 type="file" 
                 ref={fileInputRef}
                 onChange={handleFileUpload}
                 className="hidden" 
                 accept=".pdf"
              />
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center group">
                 {isUploading ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                 ) : (
                    <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                 )}
              </div>
              <div className="space-y-1">
                 <h4 className="font-black uppercase tracking-tight">
                    {isDragging ? "Drop to Ingest Intel" : "Rapid Resume Sync"}
                 </h4>
                 <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                    AI Extraction Engaged • PDF Only
                 </p>
              </div>
           </div>
        </div>
      </div>

      {/* AI Sync Modal */}
      {isResumeSyncModalOpen && suggestions && (
        <div className="fixed inset-0 z-[2500] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-border bg-gradient-to-br from-foreground/5 via-transparent to-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-foreground/10 rounded-2xl border border-foreground/20">
                    <Sparkles className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">AI Data Sync</h3>
                </div>
                <button onClick={() => setIsResumeSyncModalOpen(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-muted-foreground text-sm font-medium">We&apos;ve analyzed your resume. Would you like to update your dashboard intel?</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Identity & Bio */}
              <div className="p-6 bg-foreground/5 rounded-3xl border border-border space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-foreground/10 rounded-2xl flex items-center justify-center">
                      <User className="w-6 h-6 text-foreground" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detected Operative</p>
                      <h4 className="font-black text-lg">{suggestions.fullName || "Your Name"}</h4>
                   </div>
                </div>
                {suggestions.headline && <p className="text-sm font-bold text-foreground italic">"{suggestions.headline}"</p>}
              </div>

              {/* Detected Skills */}
              {suggestions.skills?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Extracted Arsenal ({suggestions.skills.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.skills.map(s => (
                      <span key={s} className="px-3 py-1.5 bg-secondary text-foreground border border-border rounded-full text-[10px] font-black">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-border bg-secondary/20 flex flex-col sm:flex-row gap-4">
              <button onClick={() => setIsResumeSyncModalOpen(false)} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-black uppercase tracking-widest text-xs">
                Keep Current
              </button>
              <button 
                onClick={applySuggestions}
                disabled={saving}
                className="flex-[1.5] py-4 bg-foreground text-background hover:opacity-90 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-foreground/10 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Sync Intel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
