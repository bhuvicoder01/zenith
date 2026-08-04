"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Sparkles, Eye, Save, Loader2, Copy, Check, Briefcase, 
  Code, Award, Shield, Layout, Settings, Mail, ExternalLink, 
  Terminal, FileCode, GripVertical, ChevronUp, ChevronDown, 
  Plus, Trash2, Edit3, EyeOff, X, GraduationCap, CheckCircle, Smartphone, Monitor, UserCheck, Maximize2, Tablet
} from "lucide-react";
import api, { BACKEND_URL } from "@/lib/api";
import { toast } from "sonner";

// Clean Inline Editable Text component for live preview editing without visual overlays
function InlineEdit({
  value,
  onChange,
  placeholder,
  className = "",
  multiline = false,
  tag: Tag = "span",
}: {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  tag?: any;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || "");

  useEffect(() => {
    setText(value || "");
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (text !== (value || "")) {
      onChange(text);
    }
  };

  if (editing) {
    return multiline ? (
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        autoFocus
        rows={3}
        className={`bg-primary/10 border-2 border-primary text-foreground outline-none rounded-lg p-2 w-full resize-none font-medium text-xs ${className}`}
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        autoFocus
        className={`bg-primary/10 border-2 border-primary text-foreground outline-none rounded-lg px-2 py-1 w-full font-medium text-xs ${className}`}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <Tag
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={`cursor-pointer ${className}`}
    >
      {value || <span className="italic opacity-40">{placeholder || "Click to edit"}</span>}
    </Tag>
  );
}

export default function PortfolioCustomizer() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [fullScreenModal, setFullScreenModal] = useState(false);

  // Style customization states
  const [template, setTemplate] = useState("minimalist");
  const [themeColor, setThemeColor] = useState("blue");
  const [fontFamily, setFontFamily] = useState("sans");
  const [fontSize, setFontSize] = useState("medium");
  
  // Visibility states
  const [showPhoto, setShowPhoto] = useState(true);
  const [showEmail, setShowEmail] = useState(true);

  // Drag & Drop section state for control panel and live preview canvas
  const [sections, setSections] = useState<Array<{ id: string; label: string; visible: boolean }>>([
    { id: "hero", label: "Bio Narrative & Hero", visible: true },
    { id: "skills", label: "Skills & Tech Stack", visible: true },
    { id: "experience", label: "Work Experience Timeline", visible: true },
    { id: "projects", label: "Featured Projects Grid", visible: true },
    { id: "certifications", label: "Accreditation & Certs", visible: true },
    { id: "internships", label: "Internships", visible: true },
    { id: "contact", label: "Contact & Connect", visible: true },
  ]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Canvas direct drag state
  const [canvasDraggedIndex, setCanvasDraggedIndex] = useState<number | null>(null);
  const [canvasDragOverIndex, setCanvasDragOverIndex] = useState<number | null>(null);

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

      // Load section order
      const rawOrder: string[] = settings.portfolioSectionOrder || ["hero", "skills", "experience", "projects", "certifications", "internships", "contact"];
      const visibilityMap: Record<string, boolean> = {
        hero: settings.portfolioShowBio !== false,
        skills: true,
        experience: settings.portfolioShowExperience !== false,
        projects: settings.portfolioShowProjects !== false,
        certifications: settings.portfolioShowCertifications !== false,
        internships: settings.portfolioShowInternships !== false,
        contact: true,
      };

      const labelMap: Record<string, string> = {
        hero: "Bio Narrative & Hero",
        skills: "Skills & Tech Stack",
        experience: "Work Experience Timeline",
        projects: "Featured Projects Grid",
        certifications: "Accreditation & Certs",
        internships: "Internships",
        contact: "Contact & Connect",
      };

      const loadedSections = rawOrder.map(id => ({
        id,
        label: labelMap[id] || id,
        visible: visibilityMap[id] !== false,
      }));

      // Ensure all standard sections exist
      Object.keys(labelMap).forEach(id => {
        if (!loadedSections.some(s => s.id === id)) {
          loadedSections.push({ 
            id, 
            label: labelMap[id], 
            visible: visibilityMap[id] !== false,
          });
        }
      });

      setSections(loadedSections);
    } catch (err) {
      console.error("Failed to fetch profile settings:", err);
      toast.error("Failed to load portfolio settings");
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    const newSections = [...sections];
    const [moved] = newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, moved);
    setSections(newSections);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Canvas direct drag and drop handlers
  const handleCanvasDragStart = (e: React.DragEvent, index: number) => {
    setCanvasDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCanvasDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (canvasDraggedIndex === null || canvasDraggedIndex === index) return;
    setCanvasDragOverIndex(index);
  };

  const handleCanvasDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (canvasDraggedIndex === null) return;
    const newSections = [...sections];
    const [moved] = newSections.splice(canvasDraggedIndex, 1);
    newSections.splice(index, 0, moved);
    setSections(newSections);
    setCanvasDraggedIndex(null);
    setCanvasDragOverIndex(null);
    toast.success(`Reordered section to position ${index + 1}`);
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const newSections = [...sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(newIndex, 0, moved);
    setSections(newSections);
  };

  const toggleSectionVisibility = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  const handleSaveSettings = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      const sectionOrderList = sections.map(s => s.id);
      const isHeroVisible = sections.find(s => s.id === "hero")?.visible !== false;
      const isExpVisible = sections.find(s => s.id === "experience")?.visible !== false;
      const isProjVisible = sections.find(s => s.id === "projects")?.visible !== false;
      const isCertVisible = sections.find(s => s.id === "certifications")?.visible !== false;
      const isInternVisible = sections.find(s => s.id === "internships")?.visible !== false;

      const updatedSettings = {
        ...(profile.settings || {}),
        portfolioTemplate: template,
        portfolioThemeColor: themeColor,
        portfolioFontFamily: fontFamily,
        portfolioFontSize: fontSize,
        portfolioShowPhoto: showPhoto,
        portfolioShowEmail: showEmail,
        portfolioShowBio: isHeroVisible,
        portfolioShowExperience: isExpVisible,
        portfolioShowProjects: isProjVisible,
        portfolioShowCertifications: isCertVisible,
        portfolioShowInternships: isInternVisible,
        portfolioSectionOrder: sectionOrderList,
      };

      const updatedProfile = {
        ...profile,
        settings: updatedSettings,
      };

      await api.put("/profile", updatedProfile);
      setProfile(updatedProfile);
      toast.success("Portfolio layout saved successfully!");
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

  const openPreviewInNewPage = () => {
    const url = getPublicUrl();
    if (url) {
      window.open(url, "_blank");
    } else if (profile?.username) {
      window.open(`/${profile.username}`, "_blank");
    } else {
      toast.error("Save profile username first to view public page!");
    }
  };

  // Theme color maps accurately matching Public Portfolio Page
  const themeClasses: Record<string, {
    text: string;
    bg: string;
    border: string;
    badge: string;
    accentBg: string;
    glow: string;
    terminalText: string;
    timelineDot: string;
    primary: string;
  }> = {
    blue: { 
      text: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", 
      badge: "bg-blue-500/10 text-blue-500 border-blue-500/20", accentBg: "bg-blue-500",
      glow: "shadow-blue-500/10", terminalText: "text-blue-400", timelineDot: "bg-blue-500 ring-blue-500/20",
      primary: "bg-blue-500"
    },
    green: { 
      text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", 
      badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", accentBg: "bg-emerald-500",
      glow: "shadow-emerald-500/10", terminalText: "text-emerald-400", timelineDot: "bg-emerald-500 ring-emerald-500/20",
      primary: "bg-emerald-500"
    },
    purple: { 
      text: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", 
      badge: "bg-violet-500/10 text-violet-500 border-violet-500/20", accentBg: "bg-violet-500",
      glow: "shadow-violet-500/10", terminalText: "text-violet-400", timelineDot: "bg-violet-500 ring-violet-500/20",
      primary: "bg-violet-500"
    },
    rose: { 
      text: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", 
      badge: "bg-rose-500/10 text-rose-500 border-rose-500/20", accentBg: "bg-rose-500",
      glow: "shadow-rose-500/10", terminalText: "text-rose-400", timelineDot: "bg-rose-500 ring-rose-500/20",
      primary: "bg-rose-500"
    },
    amber: { 
      text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", 
      badge: "bg-amber-500/10 text-amber-500 border-amber-500/20", accentBg: "bg-amber-500",
      glow: "shadow-amber-500/10", terminalText: "text-amber-400", timelineDot: "bg-amber-500 ring-amber-500/20",
      primary: "bg-amber-500"
    },
    zinc: { 
      text: "text-zinc-500", bg: "bg-zinc-500/10", border: "border-zinc-500/20", 
      badge: "bg-zinc-800 text-zinc-300 border-zinc-700", accentBg: "bg-zinc-500",
      glow: "shadow-zinc-500/10", terminalText: "text-zinc-300", timelineDot: "bg-zinc-500 ring-zinc-500/20",
      primary: "bg-zinc-500"
    },
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

  // Pure Clean Draggable Section Wrapper without any visual badges or overlays
  const makeDraggable = (secId: string, idx: number, content: React.ReactNode) => {
    const isDragging = canvasDraggedIndex === idx;
    const isTargeting = canvasDragOverIndex === idx;

    return (
      <div
        key={secId}
        draggable
        onDragStart={(e) => handleCanvasDragStart(e, idx)}
        onDragOver={(e) => handleCanvasDragOver(e, idx)}
        onDrop={(e) => handleCanvasDrop(e, idx)}
        className={`transition-all duration-200 ${
          isTargeting
            ? "ring-2 ring-primary bg-primary/5 rounded-2xl"
            : isDragging
            ? "opacity-30"
            : ""
        }`}
      >
        {content}
      </div>
    );
  };

  // Render Live Preview Canvas 100% IDENTICAL & ACCURATELY SIMULATING MOBILE VIEWPORT when previewDevice === 'mobile'
  const renderTemplateContent = () => {
    if (!profile) return null;

    const isDark = template === "developer" || template === "karnik_style";
    const isMobile = previewDevice === "mobile";

    return (
      <div className={`w-full min-h-full transition-colors duration-300 overflow-x-hidden portfolio-font-${fontFamily} portfolio-size-${fontSize} ${
        isDark ? "bg-zinc-950 text-zinc-100" : "bg-background text-foreground"
      }`}>
        
        {/* 1. TEMPLATE: MINIMALIST */}
        {template === "minimalist" && (
          <div className={`mx-auto text-center ${
            isMobile ? "px-4 py-6 space-y-6" : "max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-12"
          }`}>
            
            {/* Header Identity info */}
            <div className="space-y-4 text-center pb-6 border-b border-border/60">
              {showPhoto && (
                profile.profilePhotoUrl ? (
                  <div className={`${isMobile ? "w-20 h-20" : "w-24 h-24 sm:w-28 sm:h-28"} rounded-full border-2 border-border mx-auto overflow-hidden shadow-sm`}>
                    <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`${isMobile ? "w-20 h-20 text-xl" : "w-24 h-24 sm:w-28 sm:h-28 text-2xl sm:text-3xl"} rounded-full bg-secondary border border-border mx-auto flex items-center justify-center font-black uppercase text-foreground`}>
                    {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "U"}
                  </div>
                )
              )}

              <div className="space-y-2">
                <h1 className={`${isMobile ? "text-xl" : "text-2xl sm:text-3xl"} font-black uppercase tracking-tight text-foreground`}>
                  <InlineEdit value={profile.fullName} onChange={(val) => setProfile({ ...profile, fullName: val })} placeholder="Your Full Name" />
                </h1>
                <p className={`text-xs uppercase font-black tracking-widest ${activeTheme.text}`}>
                  <InlineEdit value={profile.headline} onChange={(val) => setProfile({ ...profile, headline: val })} placeholder="Your Professional Headline" />
                </p>
                {showEmail && profile.email && (
                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground font-semibold mt-1 break-all">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <InlineEdit value={profile.email} onChange={(val) => setProfile({ ...profile, email: val })} placeholder="email@example.com" />
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Draggable Sections */}
            <div className={`${isMobile ? "space-y-6" : "space-y-6 sm:space-y-8"} text-left`}>
              {sections.map((sec, idx) => {
                if (!sec.visible) return null;

                if (sec.id === "hero" && profile.bio) {
                  return makeDraggable("hero", idx, (
                    <div className="space-y-2">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">About / Identity</h2>
                      <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-medium">
                        <InlineEdit value={profile.bio} onChange={(val) => setProfile({ ...profile, bio: val })} multiline />
                      </p>
                    </div>
                  ));
                }

                if (sec.id === "skills" && profile.skills?.length > 0) {
                  return makeDraggable("skills", idx, (
                    <div className="space-y-3 pt-4 border-t border-border/40">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Expertise / Tech Stack</h2>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((skill: string, skIdx: number) => (
                          <span key={skIdx} className={`px-2.5 py-1 bg-secondary text-[10px] font-black uppercase tracking-wide rounded-xl border border-border/60 ${activeTheme.text}`}>
                            <InlineEdit value={skill} onChange={(val) => {
                              const updated = [...profile.skills]; updated[skIdx] = val; setProfile({ ...profile, skills: updated });
                            }} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "experience" && profile.experiences?.length > 0) {
                  return makeDraggable("experience", idx, (
                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Work History</h2>
                      <div className="space-y-4">
                        {profile.experiences.map((exp: any, expIdx: number) => (
                          <div key={expIdx} className={`flex ${isMobile ? "flex-col" : "flex-col sm:flex-row"} justify-between gap-2 p-4 bg-card border border-border/80 rounded-2xl shadow-sm`}>
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <h3 className="text-xs font-black uppercase tracking-tight text-foreground break-words">
                                <InlineEdit value={exp.title} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], title: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </h3>
                              <p className="text-[10px] text-muted-foreground font-semibold">
                                <InlineEdit value={exp.company} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], company: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </p>
                              <p className="text-xs text-foreground/75 leading-relaxed mt-2">
                                <InlineEdit value={exp.description} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], description: val }; setProfile({ ...profile, experiences: updated });
                                }} multiline />
                              </p>
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 self-start ${activeTheme.bg} ${activeTheme.text}`}>
                              <InlineEdit value={exp.duration} onChange={(val) => {
                                const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], duration: val }; setProfile({ ...profile, experiences: updated });
                              }} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "projects" && profile.academicProjects?.length > 0) {
                  return makeDraggable("projects", idx, (
                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Projects / Creations</h2>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-4`}>
                        {profile.academicProjects.map((proj: any, projIdx: number) => (
                          <div key={projIdx} className="p-4 bg-card border border-border rounded-2xl flex flex-col justify-between gap-4 shadow-sm">
                            <div className="space-y-2">
                              <h3 className="text-xs font-black uppercase tracking-tight text-foreground break-words">
                                <InlineEdit value={proj.title} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], title: val }; setProfile({ ...profile, academicProjects: updated });
                                }} />
                              </h3>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                                <InlineEdit value={proj.technologies} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], technologies: val }; setProfile({ ...profile, academicProjects: updated });
                                }} />
                              </p>
                              <p className="text-xs text-foreground/75 leading-relaxed">
                                <InlineEdit value={proj.description} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], description: val }; setProfile({ ...profile, academicProjects: updated });
                                }} multiline />
                              </p>
                            </div>
                            <div className="pt-2 border-t border-border/40 flex items-center gap-1.5 text-[10px] text-primary">
                              <ExternalLink className="w-3.5 h-3.5" />
                              <InlineEdit value={proj.link} onChange={(val) => {
                                const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], link: val }; setProfile({ ...profile, academicProjects: updated });
                              }} placeholder="Add Live Project URL" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "internships" && profile.internships?.length > 0) {
                  return makeDraggable("internships", idx, (
                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Internship Experience</h2>
                      <div className="space-y-3">
                        {profile.internships.map((intern: any, intIdx: number) => (
                          <div key={intIdx} className={`flex ${isMobile ? "flex-col items-start" : "flex-col sm:flex-row items-start sm:items-center"} justify-between gap-2 p-4 border border-border/60 bg-secondary/10 rounded-2xl`}>
                            <div className="space-y-0.5">
                              <h3 className="text-xs font-black uppercase text-foreground">
                                <InlineEdit value={intern.role} onChange={(val) => {
                                  const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], role: val }; setProfile({ ...profile, internships: updated });
                                }} />
                              </h3>
                              <p className="text-[10px] text-muted-foreground font-semibold">
                                <InlineEdit value={intern.company} onChange={(val) => {
                                  const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], company: val }; setProfile({ ...profile, internships: updated });
                                }} />
                              </p>
                            </div>
                            <span className="text-[9px] text-muted-foreground bg-secondary border border-border px-2.5 py-1 rounded-full font-black uppercase shrink-0">
                              <InlineEdit value={intern.duration} onChange={(val) => {
                                const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], duration: val }; setProfile({ ...profile, internships: updated });
                              }} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "certifications" && profile.certifications?.length > 0) {
                  return makeDraggable("certifications", idx, (
                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Accreditation / Certifications</h2>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-3`}>
                        {profile.certifications.map((cert: any, certIdx: number) => (
                          <div key={certIdx} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                            <Award className={`w-5 h-5 ${activeTheme.text} shrink-0`} />
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase truncate text-foreground">
                                <InlineEdit value={cert.name} onChange={(val) => {
                                  const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], name: val }; setProfile({ ...profile, certifications: updated });
                                }} />
                              </p>
                              <p className="text-[9px] text-muted-foreground font-semibold">
                                <InlineEdit value={cert.issuingOrganization} onChange={(val) => {
                                  const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], issuingOrganization: val }; setProfile({ ...profile, certifications: updated });
                                }} /> • <InlineEdit value={cert.issueDate} onChange={(val) => {
                                  const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], issueDate: val }; setProfile({ ...profile, certifications: updated });
                                }} />
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "contact") {
                  return makeDraggable("contact", idx, (
                    <div className="p-6 rounded-3xl bg-card border border-border text-center space-y-4 shadow-sm pt-4 border-t">
                      <h2 className="text-lg font-black uppercase tracking-tight text-foreground">Let's Connect & Work Together</h2>
                      {showEmail && profile.email && (
                        <p className="text-xs text-muted-foreground font-semibold break-all">
                          Send email directly to: <InlineEdit value={profile.email} onChange={(val) => setProfile({ ...profile, email: val })} />
                        </p>
                      )}
                    </div>
                  ));
                }

                return null;
              })}
            </div>
          </div>
        )}

        {/* 2. TEMPLATE: DEVELOPER CONSOLE / TERMINAL */}
        {template === "developer" && (
          <div className={`mx-auto font-mono ${
            isMobile ? "px-4 py-6 space-y-6" : "max-w-4xl px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8"
          }`}>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-3 right-3 text-[8px] text-zinc-500 font-bold uppercase select-none">~/console</div>
              <div className={`flex ${isMobile ? "flex-col text-center" : "flex-col sm:flex-row text-center sm:text-left"} items-center gap-4 sm:gap-6`}>
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
                <div className="space-y-2 min-w-0 flex-1 w-full">
                  <div className={`flex items-center ${isMobile ? "justify-center" : "justify-center sm:justify-start"} gap-2`}>
                    <div className={`w-2 h-2 rounded-full ${activeTheme.accentBg} animate-ping shrink-0`} />
                    <h1 className="text-base font-black text-white truncate">
                      <InlineEdit value={profile.fullName} onChange={(val) => setProfile({ ...profile, fullName: val })} />
                    </h1>
                  </div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${activeTheme.terminalText}`}>
                    <InlineEdit value={profile.headline} onChange={(val) => setProfile({ ...profile, headline: val })} />
                  </p>
                  {showEmail && profile.email && (
                    <div className="inline-flex items-center gap-2 text-[10px] text-zinc-500 break-all">
                      <Terminal className="w-3.5 h-3.5 shrink-0" /> cat email.txt // <InlineEdit value={profile.email} onChange={(val) => setProfile({ ...profile, email: val })} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {sections.map((sec, idx) => {
                if (!sec.visible) return null;

                if (sec.id === "hero" && profile.bio) {
                  return makeDraggable("hero", idx, (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2">
                      <p className="text-[9px] text-zinc-500 font-bold">cat bio.txt</p>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        <InlineEdit value={profile.bio} onChange={(val) => setProfile({ ...profile, bio: val })} multiline />
                      </p>
                    </div>
                  ));
                }

                if (sec.id === "skills" && profile.skills?.length > 0) {
                  return makeDraggable("skills", idx, (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
                      <p className="text-[9px] text-zinc-500 font-bold">ls skills/</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((sk: string, skIdx: number) => (
                          <span key={skIdx} className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${activeTheme.badge}`}>
                            <InlineEdit value={sk} onChange={(val) => {
                              const updated = [...profile.skills]; updated[skIdx] = val; setProfile({ ...profile, skills: updated });
                            }} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "experience" && profile.experiences?.length > 0) {
                  return makeDraggable("experience", idx, (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4">
                      <p className="text-[9px] text-zinc-500 font-bold">sh get_experience.sh</p>
                      <div className="space-y-4 border-l border-zinc-800 pl-4 ml-2">
                        {profile.experiences.map((exp: any, expIdx: number) => (
                          <div key={expIdx} className="space-y-1.5 relative">
                            <div className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full ${activeTheme.accentBg}`} />
                            <div className={`flex ${isMobile ? "flex-col items-start" : "flex-row justify-between items-center"} gap-1 text-xs`}>
                              <h3 className="font-bold text-white uppercase">
                                <InlineEdit value={exp.title} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], title: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </h3>
                              <span className="text-[9px] text-zinc-500 font-bold">
                                <InlineEdit value={exp.duration} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], duration: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 font-black">
                              <InlineEdit value={exp.company} onChange={(val) => {
                                const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], company: val }; setProfile({ ...profile, experiences: updated });
                              }} />
                            </p>
                            <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">
                              <InlineEdit value={exp.description} onChange={(val) => {
                                const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], description: val }; setProfile({ ...profile, experiences: updated });
                              }} multiline />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "projects" && profile.academicProjects?.length > 0) {
                  return makeDraggable("projects", idx, (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4">
                      <p className="text-[9px] text-zinc-500 font-bold">./run_projects_index</p>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-4`}>
                        {profile.academicProjects.map((proj: any, projIdx: number) => (
                          <div key={projIdx} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <FileCode className={`w-4 h-4 ${activeTheme.terminalText} shrink-0`} />
                                <h3 className="text-xs font-bold text-white uppercase break-words">
                                  <InlineEdit value={proj.title} onChange={(val) => {
                                    const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], title: val }; setProfile({ ...profile, academicProjects: updated });
                                  }} />
                                </h3>
                              </div>
                              <p className="text-[9px] text-zinc-500 uppercase">
                                <InlineEdit value={proj.technologies} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], technologies: val }; setProfile({ ...profile, academicProjects: updated });
                                }} />
                              </p>
                              <p className="text-[11px] text-zinc-400 leading-relaxed">
                                <InlineEdit value={proj.description} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], description: val }; setProfile({ ...profile, academicProjects: updated });
                                }} multiline />
                              </p>
                            </div>
                            <div className="pt-1 flex items-center gap-1.5 text-[9px] text-emerald-400">
                              <ExternalLink className="w-3 h-3" />
                              <InlineEdit value={proj.link} onChange={(val) => {
                                const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], link: val }; setProfile({ ...profile, academicProjects: updated });
                              }} placeholder="Add Live Project URL" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "internships" && profile.internships?.length > 0) {
                  return makeDraggable("internships", idx, (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4">
                      <p className="text-[9px] text-zinc-500 font-bold">cat internships.json</p>
                      <div className="space-y-3">
                        {profile.internships.map((intern: any, intIdx: number) => (
                          <div key={intIdx} className={`p-4 bg-zinc-900 border border-zinc-800/80 rounded-xl flex ${isMobile ? "flex-col items-start" : "flex-col sm:flex-row items-start sm:items-center"} justify-between gap-2`}>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-white">
                                <InlineEdit value={intern.role} onChange={(val) => {
                                  const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], role: val }; setProfile({ ...profile, internships: updated });
                                }} />
                              </p>
                              <p className="text-[10px] text-zinc-500 font-semibold">
                                <InlineEdit value={intern.company} onChange={(val) => {
                                  const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], company: val }; setProfile({ ...profile, internships: updated });
                                }} />
                              </p>
                            </div>
                            <span className="text-[9px] text-zinc-500 font-black">
                              <InlineEdit value={intern.duration} onChange={(val) => {
                                const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], duration: val }; setProfile({ ...profile, internships: updated });
                              }} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "certifications" && profile.certifications?.length > 0) {
                  return makeDraggable("certifications", idx, (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4">
                      <p className="text-[9px] text-zinc-500 font-bold">ls accreditation/</p>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-3 text-xs`}>
                        {profile.certifications.map((cert: any, certIdx: number) => (
                          <div key={certIdx} className="flex items-center gap-3 p-3 border border-zinc-800 bg-zinc-900/20 rounded-xl">
                            <CheckCircle className={`w-4 h-4 ${activeTheme.terminalText} shrink-0`} />
                            <div className="min-w-0">
                              <p className="font-bold text-white uppercase truncate">
                                <InlineEdit value={cert.name} onChange={(val) => {
                                  const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], name: val }; setProfile({ ...profile, certifications: updated });
                                }} />
                              </p>
                              <p className="text-[9px] text-zinc-500 mt-0.5">
                                <InlineEdit value={cert.issuingOrganization} onChange={(val) => {
                                  const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], issuingOrganization: val }; setProfile({ ...profile, certifications: updated });
                                }} /> • <InlineEdit value={cert.issueDate} onChange={(val) => {
                                  const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], issueDate: val }; setProfile({ ...profile, certifications: updated });
                                }} />
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "contact") {
                  return makeDraggable("contact", idx, (
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-center space-y-2 font-mono">
                      <p className="text-[9px] text-zinc-500 font-bold">echo $CONTACT_EMAIL</p>
                      {showEmail && profile.email && (
                        <p className={`text-xs font-bold ${activeTheme.terminalText} break-all`}>
                          <InlineEdit value={profile.email} onChange={(val) => setProfile({ ...profile, email: val })} />
                        </p>
                      )}
                    </div>
                  ));
                }

                return null;
              })}
            </div>
          </div>
        )}

        {/* 3. TEMPLATE: CYBER DARK PORTFOLIO */}
        {template === "karnik_style" && (
          <div className={`mx-auto bg-zinc-950 text-zinc-100 ${
            isMobile ? "px-4 py-6 space-y-6" : "max-w-4xl px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-12"
          }`}>
            <div className={`grid ${isMobile ? "grid-cols-1 text-center" : "grid-cols-1 md:grid-cols-12 text-center md:text-left"} gap-6 items-center`}>
              <div className={`${isMobile ? "col-span-1" : "md:col-span-7"} space-y-4`}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300">
                  <span className={`w-2 h-2 rounded-full ${activeTheme.accentBg} animate-ping`} /> {profile.headline || "Professional Portfolio"}
                </div>
                <div className="space-y-2">
                  <h1 className={`${isMobile ? "text-2xl" : "text-2xl sm:text-4xl"} font-black tracking-tight text-white leading-tight`}>
                    Hi, I'm <span className={activeTheme.text}><InlineEdit value={profile.fullName} onChange={(val) => setProfile({ ...profile, fullName: val })} /></span> 👋
                  </h1>
                  <p className="text-xs sm:text-base text-zinc-400 font-medium">
                    <InlineEdit value={profile.headline} onChange={(val) => setProfile({ ...profile, headline: val })} />
                  </p>
                </div>
                {profile.bio && (
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-xl mx-auto md:mx-0">
                    <InlineEdit value={profile.bio} onChange={(val) => setProfile({ ...profile, bio: val })} multiline />
                  </p>
                )}
              </div>
              <div className={`${isMobile ? "col-span-1" : "md:col-span-5"} flex justify-center`}>
                {showPhoto && (
                  profile.profilePhotoUrl ? (
                    <div className={`${isMobile ? "w-36 h-36" : "w-36 h-36 sm:w-56 sm:h-56"} rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl bg-zinc-900`}>
                      <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`${isMobile ? "w-36 h-36 text-2xl" : "w-36 h-36 sm:w-56 sm:h-56 text-2xl sm:text-3xl"} rounded-2xl ${activeTheme.bg} border border-zinc-800 flex items-center justify-center font-black text-white shadow-2xl bg-zinc-900`}>
                      <span>{profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "DEV"}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="space-y-6 sm:space-y-10">
              {sections.map((sec, idx) => {
                if (!sec.visible) return null;

                if (sec.id === "skills" && profile.skills?.length > 0) {
                  return makeDraggable("skills", idx, (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <h2 className="text-base font-bold tracking-tight text-white">Skills & Technologies</h2>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((sk: string, skIdx: number) => (
                          <div key={skIdx} className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-200 flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${activeTheme.accentBg}`} />
                            <InlineEdit value={sk} onChange={(val) => {
                              const updated = [...profile.skills]; updated[skIdx] = val; setProfile({ ...profile, skills: updated });
                            }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "experience" && profile.experiences?.length > 0) {
                  return makeDraggable("experience", idx, (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <h2 className="text-base font-bold tracking-tight text-white">Work Experience</h2>
                      <div className="space-y-4 border-l-2 border-zinc-800 pl-4 ml-1">
                        {profile.experiences.map((exp: any, expIdx: number) => (
                          <div key={expIdx} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-2">
                            <div className={`flex ${isMobile ? "flex-col items-start" : "flex-row justify-between items-center"} gap-1`}>
                              <h3 className="text-sm font-bold text-white">
                                <InlineEdit value={exp.title} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], title: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </h3>
                              <span className={`text-[9px] font-semibold px-2.5 py-1 rounded-full ${activeTheme.bg} ${activeTheme.text}`}>
                                <InlineEdit value={exp.duration} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], duration: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-zinc-400">
                              <InlineEdit value={exp.company} onChange={(val) => {
                                const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], company: val }; setProfile({ ...profile, experiences: updated });
                              }} />
                            </p>
                            <p className="text-xs text-zinc-300 leading-relaxed pt-1">
                              <InlineEdit value={exp.description} onChange={(val) => {
                                const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], description: val }; setProfile({ ...profile, experiences: updated });
                              }} multiline />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "projects" && profile.academicProjects?.length > 0) {
                  return makeDraggable("projects", idx, (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <h2 className="text-base font-bold tracking-tight text-white">Featured Projects</h2>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-4`}>
                        {profile.academicProjects.map((proj: any, projIdx: number) => (
                          <div key={projIdx} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                            <div className="space-y-2">
                              <h3 className="text-sm font-bold text-white">
                                <InlineEdit value={proj.title} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], title: val }; setProfile({ ...profile, academicProjects: updated });
                                }} />
                              </h3>
                              <p className="text-[9px] font-mono text-zinc-400">
                                <InlineEdit value={proj.technologies} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], technologies: val }; setProfile({ ...profile, academicProjects: updated });
                                }} />
                              </p>
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                <InlineEdit value={proj.description} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], description: val }; setProfile({ ...profile, academicProjects: updated });
                                }} multiline />
                              </p>
                            </div>
                            <div className="pt-2 border-t border-zinc-800 flex items-center gap-1.5 text-[10px] text-emerald-400">
                              <ExternalLink className="w-3.5 h-3.5" />
                              <InlineEdit value={proj.link} onChange={(val) => {
                                const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], link: val }; setProfile({ ...profile, academicProjects: updated });
                              }} placeholder="Add Project URL" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "certifications" && profile.certifications?.length > 0) {
                  return makeDraggable("certifications", idx, (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <h2 className="text-base font-bold tracking-tight text-white">Accreditation</h2>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-3`}>
                        {profile.certifications.map((cert: any, certIdx: number) => (
                          <div key={certIdx} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-white">
                                <InlineEdit value={cert.name} onChange={(val) => {
                                  const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], name: val }; setProfile({ ...profile, certifications: updated });
                                }} />
                              </p>
                              <p className="text-[10px] text-zinc-400">
                                <InlineEdit value={cert.issuingOrganization} onChange={(val) => {
                                  const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], issuingOrganization: val }; setProfile({ ...profile, certifications: updated });
                                }} />
                              </p>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-semibold">
                              <InlineEdit value={cert.issueDate} onChange={(val) => {
                                const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], issueDate: val }; setProfile({ ...profile, certifications: updated });
                              }} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "internships" && profile.internships?.length > 0) {
                  return makeDraggable("internships", idx, (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <h2 className="text-base font-bold tracking-tight text-white">Internships</h2>
                      <div className="space-y-3">
                        {profile.internships.map((intern: any, intIdx: number) => (
                          <div key={intIdx} className={`p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex ${isMobile ? "flex-col items-start" : "flex-row justify-between items-center"} gap-2 text-xs`}>
                            <div>
                              <p className="font-bold text-white">
                                <InlineEdit value={intern.role} onChange={(val) => {
                                  const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], role: val }; setProfile({ ...profile, internships: updated });
                                }} />
                              </p>
                              <p className="text-[10px] text-zinc-400">
                                <InlineEdit value={intern.company} onChange={(val) => {
                                  const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], company: val }; setProfile({ ...profile, internships: updated });
                                }} />
                              </p>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-semibold">
                              <InlineEdit value={intern.duration} onChange={(val) => {
                                const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], duration: val }; setProfile({ ...profile, internships: updated });
                              }} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "contact") {
                  return makeDraggable("contact", idx, (
                    <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-4">
                      <h2 className="text-xl font-bold text-white">Let's Connect & Work Together</h2>
                      {showEmail && profile.email && (
                        <p className="text-xs text-zinc-400 break-all">
                          Email: <InlineEdit value={profile.email} onChange={(val) => setProfile({ ...profile, email: val })} />
                        </p>
                      )}
                    </div>
                  ));
                }

                return null;
              })}
            </div>
          </div>
        )}

        {/* 4. TEMPLATE: MODERN HERO WEBSITE */}
        {template === "modern_hero" && (
          <div className={`mx-auto ${
            isMobile ? "px-4 py-6 space-y-8" : "max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-12"
          }`}>
            <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-xl border-b border-border/60 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl ${activeTheme.accentBg} text-white flex items-center justify-center font-black text-xs uppercase shrink-0`}>
                  {profile.fullName?.charAt(0) || "P"}
                </div>
                <span className="font-black text-xs uppercase text-foreground truncate">{profile.fullName}</span>
              </div>
              <div className="text-[10px] font-black uppercase text-muted-foreground shrink-0">Available for Hire</div>
            </header>

            <div className={`grid ${isMobile ? "grid-cols-1 text-center" : "grid-cols-1 md:grid-cols-12 text-center md:text-left"} gap-6 items-center`}>
              <div className={`${isMobile ? "col-span-1" : "md:col-span-7"} space-y-4`}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border text-[9px] font-black uppercase text-foreground">
                  <span className={`w-2 h-2 rounded-full ${activeTheme.accentBg} animate-ping`} /> Open for new opportunities
                </div>
                <div className="space-y-2">
                  <h1 className={`${isMobile ? "text-2xl" : "text-3xl sm:text-5xl"} font-black uppercase tracking-tight text-foreground leading-tight`}>
                    Building <span className={activeTheme.text}>Digital Experiences</span> & Software.
                  </h1>
                  <p className="text-xs text-muted-foreground font-semibold">
                    I am <strong className="text-foreground">{profile.fullName}</strong>, <InlineEdit value={profile.headline} onChange={(val) => setProfile({ ...profile, headline: val })} />
                  </p>
                </div>
              </div>
              <div className={`${isMobile ? "col-span-1" : "md:col-span-5"} flex justify-center`}>
                {showPhoto && (
                  profile.profilePhotoUrl ? (
                    <div className={`${isMobile ? "w-44 h-44" : "w-44 h-44 sm:w-56 sm:h-56"} rounded-3xl border-4 ${activeTheme.border} overflow-hidden shadow-2xl bg-card`}>
                      <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`${isMobile ? "w-44 h-44 text-3xl" : "w-44 h-44 sm:w-56 sm:h-56 text-3xl sm:text-4xl"} rounded-3xl ${activeTheme.bg} border-4 ${activeTheme.border} flex items-center justify-center font-black text-foreground shadow-2xl bg-card`}>
                      <span>{profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "DEV"}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Website Analytics & Career Metrics Card */}
            <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"} gap-3 sm:gap-4 p-4 sm:p-6 rounded-3xl bg-card border border-border/80 shadow-md`}>
              <div className="p-3 sm:p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
                <Briefcase className={`w-4 h-4 mx-auto ${activeTheme.text}`} />
                <p className={`text-xl sm:text-3xl font-black tracking-tight ${activeTheme.text}`}>
                  {profile.experiences?.length || 0}+
                </p>
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Experience</p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
                <FileCode className={`w-4 h-4 mx-auto ${activeTheme.text}`} />
                <p className={`text-xl sm:text-3xl font-black tracking-tight ${activeTheme.text}`}>
                  {profile.academicProjects?.length || 0}+
                </p>
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Projects</p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
                <Code className={`w-4 h-4 mx-auto ${activeTheme.text}`} />
                <p className={`text-xl sm:text-3xl font-black tracking-tight ${activeTheme.text}`}>
                  {profile.skills?.length || 0}+
                </p>
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Skills</p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
                <Award className={`w-4 h-4 mx-auto ${activeTheme.text}`} />
                <p className={`text-xl sm:text-3xl font-black tracking-tight ${activeTheme.text}`}>
                  {profile.certifications?.length || 0}+
                </p>
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Certifications</p>
              </div>
            </div>

            <div className="space-y-8">
              {sections.map((sec, idx) => {
                if (!sec.visible) return null;

                if (sec.id === "hero" && profile.bio) {
                  return makeDraggable("hero", idx, (
                    <div className="space-y-3 pt-4 border-t border-border">
                      <h2 className="text-xl font-black uppercase text-foreground">About Narrative</h2>
                      <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                        <InlineEdit value={profile.bio} onChange={(val) => setProfile({ ...profile, bio: val })} multiline />
                      </p>
                    </div>
                  ));
                }

                if (sec.id === "skills" && profile.skills?.length > 0) {
                  return makeDraggable("skills", idx, (
                    <div className="space-y-3 pt-4 border-t border-border">
                      <h2 className="text-xl font-black uppercase text-foreground">Tech Stack</h2>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((sk: string, skIdx: number) => (
                          <span key={skIdx} className={`px-3 py-1.5 bg-secondary text-[10px] font-black uppercase tracking-wide rounded-xl border border-border ${activeTheme.text}`}>
                            <InlineEdit value={sk} onChange={(val) => {
                              const updated = [...profile.skills]; updated[skIdx] = val; setProfile({ ...profile, skills: updated });
                            }} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "experience" && profile.experiences?.length > 0) {
                  return makeDraggable("experience", idx, (
                    <div className="space-y-6 pt-4 border-t border-border">
                      <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Work Experience</h2>
                      <div className="space-y-4">
                        {profile.experiences.map((exp: any, expIdx: number) => (
                          <div key={expIdx} className={`p-5 rounded-3xl bg-card border border-border flex ${isMobile ? "flex-col" : "flex-col md:flex-row"} justify-between gap-4`}>
                            <div className="space-y-2 flex-1">
                              <h3 className="text-sm font-black uppercase text-foreground">
                                <InlineEdit value={exp.title} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], title: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </h3>
                              <p className="text-xs font-bold text-muted-foreground">
                                <InlineEdit value={exp.company} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], company: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </p>
                              <p className="text-xs text-foreground/80 leading-relaxed pt-2">
                                <InlineEdit value={exp.description} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], description: val }; setProfile({ ...profile, experiences: updated });
                                }} multiline />
                              </p>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${activeTheme.bg} ${activeTheme.text} self-start`}>
                              <InlineEdit value={exp.duration} onChange={(val) => {
                                const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], duration: val }; setProfile({ ...profile, experiences: updated });
                              }} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "projects" && profile.academicProjects?.length > 0) {
                  return makeDraggable("projects", idx, (
                    <div className="space-y-6 pt-4 border-t border-border">
                      <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Featured Projects</h2>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} gap-4`}>
                        {profile.academicProjects.map((proj: any, projIdx: number) => (
                          <div key={projIdx} className="p-5 rounded-3xl bg-card border border-border flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                              <h3 className="text-sm font-black uppercase text-foreground">
                                <InlineEdit value={proj.title} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], title: val }; setProfile({ ...profile, academicProjects: updated });
                                }} />
                              </h3>
                              <p className="text-xs text-foreground/80 leading-relaxed">
                                <InlineEdit value={proj.description} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], description: val }; setProfile({ ...profile, academicProjects: updated });
                                }} multiline />
                              </p>
                            </div>
                            <div className="pt-2 border-t border-border flex items-center gap-1.5 text-xs font-black uppercase text-primary">
                              <ExternalLink className="w-4 h-4" />
                              <InlineEdit value={proj.link} onChange={(val) => {
                                const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], link: val }; setProfile({ ...profile, academicProjects: updated });
                              }} placeholder="Add Project URL" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "internships" && profile.internships?.length > 0) {
                  return makeDraggable("internships", idx, (
                    <div className="space-y-6 pt-4 border-t border-border">
                      <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Internship Experience</h2>
                      <div className="space-y-3">
                        {profile.internships.map((intern: any, intIdx: number) => (
                          <div key={intIdx} className={`p-5 rounded-2xl bg-card border border-border flex ${isMobile ? "flex-col items-start" : "flex-col sm:flex-row items-start sm:items-center"} justify-between gap-2`}>
                            <div>
                              <h3 className="text-sm font-black uppercase text-foreground">
                                <InlineEdit value={intern.role} onChange={(val) => {
                                  const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], role: val }; setProfile({ ...profile, internships: updated });
                                }} />
                              </h3>
                              <p className="text-xs text-muted-foreground font-semibold">
                                <InlineEdit value={intern.company} onChange={(val) => {
                                  const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], company: val }; setProfile({ ...profile, internships: updated });
                                }} />
                              </p>
                            </div>
                            <span className="text-[10px] font-black uppercase px-3 py-1 bg-secondary rounded-full border border-border">
                              <InlineEdit value={intern.duration} onChange={(val) => {
                                const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], duration: val }; setProfile({ ...profile, internships: updated });
                              }} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "certifications" && profile.certifications?.length > 0) {
                  return makeDraggable("certifications", idx, (
                    <div className="space-y-6 pt-4 border-t border-border">
                      <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Accreditation</h2>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-4`}>
                        {profile.certifications.map((cert: any, certIdx: number) => (
                          <div key={certIdx} className="p-5 rounded-2xl bg-card border border-border flex items-center gap-3">
                            <Award className={`w-5 h-5 ${activeTheme.text} shrink-0`} />
                            <div>
                              <h3 className="text-xs font-black uppercase text-foreground">
                                <InlineEdit value={cert.name} onChange={(val) => {
                                  const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], name: val }; setProfile({ ...profile, certifications: updated });
                                }} />
                              </h3>
                              <p className="text-[10px] text-muted-foreground font-bold">
                                <InlineEdit value={cert.issuingOrganization} onChange={(val) => {
                                  const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], issuingOrganization: val }; setProfile({ ...profile, certifications: updated });
                                }} /> • <InlineEdit value={cert.issueDate} onChange={(val) => {
                                  const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], issueDate: val }; setProfile({ ...profile, certifications: updated });
                                }} />
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "contact") {
                  return makeDraggable("contact", idx, (
                    <div className="p-6 rounded-3xl bg-card border border-border text-center space-y-4 shadow-xl">
                      <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Ready to Collaborate?</h2>
                      {showEmail && profile.email && (
                        <p className="text-xs text-muted-foreground font-semibold break-all">
                          Send email to: <InlineEdit value={profile.email} onChange={(val) => setProfile({ ...profile, email: val })} />
                        </p>
                      )}
                    </div>
                  ));
                }

                return null;
              })}
            </div>
          </div>
        )}

        {/* 5. TEMPLATE: CREATIVE BENTO GRID STUDIO */}
        {template === "bento_grid" && (
          <div className={`mx-auto ${
            isMobile ? "px-4 py-6 space-y-6" : "max-w-5xl px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8"
          }`}>
            <div className={`grid ${isMobile ? "grid-cols-1 gap-4" : "grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"}`}>
              
              <div className={`${isMobile ? "col-span-1 p-5" : "md:col-span-2 p-6 sm:p-8"} rounded-3xl border ${activeTheme.border} bg-card space-y-4 shadow-lg`}>
                <div className={`flex ${isMobile ? "flex-col items-start" : "flex-col sm:flex-row items-start sm:items-center"} gap-4`}>
                  {showPhoto && (
                    profile.profilePhotoUrl ? (
                      <div className="w-20 h-20 rounded-2xl border-2 border-border overflow-hidden shadow-md shrink-0">
                        <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-20 h-20 rounded-2xl ${activeTheme.bg} border border-border flex items-center justify-center text-2xl font-black uppercase ${activeTheme.text} shrink-0`}>
                        {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "BENTO"}
                      </div>
                    )
                  )}
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground">Bento Profile</span>
                    <h1 className="text-2xl font-black uppercase text-foreground">
                      <InlineEdit value={profile.fullName} onChange={(val) => setProfile({ ...profile, fullName: val })} />
                    </h1>
                    <p className={`text-xs font-black uppercase ${activeTheme.text}`}>
                      <InlineEdit value={profile.headline} onChange={(val) => setProfile({ ...profile, headline: val })} />
                    </p>
                  </div>
                </div>
                {profile.bio && (
                  <p className="text-xs text-foreground/80 leading-relaxed font-medium pt-2 border-t border-border/40">
                    <InlineEdit value={profile.bio} onChange={(val) => setProfile({ ...profile, bio: val })} multiline />
                  </p>
                )}
              </div>

              {sections.map((sec, idx) => {
                if (!sec.visible) return null;

                if (sec.id === "skills" && profile.skills?.length > 0) {
                  return makeDraggable("skills", idx, (
                    <div className="p-5 rounded-3xl border border-border bg-card space-y-4 flex flex-col justify-between shadow-sm">
                      <div className="space-y-3">
                        <h3 className={`text-xs font-black uppercase tracking-widest ${activeTheme.text} flex items-center gap-2`}><Code className="w-4 h-4 shrink-0" /> Skills Stack</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.skills.map((sk: string, skIdx: number) => (
                            <span key={skIdx} className="px-2.5 py-1 bg-secondary text-foreground text-[9px] font-black uppercase rounded-lg border border-border">
                              <InlineEdit value={sk} onChange={(val) => {
                                const updated = [...profile.skills]; updated[skIdx] = val; setProfile({ ...profile, skills: updated });
                              }} />
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "experience" && profile.experiences?.length > 0) {
                  return makeDraggable("experience", idx, (
                    <div className={`${isMobile ? "col-span-1 p-5" : "md:col-span-3 p-6 sm:p-8"} rounded-3xl border border-border bg-card space-y-6 shadow-sm`}>
                      <h3 className={`text-xs font-black uppercase tracking-widest ${activeTheme.text} flex items-center gap-2`}><Briefcase className="w-4 h-4 shrink-0" /> Experience Bento Stream</h3>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} gap-4`}>
                        {profile.experiences.map((exp: any, expIdx: number) => (
                          <div key={expIdx} className="p-4 bg-secondary/20 border border-border/80 rounded-2xl space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="text-xs font-black uppercase text-foreground">
                                <InlineEdit value={exp.title} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], title: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </h4>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${activeTheme.bg} ${activeTheme.text}`}>
                                <InlineEdit value={exp.duration} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], duration: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-bold">
                              <InlineEdit value={exp.company} onChange={(val) => {
                                const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], company: val }; setProfile({ ...profile, experiences: updated });
                              }} />
                            </p>
                            <p className="text-xs text-foreground/75 leading-relaxed pt-1">
                              <InlineEdit value={exp.description} onChange={(val) => {
                                const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], description: val }; setProfile({ ...profile, experiences: updated });
                              }} multiline />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "projects" && profile.academicProjects?.length > 0) {
                  return makeDraggable("projects", idx, (
                    <div className={`${isMobile ? "col-span-1 p-5" : "md:col-span-2 p-6 sm:p-8"} rounded-3xl border border-border bg-card space-y-6 shadow-sm`}>
                      <h3 className={`text-xs font-black uppercase tracking-widest ${activeTheme.text} flex items-center gap-2`}><FileCode className="w-4 h-4 shrink-0" /> Creations & Build Index</h3>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-4`}>
                        {profile.academicProjects.map((proj: any, projIdx: number) => (
                          <div key={projIdx} className="p-4 bg-secondary/30 border border-border/80 rounded-2xl space-y-2 flex flex-col justify-between">
                            <div className="space-y-1">
                              <h4 className="text-xs font-black uppercase text-foreground">
                                <InlineEdit value={proj.title} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], title: val }; setProfile({ ...profile, academicProjects: updated });
                                }} />
                              </h4>
                              <p className="text-xs text-foreground/75 leading-relaxed">
                                <InlineEdit value={proj.description} onChange={(val) => {
                                  const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], description: val }; setProfile({ ...profile, academicProjects: updated });
                                }} multiline />
                              </p>
                            </div>
                            <div className="pt-2 border-t border-border/40 flex items-center gap-1.5 text-[9px] font-black uppercase text-primary">
                              <ExternalLink className="w-3 h-3" />
                              <InlineEdit value={proj.link} onChange={(val) => {
                                const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], link: val }; setProfile({ ...profile, academicProjects: updated });
                              }} placeholder="Add Live Project URL" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "certifications" && profile.certifications?.length > 0) {
                  return makeDraggable("certifications", idx, (
                    <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                      <h3 className={`text-xs font-black uppercase tracking-widest ${activeTheme.text} flex items-center gap-2`}><Award className="w-4 h-4 shrink-0" /> Accreditation</h3>
                      <div className="space-y-3">
                        {profile.certifications.map((cert: any, certIdx: number) => (
                          <div key={certIdx} className="p-3 bg-secondary/30 border border-border/60 rounded-xl space-y-0.5">
                            <p className="text-xs font-black uppercase text-foreground">
                              <InlineEdit value={cert.name} onChange={(val) => {
                                const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], name: val }; setProfile({ ...profile, certifications: updated });
                              }} />
                            </p>
                            <p className="text-[9px] text-muted-foreground font-semibold">
                              <InlineEdit value={cert.issuingOrganization} onChange={(val) => {
                                const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], issuingOrganization: val }; setProfile({ ...profile, certifications: updated });
                              }} />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "internships" && profile.internships?.length > 0) {
                  return makeDraggable("internships", idx, (
                    <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                      <h3 className={`text-xs font-black uppercase tracking-widest ${activeTheme.text} flex items-center gap-2`}><Briefcase className="w-4 h-4 shrink-0" /> Internships</h3>
                      <div className="space-y-3">
                        {profile.internships.map((intern: any, intIdx: number) => (
                          <div key={intIdx} className="p-3 bg-secondary/30 border border-border/60 rounded-xl space-y-0.5">
                            <p className="text-xs font-black uppercase text-foreground">
                              <InlineEdit value={intern.role} onChange={(val) => {
                                const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], role: val }; setProfile({ ...profile, internships: updated });
                              }} />
                            </p>
                            <p className="text-[9px] text-muted-foreground font-semibold">
                              <InlineEdit value={intern.company} onChange={(val) => {
                                const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], company: val }; setProfile({ ...profile, internships: updated });
                              }} />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "contact") {
                  return makeDraggable("contact", idx, (
                    <div className={`${isMobile ? "col-span-1 p-5" : "md:col-span-3 p-8"} rounded-3xl border border-border bg-card text-center space-y-4 shadow-sm`}>
                      <h3 className="text-xl font-black uppercase text-foreground">Let's Connect</h3>
                      {showEmail && profile.email && (
                        <p className="text-xs text-muted-foreground font-semibold break-all">
                          <InlineEdit value={profile.email} onChange={(val) => setProfile({ ...profile, email: val })} />
                        </p>
                      )}
                    </div>
                  ));
                }

                return null;
              })}

            </div>
          </div>
        )}

        {/* 6. TEMPLATE: EXECUTIVE FORMAL */}
        {template === "executive" && (
          <div className={`mx-auto text-center text-foreground font-serif ${
            isMobile ? "px-4 py-6 space-y-6" : "max-w-3xl px-4 sm:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12"
          }`}>
            <div className="space-y-4 border-b border-border pb-8">
              {showPhoto && (
                profile.profilePhotoUrl ? (
                  <div className="w-20 h-20 rounded-full border-2 border-border mx-auto overflow-hidden shadow-md">
                    <img src={getPhotoUrl(profile.profilePhotoUrl)} alt={profile.fullName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-secondary border border-border mx-auto flex items-center justify-center text-xl font-black uppercase text-foreground">
                    {profile.fullName ? profile.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "EXEC"}
                  </div>
                )
              )}
              <h1 className="text-2xl font-light tracking-tight text-foreground">
                <InlineEdit value={profile.fullName} onChange={(val) => setProfile({ ...profile, fullName: val })} />
              </h1>
              <p className={`text-xs font-bold uppercase tracking-widest ${activeTheme.text}`}>
                <InlineEdit value={profile.headline} onChange={(val) => setProfile({ ...profile, headline: val })} />
              </p>
            </div>

            <div className="space-y-6 text-left">
              {sections.map((sec, idx) => {
                if (!sec.visible) return null;

                if (sec.id === "hero" && profile.bio) {
                  return makeDraggable("hero", idx, (
                    <div className="italic text-xs sm:text-sm text-foreground/80 leading-relaxed max-w-lg mx-auto text-center">
                      &ldquo;<InlineEdit value={profile.bio} onChange={(val) => setProfile({ ...profile, bio: val })} multiline />&rdquo;
                    </div>
                  ));
                }

                if (sec.id === "skills" && profile.skills?.length > 0) {
                  return makeDraggable("skills", idx, (
                    <div className="space-y-3 text-center">
                      <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${activeTheme.text}`}>Areas of Expertise</h3>
                      <div className="flex flex-wrap justify-center gap-1.5 max-w-xl mx-auto">
                        {profile.skills.map((sk: string, skIdx: number) => (
                          <span key={skIdx} className="px-3 py-1 bg-secondary text-foreground text-[10px] font-black uppercase tracking-wider rounded-lg border border-border/60">
                            <InlineEdit value={sk} onChange={(val) => {
                              const updated = [...profile.skills]; updated[skIdx] = val; setProfile({ ...profile, skills: updated });
                            }} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "experience" && profile.experiences?.length > 0) {
                  return makeDraggable("experience", idx, (
                    <div className="space-y-6 pt-6 border-t border-border">
                      <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Professional Experience</h3>
                      <div className="space-y-6 pl-4 border-l-2 border-border/60">
                        {profile.experiences.map((exp: any, expIdx: number) => (
                          <div key={expIdx} className="space-y-1.5 relative">
                            <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${activeTheme.accentBg}`} />
                            <div className={`flex ${isMobile ? "flex-col items-start" : "flex-row justify-between items-center"} gap-1`}>
                              <h4 className="text-xs sm:text-sm font-black text-foreground">
                                <InlineEdit value={exp.title} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], title: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </h4>
                              <span className="text-[10px] text-muted-foreground font-bold italic">
                                <InlineEdit value={exp.duration} onChange={(val) => {
                                  const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], duration: val }; setProfile({ ...profile, experiences: updated });
                                }} />
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-bold">
                              <InlineEdit value={exp.company} onChange={(val) => {
                                const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], company: val }; setProfile({ ...profile, experiences: updated });
                              }} />
                            </p>
                            <p className="text-xs text-foreground/75 leading-relaxed pt-1">
                              <InlineEdit value={exp.description} onChange={(val) => {
                                const updated = [...profile.experiences]; updated[expIdx] = { ...updated[expIdx], description: val }; setProfile({ ...profile, description: val });
                              }} multiline />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "projects" && profile.academicProjects?.length > 0) {
                  return makeDraggable("projects", idx, (
                    <div className="space-y-6 pt-6 border-t border-border">
                      <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Projects Portfolio</h3>
                      <div className="grid grid-cols-1 gap-6">
                        {profile.academicProjects.map((proj: any, projIdx: number) => (
                          <div key={projIdx} className="space-y-2 pb-4 border-b border-border/40 last:border-0">
                            <h4 className="text-xs font-black text-foreground uppercase tracking-tight">
                              <InlineEdit value={proj.title} onChange={(val) => {
                                const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], title: val }; setProfile({ ...profile, academicProjects: updated });
                              }} />
                            </h4>
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                              <InlineEdit value={proj.technologies} onChange={(val) => {
                                const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], technologies: val }; setProfile({ ...profile, academicProjects: updated });
                              }} />
                            </p>
                            <p className="text-xs text-foreground/75 leading-relaxed">
                              <InlineEdit value={proj.description} onChange={(val) => {
                                const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], description: val }; setProfile({ ...profile, academicProjects: updated });
                              }} multiline />
                            </p>
                            <div className="pt-1 flex items-center gap-1.5 text-[9px] font-black uppercase text-primary">
                              <ExternalLink className="w-3 h-3" />
                              <InlineEdit value={proj.link} onChange={(val) => {
                                const updated = [...profile.academicProjects]; updated[projIdx] = { ...updated[projIdx], link: val }; setProfile({ ...profile, academicProjects: updated });
                              }} placeholder="Add Live Project URL" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "internships" && profile.internships?.length > 0) {
                  return makeDraggable("internships", idx, (
                    <div className="space-y-6 pt-6 border-t border-border">
                      <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Internships</h3>
                      <div className="space-y-4 pl-4 border-l-2 border-border/60">
                        {profile.internships.map((intern: any, intIdx: number) => (
                          <div key={intIdx} className="space-y-1">
                            <h4 className="text-xs font-black text-foreground">
                              <InlineEdit value={intern.role} onChange={(val) => {
                                const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], role: val }; setProfile({ ...profile, internships: updated });
                              }} />
                            </h4>
                            <p className="text-[10px] text-muted-foreground font-bold">
                              <InlineEdit value={intern.company} onChange={(val) => {
                                const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], company: val }; setProfile({ ...profile, company: val });
                              }} /> • <InlineEdit value={intern.duration} onChange={(val) => {
                                const updated = [...profile.internships]; updated[intIdx] = { ...updated[intIdx], duration: val }; setProfile({ ...profile, duration: val });
                              }} />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "certifications" && profile.certifications?.length > 0) {
                  return makeDraggable("certifications", idx, (
                    <div className="space-y-6 pt-6 border-t border-border">
                      <h3 className="text-xs font-black uppercase tracking-[0.25em] border-b border-border pb-2 text-foreground">Accreditation</h3>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-4`}>
                        {profile.certifications.map((cert: any, certIdx: number) => (
                          <div key={certIdx} className="p-4 bg-secondary/20 border border-border/60 rounded-xl space-y-0.5">
                            <h4 className="text-xs font-black text-foreground">
                              <InlineEdit value={cert.name} onChange={(val) => {
                                const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], name: val }; setProfile({ ...profile, certifications: updated });
                              }} />
                            </h4>
                            <p className="text-[10px] text-muted-foreground font-bold">
                              <InlineEdit value={cert.issuingOrganization} onChange={(val) => {
                                const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], issuingOrganization: val }; setProfile({ ...profile, certifications: updated });
                              }} /> • <InlineEdit value={cert.issueDate} onChange={(val) => {
                                const updated = [...profile.certifications]; updated[certIdx] = { ...updated[certIdx], issueDate: val }; setProfile({ ...profile, certifications: updated });
                              }} />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }

                if (sec.id === "contact") {
                  return makeDraggable("contact", idx, (
                    <div className="p-6 rounded-2xl bg-secondary/30 border border-border text-center space-y-4">
                      <h3 className="text-lg font-black uppercase text-foreground">Executive Contact</h3>
                      {showEmail && profile.email && (
                        <p className="text-xs text-muted-foreground font-semibold break-all">
                          <InlineEdit value={profile.email} onChange={(val) => setProfile({ ...profile, email: val })} />
                        </p>
                      )}
                    </div>
                  ));
                }

                return null;
              })}
            </div>

          </div>
        )}

      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Upper header summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Portfolio Canvas & Live Builder
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            Customize templates, drag sections directly on preview, or edit text inline on the live canvas.
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
            <button
              onClick={openPreviewInNewPage}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in New Page
            </button>
            <Link 
              href={`/${profile.username}`}
              target="_blank"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> View Live Page
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Control Panel (span 5) */}
        <div className="lg:col-span-5 space-y-6 lg:max-h-[calc(100vh-170px)] lg:overflow-y-auto lg:pr-2 modern-scrollbar">
          
          {/* 1. Templates Selection */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Layout className="w-4 h-4 text-primary" /> 1. Select Template Layout
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: "karnik_style", name: "Cyber Dark Portfolio", desc: "Dark theme engineering layout (Hero, Grid, Tech Badges, Timeline, Projects, Certs, Contact)." },
                { id: "modern_hero", name: "Modern Portfolio Website", desc: "Full website layout with top navbar, hero showcase, stats bar, & work history." },
                { id: "bento_grid", name: "Creative Bento Studio", desc: "Modern studio layout with Bento cards for skills, projects, certs & experience." },
                { id: "minimalist", name: "Minimalist / Clean", desc: "Centered, elegant margins, clean typography focus across all sections." },
                { id: "developer", name: "Console IDE / Terminal", desc: "Tech badge focus, terminal console accents, and full code grid styles." },
                { id: "executive", name: "Executive / Formal Summary", desc: "Formal serif headers, structured columns, and executive timeline." },
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
                    <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Theme Colors selection */}
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

          {/* 3. Typography & Size Selection */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" /> 3. Typography & Display Options
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Font Family</p>
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

              {/* Element Visibility Toggles */}
              <div className="pt-3 border-t border-border/60 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Header Element Toggles</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowPhoto(!showPhoto)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold transition-all ${
                      showPhoto ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary text-muted-foreground border-border"
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Avatar Photo</span>
                    <span className="text-[9px] uppercase font-black">{showPhoto ? "On" : "Off"}</span>
                  </button>

                  <button
                    onClick={() => setShowEmail(!showEmail)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold transition-all ${
                      showEmail ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary text-muted-foreground border-border"
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Contact</span>
                    <span className="text-[9px] uppercase font-black">{showEmail ? "On" : "Off"}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* 4. Section Order & Visibility Controls */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Layout className="w-4 h-4 text-primary" /> 4. Section Reordering
              </h3>
              <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                Drag & Order
              </span>
            </div>

            <p className="text-[10px] text-muted-foreground font-medium">
              Drag sections here or directly on the preview canvas to reorder your portfolio sections.
            </p>

            <div className="space-y-3">
              {sections.map((sec, index) => (
                <div 
                  key={sec.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                    dragOverIndex === index ? "border-primary bg-primary/10 ring-2 ring-primary/20 scale-[1.01]" :
                    sec.visible ? "bg-secondary/20 border-border/80" : "bg-secondary/10 border-border/40 opacity-60"
                  }`}
                >
                  <div className="p-3.5 flex items-center justify-between gap-3 bg-secondary/30">
                    <div className="flex items-center gap-2.5">
                      <button 
                        className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-secondary rounded-lg text-muted-foreground touch-none min-w-[32px] flex items-center justify-center"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground/70" />
                      </button>

                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveSection(index, "up")}
                          disabled={index === 0}
                          className="p-0.5 hover:bg-secondary rounded text-muted-foreground disabled:opacity-30 flex items-center justify-center"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveSection(index, "down")}
                          disabled={index === sections.length - 1}
                          className="p-0.5 hover:bg-secondary rounded text-muted-foreground disabled:opacity-30 flex items-center justify-center"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-foreground">{sec.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSectionVisibility(sec.id)}
                        className={`p-2 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                          sec.visible 
                            ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
                            : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                        }`}
                        title={sec.visible ? "Hide section" : "Show section"}
                      >
                        {sec.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{sec.visible ? "Visible" : "Hidden"}</span>
                      </button>

                      {sec.id !== "contact" && (
                        <button
                          onClick={() => setExpandedSection(expandedSection === sec.id ? null : sec.id)}
                          className={`p-2 rounded-xl border transition-all ${
                            expandedSection === sec.id 
                              ? "bg-foreground text-background border-transparent" 
                              : "bg-secondary text-foreground border-border hover:bg-secondary/80"
                          }`}
                          title="Expand side form"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Form Control Side Panel */}
                  {expandedSection === sec.id && (
                    <div className="p-4 bg-card border-t border-border/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      {sec.id === "hero" && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Full Name</label>
                            <input
                              type="text"
                              value={profile?.fullName || ""}
                              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                              className="w-full mt-1 p-2 bg-secondary/50 border border-border rounded-xl text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Headline</label>
                            <input
                              type="text"
                              value={profile?.headline || ""}
                              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                              className="w-full mt-1 p-2 bg-secondary/50 border border-border rounded-xl text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Bio Statement</label>
                            <textarea
                              value={profile?.bio || ""}
                              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                              rows={3}
                              className="w-full mt-1 p-2 bg-secondary/50 border border-border rounded-xl text-xs font-medium resize-none"
                            />
                          </div>
                        </div>
                      )}

                      {sec.id === "skills" && (
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-muted-foreground">Skills & Technologies</label>
                          <div className="flex flex-wrap gap-1.5">
                            {(profile?.skills || []).map((sk: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary text-foreground text-xs font-bold rounded-lg border border-border">
                                {sk}
                                <button 
                                  onClick={() => {
                                    const updated = profile.skills.filter((_: any, i: number) => i !== idx);
                                    setProfile({ ...profile, skills: updated });
                                  }}
                                  className="hover:text-destructive text-muted-foreground ml-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              id="new-skill-input"
                              placeholder="Add skill (e.g. React, Java)..."
                              className="flex-1 p-2 bg-secondary/50 border border-border rounded-xl text-xs font-medium"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const input = e.currentTarget;
                                  if (input.value.trim()) {
                                    setProfile({ ...profile, skills: [...(profile.skills || []), input.value.trim()] });
                                    input.value = "";
                                  }
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById("new-skill-input") as HTMLInputElement;
                                if (input && input.value.trim()) {
                                  setProfile({ ...profile, skills: [...(profile.skills || []), input.value.trim()] });
                                  input.value = "";
                                }
                              }}
                              className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>

          {/* Action Publish button */}
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4 bg-foreground hover:bg-foreground/95 disabled:opacity-50 text-background text-xs font-black uppercase tracking-widest rounded-3xl transition-all shadow-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Publishing Canvas..." : "Publish Canvas Updates"}
          </button>
        </div>

        {/* Right Canvas Live Preview Column (span 7) */}
        <div className="lg:col-span-7 space-y-4 lg:max-h-[calc(100vh-170px)] lg:overflow-y-auto lg:pr-2 modern-scrollbar">
          
          {/* Live Preview Header Toolbar */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Live Canvas Preview
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Responsive Device Switcher */}
              <div className="flex items-center gap-1 bg-secondary p-1 rounded-xl border border-border">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    previewDevice === "desktop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[9px] uppercase font-black">Desktop</span>
                </button>
                <button
                  onClick={() => setPreviewDevice("tablet")}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    previewDevice === "tablet" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Tablet View"
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[9px] uppercase font-black">Tablet</span>
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    previewDevice === "mobile" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[9px] uppercase font-black">Mobile</span>
                </button>
              </div>

              {/* Open in New Tab Button */}
              <button
                onClick={openPreviewInNewPage}
                className="p-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                title="Open Preview in New Tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[9px] uppercase font-black">New Tab</span>
              </button>

              {/* Full Screen Expand Modal Toggle */}
              <button
                onClick={() => setFullScreenModal(true)}
                className="p-2 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-foreground text-xs font-bold flex items-center gap-1 transition-all"
                title="Expand Full Screen Live View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[9px] uppercase font-black">Full View</span>
              </button>
            </div>
          </div>

          {/* Interactive Responsive Grid Canvas Frame */}
          <div className={`w-full transition-all duration-300 mx-auto ${
            previewDevice === "mobile" 
              ? "max-w-[375px] rounded-[2.5rem] border-8 border-zinc-800 shadow-2xl overflow-hidden" 
              : previewDevice === "tablet"
              ? "max-w-[720px] rounded-3xl border-4 border-border shadow-xl overflow-hidden"
              : "w-full rounded-3xl border border-border shadow-lg"
          }`}>
            <div className="w-full min-h-[600px] max-h-[800px] overflow-y-auto modern-scrollbar transition-colors duration-300">
              {renderTemplateContent()}
            </div>
          </div>

        </div>

      </div>

      {/* FULL SCREEN RESPONSIVE PREVIEW MODAL */}
      {fullScreenModal && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-2xl flex flex-col p-4 sm:p-8 animate-in fade-in duration-200">
          
          {/* Modal Top Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                  Full View Canvas & Live Template Tester
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Testing active template: <strong className="text-foreground uppercase">{
                    {
                      karnik_style: "Cyber Dark Portfolio",
                      modern_hero: "Modern Portfolio Website",
                      bento_grid: "Creative Bento Studio",
                      minimalist: "Minimalist / Clean",
                      developer: "Console IDE / Terminal",
                      executive: "Executive / Formal Summary",
                    }[template] || template
                  }</strong> ({themeColor} theme)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Device Selector in Modal */}
              <div className="flex items-center gap-1 bg-secondary p-1 rounded-xl border border-border">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    previewDevice === "desktop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop
                </button>
                <button
                  onClick={() => setPreviewDevice("tablet")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    previewDevice === "tablet" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Tablet className="w-3.5 h-3.5" /> Tablet
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    previewDevice === "mobile" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile
                </button>
              </div>

              {/* Open in New Page Button */}
              <button
                onClick={openPreviewInNewPage}
                className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl font-bold flex items-center gap-1.5 text-xs"
              >
                <ExternalLink className="w-4 h-4" /> Open New Tab
              </button>

              {/* Close Button */}
              <button
                onClick={() => setFullScreenModal(false)}
                className="p-2.5 bg-foreground text-background rounded-xl hover:opacity-90 transition-all font-bold flex items-center gap-1 text-xs"
              >
                <X className="w-4 h-4" /> Close Full View
              </button>
            </div>
          </div>

          {/* Modal Scrollable Canvas Body */}
          <div className="flex-1 overflow-y-auto py-6 modern-scrollbar flex justify-center">
            <div className={`transition-all duration-300 w-full ${
              previewDevice === "mobile" 
                ? "max-w-[375px] rounded-[2.5rem] border-8 border-zinc-800 shadow-2xl overflow-hidden h-fit min-h-[750px]" 
                : previewDevice === "tablet"
                ? "max-w-[768px] rounded-3xl border-4 border-border shadow-2xl overflow-hidden h-fit min-h-[850px]"
                : "max-w-6xl rounded-3xl border border-border shadow-2xl overflow-hidden h-fit min-h-[900px]"
            }`}>
              {renderTemplateContent()}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
