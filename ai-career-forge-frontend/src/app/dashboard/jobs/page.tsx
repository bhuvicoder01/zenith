"use client";

import { useEffect, useState, useRef } from "react";
import api, { BACKEND_URL } from "@/lib/api";
import Link from "next/link";
import { 
  Briefcase, MapPin, DollarSign, ExternalLink, RotateCcw, 
  ChevronRight, ChevronLeft, Zap, Target, History, Globe, 
  Sliders, Grid, List, Search, Filter, Sparkles, CheckCircle2,
  Building2, Layout, ChevronDown, Loader2, ArrowLeft, CheckCircle
} from "lucide-react";
import useSyncStore from "@/store/useSyncStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { toast } from "sonner";
import PipelineBoard from "@/components/PipelineBoard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salaryMin: number;
  salaryMax: number;
  matchScore: number;
  url?: string;
  companyLogoUrl?: string;
  companyLogoTheme?: string;
  source?: string;
  jobType?: string;
  remotePolicy?: string;
  experienceLevel?: string;
  techTags?: string[];
  relevanceExplanation?: string;
  cultureAnalysis?: string;
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

interface DashboardData {
  topPicks: Job[];
  likelyToHearBack: Job[];
  basedOnActivity: Job[];
  remoteJobs: Job[];
  easyApply: Job[];
}

export default function JobsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // Tab states
  const [activeTab, setActiveTab] = useState<"dashboard" | "discovery" | "catalog" | "pipeline">("dashboard");
  const [showPreferences, setShowPreferences] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Split-Screen Layout Selected Job State
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [detailData, setDetailData] = useState<JobDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("MODERN");
  const [showTemplates, setShowTemplates] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Background relevance / culture loading states
  const [relevanceLoading, setRelevanceLoading] = useState(false);
  const [cultureLoading, setCultureLoading] = useState(false);

  // Filters State (Server-side)
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedExperience, setSelectedExperience] = useState("");
  const [selectedRemote, setSelectedRemote] = useState("");
  const [minSalary, setMinSalary] = useState<number>(0);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Score weights state
  const [weights, setWeights] = useState({
    semantic: 30,
    skills: 30,
    lifestyle: 20,
    experience: 20
  });

  // WebSocket app handler
  const { prepStatus, setPrepStatus } = useWebSocketStore();
  const isCurrentlyGenerating = prepStatus && prepStatus.step && prepStatus.step !== "COMPLETED" && prepStatus.step !== "FAILED";
  const isGeneratingOrPending = isCurrentlyGenerating || isPending;

  // Reactively mark application as completed when background prep finishes
  useEffect(() => {
    if (prepStatus?.step === "COMPLETED" && detailData) {
      // Reload detail to fetch the new application
      api.get(`/jobs/${selectedJobId}`).then(res => {
        setDetailData(res.data);
      }).catch(() => {});
    }
  }, [prepStatus]);

  const existingAppForStyle = detailData?.existingApplications?.find(
    app => app.templateStyle === selectedTemplate && app.status !== "SAVED"
  );

  // SSE Sync status
  const syncStatus = useSyncStore((state) => state.syncStatus);
  const isSyncing = syncStatus.status === 'SYNCING' || syncStatus.status === 'MATCHING';

  // Load User Preferences on Mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/profile");
        if (res.data.matchWeights) {
          const w = res.data.matchWeights;
          setWeights({
            semantic: Math.round((w.semantic ?? 0.3) * 100),
            skills: Math.round((w.skills ?? 0.3) * 100),
            lifestyle: Math.round((w.lifestyle ?? 0.2) * 100),
            experience: Math.round((w.experience ?? 0.2) * 100)
          });
        }
      } catch (err) {
        console.error("Failed to load match weights:", err);
      }
    };
    loadProfile();
  }, []);

  // Fetch full details when selectedJobId changes
  useEffect(() => {
    if (!selectedJobId) {
      setDetailData(null);
      return;
    }

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const response = await api.get(`/jobs/${selectedJobId}`);
        setDetailData(response.data);

        // If AI relevance or culture analysis are not populated, fetch them asynchronously
        if (response.data.job && !response.data.job.relevanceExplanation) {
          fetchRelevance(selectedJobId);
        }
        if (response.data.job && !response.data.job.cultureAnalysis) {
          fetchCulture(selectedJobId);
        }
      } catch (err) {
        console.error("Failed to load job details:", err);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [selectedJobId]);

  const fetchRelevance = async (jobId: string) => {
    setRelevanceLoading(true);
    try {
      const res = await api.get(`/jobs/${jobId}/relevance`);
      setDetailData(prev => {
        if (!prev || prev.job.id !== jobId) return prev;
        return {
          ...prev,
          job: { ...prev.job, relevanceExplanation: res.data.relevance }
        };
      });
    } catch (e) {
      console.error("Failed to fetch relevance:", e);
    } finally {
      setRelevanceLoading(false);
    }
  };

  const fetchCulture = async (jobId: string) => {
    setCultureLoading(true);
    try {
      const res = await api.get(`/jobs/${jobId}/culture`);
      setDetailData(prev => {
        if (!prev || prev.job.id !== jobId) return prev;
        return {
          ...prev,
          job: { ...prev.job, cultureAnalysis: res.data.culture }
        };
      });
    } catch (e) {
      console.error("Failed to fetch culture:", e);
    } finally {
      setCultureLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      const payload = {
        semantic: weights.semantic / 100,
        skills: weights.skills / 100,
        lifestyle: weights.lifestyle / 100,
        experience: weights.experience / 100
      };
      await api.post("/profile/match-preferences", payload);
      toast.success("Matching criteria weights updated!");
      setShowPreferences(false);
      
      // Reload current tab content
      setPage(0);
      setLoading(true);
      if (activeTab === "dashboard") {
        await fetchDashboard();
      } else if (activeTab !== "pipeline") {
        await fetchJobs(activeTab, 0, false);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to save weights:", err);
      toast.error("Failed to update matching criteria");
    }
  };

  const trackActivity = async (jobId: string, type: "VIEW" | "APPLY" | "SAVE") => {
    try {
      await api.post(`/jobs/${jobId}/track?type=${type}`);
    } catch (error) {
      console.error("Failed to track activity:", error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/jobs/dashboard");
      setDashboard(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  };

  const fetchJobs = async (tab: string, currentPage: number, append = false) => {
    try {
      const endpoint = tab === "catalog" ? "/jobs/catalog" : "/jobs/recommended";
      
      const params: any = {
        page: currentPage,
        size: 12
      };
      
      if (tab === "catalog") {
        if (searchQuery) params.search = searchQuery;
        if (locationQuery) params.location = locationQuery;
        if (selectedSource) params.source = selectedSource;
        if (selectedExperience) params.experienceLevel = selectedExperience;
        if (selectedRemote) params.remotePolicy = selectedRemote;
        if (minSalary > 0) params.salaryMin = minSalary;
      }

      const response = await api.get(endpoint, { params });
      
      let fetchedJobs = [];
      let totalP = 0;
      let totalE = 0;
      
      if (response.data && response.data.content) {
        fetchedJobs = response.data.content;
        totalP = response.data.totalPages || 0;
        totalE = response.data.totalElements || 0;
      } else {
        fetchedJobs = response.data || [];
        totalP = 0;
        totalE = response.data?.length || 0;
      }

      setJobs(prev => {
        const nextList = append ? [...prev, ...fetchedJobs] : fetchedJobs;
        // Select the first job if none is selected
        if (nextList.length > 0 && (!selectedJobId || !nextList.some((j: Job) => j.id === selectedJobId))) {
          setSelectedJobId(nextList[0].id);
        }
        return nextList;
      });

      setTotalPages(totalP);
      setTotalElements(totalE);
    } catch (error) {
      console.error(`Failed to fetch ${tab} jobs:`, error);
      if (!append) setJobs([]);
    }
  };

  // Re-fetch jobs on page change or filter/tab updates
  useEffect(() => {
    const initPage = async () => {
      if (activeTab === "pipeline") {
        setLoading(false);
        return;
      }
      
      if (page === 0) {
        setLoading(true);
        if (activeTab === "dashboard") {
          await fetchDashboard();
        } else {
          await fetchJobs(activeTab, 0, false);
        }
        setLoading(false);
      } else {
        setLoadingMore(true);
        await fetchJobs(activeTab, page, true);
        setLoadingMore(false);
      }
    };
    initPage();
  }, [activeTab, page, syncStatus.status]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchJobs(activeTab, 0, false);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setLocationQuery("");
    setSelectedSource("");
    setSelectedExperience("");
    setSelectedRemote("");
    setMinSalary(0);
    setPage(0);
    setLoading(true);
    fetchJobs(activeTab, 0, false);
  };

  const handleReset = async () => {
    if (!confirm("This will clear all current jobs and perform a fresh, diversified sync based on your profile. Continue?")) {
      return;
    }
    setSearching(true);
    try {
      await api.delete("/jobs");
      setJobs([]);
      setDashboard(null);
      setSelectedJobId("");
      setDetailData(null);
      setActiveTab("dashboard");
      toast.success("Profile sync reset initiated");
    } catch (error) {
      console.error("Reset failed:", error);
      toast.error("Failed to reset sync");
    } finally {
      setSearching(false);
    }
  };

  // Dynamic infinity-scroll page loader
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      if (!loadingMore && page < totalPages - 1) {
        setPage(p => p + 1);
      }
    }
  };

  // One-Click application Tailoring method
  const handleOneClickTailor = async () => {
    if (!detailData) return;
    setIsPending(true);
    
    setPrepStatus({
      step: "STARTING",
      title: "Initializing Tailoring Engine",
      message: "Parsing target vacancy parameters...",
      company: detailData.job.company
    });

    try {
      const appRes = await api.post("/applications", {
        jobId: detailData.job.id,
        templateStyle: selectedTemplate
      });

      setDetailData(prev => {
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

      api.post(`/applications/${appRes.data.id}/prepare`, {
        jobDescription: detailData.job.description,
        company: detailData.job.company
      }).catch(error => {
        console.error("Tailoring preparation failed in background:", error);
        setPrepStatus({
          step: "FAILED",
          title: "Preparation Failed",
          message: "Failed to generate materials in the background.",
          company: detailData.job.company,
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
        company: detailData.job.company,
        error: error.response?.data?.message || error.message || "An unexpected error occurred."
      });
      setIsPending(false);
    }
  };

  const HorizontalSection = ({ title, description, icon: Icon, data }: { title: string, description: string, icon: any, data: Job[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    if (!data || data.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between px-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">{title}</h2>
            </div>
            <p className="text-muted-foreground text-sm font-medium">{description}</p>
          </div>
          <button 
            onClick={() => {
              if (title.toLowerCase().includes("remote")) {
                setSelectedRemote("REMOTE");
                setActiveTab("catalog");
              } else if (title.toLowerCase().includes("picks")) {
                setActiveTab("discovery");
              } else {
                setActiveTab("catalog");
              }
              setPage(0);
            }}
            className="text-primary text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-1 group"
          >
            View More <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        
        <div className="relative group/scroll">
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory px-1"
          >
            {data.map(job => (
              <div 
                key={job.id} 
                className="snap-start"
                onClick={() => {
                  setSelectedJobId(job.id);
                  if (activeTab === "dashboard") {
                    setActiveTab("catalog");
                  }
                }}
              >
                {/* Nominal horizontal card */}
                <div className="w-[320px] flex-shrink-0 group bg-card border border-border/80 hover:border-primary/40 rounded-3xl p-6 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 flex flex-col gap-4 cursor-pointer">
                  <div className="flex justify-between items-center gap-2">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      job.matchScore >= 85 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                    }`}>
                      {Math.round(job.matchScore)}% Match
                    </span>
                    <span className="text-[8px] font-black tracking-widest text-muted-foreground px-2 py-0.5 bg-secondary rounded-full uppercase">
                      {job.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 border rounded-lg overflow-hidden flex items-center justify-center p-1 bg-secondary shrink-0">
                      {job.companyLogoUrl ? (
                        <img src={job.companyLogoUrl} alt={job.company} className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="w-5 h-5 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black truncate">{job.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{job.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 border-t border-border/30 pt-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{job.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card p-6 rounded-[2rem] border border-border/80 shadow-sm relative">
        {isSyncing && (
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-primary rounded-t-[2rem] animate-pulse" />
        )}
        
        <div className="space-y-4">
          <div className="space-y-1.5 hidden md:block">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tighter text-foreground">Job Discovery</h1>
              {isSyncing && (
                <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full animate-pulse">
                  <RotateCcw className="w-2.5 h-2.5 animate-spin" /> Sync active
                </span>
              )}
            </div>
            <p className="text-muted-foreground font-medium max-w-lg text-xs">
              LinkedIn priority integrations and autonomous AI compatibility calculations.
            </p>
          </div>
          
          {/* Navigation Tab Bar */}
          <div className="flex p-1 bg-secondary/40 rounded-xl w-fit border border-border/40">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "discovery", label: "Discovery Feed" },
              { id: "catalog", label: "All Jobs" },
              { id: "pipeline", label: "Pipeline Board" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setPage(0); }}
                className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? "bg-background text-foreground shadow-sm border border-border/10" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {activeTab === "catalog" && (
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                showAdvancedFilters ? "bg-primary text-primary-foreground border-transparent animate-pulse" : "bg-secondary/40 border-border hover:bg-secondary"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              className="p-3 rounded-xl bg-secondary/40 text-foreground hover:bg-secondary transition-all border border-border"
              title="Recalculate Weighted Match Criteria"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={searching || isSyncing}
              className="p-3 rounded-xl bg-secondary/40 text-foreground hover:bg-secondary transition-all border border-border disabled:opacity-50"
              title="Reset & Re-sync Profile"
            >
              <RotateCcw className={`w-4 h-4 ${(searching || isSyncing) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Drawer (Available in Catalog view) */}
      {activeTab === "catalog" && showAdvancedFilters && (
        <form onSubmit={handleApplyFilters} className="bg-card border border-border p-6 rounded-3xl space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-md">
          <div className="flex justify-between items-center border-b border-border/40 pb-3">
            <span className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-500" /> Advanced Filter Criteria
            </span>
            <button 
              type="button"
              onClick={handleClearFilters}
              className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Keyword Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="e.g. React, Engineer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary/30 border border-border/80 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="e.g. Remote, Berlin..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full bg-secondary/30 border border-border/80 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preferred Source</label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full bg-secondary/30 border border-border/80 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:outline-none cursor-pointer"
              >
                <option value="">All Sources</option>
                <option value="linkedin">LinkedIn (Primary)</option>
                <option value="indeed">Indeed</option>
                <option value="glassdoor">Glassdoor</option>
                <option value="adzuna">Adzuna</option>
                <option value="remotive">Remotive</option>
                <option value="jsearch">JSearch</option>
                <option value="themuse">The Muse</option>
                <option value="arbeitnow">Arbeitnow</option>
                <option value="usajobs">USAJobs</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Remote Policy</label>
              <select
                value={selectedRemote}
                onChange={(e) => setSelectedRemote(e.target.value)}
                className="w-full bg-secondary/30 border border-border/80 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:outline-none cursor-pointer"
              >
                <option value="">Any Policy</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">Onsite</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Experience Level</label>
              <select
                value={selectedExperience}
                onChange={(e) => setSelectedExperience(e.target.value)}
                className="w-full bg-secondary/30 border border-border/80 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:outline-none cursor-pointer"
              >
                <option value="">Any Level</option>
                <option value="JUNIOR">Junior (0-2 years)</option>
                <option value="MID">Mid Level (2-5 years)</option>
                <option value="SENIOR">Senior (5-9 years)</option>
                <option value="LEAD">Lead / Architect (9+ years)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Min Salary Bounds</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  type="number"
                  placeholder="e.g. 80000"
                  value={minSalary || ""}
                  onChange={(e) => setMinSalary(parseInt(e.target.value) || 0)}
                  className="w-full bg-secondary/30 border border-border/80 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-foreground text-background font-black uppercase tracking-widest text-xs py-3 px-8 rounded-xl hover:opacity-90 transition-all shadow-md"
            >
              Apply Filter Parameters
            </button>
          </div>
        </form>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse font-black tracking-widest uppercase text-[10px]">Scanning active channels...</p>
        </div>
      ) : activeTab === "pipeline" ? (
        <PipelineBoard />
      ) : activeTab === "dashboard" ? (
        dashboard ? (
          <div className="space-y-16">
            <HorizontalSection 
              title="Top job picks for you" 
              description="High similarity matches compiled using vector algorithms."
              icon={Zap}
              data={dashboard.topPicks}
            />
            
            <HorizontalSection 
              title="Likely to hear back" 
              description="Vacancy specifications aligning perfectly with your historical experience."
              icon={Target}
              data={dashboard.likelyToHearBack}
            />

            <HorizontalSection 
              title="Based on your activity" 
              description="Recommendations adapted reactively to your recent views, saves and applies."
              icon={History}
              data={dashboard.basedOnActivity}
            />

            <HorizontalSection 
              title="Remote Opportunities" 
              description="Hand-picked remote-first roles across the globe."
              icon={Globe}
              data={dashboard.remoteJobs}
            />

            <HorizontalSection 
              title="Easy Apply" 
              description="Quick application channels matching target credentials."
              icon={Briefcase}
              data={dashboard.easyApply}
            />
          </div>
        ) : null
      ) : (
        /* LinkedIn-style Split Screen Layout */
        <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] h-[calc(100vh-220px)] relative overflow-hidden">
          
          {/* Left Side: Scrollable Job Snippets List */}
          <div className="w-full lg:w-[350px] xl:w-[420px] flex-shrink-0 flex flex-col bg-card border border-border/80 rounded-3xl overflow-hidden h-full">
            <div className="px-5 py-3 border-b border-border/40 bg-secondary/20 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Feed Listings
              </span>
              <span className="text-[9px] font-bold text-muted-foreground px-2 py-0.5 bg-secondary rounded-full">
                {totalElements || jobs.length} items
              </span>
            </div>

            <div 
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar scroll-smooth"
            >
              {jobs.length > 0 ? (
                jobs.map((job) => {
                  const isSelected = selectedJobId === job.id;
                  return (
                    <div
                      key={job.id}
                      onClick={() => { setSelectedJobId(job.id); trackActivity(job.id, "VIEW"); }}
                      className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-2.5 cursor-pointer relative group ${
                        isSelected 
                          ? "bg-primary/[0.03] border-primary shadow-lg shadow-primary/5" 
                          : "bg-card border-border/50 hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                          job.matchScore >= 85 
                            ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' 
                            : 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                        }`}>
                          {Math.round(job.matchScore)}% Match
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/80 bg-secondary px-1.5 py-0.5 rounded">
                          {job.source}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg border overflow-hidden flex items-center justify-center p-1 bg-secondary shrink-0 ${
                          job.companyLogoTheme === 'light' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                        }`}>
                          {job.companyLogoUrl ? (
                            <img src={job.companyLogoUrl} alt={job.company} className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-5 h-5 text-muted-foreground opacity-55" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 leading-snug">
                          <h4 className="text-xs font-black truncate group-hover:text-primary transition-colors">{job.title}</h4>
                          <p className="text-[10px] text-muted-foreground truncate pt-0.5">{job.company}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1 border-t border-border/30 pt-2 flex-wrap gap-2">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" /> {job.location}</span>
                        {job.salaryMin && (
                          <span className="font-bold text-foreground/80">
                            ${(job.salaryMin / 1000).toFixed(0)}k - ${(job.salaryMax / 1000).toFixed(0)}k
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center text-xs text-muted-foreground font-bold">
                  No listings found.
                </div>
              )}

              {loadingMore && (
                <div className="py-3 text-center flex items-center justify-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading more logs...
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Scrollable Interactive Details Workspace */}
          <div className="flex-1 bg-card border border-border/85 rounded-[2rem] h-full overflow-y-auto relative p-6 md:p-8 no-scrollbar">
            {detailLoading ? (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 z-50">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">Loading detailed workspace analytics...</p>
              </div>
            ) : detailData ? (
              <div className="space-y-8 animate-in fade-in duration-300">
                
                {/* Header Information Box */}
                <div className="bg-secondary/20 border border-border/50 rounded-2xl p-6 relative overflow-hidden shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-4">
                      <div className={`h-16 w-16 rounded-xl border flex items-center justify-center p-2 shadow-md shrink-0 ${
                        detailData.job.companyLogoTheme === 'light' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                      }`}>
                        {detailData.job.companyLogoUrl ? (
                          <img src={detailData.job.companyLogoUrl} alt={detailData.job.company} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-muted-foreground opacity-55" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight text-foreground truncate">{detailData.job.title}</h2>
                        <h3 className="text-xs md:text-sm font-black text-muted-foreground uppercase tracking-widest pt-1">{detailData.job.company}</h3>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                      <span className="bg-secondary border border-border px-3 py-1.5 rounded-lg text-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 opacity-60" /> {detailData.job.location}
                      </span>
                      {detailData.job.salaryMin && (
                        <span className="bg-secondary border border-border px-3 py-1.5 rounded-lg text-foreground flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> ${detailData.job.salaryMin.toLocaleString()} - ${detailData.job.salaryMax.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Block */}
                  <div className="w-full md:w-auto flex flex-col gap-2 shrink-0">
                    <div className="relative">
                      <button 
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="w-full bg-secondary text-foreground px-4 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-between gap-4 border border-border hover:bg-secondary/80 transition-all uppercase tracking-widest"
                      >
                        <div className="flex items-center gap-1.5">
                          <Layout className="w-4 h-4 opacity-50" />
                          <span>Style: {selectedTemplate}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showTemplates && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl p-1 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                          {["MODERN", "CLASSIC"].map(t => (
                            <button 
                              key={t}
                              onClick={() => { setSelectedTemplate(t); setShowTemplates(false); }}
                              className="w-full text-left px-3 py-2 hover:bg-secondary rounded-lg transition-all text-[9px] font-black uppercase tracking-widest"
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
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all uppercase tracking-widest"
                      >
                        <CheckCircle className="w-4 h-4" />
                        View Materials
                      </Link>
                    ) : (
                      <button 
                        onClick={handleOneClickTailor}
                        disabled={!!isGeneratingOrPending}
                        className="w-full bg-foreground hover:bg-foreground/90 text-background px-5 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 uppercase tracking-widest"
                      >
                        {isGeneratingOrPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            TAILORING...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 fill-current" />
                            One-Click Tailor
                          </>
                        )}
                      </button>
                    )}

                    {detailData.job.url && (
                      <a 
                        href={detailData.job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group w-full bg-secondary text-foreground px-5 py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 border border-border hover:border-foreground/30 transition-all uppercase tracking-widest"
                      >
                        Apply Now
                        <ExternalLink className="w-3.5 h-3.5 opacity-55 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>
                    )}
                  </div>
                </div>

                {/* AI Match Intelligence & Culture insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                    <h3 className="text-[9px] font-black flex items-center gap-1.5 uppercase tracking-widest text-muted-foreground">
                      <Target className="w-4 h-4 opacity-50" />
                      Match Intelligence
                    </h3>
                    <div className="text-foreground leading-relaxed text-xs font-semibold">
                      {relevanceLoading ? (
                        <div className="flex items-center gap-2 opacity-60">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Match Explanation...</span>
                        </div>
                      ) : detailData.job.relevanceExplanation ? (
                        <p>{detailData.job.relevanceExplanation}</p>
                      ) : (
                        <p className="text-muted-foreground italic">No score matching details resolved.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                    <h3 className="text-[9px] font-black flex items-center gap-1.5 uppercase tracking-widest text-muted-foreground">
                      <Globe className="w-4 h-4 opacity-50" />
                      Culture Alignment
                    </h3>
                    <div className="text-foreground leading-relaxed text-xs font-semibold">
                      {cultureLoading ? (
                        <div className="flex items-center gap-2 opacity-60">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Parsing Corporate Culture...</span>
                        </div>
                      ) : detailData.job.cultureAnalysis ? (
                        <p className="truncate-lines-4" title={detailData.job.cultureAnalysis}>{detailData.job.cultureAnalysis}</p>
                      ) : (
                        <p className="text-muted-foreground italic">No culture logs cached.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Matched Skills */}
                {detailData.matchedSkills && detailData.matchedSkills.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                    <h3 className="text-[9px] font-black flex items-center gap-1.5 uppercase tracking-widest text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 opacity-50" />
                      Aligned Skills Overlap
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {detailData.matchedSkills.map(skill => (
                        <span key={skill} className="text-xs font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3 py-1.5 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full job Description Box */}
                <div className="bg-card border border-border rounded-[2rem] p-6 md:p-8 space-y-4 shadow-sm">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border/40 pb-3">
                    Vacancy Specifications
                  </h3>
                  <div className="prose dark:prose-invert prose-xs max-w-none text-foreground/80 leading-relaxed font-medium">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {detailData.job.description}
                    </ReactMarkdown>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <Briefcase className="w-12 h-12 text-muted-foreground opacity-20 mb-3" />
                <h3 className="font-black text-sm uppercase tracking-wider">Select a job to view details</h3>
                <p className="text-xs text-muted-foreground pt-1">Click any posting in the list to reveal alignment scoring and details.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Recalculate Weights Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-300">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight">Match Core Weights</h2>
              <p className="text-muted-foreground text-xs font-medium">Fine-tune the weight parameters utilized by our neural scoring engine to compute your compatibility.</p>
            </div>

            <div className="space-y-4">
              {[
                { id: "semantic", label: "Semantic Core Match", desc: "LLM contextual description & headline fit" },
                { id: "skills", label: "Skills Keyword Match", desc: "Explicit technical keyword matching" },
                { id: "lifestyle", label: "Lifestyle Match", desc: "Remote, hybrid, and location fit" },
                { id: "experience", label: "Seniority Match", desc: "Experience years vs required level fit" }
              ].map(pref => (
                <div key={pref.id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-foreground">{pref.label}</span>
                    <span className="text-primary">{(weights as any)[pref.id]}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={(weights as any)[pref.id]}
                    onChange={(e) => setWeights(prev => ({ ...prev, [pref.id]: parseInt(e.target.value) }))}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground/80 font-medium">{pref.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="flex-1 bg-secondary text-secondary-foreground text-xs font-bold py-3.5 rounded-xl hover:bg-secondary/80 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePreferences}
                className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-3.5 rounded-xl hover:bg-primary/95 transition-all shadow-lg shadow-primary/20"
              >
                Apply Criteria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
