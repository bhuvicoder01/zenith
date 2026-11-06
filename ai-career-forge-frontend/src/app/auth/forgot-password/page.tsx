"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import api from "@/lib/api";
import { BrainCircuit, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await api.post("/auth/forgot-password", { email });
      setIsSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to initiate recovery. Please verify your email.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-foreground/5 rounded-full blur-3xl -z-10" />
      
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center justify-center hover:opacity-80 transition-opacity">
            <img 
              src={resolvedTheme === 'dark' ? "/zenith-dark.png" : "/zenith-light.png"} 
              alt="Zenith" 
              className="w-full max-w-[150px] h-auto" 
            />
          </Link>
          <p className="text-muted-foreground mt-2 text-[10px] font-black uppercase tracking-[0.2em]">Neural Access Recovery</p>
        </div>

        <div className="bg-card p-8 md:p-10 rounded-3xl border border-border shadow-2xl space-y-6">
          {!isSent ? (
            <>
              <div className="space-y-2">
                <h1 className="text-xl font-bold tracking-tight">Forgot Password?</h1>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Enter your registered email address and we&apos;ll transmit a recovery link to restore your access.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] rounded-lg font-bold">
                    {error}
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-border bg-background rounded-xl focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all text-sm font-medium" 
                      placeholder="operator@zenith.ai"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-4 px-4 bg-foreground text-background font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-xl hover:opacity-90 transition-all mt-2 disabled:opacity-50"
                >
                  {isLoading ? "Transmitting..." : "Send Recovery Link"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in duration-500">
              <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">Check Your Inbox</h2>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  A recovery link has been dispatched to <span className="text-foreground font-bold">{email}</span>. 
                  It will remain active for 60 minutes.
                </p>
              </div>
              <button 
                onClick={() => setIsSent(false)}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Didn&apos;t receive it? Try again
              </button>
            </div>
          )}

          <div className="pt-6 border-t border-border/50 text-center">
            <Link href="/auth/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to Intelligence Node
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
