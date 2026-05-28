"use client";

import { useState, useEffect } from "react";
import { 
  Users, Loader2, User, Check, X, Search, ArrowRight, UserMinus, MessageSquare
} from "lucide-react";
import api, { BACKEND_URL } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";

interface PublicProfile {
  userId: string;
  fullName: string;
  headline: string;
  bio?: string;
  profilePhotoUrl?: string;
  skills?: string[];
}

interface ConnectionRequest {
  id: string;
  user: PublicProfile;
  createdAt: string;
}

interface Connection {
  id: string;
  user: PublicProfile;
  createdAt: string;
}

export default function ConnectionsPage() {
  const [activeTab, setActiveTab] = useState<"connections" | "requests" | "sent">("connections");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { user } = useAuthStore();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [connectionsRes, requestsRes, sentRes] = await Promise.all([
        api.get("/connections"),
        api.get("/connections/pending"),
        api.get("/connections/sent")
      ]);
      setConnections(connectionsRes.data);
      setRequests(requestsRes.data);
      setSentRequests(sentRes.data);
    } catch (err) {
      console.error("Failed to fetch connections data:", err);
      toast.error("Failed to load connections");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await api.post(`/connections/accept/${requestId}`);
      toast.success("Connection request accepted!");
      // Refresh list
      const acceptedRequest = requests.find(r => r.id === requestId);
      if (acceptedRequest) {
        setConnections(prev => [...prev, {
          id: requestId,
          user: acceptedRequest.user,
          createdAt: new Date().toISOString()
        }]);
      }
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error("Failed to accept request:", err);
      toast.error("Failed to accept request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await api.post(`/connections/reject/${requestId}`);
      toast.success("Request ignored");
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error("Failed to reject request:", err);
      toast.error("Failed to ignore request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDisconnect = async (connectionId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove connection with ${name}?`)) {
      return;
    }
    setActionLoadingId(connectionId);
    try {
      await api.delete(`/connections/${connectionId}`);
      toast.success("Connection removed");
      setConnections(prev => prev.filter(c => c.id !== connectionId));
    } catch (err) {
      console.error("Failed to disconnect:", err);
      toast.error("Failed to disconnect");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWithdraw = async (requestId: string, name: string) => {
    if (!confirm(`Are you sure you want to withdraw your connection request to ${name}?`)) {
      return;
    }
    setActionLoadingId(requestId);
    try {
      await api.delete(`/connections/${requestId}`);
      toast.success("Connection request withdrawn");
      setSentRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error("Failed to withdraw request:", err);
      toast.error("Failed to withdraw request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getPhotoUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith("http")) {
      return url;
    }
    return `${BACKEND_URL}/public/assets/${url}`;
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const filteredConnections = connections.filter(conn => {
    const fullName = conn.user.fullName?.toLowerCase() || "";
    const headline = conn.user.headline?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || headline.includes(query);
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 hidden md:block">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight italic flex items-center gap-3">
            Career <span className="text-muted-foreground/30 not-italic">Nexus.</span>
          </h1>
          <p className="text-muted-foreground font-medium text-sm md:text-base">
            Build and manage your professional networks, review incoming invitations, and forge connections.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center justify-between border-b border-border/60 pb-1">
        <div className="flex gap-6 flex-wrap">
          <button
            onClick={() => setActiveTab("connections")}
            className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative flex items-center gap-2 ${
              activeTab === "connections"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>My Connections</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all duration-300 ${
              activeTab === "connections"
                ? "bg-primary text-background"
                : "bg-secondary text-secondary-foreground"
            }`}>
              {connections.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative flex items-center gap-2 ${
              activeTab === "requests"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Received Invitations</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all duration-300 ${
              activeTab === "requests"
                ? "bg-primary text-background"
                : requests.length > 0
                ? "bg-primary/20 text-primary"
                : "bg-secondary text-secondary-foreground"
            }`}>
              {requests.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative flex items-center gap-2 ${
              activeTab === "sent"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Sent Requests</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all duration-300 ${
              activeTab === "sent"
                ? "bg-primary text-background"
                : "bg-secondary text-secondary-foreground"
            }`}>
              {sentRequests.length}
            </span>
          </button>
        </div>

        {activeTab === "connections" && connections.length > 0 && (
          <div className="relative w-full max-w-[240px] hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/40 border border-border/80 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 font-medium"
            />
          </div>
        )}
      </div>

      {/* Search on mobile */}
      {activeTab === "connections" && connections.length > 0 && (
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary/40 border border-border/80 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 font-medium"
          />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm animate-pulse">Syncing connections stream...</p>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          {activeTab === "connections" ? (
            <>
              {filteredConnections.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {filteredConnections.map((conn) => {
                    const photo = getPhotoUrl(conn.user.profilePhotoUrl);
                    return (
                      <div 
                        key={conn.id} 
                        className="group relative bg-card border border-border/80 hover:border-primary/30 rounded-2xl p-4 sm:p-5 hover:shadow-md hover:shadow-primary/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="flex items-center gap-4 min-w-0">
                          {/* Avatar */}
                          <div className="h-12 w-12 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {photo ? (
                              <img src={photo} alt={conn.user.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="font-bold text-sm text-muted-foreground">{getInitials(conn.user.fullName)}</div>
                            )}
                          </div>

                          {/* Info details */}
                          <div className="min-w-0 space-y-1 z-10">
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                              <h3 className="font-bold text-base leading-tight truncate group-hover:text-primary transition-colors">
                                {conn.user.fullName}
                              </h3>
                              <p className="text-muted-foreground text-xs font-semibold tracking-tight line-clamp-1 sm:max-w-[250px] md:max-w-[350px]">
                                {conn.user.headline || "Zenith Operative"}
                              </p>
                            </div>
                            {conn.user.skills && conn.user.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {conn.user.skills.slice(0, 4).map((skill, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-2 py-0.5 bg-secondary/80 text-muted-foreground rounded-md text-[9px] font-black uppercase tracking-wider border border-border/30"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {conn.user.skills.length > 4 && (
                                  <span className="text-[9px] text-muted-foreground/60 font-bold self-center ml-0.5">
                                    +{conn.user.skills.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 z-10 shrink-0 self-end sm:self-center ml-auto sm:ml-0">
                          <Link
                            href={`/public/profiles/${conn.user.userId}`}
                            className="px-4 py-2 bg-foreground text-background hover:opacity-90 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold"
                            title="View Public Profile"
                          >
                            <span>View Profile</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/dashboard/messages?userId=${conn.user.userId}`}
                            className="p-2 bg-secondary hover:bg-secondary/80 border border-border rounded-xl transition-all flex items-center justify-center text-foreground"
                            title="Send Message"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDisconnect(conn.id, conn.user.fullName)}
                            disabled={actionLoadingId === conn.id}
                            className="p-2 bg-secondary text-destructive hover:bg-destructive/10 border border-border rounded-xl transition-all flex items-center justify-center disabled:opacity-50"
                            title="Disconnect"
                          >
                            {actionLoadingId === conn.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserMinus className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-border rounded-[2rem] flex flex-col items-center gap-6">
                  <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center">
                    <Users className="w-8 h-8 text-muted-foreground opacity-40" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold italic tracking-tight">No connections found</h2>
                    <p className="text-muted-foreground text-xs max-w-sm mx-auto">
                      {searchQuery 
                        ? "No results matched your query. Try another search term."
                        : "Connect with developers and recruiters to view networks and share direct career opportunities."}
                    </p>
                  </div>
                  {!searchQuery && (
                    <Link
                      href="/public/profiles"
                      className="px-5 py-2.5 bg-foreground text-background rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
                    >
                      Explore Profiles
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : activeTab === "requests" ? (
            <>
              {requests.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {requests.map((req) => {
                    const photo = getPhotoUrl(req.user.profilePhotoUrl);
                    return (
                      <div 
                        key={req.id} 
                        className="group relative bg-card border border-border/80 hover:border-primary/30 rounded-2xl p-4 sm:p-5 hover:shadow-md hover:shadow-primary/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden animate-in slide-in-from-bottom-2 duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="flex items-center gap-4 min-w-0">
                          {/* Avatar */}
                          <div className="h-12 w-12 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {photo ? (
                              <img src={photo} alt={req.user.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="font-bold text-sm text-muted-foreground">{getInitials(req.user.fullName)}</div>
                            )}
                          </div>

                          {/* Info details */}
                          <div className="min-w-0 space-y-1 z-10">
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                              <h3 className="font-bold text-base leading-tight truncate group-hover:text-primary transition-colors">
                                {req.user.fullName}
                              </h3>
                              <p className="text-muted-foreground text-xs font-semibold tracking-tight line-clamp-1 sm:max-w-[250px] md:max-w-[350px]">
                                {req.user.headline || "Zenith Operative"}
                              </p>
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-wider pt-0.5">
                              Received {new Date(req.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 z-10 shrink-0 self-end sm:self-center ml-auto sm:ml-0">
                          <button
                            onClick={() => handleAccept(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="px-4 py-2 bg-foreground text-background hover:opacity-90 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-50"
                            title="Accept Request"
                          >
                            {actionLoadingId === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="p-2 bg-secondary text-destructive hover:bg-destructive/10 border border-border rounded-xl transition-all flex items-center justify-center disabled:opacity-50"
                            title="Ignore Request"
                          >
                            {actionLoadingId === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <Link
                            href={`/public/profiles/${req.user.userId}`}
                            className="p-2 bg-secondary hover:bg-secondary/80 border border-border rounded-xl transition-all flex items-center justify-center text-foreground/80"
                            title="View Profile"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-border rounded-[2rem] flex flex-col items-center gap-6">
                  <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground opacity-40" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold italic tracking-tight">No pending invitations</h2>
                    <p className="text-muted-foreground text-xs max-w-sm mx-auto">
                      All caught up! When other operatives request to connect with you, they will appear here.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {sentRequests.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {sentRequests.map((req) => {
                    const photo = getPhotoUrl(req.user.profilePhotoUrl);
                    return (
                      <div 
                        key={req.id} 
                        className="group relative bg-card border border-border/80 hover:border-primary/30 rounded-2xl p-4 sm:p-5 hover:shadow-md hover:shadow-primary/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden animate-in slide-in-from-bottom-2 duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="flex items-center gap-4 min-w-0">
                          {/* Avatar */}
                          <div className="h-12 w-12 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {photo ? (
                              <img src={photo} alt={req.user.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="font-bold text-sm text-muted-foreground">{getInitials(req.user.fullName)}</div>
                            )}
                          </div>

                          {/* Info details */}
                          <div className="min-w-0 space-y-1 z-10">
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                              <h3 className="font-bold text-base leading-tight truncate group-hover:text-primary transition-colors">
                                {req.user.fullName}
                              </h3>
                              <p className="text-muted-foreground text-xs font-semibold tracking-tight line-clamp-1 sm:max-w-[250px] md:max-w-[350px]">
                                {req.user.headline || "Zenith Operative"}
                              </p>
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-wider pt-0.5">
                              Sent {new Date(req.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 z-10 shrink-0 self-end sm:self-center ml-auto sm:ml-0">
                          <button
                            onClick={() => handleWithdraw(req.id, req.user.fullName)}
                            disabled={actionLoadingId === req.id}
                            className="px-4 py-2 bg-secondary text-destructive hover:bg-destructive/10 border border-border rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-50"
                            title="Withdraw Request"
                          >
                            {actionLoadingId === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5" />
                                <span>Withdraw</span>
                              </>
                            )}
                          </button>
                          <Link
                            href={`/public/profiles/${req.user.userId}`}
                            className="p-2 bg-secondary hover:bg-secondary/80 border border-border rounded-xl transition-all flex items-center justify-center text-foreground/80"
                            title="View Profile"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-border rounded-[2rem] flex flex-col items-center gap-6">
                  <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground opacity-40" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold italic tracking-tight">No sent requests</h2>
                    <p className="text-muted-foreground text-xs max-w-sm mx-auto">
                      Any pending connection requests you send to other professionals will show up here.
                    </p>
                  </div>
                  <Link
                    href="/public/profiles"
                    className="px-5 py-2.5 bg-foreground text-background rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Discover People
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
