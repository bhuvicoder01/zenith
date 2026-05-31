"use client";

import { useEffect, useState, use } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { 
  Briefcase, MapPin, DollarSign, ExternalLink, 
  ArrowLeft, Zap, CheckCircle, Shield, Building2, 
  Clock, Share2, Sparkles, MessageSquare, Target,
  FileText, Layout, ChevronDown, Loader2
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  url?: string;
  source?: string;
  cultureAnalysis?: string;
  fairPayEstimate?: string;
  relevanceExplanation?: string;
  companyLogoUrl?: string;
  companyLogoTheme?: string;
}

interface Application {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: string;
  tailoredResumeS3Url?: string;
  coverLetterText?: string;
  emailIntroduction?: string;
  interviewPrepText?: string;
  templateStyle?: string;
}

interface JobDetailResponse {
  job: Job;
  matchedSkills: string[];
  matchScore: number;
  existingApplications?: Application[];
}

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<JobDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState("MODERN");
  const [showTemplates, setShowTemplates] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { prepStatus, setPrepStatus } = useWebSocketStore();
  const isCurrentlyGenerating = prepStatus && prepStatus.step && prepStatus.step !== "COMPLETED" && prepStatus.step !== "FAILED";
  const isGeneratingOrPending = isCurrentlyGenerating || isPending;

  const [culture, setCulture] = useState<string>("");
  const [cultureLoading, setCultureLoading] = useState(false);
  const [relevance, setRelevance] = useState<string>("");
  const [relevanceLoading, setRelevanceLoading] = useState(false);

  const existingAppForStyle = data?.existingApplications?.find(
    app => app.templateStyle === selectedTemplate && app.status !== "SAVED"
  );

  // Reactively mark application as completed when background prep finishes
  useEffect(() => {
    if (prepStatus?.step === "COMPLETED" && data) {
      setData(prev => {
        if (!prev) return prev;
        const currentApps = prev.existingApplications || [];
        const updated = currentApps.map(app => 
          app.templateStyle === selectedTemplate ? { ...app, status: "APPLIED" } : app
        );
        return { ...prev, existingApplications: updated };
      });
    }
  }, [prepStatus?.step]);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await api.get(`/jobs/${id}`);
        setData(response.data);

        // Load existing culture analysis if cached, otherwise lazy-load
        if (response.data.job.cultureAnalysis) {
          setCulture(response.data.job.cultureAnalysis);
        } else {
          setCultureLoading(true);
          api.get(`/jobs/${id}/culture`)
            .then(res => setCulture(res.data.culture || ""))
            .catch(err => console.error("Failed to lazy-load culture:", err))
            .finally(() => setCultureLoading(false));
        }

        // Load existing relevance explanation if cached, otherwise lazy-load
        if (response.data.job.relevanceExplanation && !response.data.job.relevanceExplanation.includes("match")) {
          setRelevance(response.data.job.relevanceExplanation);
        } else {
          setRelevanceLoading(true);
          api.get(`/jobs/${id}/relevance`)
            .then(res => setRelevance(res.data.relevance || ""))
            .catch(err => console.error("Failed to lazy-load relevance:", err))
            .finally(() => setRelevanceLoading(false));
        }
      } catch (error) {
        console.error("Failed to fetch job details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleOneClickTailor = async () => {
    if (!data) return;
    setIsPending(true);

    setPrepStatus({
      step: "STARTING",
      title: "Preparation Started",
      message: "Initializing preparation request...",
      company: data.job.company
    });

    toast.info(`Starting AI tailoring for ${data.job.company}. Track progress in the bottom-right corner!`, {
      duration: 5000
    });

    try {
      // 1. Create Application (fast REST call)
      const appRes = await api.post("/applications", {
        jobId: data.job.id,
        jobTitle: data.job.title,
        company: data.job.company,
        templateStyle: selectedTemplate
      });

      // Optimistically append application so button state updates
      setData(prev => {
        if (!prev) return prev;
        const currentApps = prev.existingApplications || [];
        const isAlreadyPrepared = appRes.data.tailoredResumeS3Url && appRes.data.coverLetterText;
        const appWithStatus = {
          ...appRes.data,
          status: isAlreadyPrepared ? "APPLIED" : "SAVED"
        };
        return {
          ...prev,
          existingApplications: [...currentApps.filter(a => a.id !== appWithStatus.id), appWithStatus]
        };
      });

      // 2. Trigger preparation asynchronously in background (non-awaited promise!)
      api.post(`/applications/${appRes.data.id}/prepare`, {
        jobDescription: data.job.description,
        company: data.job.company
      }).catch(error => {
         console.error("Tailoring preparation failed in background:", error);
         setPrepStatus({
           step: "FAILED",
           title: "Preparation Failed",
           message: "Failed to generate materials in the background.",
           company: data.job.company,
           error: error.response?.data?.message || error.message || "An unexpected error occurred."
         });
      }).finally(() => {
         setIsPending(false);
      });

    } catch (error: any) {
       console.error("Create application failed:", error);
       setPrepStatus({
         step: "FAILED",
         title: "Preparation Failed",
         message: "Failed to initialize application.",
         company: data.job.company,
         error: error.response?.data?.message || error.message || "An unexpected error occurred."
       });
       setIsPending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { job, matchedSkills, matchScore } = data;

  return (
    <div className="w-full px-4 py-8 font-sans pb-24">
      {/* Back Button */}
      <Link 
        href="/dashboard/jobs" 
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group font-black uppercase text-[10px] tracking-widest"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        Back to Intelligence Feed
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Header Card */}
          <div className="relative bg-card backdrop-blur-md border border-border rounded-3xl p-8 md:p-10 overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-foreground/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
            
            <div className="relative flex flex-col md:flex-row gap-8 items-start justify-between">
              <div className="space-y-6 flex-1">
                <div className="flex items-center gap-6">
                  <div className={`h-22 w-auto min-w-[180px] max-w-[260px] rounded-3xl flex items-center justify-center border shadow-2xl overflow-hidden relative p-5 transition-all duration-700 ${
                    job.companyLogoTheme === 'light' 
                      ? 'bg-zinc-900 border-zinc-800 shadow-zinc-900/40' 
                      : job.companyLogoTheme === 'dark' 
                        ? 'bg-white border-zinc-200 shadow-black/5' 
                        : 'bg-zinc-100 border-zinc-200'
                  }`}>
                    {job.companyLogoUrl ? (
                      <img 
                        src={job.companyLogoUrl} 
                        alt={job.company} 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "";
                          (e.target as HTMLImageElement).className = "hidden";
                        }}
                      />
                    ) : (
                      <Building2 className="w-10 h-10 text-muted-foreground opacity-50" />
                    )}
                    <Building2 className="absolute w-10 h-10 text-muted-foreground opacity-20 -z-10" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tighter">{job.title}</h1>
                    <p className="text-xl text-muted-foreground font-black uppercase tracking-widest">{job.company}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm font-black uppercase tracking-widest">
                  <div className="bg-secondary border border-border px-4 py-2.5 rounded-xl text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 opacity-50" /> {job.location}
                  </div>
                  {job.salaryMin && (
                    <div className="bg-secondary border border-border px-4 py-2.5 rounded-xl text-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" /> ${job.salaryMin.toLocaleString()} - ${job.salaryMax?.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-auto space-y-3">
                 <div className="relative">
                    <button 
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="w-full bg-secondary text-foreground px-6 py-4 rounded-2xl font-black flex items-center justify-between gap-4 border border-border hover:bg-secondary/80 transition-all uppercase text-xs tracking-widest"
                    >
                       <div className="flex items-center gap-2">
                          <Layout className="w-5 h-5 opacity-50" />
                          <span>Style: {selectedTemplate}</span>
                       </div>
                       <ChevronDown className={`w-4 h-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showTemplates && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl p-2 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {["MODERN", "CLASSIC"].map(t => (
                          <button 
                            key={t}
                            onClick={() => { setSelectedTemplate(t); setShowTemplates(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-foreground hover:text-background rounded-xl transition-all text-xs font-black uppercase tracking-widest"
                          >
                            {t} UI
                          </button>
                        ))}
                      </div>
                    )}
                 </div>

                  {existingAppForStyle ? (
                    <Link 
                      href={`/dashboard/applications/${existingAppForStyle.id}/prep`}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-8 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-tighter"
                    >
                      <CheckCircle className="w-6 h-6" />
                      View Materials
                    </Link>
                  ) : (
                    <button 
                      onClick={handleOneClickTailor}
                      disabled={!!isGeneratingOrPending}
                      className="w-full bg-foreground hover:bg-foreground/90 text-background px-8 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 uppercase tracking-tighter"
                    >
                      {isGeneratingOrPending ? (
                        <>
                           <Loader2 className="w-6 h-6 animate-spin" />
                           TAILORING...
                        </>
                      ) : (
                        <>
                           <Sparkles className="w-6 h-6 fill-current" />
                           One-Click Tailor
                        </>
                      )}
                    </button>
                  )}

                 {job.url && (
                    <a 
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group w-full bg-secondary text-foreground px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border border-border hover:border-foreground/30 hover:shadow-xl hover:scale-[1.01] transition-all uppercase tracking-widest"
                    >
                      Apply Now
                      <ExternalLink className="w-4 h-4 opacity-50 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </a>
                  )}
              </div>
            </div>
          </div>

          {/* AI Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-card border border-border rounded-3xl p-8 space-y-4 shadow-sm">
                <h3 className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.2em] text-muted-foreground">
                   <Target className="w-4 h-4 opacity-50" />
                   Match Intelligence
                </h3>
                <div className="text-foreground leading-relaxed text-sm font-medium">
                  {relevanceLoading ? (
                    <div className="flex items-center gap-3 opacity-60">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing alignment intelligence...</span>
                    </div>
                  ) : (
                    relevance || "Alignment intelligence is currently unavailable."
                  )}
                </div>
             </div>
             
             <div className="bg-card border border-border rounded-3xl p-8 space-y-4 shadow-sm">
                <h3 className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.2em] text-muted-foreground">
                   <Shield className="w-4 h-4 opacity-50" />
                   Fair-Pay Intelligence
                </h3>
                <div className="text-foreground leading-relaxed text-sm font-medium">
                  {job.fairPayEstimate ? (
                    <div dangerouslySetInnerHTML={{ __html: job.fairPayEstimate }} />
                  ) : (
                    "Analyzing market standards and company benchmarks..."
                  )}
                </div>
             </div>
          </div>

          {/* Company Culture (RAG) */}
          <div className="bg-card border border-border rounded-3xl p-6 md:p-10 space-y-6 shadow-sm">
             <h3 className="text-xl md:text-2xl font-black flex items-center gap-3 uppercase tracking-tighter">
                <Building2 className="w-6 h-6 opacity-40" />
                Company Culture Analysis
             </h3>
               {culture ? (
                 <div className="prose prose-sm md:prose-base dark:prose-invert prose-neutral max-w-none prose-p:leading-relaxed prose-headings:font-black prose-li:text-foreground/80 animate-in fade-in duration-500">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                       {culture}
                    </ReactMarkdown>
                 </div>
               ) : cultureLoading ? (
                 <div className="flex flex-col items-center justify-center py-10 gap-4 opacity-70">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="font-black text-xs uppercase tracking-widest animate-pulse">Crawling culture nodes & Glassdoor reviews...</p>
                 </div>
               ) : (
                 <p className="text-sm text-muted-foreground font-medium">Culture analysis data is currently unavailable.</p>
               )}
          </div>

          {/* JD */}
          <div className="bg-muted border border-border rounded-3xl p-10 space-y-6">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Original Specification</h3>
             <div className="text-foreground text-sm leading-8 whitespace-pre-wrap font-medium opacity-80">
               {job.description}
             </div>
          </div>
        </div>

        {/* Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
           {/* Dynamic Match Score */}
           <div className="bg-foreground text-background border border-border rounded-3xl p-8 relative overflow-hidden shadow-2xl">
              <div className="relative z-10 space-y-4 text-center">
                 <h4 className="font-black text-background/50 uppercase tracking-widest text-[10px]">Match Confidence</h4>
                 <div className="text-8xl font-black text-background">{Math.round(matchScore)}%</div>
                 <div className="w-full bg-background/20 h-4 rounded-full overflow-hidden border border-background/20">
                    <div className="h-full bg-background transition-all duration-1000 shadow-[0_0_20px_rgba(255,255,255,0.5)]" style={{ width: `${matchScore}%` }}></div>
                 </div>
                 <p className="text-[9px] text-background/40 font-black uppercase tracking-tighter pt-2">Atlas Vector Verified Match</p>
              </div>
           </div>

           {/* Matched Skills */}
           <div className="bg-card border border-border rounded-3xl p-8 space-y-6 shadow-sm">
              <h4 className="font-black flex items-center gap-2 text-foreground/70 uppercase text-xs tracking-widest">
                 <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" />
                 Verified Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {matchedSkills.map(skill => (
                  <span key={skill} className="px-3 py-1.5 bg-secondary text-foreground border border-border rounded-xl text-[10px] font-black uppercase shadow-sm">
                    {skill}
                  </span>
                ))}
              </div>
           </div>

           {/* Quick Support */}
           <div className="bg-card border border-border rounded-3xl p-6 text-center space-y-4 shadow-sm">
              <div className="bg-muted w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border border-border">
                 <MessageSquare className="w-6 h-6 opacity-40" />
              </div>
              <h5 className="font-black uppercase text-xs tracking-widest">Inquiry required?</h5>
              <p className="text-[11px] text-muted-foreground font-bold leading-relaxed px-4">Contact the AI Assistant for deeper competitive intelligence on this role.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
