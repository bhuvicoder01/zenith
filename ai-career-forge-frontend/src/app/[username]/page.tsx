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
  const showEmail = profile.portfolioShowEmail !== false;
  const activeColor = colorThemeMap[theme] || colorThemeMap.blue;

  const fontClass = `portfolio-font-${fontFamily}`;
  const sizeClass = `portfolio-size-${fontSize}`;
  const sectionOrder: string[] = profile.portfolioSectionOrder || ["hero", "skills", "experience", "projects", "certifications", "internships", "contact"];

  return (
    <div className={`min-h-screen transition-colors duration-300 pb-20 w-full overflow-x-hidden ${fontClass} ${sizeClass} ${
      template === "developer" || template === "karnik_style" ? "bg-zinc-950 text-zinc-100" : "bg-background text-foreground"
    }`}>
      
      {/* 1. TEMPLATE: MINIMALIST */}
      {template === "minimalist" && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-16 space-y-8 sm:space-y-12 text-center">
          <div className="space-y-4 text-center pb-6 sm:pb-8 border-b border-border/60">
            {showPhoto && (
              profile.profilePhotoUrl ? (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-border mx-auto overflow-hidden shadow-sm">
                  <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-secondary border border-border mx-auto flex items-center justify-center text-2xl sm:text-3xl font-black uppercase text-foreground">
                  {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "U"}
                </div>
              )
            )}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">{profile.fullName}</h1>
              <p className={`text-xs uppercase font-black tracking-widest ${activeColor.text}`}>{profile.headline}</p>
              {showEmail && profile.email && (
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground font-semibold mt-1 break-all">
                  <Mail className="w-3.5 h-3.5 shrink-0" /> {profile.email}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8 text-left">
            {sectionOrder.map((secId) => {
              if (secId === "hero" && profile.portfolioShowBio && profile.bio) {
                return (
                  <div key="hero" className="space-y-2">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">About / Identity</h2>
                    <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-medium">{profile.bio}</p>
                  </div>
                );
              }
              if (secId === "skills" && profile.skills?.length > 0) {
                return (
                  <div key="skills" className="space-y-3 pt-4 border-t border-border/40">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Expertise / Tech Stack</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((skill: string, idx: number) => (
                        <span key={idx} className={`px-2.5 py-1 bg-secondary text-[10px] font-black uppercase tracking-wide rounded-xl border border-border/60 ${activeColor.text}`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "experience" && profile.portfolioShowExperience && profile.experiences?.length > 0) {
                return (
                  <div key="experience" className="space-y-4 sm:space-y-6 pt-4 border-t border-border/40">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Work History</h2>
                    <div className="space-y-4">
                      {profile.experiences.map((exp: any, idx: number) => (
                        <div key={idx} className="flex flex-col sm:flex-row justify-between gap-2 p-4 sm:p-5 bg-card border border-border/80 rounded-2xl shadow-sm">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <h3 className="text-xs font-black uppercase tracking-tight text-foreground break-words">{exp.title}</h3>
                            <p className="text-[10px] text-muted-foreground font-semibold">{exp.company}</p>
                            <p className="text-xs text-foreground/75 leading-relaxed mt-2">{exp.description}</p>
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 self-start sm:self-auto ${activeColor.bg} ${activeColor.text}`}>
                            {exp.duration}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "projects" && profile.portfolioShowProjects && profile.academicProjects?.length > 0) {
                return (
                  <div key="projects" className="space-y-4 sm:space-y-6 pt-4 border-t border-border/40">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Projects / Creations</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profile.academicProjects.map((proj: any, idx: number) => (
                        <div key={idx} className="p-4 sm:p-5 bg-card border border-border rounded-2xl flex flex-col justify-between gap-4 shadow-sm">
                          <div className="space-y-2">
                            <h3 className="text-xs font-black uppercase tracking-tight text-foreground break-words">{proj.title}</h3>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{proj.technologies}</p>
                            <p className="text-xs text-foreground/75 leading-relaxed">{proj.description}</p>
                          </div>
                          {proj.link && (
                            <a 
                              href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-primary hover:underline self-start mt-2"
                            >
                              <ExternalLink className="w-3 h-3" /> Live Project Link
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "internships" && profile.portfolioShowInternships && profile.internships?.length > 0) {
                return (
                  <div key="internships" className="space-y-4 sm:space-y-6 pt-4 border-t border-border/40">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Internship Experience</h2>
                    <div className="space-y-3">
                      {profile.internships.map((intern: any, idx: number) => (
                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-4 border border-border/60 bg-secondary/10 rounded-2xl">
                          <div className="space-y-0.5">
                            <h3 className="text-xs font-black uppercase text-foreground">{intern.role}</h3>
                            <p className="text-[10px] text-muted-foreground font-semibold">{intern.company}</p>
                          </div>
                          <span className="text-[9px] text-muted-foreground bg-secondary border border-border px-2.5 py-1 rounded-full font-black uppercase shrink-0">
                            {intern.duration}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "certifications" && profile.portfolioShowCertifications && profile.certifications?.length > 0) {
                return (
                  <div key="certifications" className="space-y-4 pt-4 border-t border-border/40">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Accreditation / Certifications</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.certifications.map((cert: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                          <Award className={`w-5 h-5 ${activeColor.text} shrink-0`} />
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase truncate text-foreground">{cert.name}</p>
                            <p className="text-[9px] text-muted-foreground font-semibold">{cert.issuingOrganization} • {cert.issueDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "contact") {
                return (
                  <div key="contact" className="p-6 sm:p-8 rounded-3xl bg-card border border-border text-center space-y-4 shadow-sm pt-4 border-t">
                    <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground">Let's Connect & Work Together</h2>
                    {showEmail && profile.email && (
                      <p className="text-xs text-muted-foreground font-semibold break-all">Send email directly to: {profile.email}</p>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      {/* 2. TEMPLATE: DEVELOPER CONSOLE / TERMINAL */}
      {template === "developer" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-16 space-y-6 sm:space-y-8 font-mono">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-3 right-3 text-[8px] text-zinc-500 font-bold uppercase select-none">~/console</div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {showPhoto && (
                profile.profilePhotoUrl ? (
                  <div className="w-20 h-20 rounded-2xl border border-zinc-800 overflow-hidden shrink-0">
                    <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                    {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "DEV"}
                  </div>
                )
              )}
              <div className="space-y-2 text-center sm:text-left min-w-0 flex-1 w-full">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <div className={`w-2 h-2 rounded-full ${activeColor.accentBg} animate-ping shrink-0`} />
                  <h1 className="text-base sm:text-lg font-black text-white truncate">{profile.fullName}</h1>
                </div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${activeColor.terminalText}`}>{profile.headline}</p>
                {showEmail && profile.email && (
                  <div className="inline-flex items-center gap-2 text-[10px] text-zinc-500 break-all">
                    <Terminal className="w-3.5 h-3.5 shrink-0" /> cat email.txt // {profile.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {sectionOrder.map((secId) => {
              if (secId === "hero" && profile.portfolioShowBio && profile.bio) {
                return (
                  <div key="hero" className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-2">
                    <p className="text-[9px] text-zinc-500 font-bold">cat bio.txt</p>
                    <p className="text-xs text-zinc-300 leading-relaxed">{profile.bio}</p>
                  </div>
                );
              }
              if (secId === "skills" && profile.skills?.length > 0) {
                return (
                  <div key="skills" className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-3">
                    <p className="text-[9px] text-zinc-500 font-bold">ls skills/</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((sk: string, idx: number) => (
                        <span key={idx} className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${activeColor.badge}`}>
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "experience" && profile.portfolioShowExperience && profile.experiences?.length > 0) {
                return (
                  <div key="experience" className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4">
                    <p className="text-[9px] text-zinc-500 font-bold">sh get_experience.sh</p>
                    <div className="space-y-4 border-l border-zinc-800 pl-4 ml-2">
                      {profile.experiences.map((exp: any, idx: number) => (
                        <div key={idx} className="space-y-1.5 relative">
                          <div className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full ${activeColor.accentBg}`} />
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-xs">
                            <h3 className="font-bold text-white uppercase">{exp.title}</h3>
                            <span className="text-[9px] text-zinc-500 font-bold">{exp.duration}</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 font-black">{exp.company}</p>
                          <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "projects" && profile.portfolioShowProjects && profile.academicProjects?.length > 0) {
                return (
                  <div key="projects" className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4">
                    <p className="text-[9px] text-zinc-500 font-bold">./run_projects_index</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profile.academicProjects.map((proj: any, idx: number) => (
                        <div key={idx} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <FileCode className={`w-4 h-4 ${activeColor.terminalText} shrink-0`} />
                              <h3 className="text-xs font-bold text-white uppercase break-words">{proj.title}</h3>
                            </div>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{proj.technologies}</p>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">{proj.description}</p>
                          </div>
                          {proj.link && (
                            <a 
                              href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 hover:underline mt-2 self-start"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> view_live
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "internships" && profile.portfolioShowInternships && profile.internships?.length > 0) {
                return (
                  <div key="internships" className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4">
                    <p className="text-[9px] text-zinc-500 font-bold">cat internships.json</p>
                    <div className="space-y-3">
                      {profile.internships.map((intern: any, idx: number) => (
                        <div key={idx} className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-xl flex flex-col sm:flex-row justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-white">{intern.role}</p>
                            <p className="text-[10px] text-zinc-500 font-semibold">{intern.company}</p>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-black">{intern.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "certifications" && profile.portfolioShowCertifications && profile.certifications?.length > 0) {
                return (
                  <div key="certifications" className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4">
                    <p className="text-[9px] text-zinc-500 font-bold">ls accreditation/</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {profile.certifications.map((cert: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 border border-zinc-800 bg-zinc-900/20 rounded-xl">
                          <CheckCircle className={`w-4 h-4 ${activeColor.terminalText} shrink-0`} />
                          <div className="min-w-0">
                            <p className="font-bold text-white uppercase truncate">{cert.name}</p>
                            <p className="text-[9px] text-zinc-500 mt-0.5">{cert.issuingOrganization} • {cert.issueDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "contact") {
                return (
                  <div key="contact" className="p-4 sm:p-6 bg-zinc-950 border border-zinc-800 rounded-2xl text-center space-y-2">
                    <p className="text-[9px] text-zinc-500 font-bold">echo $CONTACT_EMAIL</p>
                    {showEmail && profile.email && (
                      <p className={`text-xs font-bold ${activeColor.terminalText} break-all`}>{profile.email}</p>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      {/* 3. TEMPLATE: CYBER DARK PORTFOLIO */}
      {template === "karnik_style" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-16 space-y-8 sm:space-y-12 bg-zinc-950 text-zinc-100">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            <div className="md:col-span-7 space-y-4 sm:space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300">
                <span className={`w-2 h-2 rounded-full ${activeColor.accentBg} animate-ping`} /> {profile.headline || "Professional Portfolio"}
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                  Hi, I'm <span className={activeColor.text}>{profile.fullName}</span> 👋
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 font-medium">{profile.headline}</p>
              </div>
              {profile.portfolioShowBio && profile.bio && (
                <p className="text-xs text-zinc-400 leading-relaxed max-w-xl mx-auto md:mx-0">{profile.bio}</p>
              )}
            </div>
            <div className="md:col-span-5 flex justify-center">
              {showPhoto && (
                profile.profilePhotoUrl ? (
                  <div className="w-36 h-36 sm:w-56 sm:h-56 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl bg-zinc-900">
                    <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`w-36 h-36 sm:w-56 sm:h-56 rounded-2xl ${activeColor.bg} border border-zinc-800 flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-2xl bg-zinc-900`}>
                    <span>{profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "DEV"}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="space-y-8 sm:space-y-10">
            {sectionOrder.map((secId) => {
              if (secId === "skills" && profile.skills?.length > 0) {
                return (
                  <div key="skills" className="space-y-4 pt-4 border-t border-zinc-800">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Skills & Technologies</h2>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((sk: string, idx: number) => (
                        <div key={idx} className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-200 flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${activeColor.accentBg}`} /> {sk}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "experience" && profile.portfolioShowExperience && profile.experiences?.length > 0) {
                return (
                  <div key="experience" className="space-y-4 pt-4 border-t border-zinc-800">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Work Experience</h2>
                    <div className="space-y-4 border-l-2 border-zinc-800 pl-4 sm:pl-6 ml-1 sm:ml-2">
                      {profile.experiences.map((exp: any, idx: number) => (
                        <div key={idx} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-2">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                            <h3 className="text-sm sm:text-base font-bold text-white">{exp.title}</h3>
                            <span className={`text-[9px] font-semibold px-2.5 py-1 rounded-full ${activeColor.bg} ${activeColor.text}`}>{exp.duration}</span>
                          </div>
                          <p className="text-xs font-semibold text-zinc-400">{exp.company}</p>
                          <p className="text-xs text-zinc-300 leading-relaxed pt-1">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "projects" && profile.portfolioShowProjects && profile.academicProjects?.length > 0) {
                return (
                  <div key="projects" className="space-y-4 pt-4 border-t border-zinc-800">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Featured Projects</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {profile.academicProjects.map((proj: any, idx: number) => (
                        <div key={idx} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-3 flex flex-col justify-between">
                          <div className="space-y-2">
                            <h3 className="text-sm sm:text-base font-bold text-white">{proj.title}</h3>
                            <p className="text-[9px] font-mono text-zinc-400">{proj.technologies}</p>
                            <p className="text-xs text-zinc-400 leading-relaxed">{proj.description}</p>
                          </div>
                          {proj.link && (
                            <a 
                              href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 hover:underline pt-2 self-start"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View Live Project
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "certifications" && profile.portfolioShowCertifications && profile.certifications?.length > 0) {
                return (
                  <div key="certifications" className="space-y-4 pt-4 border-t border-zinc-800">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Accreditation</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.certifications.map((cert: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-white">{cert.name}</p>
                            <p className="text-[10px] text-zinc-400">{cert.issuingOrganization}</p>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-semibold">{cert.issueDate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "internships" && profile.portfolioShowInternships && profile.internships?.length > 0) {
                return (
                  <div key="internships" className="space-y-4 pt-4 border-t border-zinc-800">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Internships</h2>
                    <div className="space-y-3">
                      {profile.internships.map((intern: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-white">{intern.role}</p>
                            <p className="text-[10px] text-zinc-400">{intern.company}</p>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-semibold">{intern.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "contact") {
                return (
                  <div key="contact" className="p-6 sm:p-10 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Let's Connect & Work Together</h2>
                    {showEmail && profile.email && (
                      <p className="text-xs text-zinc-400 break-all">Email: {profile.email}</p>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      {/* 4. TEMPLATE: MODERN HERO WEBSITE */}
      {template === "modern_hero" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-8 sm:space-y-12">
          <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-xl border-b border-border/60 p-3 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${activeColor.accentBg} text-white flex items-center justify-center font-black text-xs sm:text-sm uppercase shrink-0`}>
                {profile.fullName?.charAt(0) || "P"}
              </div>
              <span className="font-black text-xs sm:text-sm uppercase text-foreground truncate">{profile.fullName}</span>
            </div>
            <div className="text-[10px] sm:text-xs font-black uppercase text-muted-foreground shrink-0">Available for Hire</div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center pt-2">
            <div className="md:col-span-7 space-y-4 sm:space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border text-[9px] sm:text-[10px] font-black uppercase text-foreground">
                <span className={`w-2 h-2 rounded-full ${activeColor.accentBg} animate-ping`} /> Open for new opportunities
              </div>
              <div className="space-y-2 sm:space-y-3">
                <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground leading-tight">
                  Building <span className={activeColor.text}>Digital Experiences</span> & Software.
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-semibold">I am <strong className="text-foreground">{profile.fullName}</strong>, {profile.headline}</p>
              </div>
            </div>
            <div className="md:col-span-5 flex justify-center">
              {showPhoto && (
                profile.profilePhotoUrl ? (
                  <div className={`w-44 h-44 sm:w-56 sm:h-56 rounded-3xl border-4 ${activeColor.border} overflow-hidden shadow-2xl bg-card`}>
                    <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`w-44 h-44 sm:w-56 sm:h-56 rounded-3xl ${activeColor.bg} border-4 ${activeColor.border} flex items-center justify-center text-3xl sm:text-4xl font-black text-foreground shadow-2xl bg-card`}>
                    <span>{profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "DEV"}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Website Analytics & Career Metrics Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 rounded-3xl bg-card border border-border/80 shadow-md">
            <div className="p-3 sm:p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
              <Briefcase className={`w-4 h-4 mx-auto ${activeColor.text}`} />
              <p className={`text-xl sm:text-3xl font-black tracking-tight ${activeColor.text}`}>
                {profile.experiences?.length || 0}+
              </p>
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Experience</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
              <FileCode className={`w-4 h-4 mx-auto ${activeColor.text}`} />
              <p className={`text-xl sm:text-3xl font-black tracking-tight ${activeColor.text}`}>
                {profile.academicProjects?.length || 0}+
              </p>
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Projects</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
              <Code className={`w-4 h-4 mx-auto ${activeColor.text}`} />
              <p className={`text-xl sm:text-3xl font-black tracking-tight ${activeColor.text}`}>
                {profile.skills?.length || 0}+
              </p>
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Skills</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
              <Award className={`w-4 h-4 mx-auto ${activeColor.text}`} />
              <p className={`text-xl sm:text-3xl font-black tracking-tight ${activeColor.text}`}>
                {profile.certifications?.length || 0}+
              </p>
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Certifications</p>
            </div>
          </div>

          <div className="space-y-8 sm:space-y-12">
            {sectionOrder.map((secId) => {
              if (secId === "hero" && profile.portfolioShowBio && profile.bio) {
                return (
                  <div key="hero" className="space-y-3 pt-4 border-t border-border">
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-foreground">About Narrative</h2>
                    <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-medium">{profile.bio}</p>
                  </div>
                );
              }
              if (secId === "skills" && profile.skills?.length > 0) {
                return (
                  <div key="skills" className="space-y-3 pt-4 border-t border-border">
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-foreground">Tech Stack</h2>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((sk: string, idx: number) => (
                        <span key={idx} className={`px-3 py-1.5 bg-secondary text-[10px] font-black uppercase tracking-wide rounded-xl border border-border ${activeColor.text}`}>
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "experience" && profile.portfolioShowExperience && profile.experiences?.length > 0) {
                return (
                  <div key="experience" className="space-y-6 sm:space-y-8 pt-4 border-t border-border">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">Work Experience</h2>
                    <div className="space-y-4 sm:space-y-6">
                      {profile.experiences.map((exp: any, idx: number) => (
                        <div key={idx} className="p-5 sm:p-8 rounded-3xl bg-card border border-border flex flex-col md:flex-row justify-between gap-4 sm:gap-6">
                          <div className="space-y-2 flex-1">
                            <h3 className="text-sm sm:text-base font-black uppercase text-foreground">{exp.title}</h3>
                            <p className="text-xs font-bold text-muted-foreground">{exp.company}</p>
                            <p className="text-xs text-foreground/80 leading-relaxed pt-2">{exp.description}</p>
                          </div>
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase px-3 py-1 sm:px-4 sm:py-1.5 rounded-full ${activeColor.bg} ${activeColor.text} self-start md:self-auto`}>{exp.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "projects" && profile.portfolioShowProjects && profile.academicProjects?.length > 0) {
                return (
                  <div key="projects" className="space-y-6 sm:space-y-8 pt-4 border-t border-border">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">Featured Projects</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {profile.academicProjects.map((proj: any, idx: number) => (
                        <div key={idx} className="p-5 sm:p-8 rounded-3xl bg-card border border-border flex flex-col justify-between gap-4 sm:gap-6">
                          <div className="space-y-2 sm:space-y-3">
                            <h3 className="text-sm sm:text-base font-black uppercase text-foreground">{proj.title}</h3>
                            <p className="text-xs text-foreground/80 leading-relaxed">{proj.description}</p>
                          </div>
                          {proj.link && (
                            <a 
                              href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-primary hover:underline self-start"
                            >
                              <ExternalLink className="w-4 h-4" /> Live Project Link
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "internships" && profile.portfolioShowInternships && profile.internships?.length > 0) {
                return (
                  <div key="internships" className="space-y-6 pt-4 border-t border-border">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">Internship Experience</h2>
                    <div className="space-y-3">
                      {profile.internships.map((intern: any, idx: number) => (
                        <div key={idx} className="p-5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <h3 className="text-sm font-black uppercase text-foreground">{intern.role}</h3>
                            <p className="text-xs text-muted-foreground font-semibold">{intern.company}</p>
                          </div>
                          <span className="text-[10px] font-black uppercase px-3 py-1 bg-secondary rounded-full border border-border">{intern.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "certifications" && profile.portfolioShowCertifications && profile.certifications?.length > 0) {
                return (
                  <div key="certifications" className="space-y-6 pt-4 border-t border-border">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">Accreditation</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profile.certifications.map((cert: any, idx: number) => (
                        <div key={idx} className="p-5 rounded-2xl bg-card border border-border flex items-center gap-3">
                          <Award className={`w-5 h-5 ${activeColor.text} shrink-0`} />
                          <div>
                            <h3 className="text-xs font-black uppercase text-foreground">{cert.name}</h3>
                            <p className="text-[10px] text-muted-foreground font-bold">{cert.issuingOrganization} • {cert.issueDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "contact") {
                return (
                  <div key="contact" className="p-6 sm:p-12 rounded-3xl bg-card border border-border text-center space-y-4 shadow-xl">
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">Ready to Collaborate?</h2>
                    {showEmail && profile.email && (
                      <p className="text-xs text-muted-foreground font-semibold break-all">Send email to: {profile.email}</p>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      {/* 5. TEMPLATE: CREATIVE BENTO GRID STUDIO */}
      {template === "bento_grid" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-16 space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Bento Card 1: Identity Hero */}
            <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl border border-border bg-card space-y-4 sm:space-y-6 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                {showPhoto && (
                  profile.profilePhotoUrl ? (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-border overflow-hidden shadow-md shrink-0">
                      <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ${activeColor.bg} border border-border flex items-center justify-center text-2xl sm:text-3xl font-black uppercase ${activeColor.text} shrink-0`}>
                      {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "BENTO"}
                    </div>
                  )
                )}
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground">Bento Profile</span>
                  <h1 className="text-2xl sm:text-3xl font-black uppercase text-foreground">{profile.fullName}</h1>
                  <p className={`text-xs font-black uppercase ${activeColor.text}`}>{profile.headline}</p>
                </div>
              </div>
              {profile.portfolioShowBio && profile.bio && (
                <p className="text-xs text-foreground/80 leading-relaxed font-medium pt-2 border-t border-border/40">{profile.bio}</p>
              )}
            </div>

            {/* Dynamic Section Bento Cards */}
            {sectionOrder.map((secId) => {
              if (secId === "skills" && profile.skills?.length > 0) {
                return (
                  <div key="skills" className="p-6 rounded-3xl border border-border bg-card space-y-4 flex flex-col justify-between shadow-sm">
                    <div className="space-y-3">
                      <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}><Code className="w-4 h-4 shrink-0" /> Skills Stack</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((sk: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 bg-secondary text-foreground text-[9px] font-black uppercase rounded-lg border border-border">{sk}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
              if (secId === "experience" && profile.portfolioShowExperience && profile.experiences?.length > 0) {
                return (
                  <div key="experience" className="md:col-span-3 p-6 sm:p-8 rounded-3xl border border-border bg-card space-y-6 shadow-sm">
                    <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}><Briefcase className="w-4 h-4 shrink-0" /> Experience Bento Stream</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.experiences.map((exp: any, idx: number) => (
                        <div key={idx} className="p-4 sm:p-5 bg-secondary/20 border border-border/80 rounded-2xl space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-black uppercase text-foreground">{exp.title}</h4>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${activeColor.bg} ${activeColor.text}`}>{exp.duration}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-bold">{exp.company}</p>
                          <p className="text-xs text-foreground/75 leading-relaxed pt-1">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "projects" && profile.portfolioShowProjects && profile.academicProjects?.length > 0) {
                return (
                  <div key="projects" className="md:col-span-2 p-6 sm:p-8 rounded-3xl border border-border bg-card space-y-6 shadow-sm">
                    <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}><FileCode className="w-4 h-4 shrink-0" /> Creations & Build Index</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profile.academicProjects.map((proj: any, idx: number) => (
                        <div key={idx} className="p-4 bg-secondary/30 border border-border/80 rounded-2xl space-y-2 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase text-foreground">{proj.title}</h4>
                            <p className="text-xs text-foreground/75 leading-relaxed">{proj.description}</p>
                          </div>
                          {proj.link && (
                            <a 
                              href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-primary hover:underline self-start mt-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Live Project Link
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "certifications" && profile.portfolioShowCertifications && profile.certifications?.length > 0) {
                return (
                  <div key="certifications" className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                    <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}><Award className="w-4 h-4 shrink-0" /> Accreditation</h3>
                    <div className="space-y-3">
                      {profile.certifications.map((cert: any, idx: number) => (
                        <div key={idx} className="p-3 bg-secondary/30 border border-border/60 rounded-xl space-y-0.5">
                          <p className="text-xs font-black uppercase text-foreground">{cert.name}</p>
                          <p className="text-[9px] text-muted-foreground font-semibold">{cert.issuingOrganization}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "internships" && profile.portfolioShowInternships && profile.internships?.length > 0) {
                return (
                  <div key="internships" className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                    <h3 className={`text-xs font-black uppercase tracking-widest ${activeColor.text} flex items-center gap-2`}><Briefcase className="w-4 h-4 shrink-0" /> Internships</h3>
                    <div className="space-y-3">
                      {profile.internships.map((intern: any, idx: number) => (
                        <div key={idx} className="p-3 bg-secondary/30 border border-border/60 rounded-xl space-y-0.5">
                          <p className="text-xs font-black uppercase text-foreground">{intern.role}</p>
                          <p className="text-[9px] text-muted-foreground font-semibold">{intern.company}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "contact") {
                return (
                  <div key="contact" className="md:col-span-3 p-8 rounded-3xl border border-border bg-card text-center space-y-4 shadow-sm">
                    <h3 className="text-xl font-black uppercase text-foreground">Let's Connect</h3>
                    {showEmail && profile.email && (
                      <p className="text-xs text-muted-foreground font-semibold break-all">{profile.email}</p>
                    )}
                  </div>
                );
              }
              return null;
            })}

          </div>
        </div>
      )}

      {/* 6. TEMPLATE: EXECUTIVE FORMAL */}
      {template === "executive" && (
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-8 sm:pt-16 space-y-8 sm:space-y-12 text-center text-foreground font-serif">
          <div className="space-y-4 border-b border-border pb-8">
            {showPhoto && (
              profile.profilePhotoUrl ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-border mx-auto overflow-hidden shadow-md">
                  <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-secondary border border-border mx-auto flex items-center justify-center text-xl sm:text-2xl font-black uppercase text-foreground">
                  {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "EXEC"}
                </div>
              )
            )}
            <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-foreground">{profile.fullName}</h1>
            <p className={`text-xs font-bold uppercase tracking-widest ${activeColor.text}`}>{profile.headline}</p>
          </div>

          <div className="space-y-8 sm:space-y-12 text-left">
            {sectionOrder.map((secId) => {
              if (secId === "hero" && profile.portfolioShowBio && profile.bio) {
                return (
                  <div key="hero" className="italic text-xs sm:text-sm text-foreground/80 leading-relaxed max-w-lg mx-auto text-center">
                    &ldquo;{profile.bio}&rdquo;
                  </div>
                );
              }
              if (secId === "skills" && profile.skills?.length > 0) {
                return (
                  <div key="skills" className="space-y-3 text-center">
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${activeColor.text}`}>Areas of Expertise</h3>
                    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 max-w-xl mx-auto">
                      {profile.skills.map((sk: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-secondary text-foreground text-[10px] font-black uppercase tracking-wider rounded-lg border border-border/60">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "experience" && profile.portfolioShowExperience && profile.experiences?.length > 0) {
                return (
                  <div key="experience" className="space-y-6 pt-6 border-t border-border">
                    <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Professional Experience</h3>
                    <div className="space-y-6 sm:space-y-8 pl-4 border-l-2 border-border/60">
                      {profile.experiences.map((exp: any, idx: number) => (
                        <div key={idx} className="space-y-1.5 relative">
                          <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${activeColor.accentBg}`} />
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                            <h4 className="text-xs sm:text-sm font-black text-foreground">{exp.title}</h4>
                            <span className="text-[10px] text-muted-foreground font-bold italic">{exp.duration}</span>
                          </div>
                          <p className="text-xs text-muted-foreground font-bold">{exp.company}</p>
                          <p className="text-xs text-foreground/75 leading-relaxed pt-1">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "projects" && profile.portfolioShowProjects && profile.academicProjects?.length > 0) {
                return (
                  <div key="projects" className="space-y-6 pt-6 border-t border-border">
                    <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Projects Portfolio</h3>
                    <div className="grid grid-cols-1 gap-6">
                      {profile.academicProjects.map((proj: any, idx: number) => (
                        <div key={idx} className="space-y-2 pb-4 border-b border-border/40 last:border-0">
                          <h4 className="text-xs font-black text-foreground uppercase tracking-tight">{proj.title}</h4>
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">{proj.technologies}</p>
                          <p className="text-xs text-foreground/75 leading-relaxed">{proj.description}</p>
                          {proj.link && (
                            <a 
                              href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-primary hover:underline pt-1 self-start"
                            >
                              <ExternalLink className="w-3 h-3" /> Live Project Link
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "internships" && profile.portfolioShowInternships && profile.internships?.length > 0) {
                return (
                  <div key="internships" className="space-y-6 pt-6 border-t border-border">
                    <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Internships</h3>
                    <div className="space-y-4 pl-4 border-l-2 border-border/60">
                      {profile.internships.map((intern: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <h4 className="text-xs font-black text-foreground">{intern.role}</h4>
                          <p className="text-[10px] text-muted-foreground font-bold">{intern.company} • {intern.duration}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "certifications" && profile.portfolioShowCertifications && profile.certifications?.length > 0) {
                return (
                  <div key="certifications" className="space-y-6 pt-6 border-t border-border">
                    <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Accreditation</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profile.certifications.map((cert: any, idx: number) => (
                        <div key={idx} className="p-4 bg-secondary/20 border border-border/60 rounded-xl space-y-0.5">
                          <h4 className="text-xs font-black text-foreground">{cert.name}</h4>
                          <p className="text-[10px] text-muted-foreground font-bold">{cert.issuingOrganization} • {cert.issueDate}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (secId === "contact") {
                return (
                  <div key="contact" className="p-6 sm:p-10 rounded-2xl bg-secondary/30 border border-border text-center space-y-4">
                    <h3 className="text-lg font-black uppercase text-foreground">Executive Contact</h3>
                    {showEmail && profile.email && (
                      <p className="text-xs text-muted-foreground font-semibold break-all">{profile.email}</p>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>

        </div>
      )}

    </div>
  );
}
