"use client";

import { useState, useEffect } from "react";
import { 
  User, Mail, Building, Globe, Bell, Shield, 
  Moon, Sun, Laptop, Save, Key, LogOut, Phone,
  Camera, Lock, Eye, EyeOff, Plus
} from "lucide-react";
import { useTheme } from "next-themes";
import useAuthStore from "@/store/useAuthStore";
import api from "@/lib/api";

export default function RecruiterSettings() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    companyName: "",
    website: "",
    industry: "Artificial Intelligence",
    notifEmail: true,
    notifSms: false,
    notifBrowser: true
  });

  useEffect(() => {
    setMounted(true);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/recruiter/profile");
      if (res.data) {
        setFormData({
          ...formData,
          phone: res.data.phone || "",
          companyName: res.data.companyName || "",
          website: res.data.website || "",
          industry: res.data.industry || "Artificial Intelligence",
          notifEmail: res.data.notifications?.emailAlerts ?? true,
          notifSms: res.data.notifications?.smsAlerts ?? false,
          notifBrowser: res.data.notifications?.browserSignals ?? true,
        });
      }
    } catch (err) {
      console.error("Failed to fetch recruiter profile", err);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.post("/recruiter/profile", {
        name: formData.name,
        phone: formData.phone,
        companyName: formData.companyName,
        website: formData.website,
        industry: formData.industry,
        notifications: {
          emailAlerts: formData.notifEmail,
          smsAlerts: formData.notifSms,
          browserSignals: formData.notifBrowser
        }
      });
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  const tabs = [
    { id: "profile", label: "Profile Identity", icon: User },
    { id: "company", label: "Company Branding", icon: Building },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security & Keys", icon: Key },
  ];

  return (
    <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Protocol Settings</h1>
        <p className="text-muted-foreground font-medium">Configure your recruitment terminal and corporate identity.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
           {tabs.map((tab) => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest border ${
                 activeTab === tab.id 
                   ? "bg-foreground text-background border-transparent shadow-xl" 
                   : "text-muted-foreground hover:bg-secondary border-transparent hover:text-foreground"
               }`}
             >
                <tab.icon className="w-4 h-4" /> {tab.label}
             </button>
           ))}
           <div className="pt-6">
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-secondary/50 border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
              >
                 <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    <span>Theme: {theme}</span>
                 </div>
              </button>
           </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-10 min-h-[600px]">
           {activeTab === "profile" && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <section className="bg-card border border-border rounded-[40px] p-8 md:p-10 shadow-sm space-y-8">
                   <div className="flex flex-col md:flex-row md:items-center gap-8 border-b border-border pb-10">
                      <div className="relative group">
                         <div className="w-24 h-24 rounded-3xl bg-foreground text-background flex items-center justify-center font-black text-3xl shadow-2xl">
                            {formData.name?.[0] || 'R'}
                         </div>
                         <button className="absolute -bottom-2 -right-2 p-2 bg-secondary border border-border rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                            <Camera className="w-4 h-4 text-foreground" />
                         </button>
                      </div>
                      <div>
                         <h2 className="text-2xl font-black uppercase tracking-tight">{formData.name}</h2>
                         <p className="text-sm text-muted-foreground font-medium">Global Recruitment Lead</p>
                         <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">Verified Identity</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Identity</label>
                         <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input 
                               value={formData.name}
                               onChange={e => setFormData({...formData, name: e.target.value})}
                               className="w-full bg-secondary/50 border border-border rounded-xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Contact Email</label>
                         <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input 
                               disabled
                               value={formData.email}
                               className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-4 text-sm font-bold opacity-50"
                            />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile Uplink</label>
                         <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input 
                               value={formData.phone}
                               onChange={e => setFormData({...formData, phone: e.target.value})}
                               className="w-full bg-secondary/50 border border-border rounded-xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                         </div>
                      </div>
                   </div>
                </section>
             </div>
           )}

           {activeTab === "company" && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <section className="bg-card border border-border rounded-[40px] p-8 md:p-10 shadow-sm space-y-8">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500">
                         <Building className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-black uppercase tracking-tight">Corporate Branding</h2>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Company Name</label>
                         <input 
                            value={formData.companyName}
                            onChange={e => setFormData({...formData, companyName: e.target.value})}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Official Website</label>
                         <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input 
                               value={formData.website}
                               onChange={e => setFormData({...formData, website: e.target.value})}
                               className="w-full bg-secondary/50 border border-border rounded-xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                         </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Industry Sector</label>
                         <select 
                           value={formData.industry}
                           onChange={e => setFormData({...formData, industry: e.target.value})}
                           className="w-full bg-secondary/50 border border-border rounded-xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                         >
                            <option>Artificial Intelligence</option>
                            <option>Cloud Infrastructure</option>
                            <option>Cyber Security</option>
                            <option>FinTech</option>
                         </select>
                      </div>
                   </div>
                </section>
             </div>
           )}

           {activeTab === "notifications" && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <section className="bg-card border border-border rounded-[40px] p-8 md:p-10 shadow-sm space-y-8">
                   <div className="flex items-center gap-4">
                      <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500">
                         <Bell className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-black uppercase tracking-tight">Signal Parameters</h2>
                   </div>

                   <div className="space-y-4">
                      {[
                        { id: 'notifEmail', label: "Email Alerts", desc: "Receive mission updates and candidate signals via email." },
                        { id: 'notifSms', label: "SMS Notifications", desc: "Urgent identity verification and security alerts." },
                        { id: 'notifBrowser', label: "Browser Signals", desc: "Real-time dashboard notifications for new applicants." }
                      ].map((n) => (
                        <div key={n.id} className="flex items-center justify-between p-6 rounded-3xl bg-secondary/30 border border-border/50">
                           <div>
                              <p className="text-sm font-black uppercase">{n.label}</p>
                              <p className="text-[10px] text-muted-foreground font-medium">{n.desc}</p>
                           </div>
                           <button 
                             onClick={() => setFormData({...formData, [n.id]: !formData[n.id as keyof typeof formData]})}
                             className={`w-12 h-6 rounded-full transition-all relative ${formData[n.id as keyof typeof formData] ? 'bg-blue-600' : 'bg-muted'}`}
                           >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData[n.id as keyof typeof formData] ? 'right-1' : 'left-1'}`}></div>
                           </button>
                        </div>
                      ))}
                   </div>
                </section>
             </div>
           )}

           {activeTab === "security" && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <section className="bg-card border border-border rounded-[40px] p-8 md:p-10 shadow-sm space-y-10">
                   <div className="flex items-center gap-4">
                      <div className="p-4 bg-red-500/10 rounded-2xl text-red-500">
                         <Lock className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-black uppercase tracking-tight">Encryption Keys</h2>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Password</label>
                         <input type="password" placeholder="••••••••••••" className="w-full bg-secondary/50 border border-border rounded-xl px-6 py-4 text-sm font-bold focus:outline-none" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Password</label>
                         <input type="password" placeholder="••••••••••••" className="w-full bg-secondary/50 border border-border rounded-xl px-6 py-4 text-sm font-bold focus:outline-none" />
                      </div>
                   </div>

                   <div className="pt-6 border-t border-border">
                      <div className="flex items-center justify-between mb-6">
                         <h3 className="text-sm font-black uppercase tracking-widest">Recruiter API Keys</h3>
                         <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5">
                            <Plus className="w-4 h-4" /> Request New Key
                         </button>
                      </div>
                      <div className="bg-muted p-4 rounded-2xl border border-border/50 flex items-center justify-between">
                         <code className="text-[10px] font-bold text-muted-foreground">zenith_rec_pk_49382...</code>
                         <span className="text-[8px] font-black uppercase bg-green-500/10 text-green-500 px-2 py-0.5 rounded">Active</span>
                      </div>
                   </div>
                </section>
             </div>
           )}

           <div className="flex justify-end pt-4">
              <button 
                onClick={handleSave}
                disabled={isLoading}
                className="bg-foreground text-background px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-foreground/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
              >
                 {isLoading ? "Synchronizing..." : <><Save className="w-4 h-4" /> Save Protocol</>}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
