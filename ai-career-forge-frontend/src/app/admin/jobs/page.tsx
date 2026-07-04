"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { 
  Briefcase, RefreshCw, Database, Trash2, Search, Filter, 
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock, ListRestart, Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  status: string;
  postedDate: string;
  matchScore?: number;
}

interface JobStats {
  totalJobs: number;
  statusBreakdown: {
    ACTIVE: number;
    STALE: number;
    EXPIRED: number;
  };
  sourceBreakdown: {
    linkedin: number;
    adzuna: number;
    remotive: number;
    jsearch: number;
    indeed: number;
    glassdoor: number;
    themuse: number;
    arbeitnow: number;
    usajobs: number;
    local: number;
  };
  syncInProgress: boolean;
  lastSync?: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
}

export default function AdminJobs() {
  const [stats, setStats] = useState<JobStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [purging, setPurging] = useState(false);
  
  // Table Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get("/admin/jobs/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load admin job stats", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size: 15
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.source = sourceFilter;

      const res = await api.get("/admin/jobs", { params });
      setJobs(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
    } catch (err) {
      console.error("Failed to load admin jobs list", err);
      toast.error("Failed to load jobs directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [page, statusFilter, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchJobs();
  };

  const triggerSync = async () => {
    setSyncing(true);
    toast.promise(
      api.post("/admin/jobs/sync"),
      {
        loading: "Initiating manual multi-source synchronization protocol...",
        success: (res) => {
          fetchStats();
          return res.data.message || "Sync started successfully!";
        },
        error: "Sync initiation failed."
      }
    );
    setSyncing(false);
  };

  const triggerReindex = async () => {
    setReindexing(true);
    toast.promise(
      api.post("/admin/jobs/reindex"),
      {
        loading: "Re-indexing vector embeddings for all job descriptions...",
        success: (res) => {
          return res.data.message || "Vector store re-indexing started!";
        },
        error: "Vector re-indexing failed."
      }
    );
    setReindexing(false);
  };

  const purgeExpired = async () => {
    if (!confirm("Are you sure you want to purge all EXPIRED jobs from the database?")) return;
    setPurging(true);
    try {
      const res = await api.delete("/admin/jobs/expired");
      toast.success(`Purged ${res.data.purgedCount} expired jobs successfully.`);
      fetchStats();
      fetchJobs();
    } catch (err) {
      toast.error("Purging failed");
    } finally {
      setPurging(false);
    }
  };

  const deleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this job posting?")) return;
    try {
      await api.delete(`/admin/jobs/${id}`);
      toast.success("Job listing deleted.");
      fetchStats();
      fetchJobs();
    } catch (err) {
      toast.error("Failed to delete job");
    }
  };

  const nuclearPurge = async () => {
    if (!confirm("WARNING: This will delete ALL jobs and clear the entire Vector Store. This cannot be undone. Are you sure?")) return;
    try {
      const res = await api.delete("/admin/jobs/purge-all");
      toast.success(res.data.message || "Global purge successful.");
      fetchStats();
      fetchJobs();
    } catch (err) {
      toast.error("Nuclear purge failed");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">Job Nexus</h1>
          <p className="text-muted-foreground font-medium text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-500" /> Multi-Source Ingestion & Catalog Overseer
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchStats}
            className="p-3 bg-secondary rounded-xl hover:rotate-180 transition-all duration-500 border border-border"
            title="Refresh Stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-6 rounded-3xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Catalog</span>
            <Briefcase className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-black">{statsLoading ? "..." : stats?.totalJobs}</p>
          <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Jobs in Catalog Database</span>
        </div>

        <div className="bg-card border border-border p-6 rounded-3xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Pool</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-black text-green-500">
            {statsLoading ? "..." : stats?.statusBreakdown?.ACTIVE || 0}
          </p>
          <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Currently active matching jobs</span>
        </div>

        <div className="bg-card border border-border p-6 rounded-3xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stale Listings</span>
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-black text-orange-500">
            {statsLoading ? "..." : stats?.statusBreakdown?.STALE || 0}
          </p>
          <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Not seen in last 48 hours</span>
        </div>

        <div className="bg-card border border-border p-6 rounded-3xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Archived / Expired</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-black text-red-500">
            {statsLoading ? "..." : stats?.statusBreakdown?.EXPIRED || 0}
          </p>
          <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Hidden but kept for history</span>
        </div>
      </div>

      {/* Control Panel Card */}
      <div className="bg-card border border-border rounded-3xl p-8 space-y-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight mb-1">Ingestion Orchestrator</h2>
          <p className="text-xs text-muted-foreground font-medium">Initialize core protocols to synchronise data with external sources, manage indices, or clean stale data stores.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={triggerSync}
            disabled={syncing || stats?.syncInProgress}
            className="flex-1 min-w-[200px] bg-blue-600 text-white font-black uppercase tracking-widest text-xs py-4 px-6 rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing || stats?.syncInProgress ? "animate-spin" : ""}`} />
            Sync Multi-Sources
          </button>

          <button
            onClick={triggerReindex}
            disabled={reindexing}
            className="flex-1 min-w-[200px] bg-secondary text-secondary-foreground font-black uppercase tracking-widest text-xs py-4 px-6 rounded-2xl hover:bg-secondary/80 border border-border transition-all flex items-center justify-center gap-2"
          >
            <Database className="w-4 h-4" />
            Rebuild Embeddings
          </button>

          <button
            onClick={purgeExpired}
            disabled={purging}
            className="flex-1 min-w-[200px] bg-orange-600/10 text-orange-500 border border-orange-500/20 font-black uppercase tracking-widest text-xs py-4 px-6 rounded-2xl hover:bg-orange-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Purge Expired
          </button>

          <button
            onClick={nuclearPurge}
            className="flex-1 min-w-[200px] bg-red-600/10 text-red-500 border border-red-500/20 font-black uppercase tracking-widest text-xs py-4 px-6 rounded-2xl hover:bg-red-600/20 transition-all flex items-center justify-center gap-2"
            title="Purge all jobs from MongoDB and vector store"
          >
            <ListRestart className="w-4 h-4" />
            Nuclear Purge
          </button>
        </div>

        {stats?.lastSync && (
          <div className="pt-4 border-t border-border flex flex-wrap gap-x-8 gap-y-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
            <span>Last Sync Run: {new Date(stats.lastSync.startedAt).toLocaleString()}</span>
            <span>Duration: {(stats.lastSync.durationMs / 1000).toFixed(1)}s</span>
            <span>State: {stats.syncInProgress ? "Executing" : "Idle"}</span>
          </div>
        )}
      </div>

      {/* Source Breakdown Section */}
      <div className="bg-card border border-border rounded-3xl p-8 space-y-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight mb-1">Source Distribution</h2>
          <p className="text-xs text-muted-foreground font-medium">Proportion of listings retrieved from LinkedIn (Primary) and other aggregated portals.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats && Object.entries(stats.sourceBreakdown).map(([source, count]) => (
            <div key={source} className="bg-secondary/40 border border-border/60 p-4 rounded-2xl flex flex-col gap-1.5 items-center justify-center text-center">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                source === "linkedin" ? "bg-blue-600/10 text-blue-500 border border-blue-600/20" : "bg-muted text-muted-foreground"
              }`}>
                {source}
              </span>
              <p className="text-lg font-black">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Job Directory Directory */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-8 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-black uppercase tracking-tight">Active Directories</h2>
            <div className="text-xs text-muted-foreground font-black uppercase tracking-widest">
              Total Matches: {totalElements}
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search catalog directory (Title, Company, Keyword)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="STALE">Stale</option>
                <option value="EXPIRED">Expired</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
                className="bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:outline-none"
              >
                <option value="">All Sources</option>
                <option value="linkedin">LinkedIn</option>
                <option value="adzuna">Adzuna</option>
                <option value="remotive">Remotive</option>
                <option value="jsearch">JSearch</option>
                <option value="indeed">Indeed</option>
                <option value="glassdoor">Glassdoor</option>
                <option value="themuse">The Muse</option>
                <option value="arbeitnow">Arbeitnow</option>
                <option value="usajobs">USAJobs</option>
              </select>
              <button 
                type="submit"
                className="bg-foreground text-background px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 shadow-md transition-all shrink-0"
              >
                Query Directory
              </button>
            </div>
          </form>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-secondary/20 border-b border-border">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Title & Company</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Location</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-sm text-muted-foreground font-black uppercase tracking-widest animate-pulse">
                    Retrieving directory logs...
                  </td>
                </tr>
              ) : jobs.length > 0 ? (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-foreground leading-tight">{job.title}</p>
                      <p className="text-xs text-muted-foreground font-medium pt-0.5">{job.company}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                        job.source === 'linkedin' 
                          ? 'bg-blue-600/10 text-blue-500 border-blue-600/20' 
                          : 'bg-secondary text-muted-foreground border-border'
                      }`}>
                        {job.source}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-xs text-muted-foreground">{job.location}</td>
                    <td className="px-8 py-5">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${
                        job.status === 'ACTIVE' ? 'text-green-500' : job.status === 'STALE' ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => deleteJob(job.id)}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Delete listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-sm text-muted-foreground font-bold">
                    No matching jobs found in catalog directory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-8 py-5 border-t border-border flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-secondary text-secondary-foreground text-xs font-black uppercase tracking-widest rounded-xl hover:bg-secondary/80 transition-all border border-border disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4 inline mr-1" /> Prev
            </button>
            <span className="text-xs font-bold text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-4 py-2 bg-secondary text-secondary-foreground text-xs font-black uppercase tracking-widest rounded-xl hover:bg-secondary/80 transition-all border border-border disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
