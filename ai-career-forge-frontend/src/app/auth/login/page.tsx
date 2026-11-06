"use client";

import Link from "next/link";
import ZenithBrand from "@/components/ZenithBrand";
import { BrainCircuit } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import api, { BACKEND_URL } from "@/lib/api";
import useAuthStore from "@/store/useAuthStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/authenticate", {
        email,
        password,
      });

      const { token, userId, name: userName, email: userEmail, role: userRole, needsOnboarding } = response.data;
      setAuth({ id: userId, email: userEmail, name: userName, role: userRole }, token, needsOnboarding);
      
      if (userRole === "RECRUITER") {
        router.push("/recruiter/dashboard");
      } else if (userRole === "ADMIN") {
        router.push("/admin/dashboard");
      } else if (needsOnboarding) {
        router.push("/auth/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="z-auth min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-foreground/5 rounded-full blur-3xl -z-10" />
      
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <ZenithBrand light={mounted && resolvedTheme === "dark"} />
          <p className="text-muted-foreground mt-2 text-[10px] font-black uppercase tracking-[0.2em]">Welcome back to your workspace</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-5 bg-card p-6 md:p-10 rounded-3xl border border-border shadow-2xl">
          {error && (
            <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg text-center font-bold">
              {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Email address</label>
            <input 
              id="auth-email" autoComplete="email" type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all text-sm font-medium" 
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="auth-password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Password</label>
              <Link href="/auth/forgot-password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Forgot password?</Link>
            </div>
            <input 
              id="auth-password" autoComplete="current-password" type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all text-sm font-medium" 
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 px-4 bg-foreground text-background font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-xl hover:opacity-90 transition-all mt-4 disabled:opacity-50 active:scale-95"
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-card px-4 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.location.href = `${BACKEND_URL.replace('/api/v1', '')}/oauth2/authorization/google`}
            className="w-full py-4 px-4 bg-background border border-border hover:bg-secondary/50 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
          
          <div className="text-center text-[10px] font-black uppercase tracking-widest pt-6 border-t border-border/50 mt-8">
            <span className="text-muted-foreground">No account?</span> <Link href="/auth/register" className="text-foreground hover:underline ml-1">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
