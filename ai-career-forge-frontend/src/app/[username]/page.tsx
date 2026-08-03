"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Sparkles, Mail, Briefcase, Code, Award, Shield, FileText, ExternalLink, 
  MapPin, Loader2, ArrowLeft, Terminal, FileCode, CheckCircle, Globe, GraduationCap
} from "lucide-react";
import api, { BACKEND_URL } from "@/lib/api";

export default function PublicPortfolio() {
  const { username } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (username) {
      fetchPublicProfile();
    }
  }, [username]);

  const fetchPublicProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/profile/public/${username}`);
      setProfile(res.data);
    } catch (err: any) {
      console.error("Failed to load public profile:", err);
      if (err.response?.status === 404) {
        setError("Profile not found.");
      } else {
        setError("This profile is private or unavailable.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Accent color mapping
  const colorThemeMap: Record<string, {
    text: string;
    bg: string;
    border: string;
    badge: string;
    accentBg: string;
    glow: string;
    terminalText: string;
    timelineDot: string;
  }> = {
    blue: { 
      text: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", 
      badge: "bg-blue-500/10 text-blue-500 border-blue-500/20", accentBg: "bg-blue-500",
      glow: "shadow-blue-500/10", terminalText: "text-blue-400", timelineDot: "bg-blue-500 ring-blue-500/20"
    },
    green: { 
      text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", 
      badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", accentBg: "bg-emerald-500",
      glow: "shadow-emerald-500/10", terminalText: "text-emerald-400", timelineDot: "bg-emerald-500 ring-emerald-500/20"
    },
    purple: { 
      text: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", 
      badge: "bg-violet-500/10 text-violet-500 border-violet-500/20", accentBg: "bg-violet-500",
      glow: "shadow-violet-500/10", terminalText: "text-violet-400", timelineDot: "bg-violet-500 ring-violet-500/20"
    },
    rose: { 
      text: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", 
      badge: "bg-rose-500/10 text-rose-500 border-rose-500/20", accentBg: "bg-rose-500",
      glow: "shadow-rose-500/10", terminalText: "text-rose-400", timelineDot: "bg-rose-500 ring-rose-500/20"
    },
    amber: { 
      text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", 
      badge: "bg-amber-500/10 text-amber-500 border-amber-500/20", accentBg: "bg-amber-500",
      glow: "shadow-amber-500/10", terminalText: "text-amber-400", timelineDot: "bg-amber-500 ring-amber-500/20"
    },
    zinc: { 
      text: "text-zinc-500", bg: "bg-zinc-500/10", border: "border-zinc-500/20", 
      badge: "bg-zinc-800 text-zinc-300 border-zinc-700", accentBg: "bg-zinc-500",
      glow: "shadow-zinc-500/10", terminalText: "text-zinc-300", timelineDot: "bg-zinc-500 ring-zinc-500/20"
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Constructing Portfolio...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-[2rem] bg-secondary border border-border flex items-center justify-center text-muted-foreground shadow-sm">
          <GraduationCap className="w-10 h-10" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-lg font-black uppercase tracking-wider text-foreground">Canvas Private</h2>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {error || "The profile you are looking for has been set to private, deleted, or is currently unavailable."}
          </p>
        </div>
        <button 
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-6 py-3 bg-foreground text-background text-xs font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Return Home
        </button>
      </div>
    );
  }

  const template = profile.portfolioTemplate || "minimalist";
  const theme = profile.portfolioThemeColor || "blue";
  const fontFamily = profile.portfolioFontFamily || "sans";
  const fontSize = profile.portfolioFontSize || "medium";
  const showPhoto = profile.portfolioShowPhoto !== false;
  const activeColor = colorThemeMap[theme] || colorThemeMap.blue;

  const fontClass = `portfolio-font-${fontFamily}`;
  const sizeClass = `portfolio-size-${fontSize}`;

  return (
    <div className={`min-h-screen bg-background text-foreground transition-colors duration-300 pb-20 ${fontClass} ${sizeClass}`}>
      
      {/* 1. TEMPLATE: MINIMALIST */}
      {template === "minimalist" && (
        <div className="max-w-4xl mx-auto px-6 pt-16 space-y-12">
          
          {/* Header Identity info */}
          <div className="space-y-4 text-center pb-8 border-b border-border/60">
            {showPhoto && (
              profile.profilePhotoUrl ? (
                <div className="w-28 h-28 rounded-full border-2 border-border mx-auto overflow-hidden shadow-sm">
                  <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-28 h-28 rounded-full bg-secondary border border-border mx-auto flex items-center justify-center text-3xl font-black uppercase text-foreground">
                  {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "U"}
                </div>
              )
            )}

            <div className="space-y-2">
              <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">{profile.fullName}</h1>
              <p className={`text-xs uppercase font-black tracking-widest ${activeColor.text}`}>
                {profile.headline || "Industry Professional"}
              </p>
              
              {profile.portfolioShowEmail && profile.email && (
                <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors mt-2">
                  <Mail className="w-3.5 h-3.5" /> {profile.email}
                </a>
              )}
            </div>
          </div>

          {/* Bio statement */}
          {profile.portfolioShowBio && profile.bio && (
            <div className="space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">About / Identity</h2>
              <p className="text-sm text-foreground/80 leading-relaxed font-medium">{profile.bio}</p>
            </div>
          )}

          {/* Skills tags block */}
          {profile.skills?.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/40">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Expertise / Tech Stack</h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill: string) => (
                  <span key={skill} className={`px-3 py-1 bg-secondary text-[10px] font-black uppercase tracking-wide rounded-xl border border-border/60 text-foreground/95 hover:${activeColor.text} hover:${activeColor.border} transition-all`}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience timeline */}
          {profile.portfolioShowExperience && profile.experiences?.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-border/40">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Work History</h2>
              <div className="space-y-6">
                {profile.experiences.map((exp: any, index: number) => (
                  <div key={index} className="flex flex-col md:flex-row justify-between gap-2 p-5 bg-card border border-border/80 rounded-2xl shadow-sm">
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-black uppercase tracking-tight text-foreground">{exp.title}</h3>
                      <p className="text-[10px] text-muted-foreground font-semibold">{exp.company}</p>
                      {exp.description && (
                        <p className="text-xs text-foreground/75 leading-relaxed mt-2">{exp.description}</p>
                      )}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 self-start md:self-auto ${activeColor.bg} ${activeColor.text}`}>
                      {exp.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Academic Projects */}
          {profile.portfolioShowProjects && profile.academicProjects?.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-border/40">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Projects / Creations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.academicProjects.map((proj: any, index: number) => (
                  <div key={index} className="p-5 bg-card border border-border rounded-2xl flex flex-col justify-between gap-4 hover:border-border/90 transition-all shadow-sm">
                    <div className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-tight text-foreground">{proj.title}</h3>
                      {proj.technologies && (
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{proj.technologies}</p>
                      )}
                      {proj.description && (
                        <p className="text-xs text-foreground/75 leading-relaxed">{proj.description}</p>
                      )}
                    </div>
                    {proj.link && (
                      <a 
                        href={proj.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-primary hover:underline self-start"
                      >
                        <ExternalLink className="w-3 h-3" /> Explore Link
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internships timeline */}
          {profile.portfolioShowInternships && profile.internships?.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-border/40">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Internship Experience</h2>
              <div className="space-y-4">
                {profile.internships.map((intern: any, index: number) => (
                  <div key={index} className="flex justify-between items-start gap-4 p-4 border border-border/60 bg-secondary/10 rounded-2xl">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase text-foreground">{intern.role}</h3>
                      <p className="text-[10px] text-muted-foreground font-semibold">{intern.company}</p>
                      {intern.description && (
                        <p className="text-xs text-foreground/75 mt-2 leading-relaxed">{intern.description}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground bg-secondary border border-border px-2.5 py-1 rounded-full font-black uppercase shrink-0">
                      {intern.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications list */}
          {profile.portfolioShowCertifications && profile.certifications?.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border/40">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Accreditation / Certifications</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profile.certifications.map((cert: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                    <Award className={`w-5 h-5 ${activeColor.text}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase truncate text-foreground">{cert.name}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold">{cert.issuingOrganization} • {cert.issueDate}</p>
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
        <div className="max-w-4xl mx-auto px-6 pt-16 space-y-8">
          
          {/* Header Block */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-3 right-3 text-[8px] text-zinc-500 font-bold uppercase select-none">
              ~/console
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6">
              {showPhoto && (
                profile.profilePhotoUrl ? (
                  <div className="w-24 h-24 rounded-2xl border border-zinc-800 overflow-hidden shrink-0">
                    <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                    {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "DEV"}
                  </div>
                )
              )}

              <div className="space-y-2 text-center md:text-left min-w-0 flex-1">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <div className={`w-2 h-2 rounded-full ${activeColor.timelineDot.replace("bg-", "bg-")} animate-ping`} />
                  <h1 className="text-lg font-black text-white">{profile.fullName}</h1>
                </div>
                
                <p className={`text-[10px] font-bold uppercase tracking-wider ${activeColor.terminalText}`}>
                  {profile.headline || "Software Engineer"}
                </p>

                {profile.portfolioShowEmail && profile.email && (
                  <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 text-[10px] text-zinc-500 hover:text-white transition-colors">
                    <Terminal className="w-3.5 h-3.5" /> cat email.txt // {profile.email}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Bio Block */}
          {profile.portfolioShowBio && profile.bio && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-2">
              <p className="text-[9px] text-zinc-500 font-bold">cat bio.txt</p>
              <p className="text-xs text-zinc-300 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Tech Stack Skills */}
          {profile.skills?.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-3">
              <p className="text-[9px] text-zinc-500 font-bold">ls skills/</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill: string) => (
                  <span key={skill} className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${activeColor.badge}`}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Work experience */}
          {profile.portfolioShowExperience && profile.experiences?.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <p className="text-[9px] text-zinc-500 font-bold">sh get_experience.sh</p>
              <div className="space-y-4 border-l border-zinc-800 pl-4 ml-2">
                {profile.experiences.map((exp: any, index: number) => (
                  <div key={index} className="space-y-1.5 relative">
                    <div className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full ${activeColor.accentBg}`} />
                    <div className="flex justify-between items-start text-xs">
                      <h3 className="font-bold text-white uppercase">{exp.title}</h3>
                      <span className="text-[9px] text-zinc-500 font-bold">{exp.duration}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-black">{exp.company}</p>
                    {exp.description && (
                      <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {profile.portfolioShowProjects && profile.academicProjects?.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <p className="text-[9px] text-zinc-500 font-bold">./run_projects_index</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.academicProjects.map((proj: any, index: number) => (
                  <div key={index} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2 hover:border-zinc-700 transition-colors flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileCode className={`w-4 h-4 ${activeColor.terminalText}`} />
                        <h3 className="text-xs font-bold text-white uppercase">{proj.title}</h3>
                      </div>
                      {proj.technologies && (
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{proj.technologies}</p>
                      )}
                      {proj.description && (
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{proj.description}</p>
                      )}
                    </div>
                    {proj.link && (
                      <a 
                        href={proj.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[9px] font-bold text-primary hover:underline mt-2 self-start"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> view_live
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internships */}
          {profile.portfolioShowInternships && profile.internships?.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <p className="text-[9px] text-zinc-500 font-bold">cat internships.json</p>
              <div className="space-y-3">
                {profile.internships.map((intern: any, index: number) => (
                  <div key={index} className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-xl flex justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white">{intern.role}</p>
                      <p className="text-[10px] text-zinc-500 font-semibold">{intern.company}</p>
                      {intern.description && (
                        <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">{intern.description}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-zinc-500 font-black">{intern.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {profile.portfolioShowCertifications && profile.certifications?.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <p className="text-[9px] text-zinc-500 font-bold">ls accreditation/</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {profile.certifications.map((cert: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-zinc-800 bg-zinc-900/20 rounded-xl">
                    <CheckCircle className={`w-4 h-4 ${activeColor.terminalText}`} />
                    <div>
                      <p className="font-bold text-white uppercase">{cert.name}</p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">{cert.issuingOrganization} • {cert.issueDate}</p>
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
        <div className="max-w-4xl mx-auto px-8 pt-20 space-y-12 text-foreground">
          
          {/* Header Info */}
          <div className="text-center space-y-4 border-b border-border pb-8">
            {showPhoto && (
              profile.profilePhotoUrl ? (
                <div className="w-24 h-24 rounded-full border-2 border-border mx-auto overflow-hidden shadow-md">
                  <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-secondary border border-border mx-auto flex items-center justify-center text-2xl font-black uppercase text-foreground">
                  {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "EXEC"}
                </div>
              )
            )}
            <h1 className="text-4xl font-light tracking-tight text-foreground">{profile.fullName}</h1>
            <p className={`text-xs font-bold uppercase tracking-widest ${activeColor.text}`}>
              {profile.headline || "Executive Summary"}
            </p>
            {profile.portfolioShowEmail && profile.email && (
              <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">
                <Mail className="w-3.5 h-3.5" /> {profile.email}
              </a>
            )}
          </div>

          {/* Narrative bio */}
          {profile.portfolioShowBio && profile.bio && (
            <div className="max-w-2xl mx-auto text-center italic text-sm text-foreground/80 leading-relaxed">
              &ldquo;{profile.bio}&rdquo;
            </div>
          )}

          {/* Skills List */}
          {profile.skills?.length > 0 && (
            <div className="space-y-3">
              <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] text-center ${activeColor.text}`}>Areas of Expertise</h3>
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                {profile.skills.map((skill: string) => (
                  <span key={skill} className={`px-3.5 py-1 bg-secondary text-foreground text-[10px] font-black uppercase tracking-wider rounded-lg border border-border/60 shadow-sm hover:${activeColor.text} hover:${activeColor.border} transition-all`}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience Timeline */}
          {profile.portfolioShowExperience && profile.experiences?.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Professional Experience</h3>
              <div className="space-y-8 pl-4 border-l-2 border-border/60">
                {profile.experiences.map((exp: any, index: number) => (
                  <div key={index} className="space-y-1.5 relative">
                    <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${activeColor.accentBg} ring-4 ring-background`} />
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-sm font-black text-foreground">{exp.title}</h4>
                      <span className="text-[10px] text-muted-foreground font-bold italic">{exp.duration}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-bold">{exp.company}</p>
                    {exp.description && (
                      <p className="text-xs text-foreground/75 leading-relaxed pt-1.5 max-w-3xl">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Academic Projects */}
          {profile.portfolioShowProjects && profile.academicProjects?.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Projects Portfolio</h3>
              <div className="grid grid-cols-1 gap-6">
                {profile.academicProjects.map((proj: any, index: number) => (
                  <div key={index} className="space-y-2 pb-4 border-b border-border/40 last:border-0">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-xs font-black text-foreground uppercase tracking-tight">{proj.title}</h4>
                      {proj.link && (
                        <a 
                          href={proj.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[9px] font-black text-primary hover:underline uppercase tracking-widest"
                        >
                          Link <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {proj.technologies && (
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">{proj.technologies}</p>
                    )}
                    {proj.description && (
                      <p className="text-xs text-foreground/75 leading-relaxed">{proj.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internships */}
          {profile.portfolioShowInternships && profile.internships?.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Additional History</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.internships.map((intern: any, index: number) => (
                  <div key={index} className="p-5 border border-border bg-card rounded-2xl space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-black text-foreground">{intern.role}</h4>
                      <span className="text-[9px] text-muted-foreground font-black uppercase">{intern.duration}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold">{intern.company}</p>
                    {intern.description && (
                      <p className="text-xs text-foreground/75 leading-relaxed pt-2">{intern.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {profile.portfolioShowCertifications && profile.certifications?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Accreditation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.certifications.map((cert: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-secondary/10 border border-border/60 rounded-xl">
                    <div>
                      <p className="text-xs font-black uppercase text-foreground">{cert.name}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold">{cert.issuingOrganization}</p>
                    </div>
                    <span className="text-[9px] text-muted-foreground font-bold shrink-0">{cert.issueDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 4. TEMPLATE: MODERN PORTFOLIO WEBSITE */}
      {template === "modern_hero" && (
        <div className="min-h-screen space-y-16 pb-24">
          
          {/* Top Sticky Glass Navbar */}
          <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/60">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
              {/* Logo Brand */}
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${activeColor.accentBg} text-white flex items-center justify-center font-black text-sm uppercase shadow-sm`}>
                  {profile.fullName ? profile.fullName.charAt(0) : "P"}
                </div>
                <span className="font-black text-sm uppercase tracking-tight text-foreground">{profile.fullName}</span>
              </div>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-wider text-muted-foreground">
                <a href="#about" className="hover:text-foreground transition-colors">About</a>
                <a href="#experience" className="hover:text-foreground transition-colors">Experience</a>
                <a href="#projects" className="hover:text-foreground transition-colors">Projects</a>
                <a href="#skills" className="hover:text-foreground transition-colors">Skills</a>
                <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
              </nav>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {profile.portfolioShowEmail && profile.email && (
                  <a 
                    href={`mailto:${profile.email}`} 
                    className={`hidden sm:inline-flex items-center gap-1.5 px-4 py-2 ${activeColor.accentBg} text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:opacity-90`}
                  >
                    <Mail className="w-3.5 h-3.5" /> Hire Me
                  </a>
                )}
              </div>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-6 space-y-20">
            
            {/* HERO LANDING SECTION */}
            <section className="pt-8 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              {/* Hero Left Content (span 7) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary border border-border text-[10px] font-black uppercase tracking-widest text-foreground">
                  <span className={`w-2 h-2 rounded-full ${activeColor.accentBg} animate-ping`} />
                  Available for new opportunities
                </div>

                <div className="space-y-3">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-foreground leading-[1.05]">
                    Building <span className={activeColor.text}>Digital Experiences</span> & Software.
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground font-semibold max-w-xl leading-relaxed">
                    I am <strong className="text-foreground">{profile.fullName}</strong>, {profile.headline || "a passionate Software Engineer"}.
                  </p>
                </div>

                {profile.portfolioShowBio && profile.bio && (
                  <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-medium max-w-xl">
                    {profile.bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a 
                    href="#projects"
                    className={`px-6 py-3.5 ${activeColor.accentBg} text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg hover:opacity-90 inline-flex items-center gap-2`}
                  >
                    <FileCode className="w-4 h-4" /> Explore Work
                  </a>
                  {profile.portfolioShowEmail && profile.email && (
                    <a 
                      href={`mailto:${profile.email}`}
                      className="px-6 py-3.5 bg-secondary text-foreground border border-border text-xs font-black uppercase tracking-widest rounded-2xl transition-all hover:bg-secondary/80 inline-flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" /> Get In Touch
                    </a>
                  )}
                </div>
              </div>

              {/* Hero Right Visual Avatar (span 5) */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative group">
                  <div className={`absolute -inset-4 rounded-3xl ${activeColor.bg} blur-2xl opacity-70 group-hover:opacity-100 transition-all duration-500`} />
                  
                  {showPhoto && (
                    profile.profilePhotoUrl ? (
                      <div className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl border-4 ${activeColor.border} overflow-hidden shadow-2xl bg-card`}>
                        <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl ${activeColor.bg} border-4 ${activeColor.border} flex flex-col items-center justify-center gap-2 text-4xl font-black uppercase ${activeColor.text} shadow-2xl bg-card`}>
                        <span>{profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "DEV"}</span>
                        <span className="text-[10px] tracking-widest text-muted-foreground uppercase font-bold">Portfolio Avatar</span>
                      </div>
                    )
                  )}
                </div>
              </div>

            </section>

            {/* STATS METRICS COUNTER BAR */}
            <div className="p-8 rounded-3xl bg-card border border-border grid grid-cols-2 md:grid-cols-4 gap-6 text-center shadow-sm">
              <div className="space-y-1">
                <p className={`text-3xl font-black ${activeColor.text}`}>{profile.experiences?.length || 0}+</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Career Roles</p>
              </div>
              <div className="space-y-1">
                <p className={`text-3xl font-black ${activeColor.text}`}>{profile.academicProjects?.length || 0}+</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Projects Built</p>
              </div>
              <div className="space-y-1">
                <p className={`text-3xl font-black ${activeColor.text}`}>{profile.skills?.length || 0}+</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Skills Mastered</p>
              </div>
              <div className="space-y-1">
                <p className={`text-3xl font-black ${activeColor.text}`}>{profile.certifications?.length || 0}+</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Certifications</p>
              </div>
            </div>

            {/* ABOUT & SKILLS SECTION */}
            <section id="about" className="space-y-8 scroll-mt-24">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">About & Expertise</h2>
                <div className="h-0.5 flex-1 bg-border/60" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Bio Summary */}
                <div className="md:col-span-6 p-8 rounded-3xl bg-card border border-border space-y-4 shadow-sm">
                  <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}>
                    <GraduationCap className="w-4 h-4" /> Professional Background
                  </h3>
                  <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-medium">
                    {profile.bio || "Passionate engineer dedicated to crafting clean, high-performance software applications and modern digital solutions."}
                  </p>
                </div>

                {/* Technical Skills Grid */}
                <div className="md:col-span-6 p-8 rounded-3xl bg-card border border-border space-y-4 shadow-sm">
                  <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}>
                    <Code className="w-4 h-4" /> Core Technologies & Skills
                  </h3>
                  {profile.skills?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill: string) => (
                        <span key={skill} className={`px-3.5 py-1.5 bg-secondary text-foreground text-[10px] font-black uppercase tracking-wider rounded-xl border border-border/60 shadow-xs hover:${activeColor.text} transition-all`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No skill tags listed.</p>
                  )}
                </div>
              </div>
            </section>

            {/* WORK EXPERIENCE SECTION */}
            {profile.portfolioShowExperience && profile.experiences?.length > 0 && (
              <section id="experience" className="space-y-8 scroll-mt-24">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Work Experience</h2>
                  <div className="h-0.5 flex-1 bg-border/60" />
                </div>

                <div className="space-y-6">
                  {profile.experiences.map((exp: any, index: number) => (
                    <div key={index} className="p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:border-border/90 transition-all">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${activeColor.accentBg}`} />
                          <h3 className="text-base font-black uppercase text-foreground">{exp.title}</h3>
                        </div>
                        <p className="text-xs font-bold text-muted-foreground">{exp.company}</p>
                        {exp.description && (
                          <p className="text-xs text-foreground/80 leading-relaxed pt-2 max-w-3xl">{exp.description}</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${activeColor.bg} ${activeColor.text} self-start md:self-auto border ${activeColor.border}`}>
                        {exp.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FEATURED PROJECTS SHOWCASE */}
            {profile.portfolioShowProjects && profile.academicProjects?.length > 0 && (
              <section id="projects" className="space-y-8 scroll-mt-24">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Featured Projects</h2>
                  <div className="h-0.5 flex-1 bg-border/60" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.academicProjects.map((proj: any, index: number) => (
                    <div key={index} className="p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between gap-6 hover:border-primary/50 transition-all">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <FileCode className={`w-5 h-5 ${activeColor.text}`} />
                          {proj.technologies && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2.5 py-1 rounded-md bg-secondary">
                              {proj.technologies}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black uppercase text-foreground">{proj.title}</h3>
                        {proj.description && (
                          <p className="text-xs text-foreground/80 leading-relaxed">{proj.description}</p>
                        )}
                      </div>
                      {proj.link && (
                        <a 
                          href={proj.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider ${activeColor.text} hover:underline self-start`}
                        >
                          <ExternalLink className="w-4 h-4" /> Launch Project
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ACCREDITATION & INTERNSHIPS SECTION */}
            <section id="skills" className="space-y-8 scroll-mt-24">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* Certifications */}
                {profile.portfolioShowCertifications && profile.certifications?.length > 0 && (
                  <div className="md:col-span-6 space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Accreditation</h2>
                    <div className="space-y-3">
                      {profile.certifications.map((cert: any, index: number) => (
                        <div key={index} className="p-5 rounded-2xl bg-card border border-border flex justify-between items-center shadow-sm">
                          <div>
                            <p className="text-xs font-black uppercase text-foreground">{cert.name}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold">{cert.issuingOrganization}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-bold">{cert.issueDate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Internships */}
                {profile.portfolioShowInternships && profile.internships?.length > 0 && (
                  <div className="md:col-span-6 space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Internships</h2>
                    <div className="space-y-3">
                      {profile.internships.map((intern: any, index: number) => (
                        <div key={index} className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-sm">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-black uppercase text-foreground">{intern.role}</p>
                            <span className="text-[10px] text-muted-foreground font-bold">{intern.duration}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-semibold">{intern.company}</p>
                          {intern.description && (
                            <p className="text-xs text-foreground/75 pt-1 leading-relaxed">{intern.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </section>

            {/* CONTACT FOOTER CTA BANNER */}
            <section id="contact" className="p-10 md:p-16 rounded-3xl bg-card border border-border text-center space-y-6 shadow-xl relative overflow-hidden">
              <div className={`absolute inset-0 ${activeColor.bg} opacity-20 pointer-events-none blur-3xl`} />
              <div className="space-y-3 max-w-xl mx-auto relative z-10">
                <span className={`text-[10px] font-black uppercase tracking-widest ${activeColor.text}`}>Let's Connect</span>
                <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
                  Ready to collaborate on your next big project?
                </h2>
                <p className="text-xs text-muted-foreground font-semibold">
                  Feel free to reach out directly via email to discuss engineering roles, projects, or consulting.
                </p>
              </div>

              {profile.portfolioShowEmail && profile.email && (
                <div className="pt-2 relative z-10">
                  <a 
                    href={`mailto:${profile.email}`}
                    className={`inline-flex items-center gap-2 px-8 py-4 ${activeColor.accentBg} text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl hover:opacity-90 transition-all`}
                  >
                    <Mail className="w-4 h-4" /> Send Email Message ({profile.email})
                  </a>
                </div>
              )}
            </section>

          </div>

          {/* Footer Bar */}
          <footer className="w-full border-t border-border/60 py-8 text-center text-xs text-muted-foreground font-semibold">
            <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p>© {new Date().getFullYear()} {profile.fullName}. All rights reserved.</p>
              <p className="text-[10px] uppercase font-black tracking-widest">Built with AI Career Forge</p>
            </div>
          </footer>

        </div>
      )}

      {/* 5. TEMPLATE: CREATIVE BENTO STUDIO WEBSITE */}
      {template === "bento_grid" && (
        <div className="min-h-screen space-y-12 pb-20">
          
          {/* Top Header Navbar */}
          <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/60">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${activeColor.accentBg} text-white flex items-center justify-center font-black text-xs uppercase shadow-sm`}>
                  {profile.fullName ? profile.fullName.charAt(0) : "B"}
                </div>
                <span className="font-black text-xs uppercase tracking-tight text-foreground">{profile.fullName}</span>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${activeColor.accentBg} animate-ping`} />
                Creative Studio Mode
              </div>

              {profile.portfolioShowEmail && profile.email && (
                <a 
                  href={`mailto:${profile.email}`} 
                  className={`px-3.5 py-1.5 ${activeColor.accentBg} text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm hover:opacity-90`}
                >
                  Contact Studio
                </a>
              )}
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-6 space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Bento Card 1: Main Identity Hero (span 2 md) */}
              <div className={`md:col-span-2 p-8 rounded-3xl border ${activeColor.border} bg-card shadow-lg flex flex-col justify-between space-y-6 relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-64 h-64 ${activeColor.bg} rounded-full blur-3xl opacity-40 pointer-events-none`} />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
                  {showPhoto && (
                    profile.profilePhotoUrl ? (
                      <div className="w-24 h-24 rounded-2xl border-2 border-border overflow-hidden shadow-md shrink-0">
                        <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-24 h-24 rounded-2xl ${activeColor.bg} border border-border flex items-center justify-center text-3xl font-black uppercase ${activeColor.text} shrink-0`}>
                        {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "BENTO"}
                      </div>
                    )
                  )}

                  <div className="space-y-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground">
                      Bento Showcase Profile
                    </span>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">{profile.fullName}</h1>
                    <p className={`text-xs uppercase font-black tracking-widest ${activeColor.text}`}>
                      {profile.headline || "Innovator & Creator"}
                    </p>
                  </div>
                </div>

                {profile.portfolioShowBio && profile.bio && (
                  <p className="text-xs text-foreground/80 leading-relaxed font-medium relative z-10 pt-2 border-t border-border/40">
                    {profile.bio}
                  </p>
                )}

                {profile.portfolioShowEmail && profile.email && (
                  <div className="pt-2 relative z-10">
                    <a 
                      href={`mailto:${profile.email}`}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 ${activeColor.accentBg} text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:opacity-90`}
                    >
                      <Mail className="w-3.5 h-3.5" /> Connect Via Email
                    </a>
                  </div>
                )}
              </div>

              {/* Bento Card 2: Core Skills Bento Tile (span 1 md) */}
              <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}>
                    <Code className="w-4 h-4" /> Skills Stack
                  </h3>
                  {profile.skills?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((skill: string) => (
                        <span key={skill} className="px-2.5 py-1 bg-secondary text-foreground text-[9px] font-black uppercase tracking-wider rounded-lg border border-border/60">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No skills specified.</p>
                  )}
                </div>
                <div className={`p-3 rounded-2xl ${activeColor.bg} border ${activeColor.border} text-center`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${activeColor.text}`}>Verified Talent</span>
                </div>
              </div>

              {/* Bento Card 3: Work History (span 3 md) */}
              {profile.portfolioShowExperience && profile.experiences?.length > 0 && (
                <div className="md:col-span-3 p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
                  <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}>
                    <Briefcase className="w-4 h-4" /> Experience Bento Stream
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.experiences.map((exp: any, index: number) => (
                      <div key={index} className="p-5 bg-secondary/20 border border-border/80 rounded-2xl space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-black uppercase text-foreground">{exp.title}</h4>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${activeColor.bg} ${activeColor.text}`}>
                            {exp.duration}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold">{exp.company}</p>
                        {exp.description && (
                          <p className="text-xs text-foreground/75 leading-relaxed pt-1">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bento Card 4: Academic Projects (span 2 md) */}
              {profile.portfolioShowProjects && profile.academicProjects?.length > 0 && (
                <div className="md:col-span-2 p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
                  <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}>
                    <FileCode className="w-4 h-4" /> Creations & Build Index
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profile.academicProjects.map((proj: any, index: number) => (
                      <div key={index} className="p-4 bg-secondary/30 border border-border/80 rounded-2xl flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black uppercase text-foreground">{proj.title}</h4>
                          {proj.technologies && (
                            <p className="text-[9px] text-muted-foreground font-bold uppercase">{proj.technologies}</p>
                          )}
                          {proj.description && (
                            <p className="text-xs text-foreground/75 leading-relaxed">{proj.description}</p>
                          )}
                        </div>
                        {proj.link && (
                          <a href={proj.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-primary hover:underline">
                            <ExternalLink className="w-3 h-3" /> View Project
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bento Card 5: Certifications (span 1 md) */}
              {profile.portfolioShowCertifications && profile.certifications?.length > 0 && (
                <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                  <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}>
                    <Award className="w-4 h-4" /> Accreditation
                  </h3>
                  <div className="space-y-3">
                    {profile.certifications.map((cert: any, index: number) => (
                      <div key={index} className="p-3 bg-secondary/30 border border-border/60 rounded-xl space-y-0.5">
                        <p className="text-xs font-black uppercase text-foreground">{cert.name}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold">{cert.issuingOrganization}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bento Card 6: Internships (span 3 md) */}
              {profile.portfolioShowInternships && profile.internships?.length > 0 && (
                <div className="md:col-span-3 p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                  <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}>
                    <Shield className="w-4 h-4" /> Practical Internships
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {profile.internships.map((intern: any, index: number) => (
                      <div key={index} className="p-4 bg-secondary/20 border border-border/60 rounded-2xl space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-black uppercase text-foreground">{intern.role}</h4>
                          <span className="text-[9px] text-muted-foreground font-bold">{intern.duration}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold">{intern.company}</p>
                        {intern.description && (
                          <p className="text-xs text-foreground/75 pt-1 leading-relaxed">{intern.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Footer Bar */}
          <footer className="w-full border-t border-border/60 py-8 text-center text-xs text-muted-foreground font-semibold">
            <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p>© {new Date().getFullYear()} {profile.fullName}. All rights reserved.</p>
              <p className="text-[10px] uppercase font-black tracking-widest">Powered by AI Career Forge Studio</p>
            </div>
          </footer>

        </div>
      )}

      {/* 6. TEMPLATE: CYBER-MINIMALIST ENGINEERING WEBSITE (Karnik Style) */}
      {template === "karnik_style" && (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-primary/30 selection:text-white font-sans pb-24 relative overflow-hidden">
          
          {/* Subtle Grid Pattern Overlay */}
          <div className="fixed inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none z-0" />

          {/* Sticky Minimal Navbar Header */}
          <header className="sticky top-0 z-50 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80">
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4 relative z-10">
              
              {/* Left Brand Badge */}
              <a href="#" className="flex items-center gap-2.5 group">
                <div className={`w-8 h-8 rounded-lg ${activeColor.accentBg} text-white font-black text-xs flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                  {profile.fullName ? profile.fullName.charAt(0) : "K"}
                </div>
                <span className="font-bold text-sm tracking-tight text-white group-hover:text-primary transition-colors">
                  {profile.fullName}
                </span>
              </a>

              {/* Navigation Anchors */}
              <nav className="hidden sm:flex items-center gap-6 text-xs font-semibold text-zinc-400">
                <a href="#k-about" className="hover:text-white transition-colors">About</a>
                <a href="#k-skills" className="hover:text-white transition-colors">Skills</a>
                <a href="#k-experience" className="hover:text-white transition-colors">Experience</a>
                <a href="#k-projects" className="hover:text-white transition-colors">Projects</a>
                <a href="#k-contact" className="hover:text-white transition-colors">Contact</a>
              </nav>

              {/* Email Quick Action Button */}
              {profile.portfolioShowEmail && profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className={`px-4 py-2 ${activeColor.accentBg} text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 transition-all flex items-center gap-1.5`}
                >
                  <Mail className="w-3.5 h-3.5" /> Let's Connect
                </a>
              )}
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-6 pt-12 space-y-24 relative z-10">
            
            {/* HERO SECTION */}
            <section id="k-about" className="pt-8 pb-4 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
              
              {/* Left Bio Headline Column (span 7) */}
              <div className="md:col-span-7 space-y-6">
                
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300">
                  <span className={`w-2 h-2 rounded-full ${activeColor.accentBg} animate-ping`} />
                  Software Engineer & Developer
                </div>

                <div className="space-y-2">
                  <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                    Hi, I'm <span className={activeColor.text}>{profile.fullName}</span> 👋
                  </h1>
                  <p className="text-base sm:text-lg text-zinc-400 font-medium leading-relaxed">
                    {profile.headline || "Full Stack Developer building scalable systems, web apps, and modern digital tools."}
                  </p>
                </div>

                {profile.portfolioShowBio && profile.bio && (
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl">
                    {profile.bio}
                  </p>
                )}

                {/* Hero CTAs */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href="#k-projects"
                    className={`px-5 py-3 ${activeColor.accentBg} text-white text-xs font-bold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center gap-2`}
                  >
                    <FileCode className="w-4 h-4" /> View Projects
                  </a>
                  {profile.portfolioShowEmail && profile.email && (
                    <a
                      href={`mailto:${profile.email}`}
                      className="px-5 py-3 bg-zinc-900 text-zinc-200 border border-zinc-800 text-xs font-bold rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" /> Email Me
                    </a>
                  )}
                </div>
              </div>

              {/* Right Avatar Card Column (span 5) */}
              <div className="md:col-span-5 flex justify-center">
                <div className="relative">
                  <div className={`absolute -inset-3 rounded-2xl ${activeColor.bg} blur-xl opacity-60 pointer-events-none`} />
                  
                  {showPhoto && (
                    profile.profilePhotoUrl ? (
                      <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl bg-zinc-900">
                        <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl ${activeColor.bg} border border-zinc-800 flex flex-col items-center justify-center gap-2 text-4xl font-black text-white shadow-2xl bg-zinc-900`}>
                        <span>{profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "DEV"}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

            </section>

            {/* SKILLS & TECH STACK SECTION */}
            {profile.skills?.length > 0 && (
              <section id="k-skills" className="space-y-6 scroll-mt-24">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight text-white">Skills & Technologies</h2>
                  <p className="text-xs text-zinc-400">Tools, frameworks, and programming languages I work with.</p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {profile.skills.map((skill: string) => (
                    <div 
                      key={skill} 
                      className={`px-4 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-200 hover:${activeColor.border} hover:text-white transition-all flex items-center gap-2 shadow-sm`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${activeColor.accentBg}`} />
                      {skill}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* WORK EXPERIENCE TIMELINE SECTION */}
            {profile.portfolioShowExperience && profile.experiences?.length > 0 && (
              <section id="k-experience" className="space-y-6 scroll-mt-24">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight text-white">Work Experience</h2>
                  <p className="text-xs text-zinc-400">My professional career and engineering roles.</p>
                </div>

                <div className="space-y-6 border-l-2 border-zinc-800 pl-6 ml-2">
                  {profile.experiences.map((exp: any, index: number) => (
                    <div key={index} className="space-y-2 relative group">
                      <div className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full ${activeColor.accentBg} ring-4 ring-zinc-950`} />
                      
                      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-2 hover:border-zinc-700 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h3 className="text-base font-bold text-white">{exp.title}</h3>
                          <span className={`text-[10px] font-semibold px-3 py-1 rounded-full ${activeColor.bg} ${activeColor.text} shrink-0 self-start sm:self-auto`}>
                            {exp.duration}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-zinc-400">{exp.company}</p>
                        {exp.description && (
                          <p className="text-xs text-zinc-300 leading-relaxed pt-2">{exp.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FEATURED PROJECTS SECTION */}
            {profile.portfolioShowProjects && profile.academicProjects?.length > 0 && (
              <section id="k-projects" className="space-y-6 scroll-mt-24">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight text-white">Featured Projects</h2>
                  <p className="text-xs text-zinc-400">Applications, products, and software creations.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.academicProjects.map((proj: any, index: number) => (
                    <div 
                      key={index} 
                      className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-zinc-700 transition-all shadow-sm group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <FileCode className={`w-5 h-5 ${activeColor.text}`} />
                          {proj.technologies && (
                            <span className="text-[9px] font-mono text-zinc-400 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800">
                              {proj.technologies}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">{proj.title}</h3>
                        {proj.description && (
                          <p className="text-xs text-zinc-400 leading-relaxed">{proj.description}</p>
                        )}
                      </div>

                      {proj.link && (
                        <a
                          href={proj.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 text-xs font-bold ${activeColor.text} hover:underline self-start`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Live Preview / Repo
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* CERTIFICATIONS & INTERNSHIPS SECTION */}
            {((profile.portfolioShowCertifications && profile.certifications?.length > 0) || (profile.portfolioShowInternships && profile.internships?.length > 0)) && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8 scroll-mt-24">
                
                {/* Certifications */}
                {profile.portfolioShowCertifications && profile.certifications?.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight text-white">Accreditation</h2>
                    <div className="space-y-3">
                      {profile.certifications.map((cert: any, index: number) => (
                        <div key={index} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-white">{cert.name}</p>
                            <p className="text-[10px] text-zinc-400 font-medium">{cert.issuingOrganization}</p>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-semibold">{cert.issueDate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Internships */}
                {profile.portfolioShowInternships && profile.internships?.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight text-white">Internships</h2>
                    <div className="space-y-3">
                      {profile.internships.map((intern: any, index: number) => (
                        <div key={index} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-bold text-white">{intern.role}</p>
                            <span className="text-[10px] text-zinc-400 font-semibold">{intern.duration}</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 font-medium">{intern.company}</p>
                          {intern.description && (
                            <p className="text-xs text-zinc-300 pt-1 leading-relaxed">{intern.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </section>
            )}

            {/* CONTACT FOOTER SECTION */}
            <section id="k-contact" className="p-10 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-6 shadow-xl relative overflow-hidden">
              <div className={`absolute inset-0 ${activeColor.bg} opacity-20 pointer-events-none blur-3xl`} />
              <div className="space-y-3 max-w-xl mx-auto relative z-10">
                <span className={`text-[10px] font-mono uppercase tracking-widest ${activeColor.text}`}>Contact Me</span>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Let's Connect & Work Together
                </h2>
                <p className="text-xs text-zinc-400 font-medium">
                  Have a project in mind, an engineering role, or just want to say hi? Send me a message!
                </p>
              </div>

              {profile.portfolioShowEmail && profile.email && (
                <div className="pt-2 relative z-10">
                  <a 
                    href={`mailto:${profile.email}`}
                    className={`inline-flex items-center gap-2 px-6 py-3.5 ${activeColor.accentBg} text-white text-xs font-bold rounded-xl shadow-xl hover:opacity-90 transition-all`}
                  >
                    <Mail className="w-4 h-4" /> {profile.email}
                  </a>
                </div>
              )}
            </section>

          </main>

          {/* Minimalist Bottom Footer */}
          <footer className="w-full border-t border-zinc-800/80 py-8 text-center text-xs text-zinc-400 font-medium mt-20 relative z-10">
            <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p>© {new Date().getFullYear()} {profile.fullName}. All rights reserved.</p>
              <p className="text-[10px] text-zinc-400 font-mono">Designed & Built with AI Career Forge</p>
            </div>
          </footer>

        </div>
      )}

      {/* Floating Action: View / Download CV Resume if present */}
      {profile.resumeS3Url && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-1000">
          <a
            href={profile.resumeS3Url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 bg-foreground text-background text-xs font-black uppercase tracking-widest rounded-2xl shadow-2xl hover:opacity-90 transition-all border border-background/20"
          >
            <FileText className="w-4 h-4" /> Download CV Resume
          </a>
        </div>
      )}

    </div>
  );
}
