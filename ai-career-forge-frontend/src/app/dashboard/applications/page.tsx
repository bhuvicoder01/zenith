"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { 
  CheckCircle, Clock, FileText, LayoutDashboard, 
  ExternalLink, MousePointer2, Briefcase, ChevronRight,
  TrendingUp, Download, Eye, AlertCircle, Loader2,
  Trash2, Archive, Inbox, Activity
} from "lucide-react";

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  status: 'SAVED' | 'APPLIED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'ARCHIVED';
  appliedDate: string;
  tailoredResumeS3Url?: string;
  coverLetterText?: string;
  emailIntroduction?: string;
  interviewPrepText?: string;
  templateStyle?: string;
}

export default function ApplicationTracker() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const fetchApps = async () => {
    try {
      const response = await api.get("/applications");
      setApps(response.data);
    } catch (error) {
       console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/applications/${id}/status?status=${newStatus}`);
      await fetchApps();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleArchive = (id: string) => {
    handleStatusUpdate(id, 'ARCHIVED');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this application and all generates materials?")) {
        return;
    }
    setUpdatingId(id);
    try {
      await api.delete(`/applications/${id}`);
      await fetchApps();
    } catch (error) {
      console.error("Failed to delete application:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredApps = apps.filter(app => 
    currentTab === 'ACTIVE' ? app.status !== 'ARCHIVED' : app.status === 'ARCHIVED'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
         <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 hidden md:block">
          <h1 className="text-2xl md:text-5xl font-black text-foreground tracking-tight">Application Arsenal</h1>
          <p className="text-sm md:text-base text-muted-foreground font-semibold">Manage your agent-generated materials and track your mission progress.</p>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Tabs */}
           <div className="flex p-1 bg-secondary border border-border rounded-2xl">
              <button 
                onClick={() => setCurrentTab('ACTIVE')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                  currentTab === 'ACTIVE' ? 'bg-foreground text-background shadow-lg' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                  <Activity className="w-4 h-4" /> Active Bids
              </button>
              <button 
                onClick={() => setCurrentTab('ARCHIVED')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                  currentTab === 'ARCHIVED' ? 'bg-foreground text-background shadow-lg' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                  <Inbox className="w-4 h-4" /> Archived
              </button>
           </div>

           <div className="hidden xl:flex bg-card border border-border px-6 py-3 rounded-2xl items-center gap-3 shadow-sm">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Live Operations</div>
                <div className="text-xl font-black text-foreground">{apps.filter(a => a.status === 'APPLIED' || a.status === 'INTERVIEW').length}</div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {filteredApps.length > 0 ? (
          filteredApps.map((app) => (
            <div key={app.id} className="group bg-card backdrop-blur-md border border-border rounded-2xl md:rounded-3xl p-4 md:p-8 hover:shadow-xl transition-all border-l-4 border-l-foreground relative overflow-hidden">
              <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-center justify-between relative z-10">
                
                {/* Job Info */}
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="p-3 md:p-5 bg-muted text-foreground/50 rounded-xl md:rounded-2xl border border-border">
                    <Briefcase className="w-5 h-5 md:w-8 md:h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg md:text-3xl font-black text-foreground tracking-tighter">{app.jobTitle}</h3>
                    <p className="text-sm md:text-xl text-muted-foreground font-bold">{app.company}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                       <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] md:text-xs font-black border tracking-wider ${
                         app.status === 'OFFER' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' :
                         app.status === 'INTERVIEW' ? 'bg-foreground/5 text-foreground/80 border-border' :
                         app.status === 'REJECTED' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' :
                         'bg-secondary text-muted-foreground border-border'
                       }`}>
                          <div className={`w-2 h-2 rounded-full ${
                             app.status === 'OFFER' ? 'bg-green-500' :
                             app.status === 'REJECTED' ? 'bg-red-500' :
                             'bg-foreground animate-pulse'
                          }`}></div>
                          {app.status}
                       </span>
                       <span className="text-xs text-muted-foreground flex items-center gap-1 font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(app.appliedDate).toLocaleDateString()}
                       </span>
                    </div>
                  </div>
                </div>

                {/* Status Stepper */}
                <div className="flex flex-wrap items-center gap-2 bg-muted p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-border shadow-inner">
                   {['SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'].map((st) => (
                     <button
                       key={st}
                       onClick={() => handleStatusUpdate(app.id, st)}
                       disabled={updatingId === app.id}
                       className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black transition-all ${
                         app.status === st 
                           ? 'bg-foreground text-background shadow-lg scale-105' 
                           : 'hover:bg-foreground/5 text-muted-foreground hover:text-foreground'
                       }`}
                     >
                       {st}
                     </button>
                   ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                   <div className="flex gap-2 mr-2 border-r border-border pr-4">
                       {app.status !== 'ARCHIVED' && (
                           <button 
                               onClick={() => handleArchive(app.id)}
                               title="Archive Application"
                               className="p-3 bg-secondary border border-border text-muted-foreground rounded-2xl hover:bg-foreground hover:text-background transition-all shadow-sm"
                           >
                               <Archive className="w-5 h-5" />
                           </button>
                       )}
                       <button 
                           onClick={() => handleDelete(app.id)}
                           title="Permanent Delete"
                           className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                       >
                           <Trash2 className="w-5 h-5" />
                       </button>
                   </div>

                   <a 
                     href={app.tailoredResumeS3Url}
                     target="_blank"
                     className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-secondary text-foreground hover:bg-foreground hover:text-background border border-border rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                   >
                     <Eye className="w-4 h-4" /> PREVIEW
                   </a>
                   <Link
                     href={`/dashboard/applications/${app.id}/prep`}
                     className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-foreground text-background rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-foreground/90 transition-all shadow-xl"
                   >
                     <LayoutDashboard className="w-4 h-4" /> PREP KIT
                   </Link>
                </div>
              </div>
              
              {/* Progress Line Background */}
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-muted">
                 <div className="h-full bg-foreground transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: app.status === 'OFFER' ? '100%' : app.status === 'INTERVIEW' ? '60%' : app.status === 'APPLIED' ? '30%' : '10%' }}></div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center border-2 border-dashed border-border rounded-3xl space-y-4 bg-muted/20">
             <div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mx-auto border border-border">
                <AlertCircle className="w-10 h-10 text-muted-foreground" />
             </div>
             <div>
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter">No Applications Initialize</h3>
                <p className="text-muted-foreground font-medium">Find a job match and use One-Click tailoring to start your arsenal.</p>
             </div>
             <Link href="/dashboard/jobs" className="inline-block px-12 py-4 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-foreground/90 transition-all shadow-2xl">
                Browse intelligence
             </Link>
          </div>
        )}
      </div>
    </div>
  );
}
