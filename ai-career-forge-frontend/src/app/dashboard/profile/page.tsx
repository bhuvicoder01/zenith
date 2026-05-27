"use client";

import { useEffect, useState, useRef } from "react";
import { 
  User, Mail, Briefcase, MapPin, Camera, Save, Plus, Trash2, X, Eye, EyeOff,
  ChevronRight, BrainCircuit, History, GraduationCap, Code2, Loader2,
  ExternalLink, Globe, Award, Sparkles, Building2, Calendar, FileText, UploadCloud, CheckCircle2
} from "lucide-react";
import api from "@/lib/api";
import Image from "next/image";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";

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
  link: string;
}

interface Certification {
  name: string;
  issuingOrganization: string;
  issueDate: string;
}

interface UserProfile {
  fullName: string;
  headline: string;
  bio: string;
  profilePhotoUrl: string;
  coverImageUrl: string;
  resumeS3Url: string;
  skills: string[];
  experiences: Experience[];
  internships: any[];
  academicProjects: AcademicProject[];
  certifications: Certification[];
  preferredLocation: string;
  preferredSalary: string;
  preferredLifestyle: string;
  settings?: {
    matchingPrecision: number;
    aggressiveEnrichment: boolean;
    emailNotifications: boolean;
    jobMatchAlerts: boolean;
    hideProfile: boolean;
    anonymizeData: boolean;
    showEmail?: boolean;
  };
}

interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [isCoverCropModalOpen, setIsCoverCropModalOpen] = useState(false);
  const [isResumeSyncModalOpen, setIsResumeSyncModalOpen] = useState(false);
  const [isGeneratingAiCover, setIsGeneratingAiCover] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [coverToCrop, setCoverToCrop] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<UserProfile | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [canRenderCropper, setCanRenderCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
  

  useEffect(() => {
    if (isCropModalOpen || isCoverCropModalOpen) {
      const timer = setTimeout(() => setCanRenderCropper(true), 200);
      return () => {
        clearTimeout(timer);
        setCanRenderCropper(false);
      };
    }
  }, [isCropModalOpen, isCoverCropModalOpen]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile");
      setProfile(res.data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      toast.error("Could not load profile data");
    } finally {
      setLoading(false);
    }
  };

  const hydrateUrl = (url: string) => {
    if (!url || !url.startsWith("http")) return url;
    if (url.includes("pollinations.ai") || url.includes("image.pollinations.ai") || url.includes("unsplash.com")) {
      return `${BACKEND_URL}/public/external/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await api.put("/profile", profile);
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error("Failed to update profile:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageToCrop(reader.result as string);
      setIsCropModalOpen(true);
    });
    reader.readAsDataURL(file);
  };

  const onMediaLoaded = (mediaSize: any) => {
    console.log("Media loaded successfully:", mediaSize);
  };

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    if (!croppedAreaPixels || isNaN(croppedAreaPixels.width)) {
      console.warn("Received NaN from cropper, ignoring...");
      return;
    }
    console.log("Crop complete:", croppedAreaPixels);
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    console.log("handleCropSave triggered. Current pixels:", croppedAreaPixels);
    if (!imageToCrop || !croppedAreaPixels || !croppedAreaPixels.width || isNaN(croppedAreaPixels.width)) {
      console.warn("Invalid crop state:", { imageToCrop: !!imageToCrop, croppedAreaPixels });
      toast.error("Please wait for the cropper to initialize...");
      return;
    }

    setUploading(true);
    try {
      console.log("Attempting to crop image...");
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      console.log("Cropped blob generated:", croppedBlob);
      if (!croppedBlob) throw new Error("Failed to crop image");

      const formData = new FormData();
      formData.append("file", croppedBlob, "profile-photo.jpg");

      console.log("Uploading photo to server...");
      const res = await api.post("/profile/photo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("Upload response:", res.data);
      
      setProfile(prev => prev ? { ...prev, profilePhotoUrl: res.data.profilePhotoUrl } : null);
      toast.success("Profile photo updated");
      setIsCropModalOpen(false);
      setImageToCrop(null);
    } catch (err) {
      console.error("Failed to upload cropped photo:", err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoDelete = async () => {
    if (!profile) return;
    try {
      setUploading(true);
      const updatedProfile = { ...profile, profilePhotoUrl: "" };
      await api.put("/profile", updatedProfile);
      setProfile(updatedProfile);
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error("Failed to remove photo");
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setCoverToCrop(reader.result as string);
      setIsCoverCropModalOpen(true);
      setIsCoverModalOpen(false);
    });
    reader.readAsDataURL(file);
  };

  const handleCoverCropSave = async () => {
    if (!coverToCrop || !croppedAreaPixels || !croppedAreaPixels.width || isNaN(croppedAreaPixels.width)) {
      toast.error("Please wait for the cropper to initialize...");
      return;
    }

    setUploading(true);
    try {
      const croppedBlob = await getCroppedImg(coverToCrop, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to crop cover");

      const formData = new FormData();
      formData.append("file", croppedBlob, "cover-image.jpg");

      const res = await api.post("/profile/cover", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setProfile(prev => prev ? { ...prev, coverImageUrl: res.data.coverImageUrl } : null);
      toast.success("Cover image updated");
      setIsCoverCropModalOpen(false);
      setCoverToCrop(null);
    } catch (err) {
      toast.error("Failed to upload cropped cover");
    } finally {
      setUploading(false);
    }
  };

  const handlePredefinedCover = async (url: string) => {
    setUploading(true);
    try {
      const res = await api.post("/profile/cover/predefined", { imageUrl: url });
      setProfile(prev => prev ? { ...prev, coverImageUrl: res.data.coverImageUrl } : null);
      toast.success("Cover updated");
      setIsCoverModalOpen(false);
    } catch (err) {
      toast.error("Failed to set cover");
    } finally {
      setUploading(false);
    }
  };

  const [isAiCooldown, setIsAiCooldown] = useState(false);

  const handleAiCover = async (style: string) => {
    if (isAiCooldown) {
      toast.error("Please wait a moment before generating again");
      return;
    }
    setIsGeneratingAiCover(true);
    try {
      const res = await api.post("/profile/cover/ai", { style });
      setProfile(prev => prev ? { ...prev, coverImageUrl: res.data.coverImageUrl } : null);
      toast.success("AI Cover generated!");
      
      // Start cooldown
      setIsAiCooldown(true);
      setTimeout(() => setIsAiCooldown(false), 5000);
      
      setIsCoverModalOpen(false);
    } catch (err) {
      toast.error("AI generation failed or service busy");
    } finally {
      setIsGeneratingAiCover(false);
    }
  };

  const handleCropCurrentCover = () => {
    if (!profile?.coverImageUrl) return;
    setCoverToCrop(profile.coverImageUrl);
    setIsCoverCropModalOpen(true);
    setIsCoverModalOpen(false);
  };

  const handleViewResume = () => {
    if (!profile?.resumeS3Url) return;
    // Check if it's already a full URL (hydrated by backend)
    const url = profile.resumeS3Url.startsWith("http") 
      ? profile.resumeS3Url 
      : `${BACKEND_URL}/public/assets/${profile.resumeS3Url}`;
    window.open(url, "_blank");
  };

  const resumeInputRef = useRef<HTMLInputElement>(null);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/profile/resume", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      // Store suggestions and open the confirmation modal
      setSuggestions(res.data);
      setIsResumeSyncModalOpen(true);
      toast.success("Resume uploaded & analyzed by AI");
    } catch (err) {
      toast.error("Failed to analyze resume");
    } finally {
      setUploading(false);
    }
  };

  const applySuggestions = async () => {
    if (!suggestions || !profile) return;
    
    // Merge suggestions with current profile
    const updatedProfile = {
      ...profile,
      fullName: suggestions.fullName || profile.fullName,
      headline: suggestions.headline || profile.headline,
      bio: suggestions.bio || profile.bio,
      skills: suggestions.skills && suggestions.skills.length > 0 ? suggestions.skills : profile.skills,
      experiences: suggestions.experiences && suggestions.experiences.length > 0 ? suggestions.experiences : profile.experiences,
      internships: suggestions.internships && suggestions.internships.length > 0 ? suggestions.internships : profile.internships,
      academicProjects: suggestions.academicProjects && suggestions.academicProjects.length > 0 ? suggestions.academicProjects : profile.academicProjects,
      certifications: suggestions.certifications && suggestions.certifications.length > 0 ? suggestions.certifications : profile.certifications,
    };

    setSaving(true);
    try {
      await api.put("/profile", updatedProfile);
      setProfile(updatedProfile);
      toast.success("Profile synced with resume data!");
      setIsResumeSyncModalOpen(false);
      setSuggestions(null);
    } catch (err) {
      toast.error("Failed to apply suggestions");
    } finally {
      setSaving(false);
    }
  };

  const addSkill = (skill: string) => {
    if (!profile || !skill.trim() || profile.skills.includes(skill.trim())) return;
    setProfile({ ...profile, skills: [...profile.skills, skill.trim()] });
  };

  const removeSkill = (skill: string) => {
    if (!profile) return;
    setProfile({ ...profile, skills: profile.skills.filter(s => s !== skill) });
  };

  const addExperience = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      experiences: [...profile.experiences, { title: "", company: "", duration: "", description: "" }]
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading your career profile...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Hero Header */}
      <div className="relative group">
        <div className="h-64 rounded-3xl bg-secondary overflow-hidden relative border border-border shadow-2xl">
          {profile.coverImageUrl ? (
            <img 
              src={profile.coverImageUrl} 
              alt="Cover" 
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error("Cover image failed to load:", profile.coverImageUrl);
                // Fallback to gradient if image fails
                setProfile(prev => prev ? { ...prev, coverImageUrl: "" } : null);
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/5 to-background">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(var(--primary-rgb),0.05),transparent_50%)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-6">
            <button 
              onClick={() => setIsCoverModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-xl text-white font-bold transition-all text-sm shadow-lg"
            >
              <Camera className="w-4 h-4" />
              Edit Cover
            </button>
          </div>
        </div>
        
        <div className="px-8 -mt-20 flex flex-col md:flex-row items-end gap-8 relative z-10">
          <div className="relative group/photo">
            <div className="w-40 h-40 rounded-3xl overflow-hidden border-4 border-background shadow-2xl bg-card relative">
              {profile.profilePhotoUrl ? (
                <>
                  <Image 
                    src={profile.profilePhotoUrl} 
                    alt={profile.fullName || "User"} 
                    fill 
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      onClick={() => setIsViewModalOpen(true)}
                      className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-xl text-white transition-all"
                      title="View Full Photo"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handlePhotoDelete}
                      className="p-2 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md rounded-xl text-white transition-all"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary">
                  <User className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-3 bg-foreground text-background rounded-2xl shadow-xl hover:scale-110 transition-transform group-hover/photo:rotate-12 z-20"
              title="Update Photo"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload}
            />
          </div>

          <div className="flex-1 pb-4 space-y-2">
            <input
              value={profile.fullName || ""}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              placeholder="Your Full Name"
              className="text-4xl font-black bg-transparent border-none focus:ring-0 p-0 w-full placeholder:opacity-20"
            />
            <input
              value={profile.headline || ""}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
              placeholder="Professional Headline (e.g. Senior Software Engineer)"
              className="text-xl text-muted-foreground font-medium bg-transparent border-none focus:ring-0 p-0 w-full placeholder:opacity-20"
            />
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="mb-4 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Details & Preferences */}
        <div className="space-y-10">
          {/* About Section */}
          <section className="bg-card border border-border rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">About Me</h3>
              </div>
            </div>
            <textarea
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell your story..."
              className="w-full min-h-[150px] bg-secondary/30 rounded-2xl p-4 border-transparent focus:border-primary/30 focus:ring-0 transition-all resize-none text-sm leading-relaxed"
            />
          </section>

          {/* Resume Management */}
          <section className="bg-card border border-border rounded-3xl p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Resume</h3>
              </div>
              {uploading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
            </div>

            <div className="space-y-4 relative z-10">
              {profile.resumeS3Url ? (
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-2xl border border-border">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-black truncate">Your Active Resume</p>
                      <p className="text-[10px] text-muted-foreground font-bold">Uploaded to ZENITH</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={handleViewResume}
                      className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors"
                      title="View Resume"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => resumeInputRef.current?.click()}
                      className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                      title="Update Resume"
                    >
                      <UploadCloud className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => resumeInputRef.current?.click()}
                  className="w-full py-10 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all group/upload"
                >
                  <UploadCloud className="w-8 h-8 text-muted-foreground group-hover/upload:text-primary transition-colors" />
                  <span className="text-xs font-black uppercase text-muted-foreground">Upload PDF Resume</span>
                </button>
              )}
              <input 
                type="file" 
                ref={resumeInputRef} 
                onChange={handleResumeUpload} 
                accept=".pdf" 
                className="hidden" 
              />
              <p className="text-[10px] text-center text-muted-foreground font-medium">
                AI will extract skills & experience to sync your profile.
              </p>
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-card border border-border rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Career Compass</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Location</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={profile.preferredLocation || ""}
                    onChange={(e) => setProfile({ ...profile, preferredLocation: e.target.value })}
                    className="w-full bg-secondary/30 rounded-xl py-3 pl-12 pr-4 border-transparent focus:border-blue-500/30 focus:ring-0 text-sm font-bold"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Expected Comp</label>
                <input
                  value={profile.preferredSalary || ""}
                  onChange={(e) => setProfile({ ...profile, preferredSalary: e.target.value })}
                  placeholder="$120k - $150k"
                  className="w-full bg-secondary/30 rounded-xl py-3 px-4 border-transparent focus:border-blue-500/30 focus:ring-0 text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Work Style</label>
                <select
                  value={profile.preferredLifestyle || ""}
                  onChange={(e) => setProfile({ ...profile, preferredLifestyle: e.target.value })}
                  className="w-full bg-secondary/30 rounded-xl py-3 px-4 border-transparent focus:border-blue-500/30 focus:ring-0 text-sm font-bold appearance-none"
                >
                  <option value="REMOTE">Remote First</option>
                  <option value="HYBRID">Hybrid / Flex</option>
                  <option value="ONSITE">On-site / Office</option>
                </select>
              </div>
            </div>
          </section>

          {/* Skills */}
          <section className="bg-card border border-border rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <BrainCircuit className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Core Arsenal</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="group flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 text-foreground border border-border rounded-full text-xs font-bold hover:border-amber-500/30 transition-colors">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-destructive" />
                  </button>
                </span>
              ))}
              <div className="relative group/add">
                <input
                  placeholder="Add skill..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addSkill(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                  className="w-24 bg-transparent border-none focus:ring-0 p-0 text-xs font-bold placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Experience & Projects */}
        <div className="lg:col-span-2 space-y-10">
          {/* Experience Section */}
          <section className="bg-card border border-border rounded-3xl p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/10 rounded-xl">
                  <History className="w-5 h-5 text-violet-500" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Professional Path</h3>
              </div>
              <button 
                onClick={addExperience}
                className="flex items-center gap-2 text-xs font-black uppercase text-primary hover:bg-primary/5 px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Experience
              </button>
            </div>

            <div className="space-y-8 relative before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-[2px] before:bg-border/50">
              {profile.experiences.map((exp, idx) => (
                <div key={idx} className="relative pl-10 group">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-background border-4 border-violet-500/30 group-hover:border-violet-500 transition-colors z-10" />
                  
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 space-y-1">
                        <input
                          value={exp.title || ""}
                          onChange={(e) => {
                            const newExp = [...profile.experiences];
                            newExp[idx].title = e.target.value;
                            setProfile({ ...profile, experiences: newExp });
                          }}
                          placeholder="Job Title"
                          className="w-full text-lg font-black bg-transparent border-none focus:ring-0 p-0 placeholder:opacity-20"
                        />
                        <div className="flex items-center gap-3 text-sm text-muted-foreground font-bold">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            <input
                              value={exp.company || ""}
                              onChange={(e) => {
                                const newExp = [...profile.experiences];
                                newExp[idx].company = e.target.value;
                                setProfile({ ...profile, experiences: newExp });
                              }}
                              placeholder="Company"
                              className="bg-transparent border-none focus:ring-0 p-0 w-32 placeholder:opacity-30"
                            />
                          </div>
                          <div className="w-1 h-1 rounded-full bg-border" />
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <input
                              value={exp.duration || ""}
                              onChange={(e) => {
                                const newExp = [...profile.experiences];
                                newExp[idx].duration = e.target.value;
                                setProfile({ ...profile, experiences: newExp });
                              }}
                              placeholder="Duration"
                              className="bg-transparent border-none focus:ring-0 p-0 w-32 placeholder:opacity-30"
                            />
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const newExp = profile.experiences.filter((_, i) => i !== idx);
                          setProfile({ ...profile, experiences: newExp });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={exp.description || ""}
                      onChange={(e) => {
                        const newExp = [...profile.experiences];
                        newExp[idx].description = e.target.value;
                        setProfile({ ...profile, experiences: newExp });
                      }}
                      placeholder="What did you achieve here? Use bullet points for best AI matching..."
                      className="w-full min-h-[100px] bg-secondary/30 rounded-2xl p-4 border-transparent focus:border-violet-500/30 focus:ring-0 text-sm leading-relaxed resize-none"
                    />
                  </div>
                </div>
              ))}
              
              {profile.experiences.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-border rounded-3xl">
                  <History className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground font-bold">No experience added yet</p>
                </div>
              )}
            </div>
          </section>

          {/* Academic Projects */}
          <section className="bg-card border border-border rounded-3xl p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-xl">
                  <Code2 className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Project Portfolio</h3>
              </div>
              <button 
                onClick={() => setProfile({
                  ...profile,
                  academicProjects: [...profile.academicProjects, { title: "", technologies: "", description: "", link: "" }]
                })}
                className="flex items-center gap-2 text-xs font-black uppercase text-primary hover:bg-primary/5 px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Project
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.academicProjects.map((proj, idx) => (
                <div key={idx} className="group relative bg-secondary/30 border border-transparent hover:border-green-500/30 rounded-3xl p-6 transition-all space-y-4">
                  <button 
                    onClick={() => {
                      const newProj = profile.academicProjects.filter((_, i) => i !== idx);
                      setProfile({ ...profile, academicProjects: newProj });
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <input
                    value={proj.title || ""}
                    onChange={(e) => {
                      const newProj = [...profile.academicProjects];
                      newProj[idx].title = e.target.value;
                      setProfile({ ...profile, academicProjects: newProj });
                    }}
                    placeholder="Project Title"
                    className="w-full text-lg font-black bg-transparent border-none focus:ring-0 p-0 placeholder:opacity-20"
                  />

                  <input
                    value={proj.technologies || ""}
                    onChange={(e) => {
                      const newProj = [...profile.academicProjects];
                      newProj[idx].technologies = e.target.value;
                      setProfile({ ...profile, academicProjects: newProj });
                    }}
                    placeholder="Tech Stack (React, Node, etc.)"
                    className="w-full text-xs font-bold text-green-600 bg-transparent border-none focus:ring-0 p-0 placeholder:opacity-30"
                  />

                  <textarea
                    value={proj.description || ""}
                    onChange={(e) => {
                      const newProj = [...profile.academicProjects];
                      newProj[idx].description = e.target.value;
                      setProfile({ ...profile, academicProjects: newProj });
                    }}
                    placeholder="Describe your work..."
                    className="w-full min-h-[80px] bg-background/50 rounded-xl p-3 border-transparent focus:border-green-500/30 focus:ring-0 text-sm leading-relaxed resize-none"
                  />

                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    <input
                      value={proj.link || ""}
                      onChange={(e) => {
                        const newProj = [...profile.academicProjects];
                        newProj[idx].link = e.target.value;
                        setProfile({ ...profile, academicProjects: newProj });
                      }}
                      placeholder="Project Link / GitHub"
                      className="flex-1 text-xs font-bold text-primary bg-transparent border-none focus:ring-0 p-0 placeholder:opacity-30"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* View Modal */}
      {isViewModalOpen && profile.profilePhotoUrl && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/20 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setIsViewModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-md bg-card border-4 border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square">
              <Image 
                src={profile.profilePhotoUrl} 
                alt={profile.fullName || "User"} 
                fill 
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 448px"
              />
              
              {/* Top Bar / Header */}
              <div className="absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between pointer-events-none">
                <div className="flex flex-col">
                  <span className="text-white font-black text-lg drop-shadow-md">{profile.fullName}</span>
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest drop-shadow-md">Profile Photo</span>
                </div>
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-2xl text-white transition-all pointer-events-auto border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Bottom Actions */}
            <div className="p-4 bg-card border-t border-border flex items-center justify-center">
               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Click anywhere outside to close</p>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {isCropModalOpen && imageToCrop && (
        <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">Crop Profile Photo</h3>
              <button onClick={() => setIsCropModalOpen(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 relative h-[400px] bg-black/20">
              {canRenderCropper && (
                <Cropper
                  key={imageToCrop}
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  onMediaLoaded={onMediaLoaded}
                  cropShape="round"
                  showGrid={true}
                />
              )}
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-muted-foreground">Zoom Level</span>
                  <span className="text-xs font-black text-primary">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsCropModalOpen(false)}
                  className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-black hover:bg-secondary/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropSave}
                  disabled={uploading}
                  className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Apply & Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cover Crop Modal */}
      {isCoverCropModalOpen && coverToCrop && (
        <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="w-full max-w-4xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">Crop Cover Image</h3>
              <button onClick={() => setIsCoverCropModalOpen(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 relative h-[400px] bg-black/20">
              {canRenderCropper && (
                <Cropper
                  key={coverToCrop}
                  image={coverToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={3/1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  onMediaLoaded={onMediaLoaded}
                  cropShape="rect"
                  showGrid={true}
                />
              )}
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-muted-foreground">Zoom Level</span>
                  <span className="text-xs font-black text-primary">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsCoverCropModalOpen(false)}
                  className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-black hover:bg-secondary/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCoverCropSave}
                  disabled={uploading}
                  className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Apply & Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cover Selection Modal */}
      {isCoverModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Customize Cover</h3>
              </div>
              <button onClick={() => setIsCoverModalOpen(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* Option 1: AI Generation */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                  <Sparkles className="w-4 h-4" /> AI Creator
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["Professional", "Abstract", "Tech", "Nature"].map(style => (
                    <button
                      key={style}
                      disabled={isGeneratingAiCover}
                      onClick={() => handleAiCover(style)}
                      className="group relative h-24 rounded-2xl border border-primary/20 hover:border-primary bg-primary/5 flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <BrainCircuit className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black uppercase">{style}</span>
                      {isGeneratingAiCover && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* Option 2: Curated Gallery */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-violet-500 font-black uppercase tracking-widest text-xs">
                  <Eye className="w-4 h-4" /> Curated Gallery
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800",
                    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=800",
                    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800",
                    "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=800",
                    "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800",
                    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=800"
                  ].map((url, i) => (
                    <button
                      key={i}
                      onClick={() => handlePredefinedCover(url)}
                      className="relative aspect-video rounded-2xl overflow-hidden border-2 border-transparent hover:border-primary transition-all hover:scale-[1.02] shadow-lg group"
                    >
                      <img 
                        src={url.includes("http") ? hydrateUrl(url) : url} 
                        alt={`Cover ${i}`} 
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </section>

              {/* Option 3: Manual Upload */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-amber-500 font-black uppercase tracking-widest text-xs">
                  <Plus className="w-4 h-4" /> Custom Upload
                </div>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-3xl hover:bg-secondary/50 transition-all cursor-pointer group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Camera className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                    <p className="text-sm font-bold text-muted-foreground">Drop image or click to browse</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                </label>
              </section>

              {/* Option 4: Crop Current */}
              {profile.coverImageUrl && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-sky-500 font-black uppercase tracking-widest text-xs">
                    <Sparkles className="w-4 h-4" /> Refine Current
                  </div>
                  <button
                    onClick={handleCropCurrentCover}
                    className="w-full h-20 rounded-3xl border-2 border-sky-500/20 hover:border-sky-500 bg-sky-500/5 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] group"
                  >
                    <Camera className="w-6 h-6 text-sky-500 group-hover:rotate-12 transition-transform" />
                    <span className="text-sm font-black uppercase">Crop & Re-center Current Cover</span>
                  </button>
                </section>
              )}
            </div>
            
            <div className="p-6 border-t border-border flex justify-end">
              <button 
                onClick={() => setIsCoverModalOpen(false)}
                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-xl font-bold hover:bg-secondary/80 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Sync Confirmation Modal */}
      {isResumeSyncModalOpen && suggestions && (
        <div className="fixed inset-0 z-[2500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-border bg-gradient-to-br from-blue-500/10 via-transparent to-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">AI Data Sync</h3>
                </div>
                <button 
                  onClick={() => setIsResumeSyncModalOpen(false)}
                  className="p-2 hover:bg-secondary rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                We&apos;ve analyzed your resume. Would you like to automatically fill your profile with the detected information?
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Identity & Bio */}
              <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/20 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-500" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500/60">Branding Suggestions</p>
                      <h4 className="font-black text-lg">{suggestions.fullName || "Your Name"}</h4>
                   </div>
                </div>
                {suggestions.headline && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Generated Headline</p>
                    <p className="text-sm font-bold text-foreground italic">"{suggestions.headline}"</p>
                  </div>
                )}
                {suggestions.bio && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Professional Summary</p>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{suggestions.bio}</p>
                  </div>
                )}
              </div>

              {/* Detected Skills */}
              {suggestions.skills?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Detected Skills ({suggestions.skills.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.skills.map(s => (
                      <span key={s} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-tight">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected Experience */}
              {suggestions.experiences?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-400">Professional Experience ({suggestions.experiences.length})</h4>
                  <div className="space-y-3">
                    {suggestions.experiences.map((exp, i) => (
                      <div key={i} className="p-4 bg-secondary/30 rounded-2xl border border-border/50">
                        <p className="font-black text-sm">{exp.title}</p>
                        <p className="text-xs text-muted-foreground font-bold">{exp.company} • {exp.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected Projects */}
              {suggestions.academicProjects?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400">Key Projects ({suggestions.academicProjects.length})</h4>
                  <div className="space-y-3">
                    {suggestions.academicProjects.map((proj, i) => (
                      <div key={i} className="p-4 bg-secondary/30 rounded-2xl border border-border/50">
                        <p className="font-black text-sm">{proj.title}</p>
                        <p className="text-[10px] text-muted-foreground font-medium line-clamp-1">{proj.technologies}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-border bg-secondary/20 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setIsResumeSyncModalOpen(false)}
                className="flex-1 py-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
              >
                Keep Current Data
              </button>
              <button 
                onClick={applySuggestions}
                disabled={saving}
                className="flex-[1.5] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Sync Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
