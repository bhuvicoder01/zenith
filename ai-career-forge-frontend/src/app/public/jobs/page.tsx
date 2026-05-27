"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Briefcase, MapPin, DollarSign, ExternalLink, Star } from "lucide-react";
import { useTheme } from "next-themes";
import { BACKEND_URL } from "@/lib/api";
import useAuthStore from "@/store/useAuthStore";

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
}

export default function PublicJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const fetchPublicJobs = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/jobs/public`);
        setJobs(response.data);
      } catch (error) {
        console.error("Failed to fetch public jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicJobs();
  }, []);

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(query.toLowerCase()) ||
    job.company.toLowerCase().includes(query.toLowerCase()) ||
    job.location.toLowerCase().includes(query.toLowerCase())
  );

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">Scanning the global talent market...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
               <img 
                 src={resolvedTheme === 'dark' ? '/zenith-dark.png' : '/zenith-light.png'} 
                 alt="Zenith" 
                 className="w-full h-full object-contain" 
               />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">ZENITH</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <Link href="/public/jobs" className="text-foreground transition-colors">Explore Jobs</Link>
            <Link href="/public/profiles" className="hover:text-foreground transition-colors">Explore Profiles</Link>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard" className="px-5 py-2.5 bg-foreground text-background rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">
                  Login
                </Link>
                <Link href="/auth/register" className="px-5 py-2.5 bg-foreground text-background rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight italic">
            Public <span className="text-muted-foreground/30 not-italic">Catalog.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Explore a small sample of our 1,000+ live opportunities. 
            Join now to unlock AI-powered matching and autonomous applications.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <input 
            type="text"
            placeholder="Search jobs, companies, or locations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-secondary/30 border border-border rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all font-medium"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredJobs.map((job) => (
            <div key={job.id} className="group relative bg-card border border-border rounded-3xl p-8 hover:shadow-2xl hover:shadow-blue-600/5 transition-all flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div className={`h-12 w-12 rounded-xl border flex items-center justify-center p-2 shadow-sm ${
                  job.companyLogoTheme === 'light' ? 'bg-zinc-900' : 'bg-white'
                }`}>
                  {job.companyLogoUrl ? (
                    <img src={job.companyLogoUrl} alt={job.company} className="w-full h-full object-contain" />
                  ) : (
                    <Briefcase className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="px-3 py-1.5 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-600/20">
                  Featured
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold leading-tight group-hover:text-blue-600 transition-colors">{job.title}</h3>
                <p className="text-muted-foreground font-medium">{job.company}</p>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {job.location}
                </div>
                {job.salaryMin > 0 && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" /> 
                    ${job.salaryMin.toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-auto pt-4 border-t border-border/50">
                <Link 
                  href="/auth/register"
                  className="flex-1 bg-foreground text-background text-center py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
                >
                  Unlock Match
                </Link>
                <a 
                  href={job.url}
                  target="_blank"
                  className="px-4 py-3 bg-secondary text-secondary-foreground rounded-xl flex items-center justify-center hover:bg-border transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl flex flex-col items-center gap-6">
            <Briefcase className="w-16 h-16 text-muted-foreground opacity-20" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold italic tracking-tight">No opportunities found</h2>
              <p className="text-muted-foreground">Try a different search term or join us to see the full catalog.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
