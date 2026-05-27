"use client";

import Link from "next/link";
import { 
  ArrowRight, BrainCircuit, Briefcase, FileText, 
  Target, Zap, Shield, ChevronRight, Github, 
  Linkedin, Twitter, Globe 
} from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background font-sans">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src={resolvedTheme === 'dark' ? '/zenith-dark.png' : '/zenith-light.png'} 
                alt="Zenith" 
                className="w-full h-full object-contain" 
              />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">ZENITH</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Agents</a>
            <Link href="/public/jobs" className="hover:text-foreground transition-colors">Explore Jobs</Link>
            <Link href="/public/profiles" className="hover:text-foreground transition-colors">Explore Profiles</Link>
          </div>
          <div className="flex items-center gap-4">
             {isAuthenticated ? (
               <Link href="/dashboard" className="px-5 py-2.5 bg-foreground text-background rounded-full text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                  Dashboard
               </Link>
             ) : (
               <>
                <Link href="/auth/login" className="text-[11px] font-black uppercase tracking-widest hover:text-foreground transition-colors hidden sm:block">
                  Login
                </Link>
                <Link href="/auth/register" className="px-5 py-2.5 bg-foreground text-background rounded-full text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                  Get Started
                </Link>
               </>
             )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        {/* Subtle Background Intel */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-[0.03] overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center space-y-12">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary border border-border text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-top-4 duration-1000">
              <Zap className="w-3 h-3" /> System Status: Optimal
           </div>

           <div className="mx-auto w-full max-w-[200px] md:max-w-[350px] mb-8 animate-in fade-in zoom-in duration-1000">
              <img 
                src={resolvedTheme === 'dark' ? '/zenith-dark.png' : '/zenith-light.png'} 
                alt="Zenith Branding" 
                className="w-full h-auto" 
              />
           </div>

           <h1 className="text-6xl md:text-[120px] font-black tracking-[-0.05em] leading-[0.85] text-foreground lowercase italic">
             Orchestrate <br/> 
             <span className="pl-4 md:pl-20 text-muted-foreground/30 not-italic">Intelligence.</span>
           </h1>

           <p className="max-w-2xl mx-auto text-lg md:text-2xl text-muted-foreground font-medium leading-relaxed">
             The first agentic career accelerator designed to help you secure high-level 
             opportunities through autonomous resume tailoring and semantic job matching.
           </p>

           <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
              <Link href="/auth/register" className="group relative px-10 py-5 bg-foreground text-background rounded-full text-sm font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-2xl">
                 Initialize Mission 
                 <ArrowRight className="inline-block ml-3 w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </Link>
              <Link href="/public/jobs" className="px-10 py-5 bg-secondary border border-border text-foreground rounded-full text-sm font-black uppercase tracking-[0.2em] hover:bg-secondary/80 transition-all">
                 Browse Catalog
              </Link>
              <a href="#features" className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all">
                 <Shield className="w-4 h-4" /> SECURE ACCESS
              </a>
           </div>
        </div>
      </section>

      {/* Trust Banner */}
      <div className="border-y border-border/40 py-10 bg-muted/20 text-foreground">
         <div className="max-w-7xl mx-auto px-6 overflow-hidden">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 mb-8">Utilized by candidates at</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-30 grayscale contrast-200">
               {['OPENAI', 'ANTHROPIC', 'LINEAR', 'VERCEL', 'STRIPE'].map(logo => (
                 <span key={logo} className="text-2xl font-black tracking-tighter">{logo}</span>
               ))}
            </div>
         </div>
      </div>

      {/* Features Grid (Bento Box) */}
      <section id="features" className="py-32 bg-background">
         <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="max-w-2xl">
               <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4">Core Protocols</h2>
               <p className="text-xl text-muted-foreground font-medium">Autonomous agents handling the friction of the job market.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
               <div className="md:col-span-8 bg-card border border-border rounded-[2.5rem] p-10 flex flex-col justify-between hover:border-foreground/20 transition-all group overflow-hidden relative">
                  <div className="space-y-4 relative z-10">
                     <Target className="w-12 h-12 text-foreground/40" />
                     <h3 className="text-3xl font-black uppercase tracking-tight">Semantic Ingestion</h3>
                     <p className="text-muted-foreground text-lg leading-relaxed max-w-md font-medium">
                        Our agents analyze job descriptions for hidden requirements, matching your vector profile 
                        against 10,000+ data points for a perfect fit.
                     </p>
                  </div>
                  <div className="absolute top-0 right-0 w-1/3 h-full bg-foreground/5 skew-x-12 translate-x-1/2 group-hover:translate-x-1/4 transition-transform duration-1000"></div>
               </div>
               
               <div className="md:col-span-4 bg-foreground text-background rounded-[2.5rem] p-10 flex flex-col justify-center space-y-6 hover:scale-[1.02] transition-all">
                  <Zap className="w-12 h-12 text-background/40" />
                  <h3 className="text-3xl font-black uppercase tracking-tight leading-none">Instant <br/> Tailoring</h3>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] bg-background/10 w-fit px-4 py-2 rounded-full">
                     Execute Protocol
                  </div>
               </div>

               <div className="md:col-span-4 bg-muted border border-border rounded-[2.5rem] p-10 flex flex-col space-y-6 hover:bg-muted/80 transition-all">
                  <BrainCircuit className="w-10 h-10 text-foreground/20" />
                  <h3 className="text-2xl font-black uppercase tracking-tight">Interview Recon</h3>
                  <p className="text-sm text-muted-foreground font-medium">
                     AI-generated technical drill-downs based on the specific interviewer background and role.
                  </p>
               </div>

               <div className="md:col-span-8 bg-card border border-border rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10 hover:border-foreground/20 transition-all">
                  <div className="flex-1 space-y-4">
                     <FileText className="w-10 h-10 text-foreground/20" />
                     <h3 className="text-2xl font-black uppercase tracking-tight">Version Control</h3>
                     <p className="text-sm text-muted-foreground font-medium">
                        Automatic tracking of every resume iteration. Never lose track of which agent version you sent to which company.
                     </p>
                  </div>
                  <div className="w-full md:w-48 h-32 bg-foreground/10 rounded-2xl border border-border"></div>
               </div>
            </div>
         </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-background py-32 border-t border-border/40">
         <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
            <h2 className="text-5xl md:text-9xl font-black tracking-[-0.05em] uppercase text-foreground">Ready to Ascend?</h2>
            <div className="flex flex-col items-center gap-8">
               <Link href="/auth/register" className="px-16 py-8 bg-foreground text-background rounded-full text-lg font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl">
                  Initialize Dashboard
               </Link>
               
               <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                  <span className="hover:text-foreground transition-colors flex items-center gap-2"><Twitter className="w-3.5 h-3.5" /> Social</span>
                  <span className="hover:text-foreground transition-colors flex items-center gap-2"><Linkedin className="w-3.5 h-3.5" /> Network</span>
                  <span className="hover:text-foreground transition-colors flex items-center gap-2"><Github className="w-3.5 h-3.5" /> Repository</span>
               </div>
            </div>

            <div className="pt-24 flex flex-col md:flex-row items-center justify-between border-t border-border/20 gap-6">
               <div className="flex items-center gap-2 opacity-50">
                  <BrainCircuit className="w-5 h-5" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-foreground">ZENITH v0.1-BETA</span>
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">© 2026 ZENITH INTELLIGENCE. All Rights Reserved.</p>
               <div className="flex gap-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                  <Link href="#">Privacy</Link>
                  <Link href="#">Terms</Link>
                  <Link href="#">System Log</Link>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}
