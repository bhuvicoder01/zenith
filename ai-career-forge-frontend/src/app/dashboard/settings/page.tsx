"use client";

import { useEffect, useState, Suspense } from "react";
import { 
  Settings, Bell, Shield, Moon, Sun, Monitor, Trash2, 
  Mail, Key, UserCircle, LogOut, ChevronRight, Sparkles,
  Zap, BrainCircuit, Globe, BellRing, Database, Save, Loader2, Target, Circle
} from "lucide-react";
import { useTheme } from "next-themes";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSearchParams, useRouter } from "next/navigation";

function SettingsContent() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Settings states
  const validTabs = ['appearance', 'account', 'matching', 'notifications', 'privacy', 'security'];
  const tabParam = searchParams.get("tab");
  const initialTab = (tabParam && validTabs.includes(tabParam)) ? tabParam : 'appearance';

  const [activeTab, setActiveTab] = useState<'appearance' | 'account' | 'matching' | 'notifications' | 'privacy' | 'security'>(initialTab as any);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tempPass, setTempPass] = useState<string | null>(null);

  // Password change states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // UI Preferences
  useEffect(() => {
    setMounted(true);
    fetchProfile();
    const savedPass = sessionStorage.getItem('zenith_temp_pass');
    if (savedPass) setTempPass(savedPass);
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && validTabs.includes(tab) && tab !== activeTab) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as any);
    router.replace(`/dashboard/settings?tab=${tabId}`, { scroll: false });
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile");
      setProfile(res.data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    if (!profile) return;
    const newSettings = { ...profile.settings, [key]: value };
    setProfile({ ...profile, settings: newSettings });
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put("/profile", profile);
      toast.success("ZENITH protocols updated");
    } catch (err) {
      toast.error("Failed to update protocols");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    
    setPasswordLoading(true);
    try {
      await api.put("/auth/password", {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success("Identity credentials updated");
      setIsPasswordModalOpen(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update credentials");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleExportData = () => {
    if (!profile) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "zenith_career_intel.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("Career intel exported");
  };

  if (!mounted) return null;

  const handleLogout = () => {
    logout();
    window.location.href = "/auth/login";
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm("CRITICAL ACTION: This will permanently delete your resume, career profile, and all application history. This cannot be undone. Proceed?")) return;
    
    try {
      await api.delete("/profile");
      toast.success("Profile purged from ZENITH systems");
      logout();
      window.location.href = "/auth/login";
    } catch (err) {
      toast.error("Critical: Failed to purge profile");
    }
  };

  const handleClearCache = async () => {
    toast.success("Vector search cache cleared");
  };

  return (
    <div className="w-full space-y-10 pb-20">
      <div className="flex flex-col gap-2 hidden md:flex">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground font-medium">Manage your ZENITH experience and account security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          {[
            { id: 'appearance', label: 'Appearance', icon: Moon },
            { id: 'account', label: 'Account', icon: UserCircle },
            { id: 'matching', label: 'Matching AI', icon: BrainCircuit },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'privacy', label: 'Privacy & Data', icon: Globe },
            { id: 'security', label: 'Security', icon: Shield },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all border ${
                activeTab === item.id 
                  ? 'bg-foreground text-background border-transparent shadow-lg' 
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground border-transparent'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-10">
          {/* Appearance */}
          {activeTab === 'appearance' && (
            <section className="bg-card border border-border rounded-3xl p-8 space-y-8 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Appearance</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'system', label: 'System', icon: Monitor },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setTheme(mode.id)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      theme === mode.id 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-border bg-secondary/20 hover:border-border/50'
                    }`}
                  >
                    <mode.icon className="w-6 h-6" />
                    <span className="text-xs font-black uppercase tracking-wider">{mode.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Account Profile */}
          {activeTab === 'account' && (
             <section className="bg-card border border-border rounded-3xl p-8 space-y-8 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <UserCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Public Identity</h3>
                </div>

                <div className="space-y-6">
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Full Identity Name</label>
                         <input 
                           type="text" 
                           value={profile?.fullName || ""}
                           onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                           placeholder="Enter your professional name"
                           className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Professional Headline</label>
                         <input 
                           type="text" 
                           value={profile?.headline || ""}
                           onChange={(e) => setProfile({...profile, headline: e.target.value})}
                           placeholder="e.g. Senior Software Engineer"
                           className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                         />
                      </div>
                   </div>

                   <button 
                     onClick={saveSettings}
                     disabled={saving}
                     className="px-8 py-4 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                   >
                     {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     Save Account Intel
                   </button>
                </div>
             </section>
          )}

          {/* AI Matching Engine */}
          {activeTab === 'matching' && (
            <section className="bg-card border border-border rounded-3xl p-8 space-y-8 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Matching Intelligence</h3>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Matching Precision</p>
                    <p className="text-xs text-muted-foreground">Threshold for considering a job a 'match'.</p>
                  </div>
                  <div className="text-xl font-black text-amber-500">{profile?.settings?.matchingPrecision || 80}%</div>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="100" 
                  step="5"
                  value={profile?.settings?.matchingPrecision || 80}
                  onChange={(e) => {
                    updateSetting('matchingPrecision', parseInt(e.target.value));
                  }}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-amber-500"
                />

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="font-bold">Aggressive Enrichment</p>
                      <p className="text-xs text-muted-foreground">Use more AI tokens for better insights.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => updateSetting('aggressiveEnrichment', !profile?.settings?.aggressiveEnrichment)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${profile?.settings?.aggressiveEnrichment ? 'bg-amber-500' : 'bg-border'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile?.settings?.aggressiveEnrichment ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
              <button 
                onClick={saveSettings}
                disabled={saving}
                className="w-full py-4 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Apply Intel Params
              </button>
            </section>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <section className="bg-card border border-border rounded-3xl p-8 space-y-8 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/10 rounded-xl text-violet-500">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Notification Protocols</h3>
              </div>

              <div className="space-y-6">
                 {[
                   { id: 'emailNotifications', label: 'Email Alerts', sub: 'Receive weekly career progress reports.', icon: Mail },
                   { id: 'jobMatchAlerts', label: 'Job Match Alerts', sub: 'Instant notification for 90%+ job matches.', icon: Target },
                 ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="p-2 bg-secondary rounded-lg">
                             <item.icon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                             <p className="font-bold">{item.label}</p>
                             <p className="text-xs text-muted-foreground">{item.sub}</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => updateSetting(item.id, !profile?.settings?.[item.id])}
                         className={`w-12 h-6 rounded-full transition-colors relative ${profile?.settings?.[item.id] ? 'bg-violet-500' : 'bg-border'}`}
                       >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile?.settings?.[item.id] ? 'left-7' : 'left-1'}`} />
                       </button>
                    </div>
                 ))}
              </div>
              <button 
                onClick={saveSettings}
                disabled={saving}
                className="w-full py-4 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update Alert Rules
              </button>
            </section>
          )}

          {/* Privacy & Data Tab */}
          {activeTab === 'privacy' && (
            <section className="bg-card border border-border rounded-3xl p-8 space-y-8 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Data Sovereignty</h3>
              </div>

              <div className="space-y-6">
                 {[
                   { id: 'hideProfile', label: 'Ghost Protocol', sub: 'Hide your profile from recruiter search engines.', icon: Shield },
                   { id: 'anonymizeData', label: 'Anonymize Intel', sub: 'Strip PII from data sent to AI matching agents.', icon: UserCircle },
                   { id: 'showEmail', label: 'Expose Email ID', sub: 'Show your email address on your public profile page.', icon: Mail },
                   { id: 'showOnlineStatus', label: 'Show Online Status', sub: 'Show your online presence state to other professional contacts.', icon: Circle },
                 ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="p-2 bg-secondary rounded-lg">
                             <item.icon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                             <p className="font-bold">{item.label}</p>
                             <p className="text-xs text-muted-foreground">{item.sub}</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => updateSetting(item.id, !profile?.settings?.[item.id])}
                         className={`w-12 h-6 rounded-full transition-colors relative ${profile?.settings?.[item.id] ? 'bg-emerald-500' : 'bg-border'}`}
                       >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile?.settings?.[item.id] ? 'left-7' : 'left-1'}`} />
                       </button>
                    </div>
                 ))}

                 <div className="pt-6 border-t border-border space-y-4">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Information Export</p>
                    <button 
                      onClick={handleExportData}
                      className="w-full flex items-center justify-between p-6 bg-secondary/30 border border-border rounded-2xl hover:bg-secondary/50 transition-all group"
                    >
                       <div className="flex items-center gap-4">
                          <Database className="w-6 h-6 text-primary" />
                          <div className="text-left">
                             <p className="font-black uppercase text-sm tracking-tight">Export Career Intel</p>
                             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Download full JSON profile data</p>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </button>
                 </div>
              </div>
              <button 
                onClick={saveSettings}
                disabled={saving}
                className="w-full py-4 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Persist Data Rules
              </button>
            </section>
          )}

          {/* Account Security */}
          {activeTab === 'security' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
              <section className="bg-card border border-border rounded-3xl p-8 space-y-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Security & Account</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-2xl border border-border/50">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-0.5">Email Address</p>
                      <p className="font-bold">{profile?.email || user?.email}</p>
                    </div>
                  </div>

                  {profile?.isPasswordGenerated && (
                    <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Shield className="w-4 h-4 text-amber-500" />
                          </div>
                          <p className="text-xs font-black text-amber-500 uppercase tracking-tight">Security Protocol Notice</p>
                       </div>
                       <p className="text-[11px] text-amber-500/80 leading-relaxed font-medium">
                         This account was created via Google OAuth and is currently using an **auto-generated password**. 
                         For maximum security, we recommend updating your identity credentials below.
                       </p>
                       {tempPass && (
                         <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/30">
                            <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">Initial Generated Password</p>
                            <p className="font-mono text-xs text-white mt-1 select-all cursor-pointer">{tempPass}</p>
                         </div>
                       )}
                       <button 
                         onClick={() => setIsPasswordModalOpen(true)}
                         className="w-full py-2.5 bg-amber-500 text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-amber-400 transition-all"
                       >
                         Secure Account Now
                       </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 rounded-2xl border border-transparent transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <Key className="w-5 h-5 text-muted-foreground" />
                      <span className="font-bold">Update Password</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>

                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 p-4 text-destructive hover:bg-destructive/10 rounded-2xl transition-all font-bold"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout Sessions
                  </button>
                </div>
              </section>

              {/* Danger Zone */}
              <section className="bg-destructive/5 border border-destructive/20 rounded-3xl p-8 space-y-6">
                 <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <h3 className="text-xl font-black text-destructive uppercase tracking-tight">Danger Zone</h3>
                </div>
                
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <p className="font-bold text-destructive">Erase Career Profile</p>
                    <p className="text-xs text-destructive/70">Permanently delete your profile data, resume, and application history.</p>
                  </div>
                  <button 
                    onClick={handleDeleteProfile}
                    className="px-6 py-3 bg-destructive text-destructive-foreground rounded-xl font-black shadow-lg shadow-destructive/20 hover:scale-105 transition-all"
                  >
                    Delete Data
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-card border border-border w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                       <Key className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Identity Credentials</h3>
                 </div>
                 <button 
                   onClick={() => setIsPasswordModalOpen(false)}
                   className="p-2 hover:bg-secondary rounded-full transition-colors"
                 >
                    <ChevronRight className="w-5 h-5 rotate-90" />
                 </button>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Current Password</label>
                    <input 
                      type="password" 
                      required
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                      className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">New ZENITH Password</label>
                    <input 
                      type="password" 
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                    />
                 </div>

                 <button 
                   type="submit"
                   disabled={passwordLoading}
                   className="w-full py-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all mt-4"
                 >
                    {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    Update Security Intel
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-4 min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm animate-pulse">Establishing settings dashboard...</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
