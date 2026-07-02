"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { 
  ArrowLeft, FileText, LayoutDashboard, 
  Mail, MessageSquare, Download, Eye, Loader2,
  CheckCircle, Sparkles, AlertCircle, Trash2
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from "sonner";

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  tailoredResumeS3Url?: string;
  coverLetterText?: string;
  emailIntroduction?: string;
  interviewPrepText?: string;
}

interface UserProfile {
  resumeS3Url?: string;
}

export default function ApplicationMaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [app, setApp] = useState<Application | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'RESUME' | 'LETTER' | 'INTRO' | 'PREP'>('RESUME');
  const [isComparing, setIsComparing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGeneratePrep = async () => {
    setGenerating(true);
    try {
      await api.post(`/applications/${id}/prepare`);
      toast.success("AI materials generated successfully!");
      const appResponse = await api.get(`/applications/${id}`);
      setApp(appResponse.data);
    } catch (error) {
      console.error("Failed to generate materials:", error);
      toast.error("Failed to generate AI materials");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice || window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  useEffect(() => {
    const fetchApp = async () => {
      try {
        const [appResponse, profileResponse] = await Promise.all([
            api.get(`/applications/${id}`),
            api.get(`/profile`)
        ]);
        setApp(appResponse.data);
        setProfile(profileResponse.data);
      } catch (error) {
        console.error("Failed to fetch application:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this application and all materials?")) {
        return;
    }
    try {
      await api.delete(`/applications/${app?.id}`);
      router.push("/dashboard/applications");
    } catch (error) {
      console.error("Failed to delete application:", error);
    }
  };

  const isValidS3Url = (url?: string) => {
    return url && url.includes("/api/v1/public/assets/") && url.length > 25;
  };

  const renderMobilePdf = (url: string | undefined, title: string) => {
    if (!url) return null;
    const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
    
    if (isLocal) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 w-full h-full bg-muted/20">
          <FileText className="w-12 h-12 text-muted-foreground opacity-40 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{title}</h4>
            <p className="text-[10px] text-muted-foreground max-w-[200px] leading-relaxed">
              Running locally. Please open in PDF app or test on production for interactive preview.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-[180px]">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-secondary text-foreground border border-border text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-foreground/5 transition-all flex items-center justify-center gap-1 shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" /> View Inline
            </a>
            <a
              href={`${url}?download=true`}
              className="px-3 py-2 bg-foreground text-background text-[9px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-1 shadow-md"
            >
              <Download className="w-3.5 h-3.5" /> Open in PDF App
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full relative flex flex-col justify-between">
        <div className="flex-1 w-full overflow-hidden relative">
          <iframe 
            src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`} 
            className="w-full h-full border-none absolute inset-0"
            title={title}
          />
        </div>
        <div className="p-3 bg-background/80 backdrop-blur-md border-t border-border flex justify-center items-center gap-2 shrink-0 z-10">
          <a
            href={`${url}?download=true`}
            className="px-4 py-2 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-md flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Open in PDF App
          </a>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!app) return null;

  return (
    <div className="w-full px-4 py-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <Link 
        href="/dashboard/applications" 
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group font-black uppercase text-[10px] tracking-widest"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        Back to Arsenal
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
         <div className="space-y-1">
            <h1 className="text-2xl md:text-5xl font-black text-foreground tracking-tighter">{app.jobTitle}</h1>
            <p className="text-lg md:text-2xl text-muted-foreground font-black uppercase tracking-widest">{app.company}</p>
         </div>
         
         <div className="flex gap-2 md:gap-3 w-full md:w-auto">
            <button 
              onClick={handleDelete}
              className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> DELETE
            </button>
            <a 
              href={app.tailoredResumeS3Url}
              target="_blank"
              className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-foreground text-background rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg"
            >
              <Download className="w-4 h-4" /> DOWNLOAD
            </a>
         </div>
      </div>

      <div className="flex flex-wrap gap-1.5 md:gap-2 bg-secondary p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-border">
         {[
           { id: 'RESUME', label: 'Resume', icon: FileText },
           { id: 'LETTER', label: 'Cover Letter', icon: Sparkles },
           { id: 'INTRO', label: 'Email', icon: Mail },
           { id: 'PREP', label: 'Interview', icon: LayoutDashboard }
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={`flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
               activeTab === tab.id ? 'bg-foreground text-background shadow-lg' : 'hover:bg-foreground/5 text-muted-foreground hover:text-foreground'
             }`}
           >
             <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
             {tab.label}
           </button>
         ))}
      </div>

      {/* Content Area */}
      <div className="bg-card border border-border rounded-3xl md:rounded-3xl p-4 md:p-12 min-h-[500px] shadow-sm overflow-hidden flex flex-col justify-center">
         {!app.tailoredResumeS3Url ? (
           <div className="text-center py-20 max-w-md mx-auto space-y-6 animate-in fade-in duration-300">
             <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-primary/20">
               <Sparkles className="w-8 h-8 text-primary animate-pulse" />
             </div>
             <div className="space-y-2">
               <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter">AI Prep Materials Not Generated</h3>
               <p className="text-muted-foreground text-sm font-semibold leading-relaxed">
                 Generate custom high-impact resumes, cover letters, intro emails, and interview preparation questions tailored specifically for this opportunity.
               </p>
             </div>
             <button
               onClick={handleGeneratePrep}
               disabled={generating}
               className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary/95 transition-all shadow-xl disabled:opacity-50"
             >
               {generating ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" /> GENERATING MATERIALS...
                 </>
               ) : (
                 <>
                   <Sparkles className="w-4 h-4 animate-pulse" /> GENERATE AI MATERIALS
                 </>
               )}
             </button>
           </div>
         ) : (
           <>
             {activeTab === 'RESUME' && (
               <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <h2 className="text-xl md:text-3xl font-black flex items-center gap-3 uppercase tracking-tighter">
                        <FileText className="w-6 h-6 md:w-8 md:h-8 opacity-40" /> Resume Spec
                     </h2>
                     <button 
                       onClick={() => setIsComparing(!isComparing)}
                       className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                         isComparing 
                            ? 'bg-foreground border-foreground text-background shadow-lg' 
                            : 'bg-secondary border-border text-muted-foreground hover:bg-secondary/80'
                       }`}
                     >
                       {isComparing ? 'Exit Comparison' : 'Side-by-Side Mode'}
                     </button>
                  </div>
                  
                  <div className={`grid gap-6 ${isComparing ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                     {isComparing && (
                        <div className="space-y-3">
                           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-center italic">Baseline Record</p>
                           <div className="aspect-[1/1.414] w-full bg-muted rounded-2xl border border-border overflow-hidden ring-1 ring-border relative flex items-center justify-center">
                               {isValidS3Url(profile?.resumeS3Url) ? (
                                  isMobile ? (
                                     renderMobilePdf(profile?.resumeS3Url, "Baseline Resume")
                                  ) : (
                                     <object
                                        data={profile?.resumeS3Url}
                                        type="application/pdf"
                                        className="w-full h-full border-none opacity-40 grayscale"
                                     >
                                        <embed
                                           src={profile?.resumeS3Url}
                                           type="application/pdf"
                                           className="w-full h-full border-none"
                                        />
                                     </object>
                                  )
                               ) : (
                                  <div className="text-muted-foreground font-black uppercase tracking-widest text-[8px] md:text-xs opacity-50 text-center px-4">No baseline resume found in your profile</div>
                               )}
                           </div>
                        </div>
                     )}
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-foreground uppercase tracking-[0.2em] text-center">{isComparing ? 'Optimized Intelligence' : ''}</p>
                        <div className="aspect-[1/1.414] w-full bg-white rounded-2xl border border-border overflow-hidden shadow-2xl relative flex items-center justify-center">
                           {isValidS3Url(app.tailoredResumeS3Url) ? (
                              isMobile ? (
                                 renderMobilePdf(app.tailoredResumeS3Url, "Tailored Resume")
                              ) : (
                                 <object
                                    data={app.tailoredResumeS3Url}
                                    type="application/pdf"
                                    className="w-full h-full border-none"
                                 >
                                    <embed
                                       src={app.tailoredResumeS3Url}
                                       type="application/pdf"
                                       className="w-full h-full border-none"
                                    />
                                 </object>
                              )
                           ) : (
                              <div className="text-muted-foreground font-black uppercase tracking-widest text-[8px] md:text-xs opacity-50 text-center px-4">Intelligence generation in progress...</div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
             )}

             {activeTab === 'LETTER' && (
                <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <h2 className="text-xl md:text-3xl font-black flex items-center gap-3 uppercase tracking-tighter">
                       <Sparkles className="w-6 h-6 opacity-40" /> Tailored Narrative
                    </h2>
                    <div className="bg-muted/30 border border-border rounded-2xl p-6 md:p-14 text-foreground leading-relaxed whitespace-pre-wrap font-serif text-base md:text-xl shadow-inner relative">
                       <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-20 h-20" /></div>
                       {app.coverLetterText}
                    </div>
                </div>
             )}

             {activeTab === 'INTRO' && (
                <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <h2 className="text-xl md:text-3xl font-black flex items-center gap-3 uppercase tracking-tighter">
                       <Mail className="w-6 h-6 opacity-40" /> Comms Protocol
                    </h2>
                    <div className="bg-muted border border-border rounded-2xl p-6 md:p-10 text-foreground leading-relaxed whitespace-pre-wrap font-mono text-xs md:text-sm relative shadow-inner">
                       <div className="absolute top-4 right-4 text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-40">Ready to transmit</div>
                       {app.emailIntroduction}
                    </div>
                </div>
             )}

             {activeTab === 'PREP' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <h2 className="text-2xl md:text-4xl font-black flex items-center gap-3 uppercase tracking-tighter">
                       <LayoutDashboard className="w-8 h-8 opacity-40" /> Mission Readiness
                    </h2>
                     <div className="bg-card p-4 md:p-12 rounded-3xl border border-border shadow-sm">
                        {app.interviewPrepText ? (
                            <div className="prose prose-sm md:prose-lg dark:prose-invert prose-neutral max-w-none prose-p:leading-relaxed prose-headings:font-black prose-li:text-foreground/80">
                               <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {app.interviewPrepText}
                               </ReactMarkdown>
                            </div>
                       ) : (
                         <div className="text-center py-20 opacity-50 bg-muted/20 border border-dashed border-border rounded-3xl">
                            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                            <p className="font-black text-xs uppercase tracking-widest">Intelligence generation in progress...</p>
                         </div>
                       )}
                    </div>
                </div>
             )}
           </>
         )}
      </div>
    </div>
  );
}
