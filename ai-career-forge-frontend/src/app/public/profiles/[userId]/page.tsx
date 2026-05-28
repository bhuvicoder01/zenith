"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  Briefcase, MapPin, Award, BookOpen, ExternalLink, 
  ArrowLeft, Shield, Calendar, Terminal, GraduationCap,
  Loader2, Mail, MessageSquare
} from "lucide-react";
import { useTheme } from "next-themes";
import api, { BACKEND_URL } from "@/lib/api";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";

interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

interface AcademicProject {
  title: string;
  technologies: string;
  description: string;
  link?: string;
}

interface Certification {
  name: string;
  issuingOrganization: string;
  issueDate: string;
}

interface Internship {
  role: string;
  company: string;
  duration: string;
  description: string;
}

interface PublicProfile {
  userId: string;
  email?: string;
  fullName: string;
  headline: string;
  bio: string;
  profilePhotoUrl: string;
  coverImageUrl: string;
  skills: string[];
  experiences: Experience[];
  academicProjects: AcademicProject[];
  certifications: Certification[];
  internships: Internship[];
}

export default function PublicProfileDetailPage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

  const [connStatus, setConnStatus] = useState<string>("NONE");
  const [connId, setConnId] = useState<string | null>(null);
  const [connLoading, setConnLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchConnectionStatus = async () => {
      if (!isAuthenticated || !user?.id || !userId || user.id === userId) return;
      setConnLoading(true);
      try {
        const response = await api.get(`/connections/status/${userId}`);
        setConnStatus(response.data.status);
        setConnId(response.data.connectionId);
      } catch (err) {
        console.error("Failed to fetch connection status:", err);
      } finally {
        setConnLoading(false);
      }
    };

    fetchConnectionStatus();
  }, [userId, isAuthenticated, user?.id]);

  const handleConnect = async () => {
    if (!isAuthenticated) return;
    setConnLoading(true);
    try {
      const response = await api.post(`/connections/request/${userId}`);
      setConnStatus("PENDING_SENT");
      setConnId(response.data.id);
      toast.success("Connection request sent!");
    } catch (err) {
      console.error("Failed to send connection request:", err);
      toast.error("Failed to send connection request");
    } finally {
      setConnLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!connId) return;
    setConnLoading(true);
    try {
      await api.post(`/connections/accept/${connId}`);
      setConnStatus("CONNECTED");
      toast.success("Connection accepted!");
    } catch (err) {
      console.error("Failed to accept connection:", err);
      toast.error("Failed to accept connection");
    } finally {
      setConnLoading(false);
    }
  };

  const handleReject = async () => {
    if (!connId) return;
    setConnLoading(true);
    try {
      await api.post(`/connections/reject/${connId}`);
      setConnStatus("NONE");
      setConnId(null);
      toast.success("Connection request ignored.");
    } catch (err) {
      console.error("Failed to reject connection:", err);
      toast.error("Failed to ignore request");
    } finally {
      setConnLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connId) return;
    if (!confirm("Are you sure you want to remove this connection?")) return;
    setConnLoading(true);
    try {
      await api.delete(`/connections/${connId}`);
      setConnStatus("NONE");
      setConnId(null);
      toast.success("Connection removed.");
    } catch (err) {
      console.error("Failed to remove connection:", err);
      toast.error("Failed to remove connection");
    } finally {
      setConnLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/profile/public/${userId}`);
        setProfile(response.data);
      } catch (err: any) {
        console.error("Failed to fetch public profile details:", err);
        if (err.response && err.response.status === 404) {
          setError("Profile is private or does not exist.");
        } else {
          setError("Failed to load profile details.");
        }
      } finally {
        setLoading(false);
      }
    };
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  // Helper to proxy or return image urls
  const getImageUrl = (url: string) => {
    if (!url) return null;
    if (url.startsWith("http")) {
      return url;
    }
    return `${BACKEND_URL}/public/assets/${url}`;
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">Initializing profile session...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-card border border-border p-10 rounded-3xl space-y-6 shadow-xl">
          <Shield className="w-16 h-16 text-destructive mx-auto opacity-80" />
          <h2 className="text-3xl font-black italic tracking-tight uppercase">Access Restricted</h2>
          <p className="text-muted-foreground leading-relaxed">
            {error || "This profile is private or not available."}
          </p>
          <Link 
            href="/public/profiles" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const coverUrl = getImageUrl(profile.coverImageUrl);
  const photoUrl = getImageUrl(profile.profilePhotoUrl);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src={resolvedTheme === 'dark' ? '/zenith-dark.png' : '/zenith-light.png'} 
                alt="Zenith" 
                className="w-full h-full object-contain" 
              />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">ZENITH</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <Link href="/public/jobs" className="hover:text-foreground transition-colors">Explore Jobs</Link>
            <Link href="/public/profiles" className="hover:text-foreground transition-colors">Explore Profiles</Link>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard" className="px-5 py-2.5 bg-foreground text-background rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">
                  Login
                </Link>
                <Link href="/auth/register" className="px-5 py-2.5 bg-foreground text-background rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Profile Cover & Card */}
      <div className="max-w-5xl mx-auto px-6 pt-12 space-y-8">
        {/* <Link 
          href="/public/profiles" 
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Search
        </Link> */}

        {/* Profile Card Container */}
        <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
          {/* Cover Banner */}
          <div className="h-56 w-full bg-secondary relative overflow-hidden">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-600/10 via-primary/5 to-secondary" />
            )}
          </div>

          {/* Profile Header Info */}
          <div className="px-8 md:px-12 pb-12 relative">
            {/* Profile Avatar Container */}
            <div className="h-28 w-28 rounded-3xl border-4 border-card overflow-hidden bg-muted flex items-center justify-center shadow-lg -mt-14 relative z-10">
              {photoUrl ? (
                <img src={photoUrl} alt={profile.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="font-bold text-3xl text-muted-foreground">{getInitials(profile.fullName)}</div>
              )}
            </div>

            {/* Info Grid */}
            <div className="mt-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">{profile.fullName}</h1>
                <p className="text-primary font-bold text-lg md:text-xl flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" /> {profile.headline || "Specialist"}
                </p>
                {profile.email && (
                  <p className="text-muted-foreground text-sm flex items-center gap-2 pt-1 font-semibold animate-in fade-in duration-200">
                    <Mail className="w-4 h-4 text-muted-foreground" /> {profile.email}
                  </p>
                )}
              </div>
              {/* Connection Buttons */}
              <div className="flex items-center gap-3">
                {isAuthenticated && user?.id !== userId && (
                  <Link 
                    href={`/dashboard/messages?userId=${userId}`}
                    className="px-6 py-3.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-full text-xs font-black uppercase tracking-widest transition-all text-center flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </Link>
                )}
                {!isAuthenticated ? (
                  <Link 
                    href="/auth/register"
                    className="px-6 py-3.5 bg-foreground text-background rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all text-center"
                  >
                    Connect on Zenith
                  </Link>
                ) : user?.id === userId ? (
                  <Link 
                    href="/dashboard/profile"
                    className="px-6 py-3.5 bg-secondary text-secondary-foreground border border-border rounded-full text-xs font-black uppercase tracking-widest hover:bg-secondary/80 transition-all text-center"
                  >
                    Edit Profile
                  </Link>
                ) : connLoading ? (
                  <button 
                    disabled 
                    className="px-6 py-3.5 bg-secondary text-secondary-foreground border border-border rounded-full text-xs font-black uppercase tracking-widest opacity-50 cursor-not-allowed text-center flex items-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading
                  </button>
                ) : connStatus === "CONNECTED" ? (
                  <button 
                    onClick={handleDisconnect}
                    className="px-6 py-3.5 bg-secondary text-destructive border border-border hover:bg-destructive/10 hover:border-destructive/30 rounded-full text-xs font-black uppercase tracking-widest transition-all text-center animate-in fade-in duration-200"
                  >
                    Disconnect
                  </button>
                ) : connStatus === "PENDING_SENT" ? (
                  <button 
                    disabled 
                    className="px-6 py-3.5 bg-secondary text-muted-foreground border border-border rounded-full text-xs font-black uppercase tracking-widest opacity-80 cursor-default text-center animate-in fade-in duration-200"
                  >
                    Request Sent
                  </button>
                ) : connStatus === "PENDING_RECEIVED" ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-200">
                    <button 
                      onClick={handleAccept}
                      className="px-5 py-3 bg-foreground text-background rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all text-center"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={handleReject}
                      className="px-5 py-3 bg-secondary text-destructive border border-border hover:bg-destructive/10 rounded-full text-xs font-black uppercase tracking-widest transition-all text-center"
                    >
                      Ignore
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={handleConnect}
                    className="px-6 py-3.5 bg-foreground text-background rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all text-center animate-in fade-in duration-200"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>

            {/* Bio Section */}
            {profile.bio && (
              <div className="mt-8 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">About Me</h3>
                <p className="text-muted-foreground leading-relaxed text-base whitespace-pre-line max-w-3xl">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Skills Badges */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-8 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Expertise</h3>
                <div className="flex flex-wrap gap-2.5 max-w-3xl">
                  {profile.skills.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-3.5 py-1.5 bg-secondary text-foreground rounded-xl text-xs font-semibold border border-border"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Extended Profile Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Main Experience/Project Details */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Experiences */}
            {profile.experiences && profile.experiences.length > 0 && (
              <div className="bg-card border border-border rounded-[2rem] p-8 md:p-10 space-y-8">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <Briefcase className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-black uppercase tracking-tight">Work History</h2>
                </div>
                <div className="space-y-8 relative pl-6 border-l-2 border-border/80">
                  {profile.experiences.map((exp, index) => (
                    <div key={index} className="space-y-3 relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-card" />
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                        <h4 className="text-lg font-bold text-foreground leading-tight">{exp.title}</h4>
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 bg-secondary px-2.5 py-1 rounded-md border border-border/50">
                          {exp.duration}
                        </span>
                      </div>
                      <p className="text-primary font-semibold text-sm">{exp.company}</p>
                      {exp.description && (
                        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Internships */}
            {profile.internships && profile.internships.length > 0 && (
              <div className="bg-card border border-border rounded-[2rem] p-8 md:p-10 space-y-8">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <GraduationCap className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-black uppercase tracking-tight">Internships</h2>
                </div>
                <div className="space-y-8 relative pl-6 border-l-2 border-border/80">
                  {profile.internships.map((intern, index) => (
                    <div key={index} className="space-y-3 relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-card" />
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                        <h4 className="text-lg font-bold text-foreground leading-tight">{intern.role}</h4>
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 bg-secondary px-2.5 py-1 rounded-md border border-border/50">
                          {intern.duration}
                        </span>
                      </div>
                      <p className="text-primary font-semibold text-sm">{intern.company}</p>
                      {intern.description && (
                        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{intern.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {profile.academicProjects && profile.academicProjects.length > 0 && (
              <div className="bg-card border border-border rounded-[2rem] p-8 md:p-10 space-y-8">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <Terminal className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-black uppercase tracking-tight">Academic & Side Projects</h2>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {profile.academicProjects.map((project, index) => (
                    <div key={index} className="border border-border/60 rounded-2xl p-6 space-y-4 bg-secondary/10 hover:border-primary/20 transition-all flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{project.title}</h4>
                          {project.link && (
                            <a 
                              href={project.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors p-1 bg-secondary rounded-lg border border-border"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        {project.technologies && (
                          <p className="text-xs font-black uppercase tracking-widest text-primary/80">{project.technologies}</p>
                        )}
                        {project.description && (
                          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{project.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar / Certifications */}
          <div className="space-y-8">
            {/* Certifications */}
            {profile.certifications && profile.certifications.length > 0 && (
              <div className="bg-card border border-border rounded-[2rem] p-8 space-y-6">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Award className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-black uppercase tracking-tight">Certificates</h2>
                </div>
                <div className="space-y-4">
                  {profile.certifications.map((cert, index) => (
                    <div key={index} className="space-y-1">
                      <h4 className="font-bold text-foreground leading-tight text-sm">{cert.name}</h4>
                      <p className="text-muted-foreground text-xs">{cert.issuingOrganization}</p>
                      {cert.issueDate && (
                        <p className="text-muted-foreground text-[10px] uppercase font-black tracking-widest flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Issued {cert.issueDate}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
