"use client";

import { useState, useEffect } from "react";
import { 
  Shield, Database, Lock, Settings, Bell, 
  Moon, Sun, Laptop, Save, Terminal, Globe, AlertCircle 
} from "lucide-react";
import { useTheme } from "next-themes";
import useAuthStore from "@/store/useAuthStore";
import api from "@/lib/api";

export default function AdminSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [systemConfig, setSystemConfig] = useState({
    registrationOpen: true,
    maintenanceMode: false,
    debugLogs: false,
    aiModel: "ZENITH-CORE-V2"
  });

  useEffect(() => {
    setMounted(true);
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get("/admin/config");
      if (res.data) {
        setSystemConfig(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch admin config", err);
    }
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      await api.post("/admin/config", systemConfig);
    } catch (err) {
      console.error("Failed to update config", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="w-full space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Global Authority</h1>
          <p className="text-muted-foreground font-medium">Core system configuration and security parameters.</p>
        </div>
        <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
           <AlertCircle className="w-4 h-4 text-red-500" />
           <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Privileged Access Only</span>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-8">
           {/* System Toggles */}
           <section className="bg-card border border-border rounded-[40px] p-8 md:p-10 shadow-sm space-y-10">
              <div className="flex items-center gap-4">
                 <div className="p-4 bg-blue-600/10 rounded-2xl">
                    <Terminal className="w-6 h-6 text-blue-600" />
                 </div>
                 <h2 className="text-xl font-black uppercase">Infrastructure Toggles</h2>
              </div>

              <div className="space-y-6">
                 {[
                   { id: 'registrationOpen', label: "Public Registration", desc: "Allow new entities to join the ecosystem." },
                   { id: 'maintenanceMode', label: "Maintenance Protocol", desc: "Restrict all access to administrative nodes only." },
                   { id: 'debugLogs', label: "Verbose Debugging", desc: "Enable detailed logging for all system events." }
                 ].map((toggle) => (
                   <div key={toggle.id} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50">
                      <div>
                         <p className="text-sm font-black uppercase">{toggle.label}</p>
                         <p className="text-[10px] text-muted-foreground font-medium">{toggle.desc}</p>
                      </div>
                      <button 
                        onClick={() => setSystemConfig({...systemConfig, [toggle.id]: !systemConfig[toggle.id as keyof typeof systemConfig]})}
                        className={`w-12 h-6 rounded-full transition-all relative ${systemConfig[toggle.id as keyof typeof systemConfig] ? 'bg-blue-600' : 'bg-muted'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${systemConfig[toggle.id as keyof typeof systemConfig] ? 'right-1' : 'left-1'}`}></div>
                      </button>
                   </div>
                 ))}
              </div>
           </section>

           {/* AI Configuration */}
           <section className="bg-card border border-border rounded-[40px] p-8 md:p-10 shadow-sm space-y-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Intelligence Model Selection</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {["ZENITH-CORE-V2", "QUANTUM-RECRUIT", "LEGACY-NODE"].map(model => (
                   <button 
                     key={model}
                     onClick={() => setSystemConfig({...systemConfig, aiModel: model})}
                     className={`px-6 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                       systemConfig.aiModel === model 
                         ? "bg-foreground text-background border-transparent" 
                         : "bg-background text-muted-foreground border-border hover:bg-secondary"
                     }`}
                   >
                     {model}
                   </button>
                 ))}
              </div>
           </section>
        </div>

        <div className="space-y-8">
           {/* Visual Settings */}
           <section className="bg-card border border-border rounded-[40px] p-8 shadow-sm space-y-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                 <Globe className="w-4 h-4" /> Environment
              </h2>
              <div className="space-y-3">
                 {[
                   { id: "light", label: "Solaris", icon: Sun },
                   { id: "dark", label: "Void", icon: Moon },
                   { id: "system", label: "Automatic", icon: Laptop },
                 ].map((t) => (
                   <button 
                     key={t.id}
                     onClick={() => setTheme(t.id)}
                     className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all ${
                       theme === t.id 
                         ? "bg-blue-600 text-white border-transparent" 
                         : "bg-background text-muted-foreground border-border hover:bg-secondary"
                     }`}
                   >
                      <div className="flex items-center gap-3">
                         <t.icon className="w-4 h-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                      </div>
                      {theme === t.id && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                   </button>
                 ))}
              </div>
           </section>

           <button 
             onClick={handleUpdate}
             disabled={isLoading}
             className="w-full py-5 bg-foreground text-background rounded-3xl text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-foreground/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
           >
              {isLoading ? "Broadcasting..." : <><Save className="w-4 h-4" /> Commit Changes</>}
           </button>
        </div>
      </div>
    </div>
  );
}
