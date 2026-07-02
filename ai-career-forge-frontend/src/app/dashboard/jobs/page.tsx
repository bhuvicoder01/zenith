"use client";

import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { Briefcase, MapPin, DollarSign, ExternalLink, Star, RotateCcw, ChevronRight, ChevronLeft, Zap, Target, History, Globe, Sliders } from "lucide-react";
import useSyncStore from "@/store/useSyncStore";
import { toast } from "sonner";
import PipelineBoard from "@/components/PipelineBoard";

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
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "discovery" | "catalog" | "pipeline">("dashboard");
  const [showPreferences, setShowPreferences] = useState(false);
  const [weights, setWeights] = useState({
    semantic: 30,
    skills: 30,
    lifestyle: 20,
    experience: 20
  });

  // Fetch current user profile to load saved preferences
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
        console.error("Failed to load profile match preferences:", err);
      }
    };
    loadProfile();
  }, []);

  const savePreferences = async () => {
    try {
      const payload = {
        semantic: weights.semantic / 100,
        skills: weights.skills / 100,
        lifestyle: weights.lifestyle / 100,
        experience: weights.experience / 100
      };
      await api.post("/profile/match-preferences", payload);
      toast.success("Matching preferences updated!");
      setShowPreferences(false);
      // Reload dashboard/jobs list
      setLoading(true);
      if (activeTab === "dashboard") {
        await fetchDashboard();
      } else if (activeTab !== "pipeline") {
        await fetchJobs(activeTab);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to save preferences:", err);
      toast.error("Failed to update preferences");
    }
  };
  
  const syncStatus = useSyncStore((state) => state.syncStatus);
  const isSyncing = syncStatus.status === 'SYNCING' || syncStatus.status === 'MATCHING';

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
      console.error("Failed to fetch dashboard:", error);
    }
  };

  const fetchJobs = async (tab: string) => {
    try {
      const endpoint = tab === "catalog" ? "/jobs/catalog" : "/jobs/recommended";
      const response = await api.get(endpoint);
      setJobs(response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ${tab} jobs:`, error);
      return [];
    }
  };

  useEffect(() => {
    const initPage = async () => {
      if (activeTab === "pipeline") {
        setLoading(false);
        return;
      }
      setLoading(true);
      if (activeTab === "dashboard") {
        await fetchDashboard();
      } else {
        await fetchJobs(activeTab);
      }
      setLoading(false);
    };
    initPage();
  }, [activeTab, syncStatus.status]);

  useEffect(() => {
    const filtered = jobs.filter(job => {
      const matchesQuery = !query || 
        job.title.toLowerCase().includes(query.toLowerCase()) || 
        job.company.toLowerCase().includes(query.toLowerCase()) ||
        job.description.toLowerCase().includes(query.toLowerCase());
      
      const matchesLocation = !location || 
        job.location.toLowerCase().includes(location.toLowerCase());

      return matchesQuery && matchesLocation;
    });
    setFilteredJobs(filtered);
  }, [query, location, jobs, activeTab]);

  const handleReset = async () => {
    if (!confirm("This will clear all current jobs and perform a fresh, diversified sync based on your profile. Continue?")) {
        return;
    }
    setSearching(true);
    try {
        await api.delete("/jobs");
        setJobs([]);
        setDashboard(null);
        setActiveTab("dashboard");
    } catch (error) {
        console.error("Reset failed:", error);
    } finally {
      setSearching(false);
    }
  };

  const JobCard = ({ job, variant = "grid" }: { job: Job, variant?: "grid" | "horizontal" }) => (
    <div key={job.id} className={`${variant === 'grid' ? 'w-full' : 'w-[320px] flex-shrink-0'} group relative bg-card border border-border rounded-2xl p-6 hover:shadow-2xl hover:shadow-primary/5 transition-all flex flex-col gap-4`}>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-foreground text-background rounded-full text-[9px] font-black uppercase tracking-widest border border-transparent shadow-sm">
          {Math.round(job.matchScore)}% Match
        </div>
      </div>

      <div className="flex items-start gap-3 min-w-0">
        <div className={`flex-shrink-0 h-10 w-10 rounded-lg border overflow-hidden flex items-center justify-center p-1 shadow-sm ${
          job.companyLogoTheme === 'light' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
        }`}>
          {job.companyLogoUrl ? (
            <img src={job.companyLogoUrl} alt={job.company} className="w-full h-full object-contain" />
          ) : (
            <Briefcase className="w-5 h-5 text-muted-foreground opacity-50" />
          )}
        </div>
        <div className="space-y-0.5 min-w-0 flex-1">
          <h3 className="text-base font-bold leading-tight truncate" title={job.title}>{job.title}</h3>
          <p className="text-muted-foreground font-medium text-xs truncate" title={job.company}>{job.company}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> {job.location}
        </div>
        {job.salaryMin && (
          <div className="flex items-center gap-1 font-semibold text-foreground/80">
            <DollarSign className="w-3.5 h-3.5" /> 
            ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-auto">
        <Link
          href={`/dashboard/jobs/${job.id}`}
          onClick={() => trackActivity(job.id, "VIEW")}
          className="flex-1 bg-secondary text-secondary-foreground text-center py-2 rounded-lg text-xs font-bold hover:bg-secondary/80 transition-colors"
        >
          Details
        </Link>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackActivity(job.id, "APPLY")}
          className="flex-1 bg-primary text-primary-foreground text-center py-2 rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
        >
          Apply <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );

  const HorizontalSection = ({ title, description, icon: Icon, data }: { title: string, description: string, icon: any, data: Job[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    if (!data || data.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between px-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">{title}</h2>
            </div>
            <p className="text-muted-foreground text-sm font-medium">{description}</p>
          </div>
          <button className="text-primary text-sm font-bold hover:underline flex items-center gap-1 group">
            Show all <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        
        <div className="relative group/scroll">
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory px-1"
          >
            {data.map(job => (
              <div key={job.id} className="snap-start">
                <JobCard job={job} variant="horizontal" />
              </div>
            ))}
          </div>
          
          <button 
            onClick={() => scrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' })}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-background border border-border p-2 rounded-full shadow-xl opacity-0 group-hover/scroll:opacity-100 transition-all z-10 hover:bg-secondary"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => scrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' })}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-background border border-border p-2 rounded-full shadow-xl opacity-0 group-hover/scroll:opacity-100 transition-all z-10 hover:bg-secondary"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card p-8 rounded-[2rem] border border-border shadow-sm">
        <div className="space-y-4">
          <div className="space-y-1 hidden md:block">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground">Job Discovery</h1>
            <p className="text-muted-foreground font-medium max-w-lg">
              {activeTab === "dashboard" ? "Personalized collections based on your profile and behavior." : "Semantic matches and global verified career opportunities."}
            </p>
          </div>
          
          <div className="flex p-1 bg-secondary/30 rounded-xl w-fit">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "discovery", label: "Discovery Feed" },
              { id: "catalog", label: "All Jobs" },
              { id: "pipeline", label: "Pipeline Board" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex-1 lg:w-64 xl:w-72">
            <input
              type="text"
              placeholder="Filter by Skill or Title"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              className="p-2.5 rounded-xl bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-all border border-border"
              title="Recalculate Weighted Match Criteria"
            >
              <Sliders className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={searching || isSyncing}
              className="p-2.5 rounded-xl bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-all border border-border disabled:opacity-50"
              title="Reset & Re-sync Profile"
            >
              <RotateCcw className={`w-5 h-5 ${(searching || isSyncing) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-xs">Assembling your career dashboard...</p>
        </div>
      ) : activeTab === "pipeline" ? (
        <PipelineBoard />
      ) : activeTab === "dashboard" && dashboard ? (
        <div className="space-y-16">
          <HorizontalSection 
            title="Top job picks for you" 
            description="Based on your profile, preferences, and activity like applies, searches, and saves"
            icon={Zap}
            data={dashboard.topPicks}
          />
          
          <HorizontalSection 
            title="Likely to hear back" 
            description="Jobs where your profile is in the top 10% of applicants"
            icon={Target}
            data={dashboard.likelyToHearBack}
          />

          <HorizontalSection 
            title="Based on your activity" 
            description="Opportunities similar to jobs you've recently viewed or applied to"
            icon={History}
            data={dashboard.basedOnActivity}
          />

          <HorizontalSection 
            title="Remote Opportunities" 
            description="Hand-picked remote-first roles across the globe"
            icon={Globe}
            data={dashboard.remoteJobs}
          />

          <HorizontalSection 
            title="Easy Apply" 
            description="Quick application process through verified local recruiters"
            icon={Briefcase}
            data={dashboard.easyApply}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => <JobCard key={job.id} job={job} variant="grid" />)
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-2xl flex flex-col items-center gap-4">
              <Briefcase className="w-12 h-12 text-muted-foreground opacity-20" />
              <h2 className="text-xl font-semibold">No matches found in this category</h2>
            </div>
          )}
        </div>
      )}

      {/* Matching Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-300">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight">Recalculate Match Criteria</h2>
              <p className="text-muted-foreground text-xs font-medium">Fine-tune the weight parameters utilized by our AI to compute your compatibility score.</p>
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
                    className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground/80 font-medium">{pref.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="flex-1 bg-secondary text-secondary-foreground text-xs font-bold py-3 rounded-xl hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePreferences}
                className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-3 rounded-xl hover:bg-primary/95 transition-colors"
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
