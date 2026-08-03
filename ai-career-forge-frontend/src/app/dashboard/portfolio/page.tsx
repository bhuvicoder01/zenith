"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Sparkles, Eye, Save, Loader2, ArrowUpRight, Copy, Check, Briefcase, 
  Code, Award, Shield, CheckCircle, Info, Layout, CheckSquare, Settings,
  Mail, ExternalLink, FileCode, Terminal
} from "lucide-react";
import api, { BACKEND_URL } from "@/lib/api";
import { toast } from "sonner";

export default function PortfolioCustomizer() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Style customization states
  const [template, setTemplate] = useState("minimalist");
  const [themeColor, setThemeColor] = useState("blue");
  const [fontFamily, setFontFamily] = useState("sans");
  const [fontSize, setFontSize] = useState("medium");
  
  // Visibility states
  const [showPhoto, setShowPhoto] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [showBio, setShowBio] = useState(true);
  const [showExperience, setShowExperience] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showCertifications, setShowCertifications] = useState(true);
  const [showInternships, setShowInternships] = useState(true);

  const getPhotoUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    let cleanUrl = url.startsWith("/") ? url.slice(1) : url;
    if (cleanUrl.startsWith("api/public/assets/")) {
      cleanUrl = cleanUrl.replace("api/public/assets/", "");
    } else if (cleanUrl.startsWith("public/assets/")) {
      cleanUrl = cleanUrl.replace("public/assets/", "");
    }
    return `${BACKEND_URL}/public/assets/${cleanUrl}`;
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/profile");
      const data = res.data;
      setProfile(data);

      // Load settings
      const settings = data.settings || {};
      setTemplate(settings.portfolioTemplate || "minimalist");
      setThemeColor(settings.portfolioThemeColor || "blue");
      setFontFamily(settings.portfolioFontFamily || "sans");
      setFontSize(settings.portfolioFontSize || "medium");
      setShowPhoto(settings.portfolioShowPhoto !== false);
      setShowEmail(settings.portfolioShowEmail !== false);
      setShowBio(settings.portfolioShowBio !== false);
      setShowExperience(settings.portfolioShowExperience !== false);
      setShowProjects(settings.portfolioShowProjects !== false);
      setShowCertifications(settings.portfolioShowCertifications !== false);
      setShowInternships(settings.portfolioShowInternships !== false);
    } catch (err) {
      console.error("Failed to fetch profile settings:", err);
      toast.error("Failed to load portfolio settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      const updatedSettings = {
        ...(profile.settings || {}),
        portfolioTemplate: template,
        portfolioThemeColor: themeColor,
        portfolioFontFamily: fontFamily,
        portfolioFontSize: fontSize,
        portfolioShowPhoto: showPhoto,
        portfolioShowEmail: showEmail,
        portfolioShowBio: showBio,
        portfolioShowExperience: showExperience,
        portfolioShowProjects: showProjects,
        portfolioShowCertifications: showCertifications,
        portfolioShowInternships: showInternships,
      };

      const updatedProfile = {
        ...profile,
        settings: updatedSettings,
      };

      await api.put("/profile", updatedProfile);
      setProfile(updatedProfile);
      toast.success("Portfolio layout updated successfully!");
    } catch (err) {
      console.error("Failed to save portfolio settings:", err);
      toast.error("Failed to save portfolio updates");
    } finally {
      setSaving(false);
    }
  };

  const getPublicUrl = () => {
    if (typeof window === "undefined" || !profile?.username) return "";
    return `${window.location.origin}/${profile.username}`;
  };

  const handleCopyLink = () => {
    const url = getPublicUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Public portfolio link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Color theme class map for Preview and selectors
  const themeClasses: Record<string, any> = {
    blue: { primary: "bg-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-500", dot: "bg-blue-500", timelineDot: "bg-blue-500", terminalText: "text-blue-400", badge: "bg-blue-950/60 text-blue-400 border-blue-800", accentBg: "bg-blue-500" },
    green: { primary: "bg-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-500", dot: "bg-emerald-500", timelineDot: "bg-emerald-500", terminalText: "text-emerald-400", badge: "bg-emerald-950/60 text-emerald-400 border-emerald-800", accentBg: "bg-emerald-500" },
    purple: { primary: "bg-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-500", dot: "bg-violet-500", timelineDot: "bg-violet-500", terminalText: "text-violet-400", badge: "bg-violet-950/60 text-violet-400 border-violet-800", accentBg: "bg-violet-500" },
    rose: { primary: "bg-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-500", dot: "bg-rose-500", timelineDot: "bg-rose-500", terminalText: "text-rose-400", badge: "bg-rose-950/60 text-rose-400 border-rose-800", accentBg: "bg-rose-500" },
    amber: { primary: "bg-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-500", dot: "bg-amber-500", timelineDot: "bg-amber-500", terminalText: "text-amber-400", badge: "bg-amber-950/60 text-amber-400 border-amber-800", accentBg: "bg-amber-500" },
    zinc: { primary: "bg-zinc-500", bg: "bg-zinc-500/10", border: "border-zinc-500/20", text: "text-zinc-500", dot: "bg-zinc-500", timelineDot: "bg-zinc-500", terminalText: "text-zinc-400", badge: "bg-zinc-900 text-zinc-300 border-zinc-700", accentBg: "bg-zinc-500" },
  };

  const activeTheme = themeClasses[themeColor] || themeClasses.blue;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">Syncing Portfolio Canvas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Upper header summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Portfolio Canvas
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            Configure templates, design colors, and customize elements for your public vanity page.
          </p>
        </div>
        
        {profile?.username && (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button 
              onClick={handleCopyLink}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 border border-border text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy Link"}
            </button>
            <Link 
              href={`/${profile.username}`}
              target="_blank"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> View Public
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editor controls: span 5 (Independent scroll container) */}
        <div className="lg:col-span-5 space-y-6 lg:max-h-[calc(100vh-170px)] lg:overflow-y-auto lg:pr-2 modern-scrollbar">
          {/* Templates selection */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Layout className="w-4 h-4 text-primary" /> 1. Select Template
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: "karnik_style", name: "Cyber-Minimalist Engineering Site", desc: "Sleek dark tech website layout inspired by top engineer portfolios (Hero, Tech Stack, Timeline, Projects)." },
                { id: "modern_hero", name: "Modern Portfolio Website", desc: "Full-scale website with hero landing section, top navbar, & stats bar." },
                { id: "bento_grid", name: "Creative Studio Website", desc: "Full personal website with dark mode studio layout & bento showcase." },
                { id: "minimalist", name: "Minimalist/Clean", desc: "Sleek margins, centered highlights, simple modern typography." },
                { id: "developer", name: "Developer/Console IDE", desc: "Tech badge emphasis, terminal console accents, and grid styles." },
                { id: "executive", name: "Executive/Formal", desc: "Serif headers, formal timelines, and structured columns." },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setTemplate(tmpl.id)}
                  className={`text-left p-4 rounded-2xl border transition-all duration-300 relative ${
                    template === tmpl.id 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-border/80 bg-transparent"
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-tight text-foreground">{tmpl.name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-1 leading-relaxed">{tmpl.desc}</p>
                  {template === tmpl.id && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Colors selection */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> 2. Theme Accents
            </h3>
            
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(themeClasses).map((col) => (
                <button
                  key={col}
                  onClick={() => setThemeColor(col)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border uppercase tracking-wider text-[9px] font-black transition-all ${
                    themeColor === col 
                      ? "border-primary bg-primary/5 text-foreground" 
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full ${themeClasses[col].primary} mb-2`} />
                  {col}
                </button>
              ))}
            </div>
          </div>

          {/* Typography & Size Selection */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> 3. Typography & Sizing
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Font Family Style</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "sans", name: "Sans-Serif", sample: "Clean Modern" },
                    { id: "serif", name: "Serif", sample: "Classic Formal" },
                    { id: "mono", name: "Monospace", sample: "Terminal Code" },
                    { id: "display", name: "Display", sample: "Plus Jakarta" },
                  ].map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setFontFamily(font.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        fontFamily === font.id
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <p className="text-xs font-black uppercase">{font.name}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{font.sample}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Text Scale</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "small", name: "Compact" },
                    { id: "medium", name: "Standard" },
                    { id: "large", name: "Spacious" },
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      onClick={() => setFontSize(sz.id)}
                      className={`p-2.5 rounded-2xl border uppercase tracking-wider text-[9px] font-black text-center transition-all ${
                        fontSize === sz.id
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {sz.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section Visibility Switches */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" /> 4. Section Visibility
            </h3>

            <div className="space-y-3">
              {[
                { label: "Show Profile Photo", state: showPhoto, setter: setShowPhoto },
                { label: "Show Public Email", state: showEmail, setter: setShowEmail },
                { label: "Show Bio Narrative", state: showBio, setter: setShowBio },
                { label: "Show Work Experience", state: showExperience, setter: setShowExperience },
                { label: "Show Academic Projects", state: showProjects, setter: setShowProjects },
                { label: "Show Certifications", state: showCertifications, setter: setShowCertifications },
                { label: "Show Internships", state: showInternships, setter: setShowInternships },
              ].map((sw, index) => (
                <div key={index} className="flex justify-between items-center py-1">
                  <span className="text-xs font-semibold text-foreground/80">{sw.label}</span>
                  <button
                    onClick={() => sw.setter(!sw.state)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition-all ${
                      sw.state ? "bg-primary justify-end" : "bg-secondary justify-start"
                    }`}
                  >
                    <span className="bg-card w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4 bg-foreground hover:bg-foreground/95 disabled:opacity-50 text-background text-xs font-black uppercase tracking-widest rounded-3xl transition-all shadow-xl shadow-foreground/5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Publishing Canvas..." : "Publish Canvas Updates"}
          </button>
        </div>

        {/* Live Preview & Details: span 7 (Independent scroll container) */}
        <div className="lg:col-span-7 space-y-6 lg:max-h-[calc(100vh-170px)] lg:overflow-y-auto lg:pr-2 modern-scrollbar">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Live Canvas Preview
              </h3>
              <span className="text-[9px] font-black uppercase bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                Interactive Map
              </span>
            </div>

            {/* Canvas Mock container */}
            <div className="w-full h-[620px] bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-inner flex flex-col relative text-white">
              {/* Top border header */}
              <div className="h-2 w-full bg-gradient-to-r from-transparent via-white/5 to-transparent absolute top-0" />
              
              {/* Scrollable mockup body */}
              <div className={`flex-1 overflow-y-auto modern-scrollbar p-6 space-y-6 text-left text-zinc-300 portfolio-font-${fontFamily} portfolio-size-${fontSize}`}>
                
                {/* 1. TEMPLATE: MINIMALIST */}
                {template === "minimalist" && (
                  <div className="space-y-8 max-w-lg mx-auto text-center">
                    
                    {/* Header Identity info */}
                    <div className="space-y-3 text-center pb-6 border-b border-zinc-800">
                      {showPhoto && (
                        profile.profilePhotoUrl ? (
                          <div className="w-20 h-20 rounded-full border-2 border-zinc-700 mx-auto overflow-hidden shadow-sm">
                            <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-xl font-black uppercase text-white">
                            {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "U"}
                          </div>
                        )
                      )}

                      <div className="space-y-1">
                        <h1 className="text-xl font-black uppercase tracking-tight text-white">{profile.fullName || "User Name"}</h1>
                        <p className={`text-[10px] uppercase font-black tracking-widest ${activeTheme.text}`}>
                          {profile.headline || "Industry Professional"}
                        </p>
                        
                        {showEmail && profile.email && (
                          <div className="inline-flex items-center gap-1.5 text-[10px] text-zinc-400 font-semibold mt-1">
                            <Mail className="w-3 h-3" /> {profile.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio statement */}
                    {showBio && profile.bio && (
                      <div className="space-y-1.5 text-center">
                        <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">About / Identity</h2>
                        <p className="text-xs text-zinc-300 leading-relaxed font-medium">{profile.bio}</p>
                      </div>
                    )}

                    {/* Skills tags block */}
                    {profile.skills?.length > 0 && (
                      <div className="space-y-2 pt-4 border-t border-zinc-800">
                        <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Expertise / Tech Stack</h2>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {profile.skills.map((skill: string) => (
                            <span key={skill} className={`px-2.5 py-0.5 bg-zinc-800 text-[9px] font-black uppercase tracking-wide rounded-lg border border-zinc-700 text-zinc-200`}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experience timeline */}
                    {showExperience && profile.experiences?.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-zinc-800 text-left">
                        <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Work History</h2>
                        <div className="space-y-3">
                          {profile.experiences.map((exp: any, index: number) => (
                            <div key={index} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                              <div className="flex justify-between items-start">
                                <h3 className="text-xs font-black uppercase tracking-tight text-white">{exp.title}</h3>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${activeTheme.bg} ${activeTheme.text}`}>
                                  {exp.duration}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 font-semibold">{exp.company}</p>
                              {exp.description && (
                                <p className="text-[10px] text-zinc-400 leading-relaxed pt-1">{exp.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Academic Projects */}
                    {showProjects && profile.academicProjects?.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-zinc-800 text-left">
                        <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Projects / Creations</h2>
                        <div className="space-y-3">
                          {profile.academicProjects.map((proj: any, index: number) => (
                            <div key={index} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                              <h3 className="text-xs font-black uppercase text-white">{proj.title}</h3>
                              {proj.technologies && (
                                <p className="text-[9px] font-bold text-zinc-500 uppercase">{proj.technologies}</p>
                              )}
                              {proj.description && (
                                <p className="text-[10px] text-zinc-400 leading-relaxed">{proj.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Internships timeline */}
                    {showInternships && profile.internships?.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-zinc-800 text-left">
                        <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Internships</h2>
                        <div className="space-y-2">
                          {profile.internships.map((intern: any, index: number) => (
                            <div key={index} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex justify-between gap-2">
                              <div>
                                <h3 className="text-xs font-black uppercase text-white">{intern.role}</h3>
                                <p className="text-[10px] text-zinc-400">{intern.company}</p>
                                {intern.description && <p className="text-[10px] text-zinc-500 mt-1">{intern.description}</p>}
                              </div>
                              <span className="text-[8px] text-zinc-500 font-bold shrink-0">{intern.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {showCertifications && profile.certifications?.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-zinc-800 text-left">
                        <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Certifications</h2>
                        <div className="space-y-2">
                          {profile.certifications.map((cert: any, index: number) => (
                            <div key={index} className="flex items-center gap-2.5 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                              <Award className={`w-4 h-4 ${activeTheme.text}`} />
                              <div>
                                <p className="text-xs font-black uppercase text-white">{cert.name}</p>
                                <p className="text-[9px] text-zinc-500">{cert.issuingOrganization} • {cert.issueDate}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* 2. TEMPLATE: DEVELOPER */}
                {template === "developer" && (
                  <div className="space-y-6 font-mono">
                    
                    {/* Header Block */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 relative overflow-hidden shadow-xl">
                      <div className="absolute top-2 right-2 text-[8px] text-zinc-500 font-bold uppercase">
                        ~/console
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {showPhoto && (
                          profile.profilePhotoUrl ? (
                            <div className="w-16 h-16 rounded-xl border border-zinc-800 overflow-hidden shrink-0">
                              <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg font-bold text-white shrink-0">
                              {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "DEV"}
                            </div>
                          )
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${activeTheme.accentBg} animate-ping`} />
                            <h1 className="text-base font-black text-white">{profile.fullName || "User Name"}</h1>
                          </div>
                          
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${activeTheme.terminalText}`}>
                            {profile.headline || "Software Engineer"}
                          </p>

                          {showEmail && profile.email && (
                            <div className="inline-flex items-center gap-1.5 text-[9px] text-zinc-500">
                              <Terminal className="w-3 h-3" /> cat email.txt // {profile.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bio Block */}
                    {showBio && profile.bio && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-1.5">
                        <p className="text-[8px] text-zinc-500 font-bold">cat bio.txt</p>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">{profile.bio}</p>
                      </div>
                    )}

                    {/* Tech Stack Skills */}
                    {profile.skills?.length > 0 && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                        <p className="text-[8px] text-zinc-500 font-bold">ls skills/</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.skills.map((skill: string) => (
                            <span key={skill} className={`px-2 py-0.5 text-[9px] font-bold rounded ${activeTheme.badge}`}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work experience */}
                    {showExperience && profile.experiences?.length > 0 && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                        <p className="text-[8px] text-zinc-500 font-bold">sh get_experience.sh</p>
                        <div className="space-y-3 border-l border-zinc-800 pl-3 ml-1">
                          {profile.experiences.map((exp: any, index: number) => (
                            <div key={index} className="space-y-1 relative">
                              <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${activeTheme.accentBg}`} />
                              <div className="flex justify-between items-start text-[11px]">
                                <h3 className="font-bold text-white uppercase">{exp.title}</h3>
                                <span className="text-[8px] text-zinc-500 font-bold">{exp.duration}</span>
                              </div>
                              <p className="text-[9px] text-zinc-400 font-black">{exp.company}</p>
                              {exp.description && (
                                <p className="text-[10px] text-zinc-500 leading-relaxed pt-0.5">{exp.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {showProjects && profile.academicProjects?.length > 0 && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                        <p className="text-[8px] text-zinc-500 font-bold">./run_projects_index</p>
                        <div className="space-y-3">
                          {profile.academicProjects.map((proj: any, index: number) => (
                            <div key={index} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1">
                              <div className="flex items-center gap-2">
                                <FileCode className={`w-3.5 h-3.5 ${activeTheme.terminalText}`} />
                                <h3 className="text-[11px] font-bold text-white uppercase">{proj.title}</h3>
                              </div>
                              {proj.technologies && (
                                <p className="text-[8px] text-zinc-500 uppercase">{proj.technologies}</p>
                              )}
                              {proj.description && (
                                <p className="text-[10px] text-zinc-400 leading-relaxed">{proj.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Internships */}
                    {showInternships && profile.internships?.length > 0 && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                        <p className="text-[8px] text-zinc-500 font-bold">cat internships.json</p>
                        <div className="space-y-2">
                          {profile.internships.map((intern: any, index: number) => (
                            <div key={index} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex justify-between gap-2">
                              <div>
                                <p className="text-[11px] font-bold text-white">{intern.role}</p>
                                <p className="text-[9px] text-zinc-500">{intern.company}</p>
                              </div>
                              <span className="text-[8px] text-zinc-500 font-bold">{intern.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {showCertifications && profile.certifications?.length > 0 && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                        <p className="text-[8px] text-zinc-500 font-bold">ls accreditation/</p>
                        <div className="space-y-2 text-xs">
                          {profile.certifications.map((cert: any, index: number) => (
                            <div key={index} className="flex items-center gap-2.5 p-2.5 border border-zinc-800 bg-zinc-900/20 rounded-lg">
                              <CheckCircle className={`w-3.5 h-3.5 ${activeTheme.terminalText}`} />
                              <div>
                                <p className="font-bold text-white text-[11px] uppercase">{cert.name}</p>
                                <p className="text-[8px] text-zinc-500">{cert.issuingOrganization} • {cert.issueDate}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* 3. TEMPLATE: EXECUTIVE */}
                {template === "executive" && (
                  <div className="space-y-8 font-sans text-zinc-300 max-w-xl mx-auto">
                    
                    {/* Header Info */}
                    <div className="text-center space-y-3 border-b border-zinc-800 pb-6">
                      {showPhoto && (
                        profile.profilePhotoUrl ? (
                          <div className="w-16 h-16 rounded-full border-2 border-zinc-700 mx-auto overflow-hidden shadow-sm">
                            <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-base font-black uppercase text-white">
                            {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "EXEC"}
                          </div>
                        )
                      )}
                      <h1 className="text-2xl font-light tracking-tight text-white font-serif">{profile.fullName || "User Name"}</h1>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${activeTheme.text}`}>
                        {profile.headline || "Executive Summary"}
                      </p>
                      {showEmail && profile.email && (
                        <div className="inline-flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                          <Mail className="w-3 h-3" /> {profile.email}
                        </div>
                      )}
                    </div>

                    {/* Narrative bio */}
                    {showBio && profile.bio && (
                      <div className="max-w-md mx-auto text-center italic text-xs text-zinc-300 leading-relaxed font-serif">
                        &ldquo;{profile.bio}&rdquo;
                      </div>
                    )}

                    {/* Skills List */}
                    {profile.skills?.length > 0 && (
                      <div className="space-y-2 text-center">
                        <h3 className={`text-[8px] font-black uppercase tracking-[0.25em] ${activeTheme.text}`}>Areas of Expertise</h3>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {profile.skills.map((skill: string) => (
                            <span key={skill} className={`px-2.5 py-0.5 bg-zinc-950 text-[9px] font-black uppercase tracking-wider rounded-md border border-zinc-700 text-white`}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experience Timeline */}
                    {showExperience && profile.experiences?.length > 0 && (
                      <div className="space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] border-b border-zinc-800 pb-1 text-white">Professional Experience</h3>
                        <div className="space-y-4 pl-3 border-l border-zinc-800">
                          {profile.experiences.map((exp: any, index: number) => (
                            <div key={index} className="space-y-1 relative">
                              <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${activeTheme.accentBg}`} />
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="text-xs font-black text-white">{exp.title}</h4>
                                <span className="text-[8px] text-zinc-400 font-serif italic">{exp.duration}</span>
                              </div>
                              <p className="text-[10px] text-zinc-400 font-bold">{exp.company}</p>
                              {exp.description && (
                                <p className="text-[10px] text-zinc-400 leading-relaxed pt-1">{exp.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects Portfolio */}
                    {showProjects && profile.academicProjects?.length > 0 && (
                      <div className="space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] border-b border-zinc-800 pb-1 text-white">Projects Portfolio</h3>
                        <div className="space-y-3">
                          {profile.academicProjects.map((proj: any, index: number) => (
                            <div key={index} className="space-y-1 pb-3 border-b border-zinc-900 last:border-0">
                              <h4 className="text-xs font-black text-white uppercase">{proj.title}</h4>
                              {proj.technologies && <p className="text-[8px] text-zinc-500 uppercase">{proj.technologies}</p>}
                              {proj.description && (
                                <p className="text-[10px] text-zinc-400 leading-relaxed">{proj.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Internships */}
                    {showInternships && profile.internships?.length > 0 && (
                      <div className="space-y-3 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] border-b border-zinc-800 pb-1 text-white">Internships</h3>
                        <div className="space-y-2">
                          {profile.internships.map((intern: any, index: number) => (
                            <div key={index} className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex justify-between gap-2">
                              <div>
                                <h4 className="text-xs font-black text-white">{intern.role}</h4>
                                <p className="text-[9px] text-zinc-400">{intern.company}</p>
                              </div>
                              <span className="text-[8px] text-zinc-500 font-serif italic">{intern.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {showCertifications && profile.certifications?.length > 0 && (
                      <div className="space-y-3 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] border-b border-zinc-800 pb-1 text-white">Accreditation</h3>
                        <div className="space-y-2">
                          {profile.certifications.map((cert: any, index: number) => (
                            <div key={index} className="flex justify-between items-center p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg">
                              <span className="text-xs font-bold text-white">{cert.name}</span>
                              <span className="text-[9px] text-zinc-500">{cert.issuingOrganization}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* 4. TEMPLATE: SPLIT HERO BANNER PREVIEW */}
                {template === "modern_hero" && (
                  <div className="space-y-6 text-left">
                    {/* Hero Banner Header */}
                    <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950 space-y-3 relative overflow-hidden">
                      <div className="flex items-center gap-4">
                        {showPhoto && (
                          profile.profilePhotoUrl ? (
                            <div className="w-16 h-16 rounded-xl border border-zinc-700 overflow-hidden shrink-0">
                              <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-lg font-black uppercase text-white shrink-0">
                              {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "PRO"}
                            </div>
                          )
                        )}
                        <div>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${activeTheme.bg} ${activeTheme.text}`}>
                            Split Hero Layout
                          </span>
                          <h1 className="text-lg font-black uppercase text-white mt-1">{profile.fullName || "User Name"}</h1>
                          <p className={`text-[10px] font-bold uppercase ${activeTheme.text}`}>{profile.headline || "Senior Software Engineer"}</p>
                        </div>
                      </div>
                      {showBio && profile.bio && (
                        <p className="text-xs text-zinc-300 pt-2 border-t border-zinc-800 leading-relaxed">{profile.bio}</p>
                      )}
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 gap-4">
                      {/* Skills & Experience Stream */}
                      {profile.skills?.length > 0 && (
                        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                          <p className={`text-[9px] font-black uppercase tracking-widest ${activeTheme.text}`}>Skills Stack</p>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.skills.map((skill: string) => (
                              <span key={skill} className="px-2 py-0.5 bg-zinc-900 text-zinc-200 text-[9px] font-bold rounded border border-zinc-800">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {showExperience && profile.experiences?.length > 0 && (
                        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                          <p className={`text-[9px] font-black uppercase tracking-widest ${activeTheme.text}`}>Work Journey</p>
                          <div className="space-y-3 border-l border-zinc-800 pl-3">
                            {profile.experiences.map((exp: any, index: number) => (
                              <div key={index} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-bold text-white uppercase">{exp.title}</span>
                                  <span className="text-[9px] text-zinc-500">{exp.duration}</span>
                                </div>
                                <p className="text-[10px] text-zinc-400">{exp.company}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. TEMPLATE: BENTO GRID SHOWCASE PREVIEW */}
                {template === "bento_grid" && (
                  <div className="space-y-4 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Hero Tile */}
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2">
                        <div className="flex items-center gap-3">
                          {showPhoto && (
                            profile.profilePhotoUrl ? (
                              <div className="w-12 h-12 rounded-lg border border-zinc-700 overflow-hidden shrink-0">
                                <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs font-black uppercase text-white shrink-0">
                                {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "BENTO"}
                              </div>
                            )
                          )}
                          <div>
                            <h1 className="text-sm font-black uppercase text-white">{profile.fullName || "User Name"}</h1>
                            <p className={`text-[9px] font-bold ${activeTheme.text}`}>{profile.headline || "Innovator"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Tech Tile */}
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2">
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeTheme.text}`}>Skills Bento</p>
                        <div className="flex flex-wrap gap-1">
                          {profile.skills?.slice(0, 4).map((skill: string) => (
                            <span key={skill} className="px-2 py-0.5 bg-zinc-900 text-zinc-200 text-[8px] font-bold rounded border border-zinc-800">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {showExperience && profile.experiences?.length > 0 && (
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2">
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeTheme.text}`}>Experience Bento Block</p>
                        <div className="space-y-2">
                          {profile.experiences.map((exp: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-xs">
                              <span className="font-bold text-white">{exp.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {template === "karnik_style" && (
                  <div className="space-y-5 text-left">
                    {/* Header bar */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded ${activeTheme.accentBg} text-white font-black text-[10px] flex items-center justify-center`}>
                          {profile.fullName ? profile.fullName.charAt(0) : "K"}
                        </div>
                        <span className="text-xs font-bold text-white">{profile.fullName || "User Name"}</span>
                      </div>
                      <span className="text-[8px] font-semibold text-zinc-500">Cyber Minimalist</span>
                    </div>

                    {/* Hero Box */}
                    <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-3">
                      <div className="flex items-center gap-4">
                        {showPhoto && (
                          profile.profilePhotoUrl ? (
                            <div className="w-14 h-14 rounded-xl border border-zinc-700 overflow-hidden shrink-0">
                              <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sm font-black text-white shrink-0">
                              {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "DEV"}
                            </div>
                          )
                        )}
                        <div>
                          <h1 className="text-sm font-black text-white">Hi, I'm {profile.fullName || "User Name"} 👋</h1>
                          <p className={`text-[9px] font-semibold ${activeTheme.text}`}>{profile.headline || "Full Stack Developer"}</p>
                        </div>
                      </div>
                      {showBio && profile.bio && (
                        <p className="text-xs text-zinc-300 pt-2 border-t border-zinc-800 leading-relaxed">{profile.bio}</p>
                      )}
                    </div>

                    {/* Tech Stack */}
                    {profile.skills?.length > 0 && (
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2">
                        <p className={`text-[8px] font-bold uppercase tracking-widest ${activeTheme.text}`}>Skills & Tech Stack</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.skills.map((skill: string) => (
                            <span key={skill} className="px-2 py-0.5 bg-zinc-900 text-zinc-200 text-[8px] font-semibold rounded border border-zinc-800">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experience Timeline */}
                    {showExperience && profile.experiences?.length > 0 && (
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
                        <p className={`text-[8px] font-bold uppercase tracking-widest ${activeTheme.text}`}>Career Experience</p>
                        <div className="space-y-2 border-l border-zinc-800 pl-3 ml-1">
                          {profile.experiences.map((exp: any, index: number) => (
                            <div key={index} className="space-y-0.5">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-white">{exp.title}</span>
                                <span className="text-[8px] text-zinc-500">{exp.duration}</span>
                              </div>
                              <p className="text-[10px] text-zinc-400">{exp.company}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Bottom control panel bar */}
              <div className="h-10 bg-zinc-950 border-t border-white/5 flex items-center px-4 justify-between text-[8px] font-black uppercase tracking-widest text-zinc-600 z-10">
                <span>Layout: {template} • {themeColor}</span>
                <span>Font: {fontFamily} ({fontSize})</span>
              </div>
            </div>
          </div>

          {/* User Experience Summary listing box */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Active Experiences Overview
              </h3>
              <Link 
                href="/dashboard/profile"
                className="text-[9px] font-black uppercase bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded-xl border border-border flex items-center gap-1 transition-all"
              >
                Edit Profile <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Work Exp */}
              <div className="p-4 bg-secondary/20 border border-border/60 rounded-2xl space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" /> Work History
                </p>
                {profile.experiences?.length > 0 ? (
                  <div className="space-y-1.5">
                    {profile.experiences.slice(0, 3).map((exp: any, index: number) => (
                      <div key={index} className="text-xs truncate">
                        <span className="font-bold text-foreground">{exp.title}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold"> - {exp.company}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground font-semibold italic">No work experiences added.</p>
                )}
              </div>

              {/* Projects */}
              <div className="p-4 bg-secondary/20 border border-border/60 rounded-2xl space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Code className="w-3.5 h-3.5" /> Projects
                </p>
                {profile.academicProjects?.length > 0 ? (
                  <div className="space-y-1.5">
                    {profile.academicProjects.slice(0, 3).map((proj: any, index: number) => (
                      <div key={index} className="text-xs truncate">
                        <span className="font-bold text-foreground">{proj.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground font-semibold italic">No academic projects added.</p>
                )}
              </div>

              {/* Certifications */}
              <div className="p-4 bg-secondary/20 border border-border/60 rounded-2xl space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Certifications
                </p>
                {profile.certifications?.length > 0 ? (
                  <div className="space-y-1.5">
                    {profile.certifications.slice(0, 3).map((cert: any, index: number) => (
                      <div key={index} className="text-xs truncate">
                        <span className="font-bold text-foreground">{cert.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground font-semibold italic">No certifications added.</p>
                )}
              </div>

              {/* Internships */}
              <div className="p-4 bg-secondary/20 border border-border/60 rounded-2xl space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Internships
                </p>
                {profile.internships?.length > 0 ? (
                  <div className="space-y-1.5">
                    {profile.internships.slice(0, 3).map((intern: any, index: number) => (
                      <div key={index} className="text-xs truncate">
                        <span className="font-bold text-foreground">{intern.role}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold"> - {intern.company}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground font-semibold italic">No internships added.</p>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
