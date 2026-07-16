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
  experienceLevel?: string;
  techTags?: string[];
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
  const [showStyleChooserModal, setShowStyleChooserModal] = useState(false);
  const [activeSection, setActiveSection] = useState("specifications-section");



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

  let matchLevel = "LOW";
  let matchColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
  if (matchScore >= 80) {
    matchLevel = "HIGH";
    matchColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  } else if (matchScore >= 50) {
    matchLevel = "MEDIUM";
    matchColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
  }

  const detectRequiredKeywords = (desc: string) => {
    const commonSkills = [
      "React", "Node", "Java", "Python", "JavaScript", "Docker", "Kubernetes", 
      "TypeScript", "AWS", "SQL", "HTML", "CSS", "Go", "C++", "C#", "Ruby", 
      "PostgreSQL", "MongoDB", "Redis", "Figma", "Git", "CI/CD", "Next.js", "Spring"
    ];
    const detected: string[] = [];
    const lowerDesc = desc.toLowerCase();
    for (const skill of commonSkills) {
      if (lowerDesc.includes(skill.toLowerCase())) {
        detected.push(skill);
      }
    }
    return detected.slice(0, 6);
  };

  const requiredSkillsList = job.techTags && job.techTags.length > 0
    ? job.techTags
    : job.description
      ? detectRequiredKeywords(job.description)
      : ["Software Development"];

  return (
    <div className="w-full px-3 sm:px-4 py-6 md:py-8 font-sans pb-24">
      {/* Back Button */}
      <Link 
        href="/dashboard/jobs" 
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 md:mb-8 group font-black uppercase text-[10px] tracking-widest"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        Back to Intelligence Feed
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        {/* Main Content (8 cols) */}
        <div className="md:col-span-8 space-y-6 md:space-y-8">
          
          {/* Header Card */}
          <div id="header-section" className="relative bg-card backdrop-blur-md border border-border rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-foreground/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
            
            <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 items-start justify-between">
              <div className="space-y-4 md:space-y-6 flex-1 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center border shadow-xl overflow-hidden relative p-3 shrink-0 transition-all duration-700 ${
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
                      <Building2 className="w-8 h-8 text-muted-foreground opacity-50" />
                    )}
                    <Building2 className="absolute w-8 h-8 text-muted-foreground opacity-20 -z-10" />
                  </div>
                  <div className="space-y-2 min-w-0 flex-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tighter leading-tight break-words">{job.title}</h1>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground font-black uppercase tracking-widest truncate">{job.company}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm font-black uppercase tracking-widest">
                  <div className="bg-secondary border border-border px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-foreground flex items-center gap-1.5 md:gap-2">
                    <MapPin className="w-4 h-4 opacity-50" /> {job.location}
                  </div>
                  {job.salaryMin && (
                    <div className="bg-secondary border border-border px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-foreground flex items-center gap-1.5 md:gap-2">
                      <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" /> ${job.salaryMin.toLocaleString()} - ${job.salaryMax?.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Experience & Skills Section (Shifted below Location) */}
                <div className="flex flex-col gap-4 pt-4 border-t border-border/40 w-full mt-4">
                  {/* Match pill at the top */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Match Compatibility:</span>
                    <span className={`border px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm ${matchColor}`}>
                      <Target className="w-3.5 h-3.5 opacity-75" /> {matchLevel} Match ({Math.round(matchScore)}%)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Required Experience</span>
                      <span className="inline-block text-[10px] font-bold text-foreground bg-secondary/60 px-3 py-1.5 rounded-xl border border-border/60 uppercase tracking-wide w-fit">
                        {job.experienceLevel || "Mid-Senior Level"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">Key Tech Required</span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {requiredSkillsList.map(skill => {
                          const isMatch = matchedSkills.some(s => s.toLowerCase() === skill.toLowerCase());
                          return (
                            <span 
                              key={skill} 
                              className={`px-2.5 py-1 rounded-xl text-[9px] font-bold border transition-all ${
                                isMatch
                                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 shadow-sm"
                                  : "bg-secondary/60 text-foreground/80 border-border/40"
                              }`}
                            >
                              {skill}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
 
              <div className="w-full md:w-[280px] shrink-0 space-y-3">
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
                    onClick={() => setShowStyleChooserModal(true)}
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
                    className="group w-full bg-secondary text-foreground px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 border border-border hover:border-foreground/30 hover:shadow-xl hover:scale-[1.01] transition-all uppercase tracking-widest"
                  >
                    <span>Apply Now</span>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black text-[9px] border border-primary/20 shrink-0">
                      {Math.round(matchScore)}% Match
                    </span>
                    <ExternalLink className="w-4 h-4 opacity-50 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Tab Navigator for Mobile/Tablet */}
          <div className="xl:hidden sticky top-[-16px] md:top-[-24px] z-30 bg-background/95 backdrop-blur-md border-b border-border/40 py-3.5 flex flex-col items-center justify-center gap-2.5 px-4 shrink-0 shadow-sm">
            {/* Primary Tab (Job Description) */}
            <button
              onClick={() => setActiveSection("specifications-section")}
              className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all scale-[1.03] shadow-sm shrink-0 ${
                activeSection === "specifications-section"
                  ? "bg-foreground text-background border-foreground shadow-md"
                  : "bg-secondary/40 text-muted-foreground border-border/70 hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              Job Description
            </button>

            {/* Secondary Tabs (AI Insights & Culture Analysis) */}
            <div className="flex items-center justify-center gap-2 shrink-0">
              {[
                { id: "insights-section", label: "AI Insights" },
                { id: "culture-section", label: "Culture Analysis" }
              ].map((sec) => {
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className={`px-3.5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all shrink-0 ${
                      isActive 
                        ? "bg-foreground text-background border-foreground shadow-md" 
                        : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary/80 hover:text-foreground"
                    }`}
                  >
                    {sec.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Switcher panels */}
          <div className="transition-all duration-300">
            {activeSection === "insights-section" && (
              <div id="insights-section" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                 <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-4 shadow-sm">
                    <h3 className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.2em] text-muted-foreground">
                       <Target className="w-4 h-4 opacity-50" />
                       Match Intelligence
                    </h3>
                    <div className="text-foreground/90 leading-relaxed text-sm font-sans font-normal">
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
                 
                 <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-4 shadow-sm">
                    <h3 className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.2em] text-muted-foreground">
                       <Shield className="w-4 h-4 opacity-50" />
                       Fair-Pay Intelligence
                    </h3>
                    <div className="text-foreground/90 leading-relaxed text-sm font-sans font-normal">
                      {job.fairPayEstimate ? (
                        <div dangerouslySetInnerHTML={{ __html: job.fairPayEstimate }} />
                      ) : (
                        "Analyzing market standards and company benchmarks..."
                      )}
                    </div>
                 </div>
              </div>
            )}

            {activeSection === "culture-section" && (
              <div id="culture-section" className="bg-card border border-border rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-4 md:space-y-6 shadow-sm animate-in fade-in duration-300">
                 <h3 className="text-lg md:text-2xl font-black flex items-center gap-3 uppercase tracking-tighter">
                    <Building2 className="w-6 h-6 opacity-40" />
                    Company Culture Analysis
                 </h3>
                   {culture ? (
                     <div className="prose prose-sm md:prose-base dark:prose-invert prose-neutral max-w-none prose-p:leading-relaxed prose-headings:font-black prose-li:text-foreground/80 animate-in fade-in duration-500 font-sans font-normal">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ node, ...props }) => <p className="mb-6 leading-relaxed last:mb-0" {...props} />,
                            h1: ({ node, ...props }) => <h1 className="text-xl md:text-2xl font-black mt-8 mb-4 tracking-tight" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-lg md:text-xl font-black mt-8 mb-4 tracking-tight" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-base md:text-lg font-black mt-6 mb-3 tracking-tight" {...props} />,
                            h4: ({ node, ...props }) => <h4 className="text-sm md:text-base font-black mt-5 mb-2 tracking-tight" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-6 space-y-2" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-6 space-y-2" {...props} />,
                            li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />
                          }}
                        >
                           {culture}
                        </ReactMarkdown>
                     </div>
                   ) : cultureLoading ? (
                     <div className="flex flex-col items-center justify-center py-10 gap-4 opacity-70">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="font-black text-xs uppercase tracking-widest animate-pulse">Crawling culture nodes & Glassdoor reviews...</p>
                     </div>
                   ) : (
                     <p className="text-sm text-muted-foreground font-sans font-normal">Culture analysis data is currently unavailable.</p>
                   )}
              </div>
            )}

            {activeSection === "specifications-section" && (
              <div id="specifications-section" className="bg-card border border-border rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-4 shadow-sm animate-in fade-in duration-300">
                  <h3 className="text-lg md:text-2xl font-black flex items-center gap-3 uppercase tracking-tighter border-b border-border/40 pb-3">
                     <FileText className="w-6 h-6 opacity-40" />
                     Job Description
                  </h3>
                 <div className="prose dark:prose-invert prose-sm md:prose-base max-w-none text-foreground/90 leading-relaxed font-sans font-normal">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => <p className="mb-6 leading-relaxed last:mb-0" {...props} />,
                        h1: ({ node, ...props }) => <h1 className="text-xl md:text-2xl font-black mt-8 mb-4 tracking-tight" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-lg md:text-xl font-black mt-8 mb-4 tracking-tight" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-base md:text-lg font-black mt-6 mb-3 tracking-tight" {...props} />,
                        h4: ({ node, ...props }) => <h4 className="text-sm md:text-base font-black mt-5 mb-2 tracking-tight" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-6 space-y-2" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-6 space-y-2" {...props} />,
                        li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />
                      }}
                    >
                       {job.description}
                    </ReactMarkdown>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (4 cols) */}
        <div className="md:col-span-4 space-y-6">
           {/* Dynamic Match Score */}
           <div className="hidden md:block bg-foreground text-background border border-border rounded-3xl p-8 relative overflow-hidden shadow-2xl">
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
           <div className="hidden md:block bg-card border border-border rounded-3xl p-8 space-y-6 shadow-sm">
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
           <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-5 md:p-6 text-center space-y-4 shadow-sm">
              <div className="bg-muted w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border border-border">
                 <MessageSquare className="w-6 h-6 opacity-40" />
              </div>
              <h5 className="font-black uppercase text-xs tracking-widest">Inquiry required?</h5>
              <p className="text-[11px] text-muted-foreground font-bold leading-relaxed px-4">Contact the AI Assistant for deeper competitive intelligence on this role.</p>
           </div>
        </div>
      </div>

      {/* Floating Section Navigator (Table of Contents Tab Switcher) */}
      <div className="hidden xl:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col gap-6 z-40 bg-card/60 backdrop-blur-md border border-border px-3 py-6 rounded-full shadow-xl animate-in slide-in-from-right duration-500">
        {[
          { id: "insights-section", label: "AI Insights", icon: Sparkles },
          { id: "specifications-section", label: "Job Description", icon: FileText },
          { id: "culture-section", label: "Culture Analysis", icon: Target }
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className="group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 hover:scale-110"
              title={sec.label}
            >
              <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
                isActive 
                  ? "bg-foreground scale-100 shadow-md" 
                  : "bg-transparent scale-0 group-hover:scale-50 group-hover:bg-secondary"
              }`} />
              <Icon className={`w-4 h-4 z-10 transition-colors duration-300 ${
                isActive 
                  ? "text-background" 
                  : "text-muted-foreground group-hover:text-foreground"
              }`} />
              
              {/* Tooltip */}
              <span className="absolute right-full mr-4 px-3 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl whitespace-nowrap">
                {sec.label}
              </span>
            </button>
          );
        })}
      </div>

      {showStyleChooserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-[2rem] p-6 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 text-left">
            <div className="space-y-2">
              <h4 className="text-lg font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary fill-current" />
                Choose Tailoring Style blueprint
              </h4>
              <p className="text-xs text-muted-foreground font-bold leading-relaxed">
                Select the aesthetic template style blueprint for your tailored resume application package.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* MODERN option */}
              <button
                onClick={() => setSelectedTemplate("MODERN")}
                className={`p-4 rounded-2xl border text-left transition-all space-y-2 relative overflow-hidden ${
                  selectedTemplate === "MODERN"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border bg-secondary/30 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                }`}
              >
                <div className="font-black uppercase tracking-wider text-xs">Modern UI</div>
                <div className="text-[10px] leading-relaxed opacity-85 font-semibold">
                  Minimal, spacious design with accent headers and sidebars.
                </div>
                {selectedTemplate === "MODERN" && (
                  <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-primary" />
                )}
              </button>

              {/* CLASSIC option */}
              <button
                onClick={() => setSelectedTemplate("CLASSIC")}
                className={`p-4 rounded-2xl border text-left transition-all space-y-2 relative overflow-hidden ${
                  selectedTemplate === "CLASSIC"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border bg-secondary/30 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                }`}
              >
                <div className="font-black uppercase tracking-wider text-xs">Classic UI</div>
                <div className="text-[10px] leading-relaxed opacity-85 font-semibold">
                  Traditional structured layout focusing on content density.
                </div>
                {selectedTemplate === "CLASSIC" && (
                  <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-primary" />
                )}
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowStyleChooserModal(false)}
                className="flex-1 bg-secondary text-foreground hover:bg-secondary/80 px-4 py-3 rounded-xl font-black uppercase text-xs tracking-widest border border-border transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowStyleChooserModal(false);
                  handleOneClickTailor();
                }}
                className="flex-1 bg-foreground text-background hover:bg-foreground/90 px-4 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all"
              >
                Confirm & Tailor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
