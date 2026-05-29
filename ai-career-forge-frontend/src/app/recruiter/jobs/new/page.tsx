"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Sparkles, ArrowLeft, Send, MapPin, Building2, DollarSign } from "lucide-react";
import Link from "next/link";

export default function NewJobPosting() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    location: "Remote",
    description: "",
    jobType: "FULL_TIME",
    salaryMin: "",
    salaryMax: "",
    url: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post("/recruiter/jobs", formData);
      router.push("/recruiter/jobs");
    } catch (err) {
      console.error("Failed to post job", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAISuggest = () => {
    // This would ideally call an AI service to refine the description
    const refined = `We are looking for a ${formData.title} to join our dynamic team at ${formData.company}. \n\nResponsibilities:\n- Build amazing features\n- Collaborate with cross-functional teams\n\nRequirements:\n- 3+ years of experience\n- Strong proficiency in relevant technologies`;
    setFormData({ ...formData, description: refined });
  };

  return (
    <div className="w-full space-y-10 animate-in slide-in-from-bottom-5 duration-700">
      <div className="flex items-center gap-4">
        <Link href="/recruiter/jobs" className="p-3 rounded-2xl bg-secondary hover:bg-border transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Deploy New Mission</h1>
          <p className="text-muted-foreground font-medium">Define the parameters for your next talent acquisition.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-[40px] p-8 md:p-12 shadow-2xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Mission Title</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                required
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Senior React Architect"
                className="w-full bg-secondary/50 border border-border rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Operating Sector (Company)</label>
            <input 
              required
              value={formData.company}
              onChange={e => setFormData({...formData, company: e.target.value})}
              placeholder="ZENITH AI Corp"
              className="w-full bg-secondary/50 border border-border rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Deployment Location</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                required
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                placeholder="Remote / San Francisco"
                className="w-full bg-secondary/50 border border-border rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Compensation Range (Min - Max)</label>
            <div className="flex items-center gap-3">
               <input 
                type="number"
                placeholder="Min"
                value={formData.salaryMin}
                onChange={e => setFormData({...formData, salaryMin: e.target.value})}
                className="w-full bg-secondary/50 border border-border rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all font-bold"
              />
              <span className="opacity-20 font-black">—</span>
               <input 
                type="number"
                placeholder="Max"
                value={formData.salaryMax}
                onChange={e => setFormData({...formData, salaryMax: e.target.value})}
                className="w-full bg-secondary/50 border border-border rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all font-bold"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
           <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Mission Brief (Description)</label>
              <button 
                type="button"
                onClick={handleAISuggest}
                className="text-[9px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5 hover:opacity-70 transition-all"
              >
                 <Sparkles className="w-3 h-3" /> Optimize with AI
              </button>
           </div>
           <textarea 
             required
             rows={8}
             value={formData.description}
             onChange={e => setFormData({...formData, description: e.target.value})}
             placeholder="Describe the responsibilities and requirements for this operative..."
             className="w-full bg-secondary/50 border border-border rounded-[32px] px-8 py-6 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all font-medium text-sm leading-relaxed"
           />
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full py-5 rounded-[24px] bg-foreground text-background font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-foreground/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? "Synchronizing Data..." : (
            <>
               <Send className="w-4 h-4" /> Broadcast Mission
            </>
          )}
        </button>
      </form>
    </div>
  );
}
