"use client";

import { useState, useEffect, useRef, Suspense, useLayoutEffect, Fragment } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Search, Send, MessageSquare, ArrowLeft, User, Loader2, 
  ExternalLink, Mail, Circle, PhoneCall, Plus, X, CheckCheck, Trash2, Menu,
  Globe, ArrowRight
} from "lucide-react";
import api, { BACKEND_URL } from "@/lib/api";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import Link from "next/link";

interface PublicProfile {
  userId: string;
  fullName: string;
  headline: string;
  profilePhotoUrl?: string;
  skills?: string[];
  lastOnline?: string;
}

interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  otherUser: PublicProfile;
  lastMessage?: DirectMessage;
  unreadCount: number;
}

interface Connection {
  id: string;
  user: PublicProfile;
}

function ChatContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeUser, setActiveUser] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isInitialLoadRef = useRef(true);
  const intersectingMessageIdsRef = useRef<Set<string>>(new Set());
  const [visibleTimeMessageId, setVisibleTimeMessageId] = useState<string | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);

  const { socket, isConnected, fetchUnreadMessageCount, onlineUserIds, setActiveChatUserId, sendTypingStatus } = useWebSocketStore();
  const { user } = useAuthStore();
  const currentUserId = user?.id;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localTypingStateRef = useRef(false);

  useEffect(() => {
    fetchConversations();
    fetchConnections();
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle active user change or targetUserId query parameter change
  useEffect(() => {
    if (targetUserId) {
      handleSelectUserById(targetUserId);
    }
  }, [targetUserId, conversations]);

  // Subscribe to central WebSocket messages
  useEffect(() => {
    const handleIncomingMessage = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      
      if (payload.type === "MESSAGE") {
        const msg = payload.data as DirectMessage;
        
        // If we are currently chatting with the sender or receiver of this message
        if (activeUser && (msg.senderId === activeUser.userId || msg.receiverId === activeUser.userId)) {
          setMessages(prev => {
            // Prevent duplicates
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          
          if (msg.senderId === activeUser.userId) {
            // Increment local unreadCount; the IntersectionObserver will mark it read if visible
            setConversations(prev => 
              prev.map(c => 
                c.otherUser.userId === activeUser.userId ? { ...c, unreadCount: c.unreadCount + 1 } : c
              )
            );
          }
        } else {
          // If it's not the active conversation, just refresh the list to update snippets/unread count
          fetchConversations();
        }
      } else if (payload.type === "READ") {
        const readerId = payload.data?.readerId;
        if (activeUser && readerId === activeUser.userId) {
          // Mark all our sent messages to this user as read
          setMessages(prev => 
            prev.map(m => m.senderId === currentUserId ? { ...m, read: true } : m)
          );
        }
      } else if (payload.type === "TYPING") {
        const senderId = payload.data?.senderId;
        const isTyping = payload.data?.isTyping;
        if (activeUser && senderId === activeUser.userId) {
          setIsOtherUserTyping(!!isTyping);
        }
      }
    };

    window.addEventListener("zenith-app-message", handleIncomingMessage);
    return () => window.removeEventListener("zenith-app-message", handleIncomingMessage);
  }, [activeUser, currentUserId]);

  const markMessagesAsRead = async (messageIds: string[]) => {
    if (!activeUser || messageIds.length === 0) return;
    try {
      await api.post("/messages/read-multiple", { messageIds });
      
      // Update local messages state
      setMessages(prev => 
        prev.map(m => messageIds.includes(m.id) ? { ...m, read: true } : m)
      );
      
      // Update local unreadCount for the active conversation
      setConversations(prev => 
        prev.map(c => 
          c.otherUser.userId === activeUser.userId 
            ? { ...c, unreadCount: Math.max(0, c.unreadCount - messageIds.length) } 
            : c
        )
      );

      // Refresh global unread badge
      fetchUnreadMessageCount();
      
      // Clean up the marked IDs from the intersecting set
      messageIds.forEach(id => intersectingMessageIdsRef.current.delete(id));
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  };

  // Reset intersecting messages set on active conversation transition
  useEffect(() => {
    intersectingMessageIdsRef.current.clear();
    setVisibleTimeMessageId(null);
    setIsOtherUserTyping(false);
  }, [activeUser]);

  // Handle marking visible messages as read when tab/window gains focus or user clicks inside
  useEffect(() => {
    const handleFocus = () => {
      if (activeUser && document.hasFocus() && intersectingMessageIdsRef.current.size > 0) {
        markMessagesAsRead(Array.from(intersectingMessageIdsRef.current));
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("click", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("click", handleFocus);
    };
  }, [activeUser]);

  // Intersection Observer for viewport-based read receipts
  useEffect(() => {
    if (!activeUser || messages.length === 0 || !chatContainerRef.current) return;

    const container = chatContainerRef.current;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const msgId = entry.target.getAttribute("data-message-id");
        if (!msgId) return;

        if (entry.isIntersecting) {
          intersectingMessageIdsRef.current.add(msgId);
        } else {
          intersectingMessageIdsRef.current.delete(msgId);
        }
      });

      // If document is focused, mark visible messages as read
      if (document.hasFocus() && intersectingMessageIdsRef.current.size > 0) {
        markMessagesAsRead(Array.from(intersectingMessageIdsRef.current));
      }
    }, {
      root: container,
      rootMargin: "0px 0px -70px 0px", // Obscured by the message typing footer (~70px height)
      threshold: 0.1 // Intersects if at least 10% visible above typing section
    });

    // Observe all unread messages sent by the other user
    const unreadElements = container.querySelectorAll('[data-unread="true"]');
    unreadElements.forEach(el => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [activeUser, messages]);

  // Synchronize activeChatUserId with useWebSocketStore
  useEffect(() => {
    if (activeUser) {
      setActiveChatUserId(activeUser.userId);
    } else {
      setActiveChatUserId(null);
    }
    return () => {
      setActiveChatUserId(null);
    };
  }, [activeUser, setActiveChatUserId]);

  // Scroll to bottom when messages load/change
  useLayoutEffect(() => {
    if (loadingMessages) return;

    if (isInitialLoadRef.current) {
      scrollToBottom(false);
      isInitialLoadRef.current = false;
    } else {
      if (page === 0) {
        scrollToBottom(true);
      } else if (chatContainerRef.current) {
        const target = chatContainerRef.current;
        const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 200;
        if (isNearBottom) {
          scrollToBottom(true);
        }
      }
    }
  }, [messages, loadingMessages]);

  const scrollToBottom = (smooth = false) => {
    if (chatContainerRef.current) {
      const target = chatContainerRef.current;
      if (smooth) {
        target.scrollTo({ top: target.scrollHeight, behavior: "smooth" });
      } else {
        target.scrollTop = target.scrollHeight;
        requestAnimationFrame(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        });
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 50);
      }
    }
  };

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasMore && !loadingMore && !loadingMessages && activeUser) {
      setLoadingMore(true);
      const prevScrollHeight = target.scrollHeight;
      const nextPage = page + 1;
      try {
        const res = await api.get(`/messages/history/${activeUser.userId}?page=${nextPage}&size=30`);
        const olderMessages = res.data;
        if (olderMessages.length > 0) {
          setMessages(prev => {
            const newMsgs = olderMessages.filter((m: DirectMessage) => !prev.some(p => p.id === m.id));
            return [...newMsgs, ...prev];
          });
          setPage(nextPage);
        }
        if (olderMessages.length < 30) {
          setHasMore(false);
        }
        setTimeout(() => {
          if (chatContainerRef.current) {
            const newScrollHeight = chatContainerRef.current.scrollHeight;
            chatContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
          }
        }, 50);
      } catch (err) {
        console.error("Failed to load older messages:", err);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get("/messages/conversations");
      setConversations(res.data);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const res = await api.get("/connections");
      setConnections(res.data);
    } catch (err) {
      console.error("Failed to fetch connections:", err);
    }
  };

  const handleSelectUserById = async (userId: string) => {
    // Check if target user is already in our loaded conversations list
    const existing = conversations.find(c => c.otherUser.userId === userId);
    if (existing) {
      if (activeUser?.userId !== userId) {
        selectConversation(existing.otherUser);
      }
    } else {
      // If not, we fetch their public profile to start a new thread
      try {
        const res = await api.get(`/profile/public/${userId}`);
        const profile = res.data;
        if (profile && activeUser?.userId !== userId) {
          selectConversation(profile);
        }
      } catch (err) {
        console.error("Failed to fetch user profile for message thread:", err);
      }
    }
  };

  const markActiveChatAsRead = async (userId: string) => {
    try {
      await api.post(`/messages/read/${userId}`);
      fetchUnreadMessageCount();
      
      // Update local conversations list counts reactively
      setConversations(prev => 
        prev.map(c => 
          c.otherUser.userId === userId ? { ...c, unreadCount: 0 } : c
        )
      );
    } catch (err) {
      console.error("Failed to mark chat as read:", err);
    }
  };

  const selectConversation = async (otherUser: PublicProfile) => {
    setActiveUser(otherUser);
    setLoadingMessages(true);
    setPage(0);
    setHasMore(true);
    isInitialLoadRef.current = true;
    
    // Persist active chat user in query param for persistence on refresh
    router.replace(`/dashboard/messages?userId=${otherUser.userId}`, { scroll: false });

    try {
      const res = await api.get(`/messages/history/${otherUser.userId}?page=0&size=30`);
      setMessages(res.data);
      if (res.data.length < 30) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleClearConversation = async () => {
    if (!activeUser) return;
    if (
      !window.confirm(
        `Are you sure you want to clear the conversation with ${activeUser.fullName}? This will hide all existing messages from your view. The other user will still see them.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/messages/clear/${activeUser.userId}`);
      toast.success("Conversation cleared");
      setActiveUser(null);
      setMessages([]);
      router.replace("/dashboard/messages", { scroll: false });
      fetchConversations();
    } catch (err) {
      console.error("Failed to clear conversation:", err);
      toast.error("Failed to clear conversation");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!activeUser) return;

    // Send typing: true if not already typing
    if (!localTypingStateRef.current && value.trim().length > 0) {
      localTypingStateRef.current = true;
      sendTypingStatus(activeUser.userId, true);
    }

    // Reset local typing status if input is cleared
    if (value.trim().length === 0 && localTypingStateRef.current) {
      localTypingStateRef.current = false;
      sendTypingStatus(activeUser.userId, false);
    }

    // Set a timeout to clear the typing status after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (localTypingStateRef.current) {
        localTypingStateRef.current = false;
        if (activeUser) {
          sendTypingStatus(activeUser.userId, false);
        }
      }
    }, 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !newMessage.trim() || sending) return;

    // Clear typing indicator immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (localTypingStateRef.current) {
      localTypingStateRef.current = false;
      sendTypingStatus(activeUser.userId, false);
    }

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const res = await api.post("/messages/send", {
        receiverId: activeUser.userId,
        content
      });
      
      const sentMsg = res.data;
      setMessages(prev => {
        if (prev.some(m => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });

      // Update conversations list so this partner is at the top with updated snippet
      setConversations(prev => {
        const filtered = prev.filter(c => c.otherUser.userId !== activeUser.userId);
        const updatedConv: Conversation = {
          otherUser: activeUser,
          lastMessage: sentMsg,
          unreadCount: 0
        };
        return [updatedConv, ...filtered];
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
      setNewMessage(content); // Restore message
    } finally {
      setSending(false);
    }
  };

  const getPhotoUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}/public/assets/${url}`;
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      }
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) {
      return "";
    }
  };

  const formatDetailedTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  };

  const formatLastSeen = (isoString?: string) => {
    if (!isoString) return "Offline";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) {
        return "Last seen just now";
      } else if (diffMins < 60) {
        return `Last seen ${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `Last seen ${diffHours}h ago`;
      } else if (diffDays === 1) {
        return "Last seen yesterday";
      } else {
        return `Last seen ${date.toLocaleDateString()}`;
      }
    } catch (e) {
      return "Offline";
    }
  };

  const getDividerDateLabel = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      } else {
        return date.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      }
    } catch (e) {
      return "";
    }
  };

  // Filter contacts/active threads
  const filteredConversations = conversations.filter(c => {
    const name = c.otherUser.fullName?.toLowerCase() || "";
    const headline = c.otherUser.headline?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || headline.includes(query);
  });

  // Filter connections in "New Chat" modal search
  const filteredConnections = connections.filter(conn => {
    const name = conn.user.fullName?.toLowerCase() || "";
    const headline = conn.user.headline?.toLowerCase() || "";
    const query = newChatSearch.toLowerCase();
    // Exclude users already in active conversations (optional, but let's show all connections)
    return name.includes(query) || headline.includes(query);
  });

  return (
    <div className="h-full w-full flex bg-card overflow-hidden relative animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: Conversation List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-border/60 flex flex-col shrink-0 bg-secondary/15 ${
        activeUser ? "hidden md:flex" : "flex"
      }`}>
        {/* Header section with search & new chat trigger */}
        <div className="p-5 border-b border-border/60 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black italic tracking-tight flex items-center gap-2">
              Conversations 
              {/* <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> */}
            </h1>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 bg-foreground text-background hover:opacity-90 rounded-xl transition-all flex items-center justify-center"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/50 border border-border/80 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 font-medium"
            />
          </div>
        </div>

        {/* Conversation rows list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/30 p-2 space-y-1">
          {loadingConversations ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-muted-foreground text-xs">Loading active channels...</p>
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const other = conv.otherUser;
              const photo = getPhotoUrl(other.profilePhotoUrl);
              const isActive = activeUser?.userId === other.userId;
              return (
                <button
                  key={other.userId}
                  onClick={() => selectConversation(other)}
                  className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3.5 transition-all group relative ${
                    isActive 
                      ? "bg-foreground text-background shadow-md" 
                      : "hover:bg-secondary/40 text-foreground"
                  }`}
                >
                  {/* Active background glow on hover */}
                  {!isActive && (
                    <div className="absolute inset-y-2 left-0 w-1 bg-primary rounded-full scale-y-0 group-hover:scale-y-100 transition-transform" />
                  )}

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="h-11 w-11 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden shadow-sm">
                      {photo ? (
                        <img src={photo} alt={other.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`font-bold text-sm ${isActive ? 'text-background' : 'text-muted-foreground'}`}>
                          {getInitials(other.fullName)}
                        </div>
                      )}
                    </div>
                    {onlineUserIds.includes(other.userId) && (
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-md shadow-green-500/20 z-20" />
                    )}
                  </div>

                  {/* Info details */}
                  <div className="flex-1 min-w-0 space-y-1 z-10">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-sm truncate leading-tight group-hover:text-primary transition-colors">
                        {other.fullName}
                      </h4>
                      <span className={`text-[10px] shrink-0 font-medium ${isActive ? 'text-background/70' : 'text-muted-foreground'}`}>
                        {formatTime(conv.lastMessage?.timestamp)}
                      </span>
                    </div>
                    
                    <p className={`text-[11px] truncate leading-tight font-medium ${
                      isActive ? 'text-background/80' : 'text-muted-foreground/80'
                    }`}>
                      {other.headline || "Zenith Operative"}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <p className={`text-xs truncate max-w-[180px] lg:max-w-[220px] ${
                        conv.unreadCount > 0 && !isActive
                          ? "font-black text-foreground"
                          : isActive ? "text-background/90" : "text-muted-foreground/60"
                      }`}>
                        {conv.lastMessage?.content || "Click to start conversation"}
                      </p>
                      
                      {conv.unreadCount > 0 && !isActive && (
                        <span className="px-2 py-0.5 bg-primary text-background rounded-full text-[9px] font-black shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-4 text-muted-foreground px-4">
              <MessageSquare className="w-10 h-10 opacity-30" />
              <div className="space-y-1">
                <p className="text-sm font-bold">No conversations yet</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Connect with professionals and recruiters to initiate private transmissions.
                </p>
              </div>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-2 px-4 py-2 bg-foreground text-background rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-sm"
              >
                Start Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 bg-card ${
        !activeUser ? "hidden md:flex" : "flex"
      }`}>
        {activeUser ? (
          <>
            {/* Chat header info */}
            <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between gap-3 bg-secondary/5 z-10">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Back button for mobile */}
                <button
                  onClick={() => {
                    setActiveUser(null);
                    router.replace("/dashboard/messages", { scroll: false });
                  }}
                  className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground md:hidden transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-11 w-11 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden shadow-sm">
                    {getPhotoUrl(activeUser.profilePhotoUrl) ? (
                      <img src={getPhotoUrl(activeUser.profilePhotoUrl)!} alt={activeUser.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="font-bold text-sm text-muted-foreground">{getInitials(activeUser.fullName)}</div>
                    )}
                  </div>
                  {onlineUserIds.includes(activeUser.userId) && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-md shadow-green-500/20 z-20 animate-pulse" />
                  )}
                </div>

                {/* Name details */}
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base leading-tight truncate flex items-center gap-2">
                    {activeUser.fullName}
                    {onlineUserIds.includes(activeUser.userId) ? (
                      <span className="flex items-center gap-1 text-[9px] text-emerald-500 font-extrabold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full select-none">
                        {/* <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" /> */}
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] text-muted-foreground font-extrabold uppercase bg-secondary px-2 py-0.5 rounded-full select-none">
                        {formatLastSeen(activeUser.lastOnline)}
                      </span>
                    )}
                  </h3>
                  <p className="text-muted-foreground text-[10px] sm:text-xs truncate font-medium">
                    {activeUser.headline || "Zenith Operative"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/public/profiles/${activeUser.userId}`}
                  className="px-3.5 py-2 bg-secondary border border-border text-foreground hover:bg-secondary/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="View Profile"
                >
                  <span className="hidden sm:inline">Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={handleClearConversation}
                  className="px-3.5 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Clear Conversation"
                >
                  <span className="hidden sm:inline">Clear Chat</span>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat feed body */}
            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-5 space-y-4 bg-secondary/5 border-b border-border/30 relative"
            >
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground text-xs animate-pulse">Decrypting message feed...</p>
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-4">
                  {loadingMore && (
                    <div className="flex justify-center py-2 shrink-0">
                      <Loader2 className="w-5 h-5 animate-spin text-primary animate-pulse" />
                    </div>
                  )}
                  {messages.map((msg, index) => {
                    const isSelf = msg.senderId === currentUserId;
                    const dateLabel = getDividerDateLabel(msg.timestamp);
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const prevDateLabel = prevMsg ? getDividerDateLabel(prevMsg.timestamp) : null;
                    const showDivider = dateLabel && dateLabel !== prevDateLabel;

                    // Parse post share payload if present
                    let sharedPost: any = null;
                    if (msg.content.trim().startsWith('{"type":"POST_SHARE"')) {
                      try {
                        sharedPost = JSON.parse(msg.content);
                      } catch (e) {
                        // ignore
                      }
                    }

                    return (
                      <Fragment key={msg.id}>
                        {showDivider && (
                          <div className="flex items-center justify-center my-6 w-full select-none">
                            <div className="h-[1px] bg-border/60 flex-1" />
                            <span className="mx-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-full border border-border/40 shadow-sm">
                              {dateLabel}
                            </span>
                            <div className="h-[1px] bg-border/60 flex-1" />
                          </div>
                        )}
                        <div 
                          data-message-id={msg.id}
                          data-unread={!msg.read && !isSelf}
                          onClick={() => setVisibleTimeMessageId(prev => prev === msg.id ? null : msg.id)}
                          className={`flex flex-col max-w-[75%] sm:max-w-[65%] w-fit group relative cursor-pointer select-none ${
                            isSelf ? "ml-auto items-end" : "mr-auto items-start"
                          }`}
                        >
                          {sharedPost ? (
                            <div className={`rounded-2xl text-xs overflow-hidden border border-border/80 shadow-md transition-all hover:border-primary/40 relative w-64 sm:w-72 ${
                              isSelf 
                                ? "bg-card text-foreground rounded-tr-none" 
                                : "bg-card text-foreground rounded-tl-none"
                            }`}>
                              {/* Card Header */}
                              <div className="p-3 border-b border-border/50 bg-secondary/25 flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="font-black uppercase tracking-tight truncate text-[10px]">
                                    {sharedPost.postAuthor}
                                  </span>
                                </div>
                                <span className="text-[9px] text-muted-foreground font-semibold shrink-0">Broadcast</span>
                              </div>

                              {/* Card Body */}
                              <div className="p-3 space-y-2">
                                {sharedPost.postText && (
                                  <p className="text-muted-foreground font-medium line-clamp-3 leading-relaxed text-[11px] select-text">
                                    {sharedPost.postText}
                                  </p>
                                )}
                                
                                {sharedPost.postImage && (
                                  <div className="w-full h-24 overflow-hidden rounded-lg border border-border/50 bg-secondary/10">
                                    <img 
                                      src={sharedPost.postImage} 
                                      alt="Shared attachment" 
                                      className="w-full h-full object-cover" 
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Card Footer action */}
                              <Link 
                                href={`/posts/${sharedPost.postId}`}
                                className="w-full p-2.5 bg-secondary/40 hover:bg-secondary/70 border-t border-border/50 text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1 text-primary hover:text-primary-hover transition-colors"
                              >
                                Inspect Intel
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          ) : (
                            <div className={`p-3.5 rounded-2xl text-sm leading-relaxed relative w-fit ${
                              isSelf 
                                ? "bg-foreground text-background rounded-tr-none shadow-md" 
                                : "bg-card border border-border rounded-tl-none text-foreground shadow-sm"
                            }`}>
                              <p className="whitespace-pre-wrap select-text">{msg.content}</p>
                            </div>
                          )}
                          
                          {/* Detailed time and checkmarks */}
                          <div className="flex items-center gap-1.5 mt-1 px-1">
                            {visibleTimeMessageId === msg.id && (
                              <span className="text-[9px] text-muted-foreground/60 font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
                                {formatDetailedTime(msg.timestamp)}
                              </span>
                            )}
                            {isSelf && (
                              msg.read ? (
                                <span title="Seen"><CheckCheck className="w-3.5 h-3.5 text-blue-500" /></span>
                              ) : (
                                <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-muted-foreground/40" /></span>
                              )
                            )}
                          </div>
                        </div>
                      </Fragment>
                    );
                  })}
                  
                  {isOtherUserTyping && (
                    <div className="flex items-center gap-2.5 mr-auto pl-1 animate-in fade-in duration-200 shrink-0">
                      <div className="h-9 w-9 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                        {getPhotoUrl(activeUser.profilePhotoUrl) ? (
                          <img src={getPhotoUrl(activeUser.profilePhotoUrl)!} alt={activeUser.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="font-bold text-xs text-muted-foreground">{getInitials(activeUser.fullName)}</div>
                        )}
                      </div>
                      <div className="bg-card border border-border px-4 py-3.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-duration:1000ms]"></span>
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-duration:1000ms] [animation-delay:150ms]"></span>
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-duration:1000ms] [animation-delay:300ms]"></span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                  <MessageSquare className="w-12 h-12 text-primary/40 animate-bounce" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold">Start direct communication</p>
                    <p className="text-xs text-muted-foreground/70">
                      Send a message to initiate an encrypted direct session with {activeUser.fullName}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Chat input submit footer */}
            <form 
              onSubmit={handleSendMessage} 
              className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 flex items-center gap-3 bg-card border-t border-border/40 sticky bottom-0 z-20 shrink-0"
            >
              <input
                type="text"
                placeholder="Write a message..."
                value={newMessage}
                onChange={handleInputChange}
                className="flex-1 bg-card border border-border/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 font-medium"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="px-5 py-3 bg-foreground text-background disabled:opacity-50 disabled:hover:opacity-50 hover:opacity-90 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span className="hidden sm:inline">Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-6 p-8">
            <div className="w-20 h-20 bg-secondary rounded-[2rem] flex items-center justify-center shadow-lg border border-border/40 hover:scale-105 transition-transform duration-500">
              <MessageSquare className="w-10 h-10 text-muted-foreground/60" />
            </div>
            <div className="text-center space-y-2 max-w-sm">
              <h2 className="text-2xl font-black italic tracking-tight text-foreground">Zenith Chat Terminal</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect securely with recruiters and other professionals. Select a chat from the left panel or click the "+" button to initiate a new thread with your connections.
              </p>
            </div>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-5 py-2.5 bg-foreground text-background rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-md"
            >
              Start A New Chat
            </button>
          </div>
        )}
      </div>

      {/* NEW CHAT MODAL OVERLAY */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 flex flex-col max-h-[80vh] relative animate-in zoom-in-95 duration-200">
            {/* Modal close */}
            <button
              onClick={() => {
                setShowNewChatModal(false);
                setNewChatSearch("");
              }}
              className="absolute top-4 right-4 p-2 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-xl font-bold italic tracking-tight mb-4 flex items-center gap-2">
              Start Conversation
            </h2>

            {/* Connection filter search input */}
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search connections..."
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                className="w-full bg-secondary/50 border border-border/80 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 font-medium"
              />
            </div>

            {/* Connection list scroll feed */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/20 max-h-[350px]">
              {filteredConnections.length > 0 ? (
                filteredConnections.map((conn) => {
                  const photo = getPhotoUrl(conn.user.profilePhotoUrl);
                  return (
                    <button
                      key={conn.id}
                      onClick={() => {
                        selectConversation(conn.user);
                        setShowNewChatModal(false);
                        setNewChatSearch("");
                      }}
                      className="w-full text-left p-3 hover:bg-secondary/50 rounded-xl flex items-center gap-3.5 transition-colors group"
                    >
                      <div className="relative shrink-0">
                        <div className="h-10 w-10 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shadow-sm">
                          {photo ? (
                            <img src={photo} alt={conn.user.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="font-bold text-xs text-muted-foreground">{getInitials(conn.user.fullName)}</div>
                          )}
                        </div>
                        {onlineUserIds.includes(conn.user.userId) && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background shadow-md shadow-green-500/20 z-20" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm truncate leading-tight group-hover:text-primary transition-colors">
                          {conn.user.fullName}
                        </h4>
                        <p className="text-muted-foreground text-[10px] truncate">
                          {conn.user.headline || "Zenith Operative"}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-4">
                  <User className="w-8 h-8 opacity-30" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold">No connections match search</p>
                    <p className="text-[10px] text-muted-foreground/60 max-w-[240px] mx-auto">
                      Search active connections. Chat is currently available with accepted connections.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-4 min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm animate-pulse">Establishing chat framework...</p>
      </div>
    }>
      <ChatContainer />
    </Suspense>
  );
}
