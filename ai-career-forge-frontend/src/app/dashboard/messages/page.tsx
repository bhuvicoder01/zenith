"use client";

import { useState, useEffect, useRef, Suspense, useLayoutEffect, Fragment } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Search, Send, MessageSquare, ArrowLeft, User, Loader2, 
  ExternalLink, Mail, Circle, PhoneCall, Plus, X, CheckCheck, Trash2, Menu,
  Globe, ArrowRight, Image as ImageIcon, CornerUpLeft, MoreVertical
} from "lucide-react";
import api, { BACKEND_URL } from "@/lib/api";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import Link from "next/link";
import GifStickerPicker from "@/components/GifStickerPicker";
import { generateE2eeKeyPair, deriveSharedKey, encryptMessage, decryptMessage } from "@/lib/e2ee";

interface PublicProfile {
  userId: string;
  username?: string;
  fullName: string;
  headline: string;
  profilePhotoUrl?: string;
  skills?: string[];
  lastOnline?: string;
  e2eePublicKey?: string;
}

interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  readAt?: string;
  isE2ee?: boolean;
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
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<DirectMessage | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isInitialLoadRef = useRef(true);
  const intersectingMessageIdsRef = useRef<Set<string>>(new Set());
  const [visibleTimeMessageId, setVisibleTimeMessageId] = useState<string | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement>(null);

  const sharedKeysRef = useRef<Record<string, CryptoKey>>({});

  const { socket, isConnected, fetchUnreadMessageCount, onlineUserIds, setActiveChatUserId, sendTypingStatus } = useWebSocketStore();
  const { user } = useAuthStore();
  const currentUserId = user?.id;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localTypingStateRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeSwipeElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchConversations();
    fetchConnections();
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // E2EE Key Enrollment & Self-Healing Sync
  useEffect(() => {
    const enrollE2ee = async () => {
      if (typeof window === "undefined") return;
      let myPrivateKey = localStorage.getItem("zenith_e2ee_private_key");
      let myPublicKey = localStorage.getItem("zenith_e2ee_public_key");

      try {
        // 1. Fetch user's own profile to check vault status
        const res = await api.get("/profile");
        const profile = res.data;

        if (profile.e2eePrivateKey && profile.e2eePublicKey) {
          // If keys exist on the server, recover/restore them to local storage if they are missing
          if (!myPrivateKey || !myPublicKey) {
            console.log("E2EE: Restoring encryption key agreement pair from vault...");
            myPrivateKey = profile.e2eePrivateKey;
            myPublicKey = profile.e2eePublicKey;
            localStorage.setItem("zenith_e2ee_private_key", myPrivateKey!);
            localStorage.setItem("zenith_e2ee_public_key", myPublicKey!);
          }
        }

        // 2. If keys are missing everywhere, generate new ones
        if (!myPrivateKey || !myPublicKey) {
          console.log("E2EE: Initializing new key agreement pair...");
          const keys = await generateE2eeKeyPair();
          myPrivateKey = JSON.stringify(keys.privateKeyJwk);
          myPublicKey = JSON.stringify(keys.publicKeyJwk);
          localStorage.setItem("zenith_e2ee_private_key", myPrivateKey);
          localStorage.setItem("zenith_e2ee_public_key", myPublicKey);

          console.log("E2EE: Vaulting new encryption keypair to the server...");
          await api.post("/profile/e2ee-key", { publicKey: myPublicKey, privateKey: myPrivateKey });
          fetchConversations();
        } else if (profile.e2eePublicKey !== myPublicKey || profile.e2eePrivateKey !== myPrivateKey) {
          // 3. Self-heal key synchronization if database keys differ from localStorage
          console.log("E2EE: Syncing local encryption keys to server vault...");
          await api.post("/profile/e2ee-key", { publicKey: myPublicKey, privateKey: myPrivateKey });
          fetchConversations();
        }
      } catch (err) {
        console.error("E2EE: Failed to verify or restore E2EE key vault:", err);
      }
    };
    enrollE2ee();
  }, []);

  const decryptMessageItem = async (msg: DirectMessage, partner: PublicProfile): Promise<DirectMessage> => {
    if (!msg.content.startsWith('{"encrypted":true')) {
      return msg;
    }
    try {
      let sharedKey = sharedKeysRef.current[partner.userId];
      if (!sharedKey) {
        const myPrivateKeyJwk = JSON.parse(localStorage.getItem("zenith_e2ee_private_key") || "null");
        const theirPublicKeyJwk = JSON.parse(partner.e2eePublicKey || "null");
        if (myPrivateKeyJwk && theirPublicKeyJwk) {
          sharedKey = await deriveSharedKey(myPrivateKeyJwk, theirPublicKeyJwk);
          sharedKeysRef.current[partner.userId] = sharedKey;
        }
      }
      if (sharedKey) {
        const plaintext = await decryptMessage(msg.content, sharedKey);
        return { ...msg, content: plaintext, isE2ee: true };
      }
    } catch (e) {
      console.error("E2EE: Failed to decrypt message content:", e);
    }
    return { ...msg, content: "[Encrypted Message]", isE2ee: true };
  };

  const decryptMessageList = async (msgList: DirectMessage[], partner: PublicProfile): Promise<DirectMessage[]> => {
    return await Promise.all(msgList.map(msg => decryptMessageItem(msg, partner)));
  };

  const decryptConversationItem = async (conv: Conversation): Promise<Conversation> => {
    if (!conv.lastMessage || !conv.lastMessage.content.startsWith('{"encrypted":true')) {
      return conv;
    }
    try {
      let sharedKey = sharedKeysRef.current[conv.otherUser.userId];
      if (!sharedKey) {
        const myPrivateKeyJwk = JSON.parse(localStorage.getItem("zenith_e2ee_private_key") || "null");
        const theirPublicKeyJwk = JSON.parse(conv.otherUser.e2eePublicKey || "null");
        if (myPrivateKeyJwk && theirPublicKeyJwk) {
          sharedKey = await deriveSharedKey(myPrivateKeyJwk, theirPublicKeyJwk);
          sharedKeysRef.current[conv.otherUser.userId] = sharedKey;
        }
      }
      if (sharedKey) {
        const plaintext = await decryptMessage(conv.lastMessage.content, sharedKey);
        return {
          ...conv,
          lastMessage: { ...conv.lastMessage, content: plaintext, isE2ee: true }
        };
      }
    } catch (e) {
      console.error("E2EE: Failed to decrypt last message snippet:", e);
    }
    return {
      ...conv,
      lastMessage: { ...conv.lastMessage, content: "[Encrypted Message]", isE2ee: true }
    };
  };

  const decryptConversationList = async (convList: Conversation[]): Promise<Conversation[]> => {
    return await Promise.all(convList.map(conv => decryptConversationItem(conv)));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target as Node)) {
        setShowChatMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          decryptMessageItem(msg, activeUser).then((decryptedMsg) => {
            setMessages(prev => {
              // Prevent duplicates
              if (prev.some(m => m.id === decryptedMsg.id)) return prev;
              return [...prev, decryptedMsg];
            });
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
        const readAt = payload.data?.readAt;
        if (activeUser && readerId === activeUser.userId) {
          // Mark all our sent messages to this user as read
          setMessages(prev => 
            prev.map(m => m.senderId === currentUserId ? { ...m, read: true, readAt: readAt || m.readAt || new Date().toISOString() } : m)
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
    setReplyingToMessage(null);
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
          const decryptedOlder = await decryptMessageList(olderMessages, activeUser);
          setMessages(prev => {
            const newMsgs = decryptedOlder.filter((m: DirectMessage) => !prev.some(p => p.id === m.id));
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
      const decrypted = await decryptConversationList(res.data);
      setConversations(decrypted);
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
      const decrypted = await decryptMessageList(res.data, otherUser);
      setMessages(decrypted);
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

    let content = newMessage.trim();
    if (replyingToMessage) {
      const originalTextSnippet = (() => {
        if (replyingToMessage.content.startsWith('{"type":"POST_SHARE"')) {
          return "[Shared Post]";
        }
        if (replyingToMessage.content.startsWith("[GIF]")) {
          return "[GIF]";
        }
        if (replyingToMessage.content.startsWith("[STICKER]")) {
          return "[STICKER]";
        }
        if (replyingToMessage.content.startsWith('{"type":"REPLY"')) {
          try {
            const parsed = JSON.parse(replyingToMessage.content);
            return parsed.text;
          } catch (e) {
            return replyingToMessage.content;
          }
        }
        return replyingToMessage.content;
      })();

      content = JSON.stringify({
        type: "REPLY",
        replyToMessageId: replyingToMessage.id,
        replyToSenderName: replyingToMessage.senderId === currentUserId ? "You" : activeUser.fullName,
        replyToContent: originalTextSnippet,
        text: content
      });
    }

    setNewMessage("");
    setReplyingToMessage(null);
    setSending(true);

    try {
      let payloadContent = content;
      if (activeUser.e2eePublicKey) {
        try {
          let sharedKey = sharedKeysRef.current[activeUser.userId];
          if (!sharedKey) {
            const myPrivateKeyJwk = JSON.parse(localStorage.getItem("zenith_e2ee_private_key") || "null");
            const theirPublicKeyJwk = JSON.parse(activeUser.e2eePublicKey);
            if (myPrivateKeyJwk && theirPublicKeyJwk) {
              sharedKey = await deriveSharedKey(myPrivateKeyJwk, theirPublicKeyJwk);
              sharedKeysRef.current[activeUser.userId] = sharedKey;
            }
          }
          if (sharedKey) {
            payloadContent = await encryptMessage(content, sharedKey);
          }
        } catch (encryptErr) {
          console.error("E2EE Encryption failed, sending plaintext fallback:", encryptErr);
        }
      }

      const res = await api.post("/messages/send", {
        receiverId: activeUser.userId,
        content: payloadContent
      });
      
      const sentMsg = res.data;
      const localMsg = {
        ...sentMsg,
        content: content,
        isE2ee: !!activeUser.e2eePublicKey
      };

      setMessages(prev => {
        if (prev.some(m => m.id === localMsg.id)) return prev;
        return [...prev, localMsg];
      });

      // Update conversations list so this partner is at the top with updated snippet
      setConversations(prev => {
        const filtered = prev.filter(c => c.otherUser.userId !== activeUser.userId);
        const updatedConv: Conversation = {
          otherUser: activeUser,
          lastMessage: localMsg,
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

  const sendGifOrSticker = async (url: string, type: "gif" | "sticker") => {
    if (!activeUser || sending) return;
    let content = type === "gif" ? `[GIF]${url}` : `[STICKER]${url}`;
    if (replyingToMessage) {
      const originalTextSnippet = (() => {
        if (replyingToMessage.content.startsWith('{"type":"POST_SHARE"')) {
          return "[Shared Post]";
        }
        if (replyingToMessage.content.startsWith("[GIF]")) {
          return "[GIF]";
        }
        if (replyingToMessage.content.startsWith("[STICKER]")) {
          return "[STICKER]";
        }
        if (replyingToMessage.content.startsWith('{"type":"REPLY"')) {
          try {
            const parsed = JSON.parse(replyingToMessage.content);
            return parsed.text;
          } catch (e) {
            return replyingToMessage.content;
          }
        }
        return replyingToMessage.content;
      })();

      content = JSON.stringify({
        type: "REPLY",
        replyToMessageId: replyingToMessage.id,
        replyToSenderName: replyingToMessage.senderId === currentUserId ? "You" : activeUser.fullName,
        replyToContent: originalTextSnippet,
        text: content
      });
    }

    setReplyingToMessage(null);
    setSending(true);

    try {
      let payloadContent = content;
      if (activeUser.e2eePublicKey) {
        try {
          let sharedKey = sharedKeysRef.current[activeUser.userId];
          if (!sharedKey) {
            const myPrivateKeyJwk = JSON.parse(localStorage.getItem("zenith_e2ee_private_key") || "null");
            const theirPublicKeyJwk = JSON.parse(activeUser.e2eePublicKey);
            if (myPrivateKeyJwk && theirPublicKeyJwk) {
              sharedKey = await deriveSharedKey(myPrivateKeyJwk, theirPublicKeyJwk);
              sharedKeysRef.current[activeUser.userId] = sharedKey;
            }
          }
          if (sharedKey) {
            payloadContent = await encryptMessage(content, sharedKey);
          }
        } catch (encryptErr) {
          console.error("E2EE Encryption failed for GIF/Sticker:", encryptErr);
        }
      }

      const res = await api.post("/messages/send", {
        receiverId: activeUser.userId,
        content: payloadContent
      });
      
      const sentMsg = res.data;
      const localMsg = {
        ...sentMsg,
        content: content,
        isE2ee: !!activeUser.e2eePublicKey
      };

      setMessages(prev => {
        if (prev.some(m => m.id === localMsg.id)) return prev;
        return [...prev, localMsg];
      });

      setConversations(prev => {
        const filtered = prev.filter(c => c.otherUser.userId !== activeUser.userId);
        const updatedConv: Conversation = {
          otherUser: activeUser,
          lastMessage: localMsg,
          unreadCount: 0
        };
        return [updatedConv, ...filtered];
      });
    } catch (err) {
      console.error("Failed to send GIF/Sticker message:", err);
      toast.error("Failed to send message");
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
        return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
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
        minute: "2-digit",
        hour12: false
      });
    } catch (e) {
      return "";
    }
  };

  const formatLastMessageSnippet = (content?: string) => {
    if (!content) return "Click to start conversation";
    const trimmed = content.trim();
    if (trimmed.startsWith('{"encrypted":true')) {
      return "🔒 [Encrypted Message]";
    }
    if (trimmed.startsWith('{"type":"POST_SHARE"')) {
      try {
        const parsed = JSON.parse(trimmed);
        return `Sent a post by ${parsed.postAuthor || "unknown"}`;
      } catch (e) {
        return "Sent a post";
      }
    }
    if (trimmed.startsWith('{"type":"REPLY"')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed.text || "";
      } catch (e) {
        return content;
      }
    }
    if (trimmed.startsWith("[GIF]")) {
      return "[GIF]";
    }
    if (trimmed.startsWith("[STICKER]")) {
      return "[Sticker]";
    }
    return content;
  };

  const handleTouchStart = (e: React.TouchEvent, isSelf: boolean) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    
    const container = e.currentTarget as HTMLDivElement;
    const innerRow = container.firstElementChild;
    if (!innerRow) return;
    const bubble = innerRow.firstElementChild as HTMLDivElement;
    if (bubble) {
      activeSwipeElRef.current = bubble;
      bubble.style.transition = "none";
    }
  };

  const handleTouchMove = (e: React.TouchEvent, isSelf: boolean) => {
    if (!touchStartRef.current || !activeSwipeElRef.current) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(diffY) > Math.abs(diffX)) return;
    
    // Inward check:
    // If self (on right), swipe direction should be left (diffX < 0)
    // If other (on left), swipe direction should be right (diffX > 0)
    if (isSelf && diffX > 0) return;
    if (!isSelf && diffX < 0) return;

    if (Math.abs(diffX) > 10) {
      if (e.cancelable) e.preventDefault();
    }

    const offset = isSelf ? Math.max(-80, diffX) : Math.min(80, diffX);
    activeSwipeElRef.current.style.transform = `translateX(${offset}px)`;
  };

  const handleTouchEnd = (e: React.TouchEvent, msg: DirectMessage, isSelf: boolean) => {
    if (!touchStartRef.current || !activeSwipeElRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;

    const bubble = activeSwipeElRef.current;
    bubble.style.transition = "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)";
    bubble.style.transform = "translateX(0)";

    // Trigger reply if swiped past inward threshold (50px)
    const triggered = isSelf ? (diffX < -50) : (diffX > 50);
    if (triggered) {
      setReplyingToMessage(msg);
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        try {
          window.navigator.vibrate(15);
        } catch (err) {}
      }
    }

    touchStartRef.current = null;
    activeSwipeElRef.current = null;
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
                    
                    {onlineUserIds.includes(other.userId) ? (
                      <p className={`text-[10px] truncate leading-tight font-black uppercase tracking-wider ${
                        isActive ? 'text-emerald-300' : 'text-emerald-500'
                      }`}>
                        Online
                      </p>
                    ) : (
                      <p className={`text-[10px] truncate leading-tight font-semibold ${
                        isActive ? 'text-background/70' : 'text-muted-foreground/70'
                      }`}>
                        {formatLastSeen(other.lastOnline)}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <p className={`text-xs truncate max-w-[180px] lg:max-w-[220px] ${
                        conv.unreadCount > 0 && !isActive
                          ? "font-black text-foreground"
                          : isActive ? "text-background/90" : "text-muted-foreground/60"
                      }`}>
                        {formatLastMessageSnippet(conv.lastMessage?.content)}
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
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-border/60 flex items-center justify-between gap-3 bg-secondary/5 z-20 relative select-none">
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
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden shadow-sm">
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
                   <h3 className="font-bold text-sm sm:text-base leading-tight truncate flex items-center gap-1.5">
                     {activeUser.fullName}
                     {activeUser.e2eePublicKey && (
                       <span className="text-[10px] text-emerald-500 font-extrabold uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 select-none shrink-0" title="End-to-End Encrypted">
                         🔒 e2ee
                       </span>
                     )}
                   </h3>
                   {onlineUserIds.includes(activeUser.userId) ? (
                     <p className="text-[10px] sm:text-xs text-emerald-500 font-extrabold uppercase tracking-wider select-none mt-0.5">
                       Online
                     </p>
                   ) : (
                     <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold select-none mt-0.5">
                       {formatLastSeen(activeUser.lastOnline)}
                     </p>
                   )}
                 </div>
              </div>

              {/* Actions Menu */}
              <div className="relative shrink-0" ref={chatMenuRef}>
                <button
                  onClick={() => setShowChatMenu(!showChatMenu)}
                  className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center justify-center border border-border/40 hover:border-border/80 shadow-sm bg-card/50"
                  title="Conversation Actions"
                >
                  <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {showChatMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-card border border-border shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <Link
                      href={`/public/profiles/${activeUser.username || activeUser.userId}`}
                      onClick={() => setShowChatMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-colors w-full text-left"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      View Profile
                    </Link>
                    <button
                      onClick={() => {
                        setShowChatMenu(false);
                        handleClearConversation();
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors w-full text-left border-t border-border/40"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear Conversation
                    </button>
                  </div>
                )}
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

                    // Parse reply payload if present
                    let replyInfo: any = null;
                    let messageBody = msg.content;
                    if (msg.content.trim().startsWith('{"type":"REPLY"')) {
                      try {
                        replyInfo = JSON.parse(msg.content);
                        messageBody = replyInfo.text;
                      } catch (e) {
                        // ignore
                      }
                    }

                    // Parse post share payload if present
                    let sharedPost: any = null;
                    if (messageBody.trim().startsWith('{"type":"POST_SHARE"')) {
                      try {
                        sharedPost = JSON.parse(messageBody);
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
                          onTouchStart={(e) => handleTouchStart(e, isSelf)}
                          onTouchMove={(e) => handleTouchMove(e, isSelf)}
                          onTouchEnd={(e) => handleTouchEnd(e, msg, isSelf)}
                          className={`flex flex-col max-w-[75%] sm:max-w-[65%] w-fit group relative cursor-pointer select-none ${
                            isSelf ? "ml-auto items-end" : "mr-auto items-start"
                          }`}
                        >
                          <div className={`flex items-center gap-2 w-full ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
                            {replyInfo ? (
                              /* Unified Reply Bubble (Handles Text, GIFs, Stickers, and Shared Posts inside a reply bubble) */
                              <div className={`p-3.5 rounded-2xl text-sm leading-relaxed relative w-fit shadow-sm flex flex-col gap-2 ${
                                isSelf 
                                  ? "bg-foreground text-background rounded-tr-none" 
                                  : "bg-card border border-border rounded-tl-none text-foreground"
                              }`}>
                                {/* Quote card header */}
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const originalMsgEl = document.querySelector(`[data-message-id="${replyInfo.replyToMessageId}"]`);
                                    if (originalMsgEl) {
                                      originalMsgEl.scrollIntoView({ behavior: "smooth", block: "center" });
                                      originalMsgEl.classList.add("bg-primary/25", "dark:bg-primary/30", "scale-102");
                                      setTimeout(() => {
                                        originalMsgEl.classList.remove("bg-primary/25", "dark:bg-primary/30", "scale-102");
                                      }, 1500);
                                    }
                                  }}
                                  className={`border-l-4 pl-2 py-1 rounded text-left transition-all duration-300 hover:opacity-90 cursor-pointer ${
                                    isSelf 
                                      ? "border-background/55 bg-background/10 text-background/90" 
                                      : "border-primary bg-secondary/40 text-foreground"
                                  }`}
                                >
                                  <div className={`text-[9px] font-black uppercase tracking-wider ${isSelf ? 'text-background/90' : 'text-primary'}`}>
                                    Replying to {replyInfo.replyToSenderName}
                                  </div>
                                  <div className="text-[11px] truncate max-w-[180px] sm:max-w-[220px] font-semibold mt-0.5">
                                    {replyInfo.replyToContent}
                                  </div>
                                </div>

                                {/* Reply Body Content */}
                                {sharedPost ? (
                                  <Link 
                                    href={`/posts/${sharedPost.postId}`}
                                    className={`block rounded-2xl text-xs overflow-hidden border border-border/80 shadow-md transition-all hover:border-primary/40 relative w-56 sm:w-64 hover:scale-[1.01] active:scale-[0.99] ${
                                      isSelf 
                                        ? "bg-card text-foreground rounded-tr-none" 
                                        : "bg-card text-foreground rounded-tl-none"
                                    }`}
                                  >
                                    {/* Card Header */}
                                    <div className="p-2 border-b border-border/50 bg-secondary/25 flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Globe className="w-3 h-3 text-primary shrink-0" />
                                        <span className="font-black uppercase tracking-tight truncate text-[9px]">
                                          {sharedPost.postAuthor}
                                        </span>
                                      </div>
                                      <span className="text-[8px] text-muted-foreground font-semibold shrink-0">Broadcast</span>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-2 space-y-1.5">
                                      {sharedPost.postText && (
                                        <p className="text-muted-foreground font-medium line-clamp-2 leading-relaxed text-[10px] select-text">
                                          {sharedPost.postText}
                                        </p>
                                      )}
                                      
                                      {sharedPost.postImage && (
                                        <div className="w-full h-20 overflow-hidden rounded border border-border/50 bg-secondary/10">
                                          <img 
                                            src={sharedPost.postImage} 
                                            alt="Shared attachment" 
                                            className="w-full h-full object-cover" 
                                          />
                                        </div>
                                      )}

                                      {/* Video Thumbnail */}
                                      {sharedPost.postVideoUrl && !sharedPost.postImage && (
                                        <div className="w-full h-20 overflow-hidden rounded border border-border/50 bg-black/90 relative group/vid">
                                          <video 
                                            src={sharedPost.postVideoUrl} 
                                            className="w-full h-full object-cover" 
                                            muted 
                                            preload="metadata"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </Link>
                                ) : messageBody?.startsWith("[GIF]") ? (
                                  <div className="rounded-xl overflow-hidden max-w-[180px] sm:max-w-[220px] border border-border/40 shadow-sm bg-secondary/15 mt-1">
                                    <img src={messageBody.slice(5)} alt="GIF" className="w-full h-auto object-contain max-h-40" />
                                  </div>
                                ) : messageBody?.startsWith("[STICKER]") ? (
                                  <div className="max-w-[90px] select-none p-0.5 mt-1">
                                    <img src={messageBody.slice(9)} alt="Sticker" className="w-full h-auto object-contain animate-pulse [animation-duration:3s]" />
                                  </div>
                                ) : (
                                  <p className="whitespace-pre-wrap select-text">{messageBody}</p>
                                )}
                              </div>
                            ) : (
                              /* Standard Direct Message (No Reply Quote) */
                              sharedPost ? (
                                  <Link 
                                    href={`/posts/${sharedPost.postId}`}
                                    className={`block rounded-2xl text-xs overflow-hidden border border-border/80 shadow-md transition-all hover:border-primary/40 relative w-64 sm:w-72 hover:scale-[1.01] active:scale-[0.99] ${
                                      isSelf 
                                        ? "bg-card text-foreground rounded-tr-none" 
                                        : "bg-card text-foreground rounded-tl-none"
                                    }`}
                                  >
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

                                      {/* Video Thumbnail */}
                                      {sharedPost.postVideoUrl && !sharedPost.postImage && (
                                        <div className="w-full h-28 overflow-hidden rounded-lg border border-border/50 bg-black/90 relative group/vid">
                                          <video 
                                            src={sharedPost.postVideoUrl} 
                                            className="w-full h-full object-cover" 
                                            muted 
                                            preload="metadata"
                                          />
                                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
                                            <span className="text-[8px] font-bold text-white/90 uppercase tracking-wider">Video</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </Link>
                              ) : messageBody?.startsWith("[GIF]") ? (
                                <div className="rounded-2xl overflow-hidden max-w-[200px] sm:max-w-[240px] border border-border shadow-md bg-secondary/10 mt-1">
                                  <img src={messageBody.slice(5)} alt="GIF" className="w-full h-auto object-contain max-h-48" />
                                </div>
                              ) : messageBody?.startsWith("[STICKER]") ? (
                                <div className="max-w-[100px] select-none p-1 mt-1">
                                  <img src={messageBody.slice(9)} alt="Sticker" className="w-full h-auto object-contain animate-pulse [animation-duration:3s]" />
                                </div>
                              ) : (
                                <div className={`p-3.5 rounded-2xl text-sm leading-relaxed relative w-fit shadow-sm ${
                                  isSelf 
                                    ? "bg-foreground text-background rounded-tr-none shadow-md" 
                                    : "bg-card border border-border rounded-tl-none text-foreground shadow-sm"
                                }`}>
                                  <p className="whitespace-pre-wrap select-text">{messageBody}</p>
                                </div>
                              )
                            )}

                            {/* Small Reply Button next to bubble */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyingToMessage(msg);
                              }}
                              className="hidden md:flex p-1.5 rounded-lg bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 shrink-0"
                              title="Reply to this message"
                            >
                              <CornerUpLeft className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          {/* Detailed time and checkmarks */}
                          <div className="flex items-center gap-1.5 mt-1 px-1">
                            {visibleTimeMessageId === msg.id && (
                              <span className="text-[9px] text-muted-foreground/60 font-semibold animate-in fade-in slide-in-from-top-1 duration-200 flex items-center gap-1">
                                <span>Sent {formatDetailedTime(msg.timestamp)}</span>
                                {msg.read && msg.readAt && (
                                  <span className="text-[9px] text-emerald-500 font-bold">
                                    • Seen {formatDetailedTime(msg.readAt)}
                                  </span>
                                )}
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
              className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 flex flex-col bg-card border-t border-border/40 sticky bottom-0 z-20 shrink-0"
            >
              {/* Replying to message preview bar */}
              {replyingToMessage && (
                <div className="w-full pb-3 flex items-center justify-between border-b border-border/40 mb-3 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex-1 border-l-4 border-primary pl-3 min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Replying to {replyingToMessage.senderId === currentUserId ? "you" : activeUser.fullName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-md mt-0.5 font-medium">
                      {(() => {
                        if (replyingToMessage.content.startsWith('{"type":"POST_SHARE"')) {
                          return "[Shared Post]";
                        }
                        if (replyingToMessage.content.startsWith("[GIF]")) {
                          return "[GIF]";
                        }
                        if (replyingToMessage.content.startsWith("[STICKER]")) {
                          return "[STICKER]";
                        }
                        if (replyingToMessage.content.startsWith('{"type":"REPLY"')) {
                          try {
                            const parsed = JSON.parse(replyingToMessage.content);
                            return parsed.text;
                          } catch (e) {
                            return replyingToMessage.content;
                          }
                        }
                        return replyingToMessage.content;
                      })()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingToMessage(null)}
                    className="p-1.5 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors ml-2"
                    title="Cancel reply"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowGifPicker(true)}
                  title="Add GIF or Sticker"
                  className="p-3 bg-secondary/40 hover:bg-secondary/70 border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all shrink-0 flex items-center justify-center h-[46px] w-[46px]"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
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
              </div>
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
      {showGifPicker && (
        <GifStickerPicker
          onSelect={(url, type) => {
            sendGifOrSticker(url, type);
            setShowGifPicker(false);
          }}
          onClose={() => setShowGifPicker(false)}
        />
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
