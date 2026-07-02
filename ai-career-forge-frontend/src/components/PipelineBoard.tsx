"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Briefcase, MapPin, Star, Clock } from "lucide-react";

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
  pipelineStage?: string;
}

const COLUMNS = [
  { id: "SAVED", title: "Saved", color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400" },
  { id: "APPLYING", title: "Applying", color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400" },
  { id: "APPLIED", title: "Applied", color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400" },
  { id: "INTERVIEWING", title: "Interviewing", color: "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400" },
  { id: "OFFER", title: "Offer", color: "from-cyan-500/20 to-blue-600/20 border-cyan-500/30 text-cyan-400" },
  { id: "REJECTED", title: "Rejected", color: "from-red-500/20 to-rose-600/20 border-red-500/30 text-rose-400" }
];

export default function PipelineBoard() {
  const [pipelineJobs, setPipelineJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const fetchPipeline = async () => {
    try {
      setLoading(true);
      const res = await api.get("/jobs/pipeline");
      setPipelineJobs(res.data);
    } catch (err) {
      console.error("Failed to load pipeline jobs:", err);
      toast.error("Failed to fetch pipeline board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const moveJob = async (jobId: string, targetStage: string) => {
    // Optimistic update
    const previousJobs = [...pipelineJobs];
    setPipelineJobs(prev =>
      prev.map(j => (j.id === jobId ? { ...j, pipelineStage: targetStage } : j))
    );

    try {
      await api.put(`/jobs/${jobId}/stage`, { stage: targetStage });
      toast.success(`Job moved to ${targetStage.toLowerCase()}`);
    } catch (err) {
      console.error("Failed to move job stage:", err);
      toast.error("Failed to update job stage");
      setPipelineJobs(previousJobs); // rollback
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    if (id) {
      moveJob(id, targetColumn);
    }
    setDraggingId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Clock className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Assembling your pipeline board...</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="flex gap-6 min-w-[1200px] h-[calc(100vh-280px)] px-1">
        {COLUMNS.map(col => {
          const colJobs = pipelineJobs.filter(j => j.pipelineStage?.toUpperCase() === col.id);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex-1 min-w-[250px] flex flex-col bg-muted/30 border border-border/40 rounded-2xl p-4 overflow-y-auto max-h-full transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/20 shrink-0">
                <span className="font-bold text-sm tracking-wide text-foreground flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-r ${col.color}`} />
                  {col.title}
                </span>
                <span className="bg-secondary/60 text-secondary-foreground text-xs font-black px-2 py-0.5 rounded-full">
                  {colJobs.length}
                </span>
              </div>

              {/* Card List */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto scrollbar-none pb-12">
                {colJobs.length === 0 ? (
                  <div className="flex-1 border border-dashed border-border/30 rounded-xl flex items-center justify-center p-6 text-center text-xs text-muted-foreground/60 min-h-[120px]">
                    Drag jobs here
                  </div>
                ) : (
                  colJobs.map(job => (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className={`group relative bg-card border border-border/40 hover:border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-grab active:cursor-grabbing ${
                        draggingId === job.id ? "opacity-40 border-dashed" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="shrink-0 h-8 w-8 rounded-lg border overflow-hidden flex items-center justify-center p-1 bg-zinc-900 border-zinc-800">
                          {job.companyLogoUrl ? (
                            <img src={job.companyLogoUrl} alt={job.company} className="w-full h-full object-contain" />
                          ) : (
                            <Briefcase className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold leading-snug truncate" title={job.title}>
                            {job.title}
                          </h4>
                          <p className="text-muted-foreground text-[10px] truncate" title={job.company}>
                            {job.company}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground/80 border-t border-border/20 pt-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[80px]">{job.location}</span>
                        </span>
                        <div className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold">
                          {Math.round(job.matchScore)}% Match
                        </div>
                      </div>

                      {/* Manual Move Quick Selector for Mobile/Taps */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <select
                          value={col.id}
                          onChange={(e) => moveJob(job.id, e.target.value)}
                          className="bg-secondary/90 border border-border text-[9px] font-bold rounded px-1 py-0.5 outline-none cursor-pointer text-foreground"
                        >
                          {COLUMNS.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
