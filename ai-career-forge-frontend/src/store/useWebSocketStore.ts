import { create } from 'zustand';
import { toast } from 'sonner';
import api from '@/lib/api';
import useAuthStore from './useAuthStore';
import { deriveSharedKey, decryptMessage } from '@/lib/e2ee';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

export interface PrepStatus {
  step: "STARTING" | "AI_GENERATION" | "PDF_RENDERING" | "COMPLETED" | "FAILED" | "";
  title: string;
  message: string;
  company?: string;
  applicationId?: string;
  error?: string;
}

interface WebSocketStore {
  socket: WebSocket | null;
  isConnected: boolean;
  notifications: NotificationItem[];
  unreadMessageCount: number;
  onlineUserIds: string[];
  prepStatus: PrepStatus | null;
  showPrepDialog: boolean;
  setPrepStatus: (status: PrepStatus | null) => void;
  setShowPrepDialog: (show: boolean) => void;
  connect: (routerPush?: (url: string) => void) => void;
  disconnect: () => void;
  loadSavedNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  fetchUnreadMessageCount: () => Promise<void>;
  setUnreadMessageCount: (count: number) => void;
  fetchOnlineUsers: () => Promise<void>;
  activeChatUserId: string | null;
  setActiveChatUserId: (userId: string | null) => void;
  sendTypingStatus: (receiverId: string, isTyping: boolean) => void;
}

let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  notifications: [],
  unreadMessageCount: 0,
  onlineUserIds: [],
  activeChatUserId: null,
  prepStatus: null,
  showPrepDialog: false,
  setPrepStatus: (prepStatus) => set({ prepStatus }),
  setShowPrepDialog: (showPrepDialog) => set({ showPrepDialog }),
  setActiveChatUserId: (userId) => set({ activeChatUserId: userId }),
  sendTypingStatus: (receiverId, isTyping) => {
    const socket = get().socket;
    const isConnected = get().isConnected;
    if (socket && isConnected && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'TYPING',
        data: {
          receiverId,
          isTyping
        }
      }));
    }
  },

  fetchOnlineUsers: async () => {
    try {
      const res = await api.get('/messages/presence');
      set({ onlineUserIds: res.data || [] });
    } catch (err) {
      console.error('Failed to fetch online presence:', err);
    }
  },

  loadSavedNotifications: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zenith_notifications');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((n: any) => n.type !== 'PRESENCE' && n.type !== 'SYSTEM');
            set({ notifications: filtered });
            localStorage.setItem('zenith_notifications', JSON.stringify(filtered));
          } else {
            set({ notifications: parsed });
          }
        } catch (e) {
          console.error('Failed to parse saved notifications:', e);
        }
      }
    }
  },

  fetchUnreadMessageCount: async () => {
    try {
      const res = await api.get('/messages/unread-count');
      set({ unreadMessageCount: res.data.unreadCount || 0 });
    } catch (err) {
      console.error('Failed to fetch unread message count:', err);
    }
  },

  setUnreadMessageCount: (count: number) => {
    set({ unreadMessageCount: Math.max(0, count) });
  },

  connect: (routerPush) => {
    // Don't connect if already connected or connecting
    if (get().isConnected || get().socket) return;

    // Load initial list from local storage first
    get().loadSavedNotifications();
    get().fetchUnreadMessageCount();
    get().fetchOnlineUsers();

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    const wsUrl = `${baseUrl
      .replace('/api/v1', '/ws/app')
      .replace('http://', 'ws://')
      .replace('https://', 'wss://')}?token=${token}`;

    try {
      const socket = new WebSocket(wsUrl);
      set({ socket });

      socket.onopen = () => {
        console.log('Zenith App-wide WebSocket channel open.');
        set({ isConnected: true });
        reconnectAttempts = 0;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received socket payload:', data);

          if (data.type === 'PREP_STATUS') {
            if (data.data) {
               set({
                 prepStatus: {
                   step: data.data.step,
                   title: data.title || "",
                   message: data.message || "",
                   company: data.data.company || get().prepStatus?.company,
                   applicationId: data.data.applicationId || get().prepStatus?.applicationId,
                   error: data.data.error || ""
                 },
                 showPrepDialog: true
               });
            }
            return;
          }

          if (data.type === 'SYSTEM') {
            if (data.data && data.data.onlineUserIds) {
              set({ onlineUserIds: data.data.onlineUserIds });
            }
            console.log('Live Connection:', data.message);
            return;
          }

          if (data.type === 'PRESENCE') {
            const { userId, status } = data.data;
            if (userId) {
              set(state => {
                const current = [...state.onlineUserIds];
                if (status === 'ONLINE') {
                  if (!current.includes(userId)) {
                    current.push(userId);
                  }
                } else {
                  const idx = current.indexOf(userId);
                  if (idx > -1) {
                    current.splice(idx, 1);
                  }
                }
                return { onlineUserIds: current };
              });
            }
            return;
          }

          // Handle MESSAGE, READ & TYPING events
          if (data.type === 'MESSAGE' || data.type === 'READ' || data.type === 'TYPING') {
            // Dispatch a custom event for active chat window updates
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('zenith-app-message', { detail: data }));
            }

            if (data.type === 'MESSAGE') {
              // Ignore if we are the sender
              const currentUserId = useAuthStore.getState().user?.id;
              if (currentUserId && data.data.senderId === currentUserId) {
                return;
              }

              // Check if user is currently on the messages page
              const isChatPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard/messages');
              const isCurrentChat = isChatPage && get().activeChatUserId === data.data.senderId;
              
              // Re-fetch the correct unread chat count from the backend if not actively viewing the current chat
              if (!isCurrentChat) {
                get().fetchUnreadMessageCount();
              }

              // Decrypt notification payload if encrypted
              const triggerNotification = async () => {
                let displayMsg = data.message;
                if (data.data.content && data.data.content.startsWith('{"encrypted":true')) {
                  try {
                    const myPrivateKeyJwk = JSON.parse(localStorage.getItem("zenith_e2ee_private_key") || "null");
                    const theirPublicKeyJwk = JSON.parse(data.data.senderPublicKey || "null");
                    if (myPrivateKeyJwk && theirPublicKeyJwk) {
                      const sharedKey = await deriveSharedKey(myPrivateKeyJwk, theirPublicKeyJwk);
                      const decrypted = await decryptMessage(data.data.content, sharedKey);
                      // Decrypted successfully, let's extract rich content text
                      if (decrypted.startsWith("[GIF]")) {
                        displayMsg = "[GIF]";
                      } else if (decrypted.startsWith("[STICKER]")) {
                        displayMsg = "[Sticker]";
                      } else if (decrypted.startsWith('{"type":"REPLY"')) {
                        try {
                          const parsed = JSON.parse(decrypted);
                          displayMsg = parsed.text || "Replied to a message";
                        } catch (e) {
                          displayMsg = "Replied to a message";
                        }
                      } else {
                        displayMsg = decrypted;
                      }
                    }
                  } catch (decryptErr) {
                    console.error("Failed to decrypt live notification message:", decryptErr);
                  }
                }

                // Show alerts and add to feed if not currently viewing this specific conversation
                if (!isCurrentChat) {
                  // Show native browser desktop notification ONLY if tab is out of focus
                  const isUserOffline = typeof document !== 'undefined' && !document.hasFocus();
                  if (isUserOffline) {
                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                      navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(`New message from ${data.title || 'Connection'}`, {
                          body: displayMsg,
                          icon: '/zenith-favicon.png',
                          badge: '/zenith-favicon.png',
                          data: { url: `/dashboard/messages?userId=${data.data.senderId}` }
                        });
                      }).catch(err => {
                        console.error('Failed to trigger native message notification via worker:', err);
                      });
                    }
                  }

                  // Always show a toast popup when outside the chat window
                  toast.info(`New message from ${data.title || 'Connection'}`, {
                    description: displayMsg,
                    action: routerPush ? {
                      label: 'Reply',
                      onClick: () => routerPush(`/dashboard/messages?userId=${data.data.senderId}`)
                    } : undefined,
                    duration: 5000,
                  });

                  // Save as a notification item so it shows up in their Feed
                  const newNotif: NotificationItem = {
                    id: `msg_${data.data.id || Date.now().toString()}`,
                    type: 'NEW_MESSAGE',
                    title: `New Message from ${data.title || 'Connection'}`,
                    message: displayMsg || '',
                    timestamp: data.timestamp || new Date().toISOString(),
                    read: false,
                    data: data.data,
                  };

                  const updatedNotifications = [newNotif, ...get().notifications];
                  set({ notifications: updatedNotifications });
                  localStorage.setItem('zenith_notifications', JSON.stringify(updatedNotifications));
                }
              };

              triggerNotification();
            }
            return;
          }

          // Handle POST_UPDATE events (real-time like/comment count sync)
          if (data.type === 'POST_UPDATE') {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('zenith-post-update', { detail: data.data }));
            }
            return;
          }

          // Persist and handle notification items
          if (data.type === 'PRESENCE' || data.type === 'SYSTEM') {
            return;
          }

          const newNotif: NotificationItem = {
            id: data.id || Date.now().toString(),
            type: data.type,
            title: data.title || 'System Notification',
            message: data.message || '',
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
            data: data.data,
          };

          // Save in state & localStorage
          const updatedNotifications = [newNotif, ...get().notifications];
          set({ notifications: updatedNotifications });
          localStorage.setItem('zenith_notifications', JSON.stringify(updatedNotifications));

          // Show native browser desktop notification via service worker if tab is blurred/out of focus
          const isUserOffline = typeof document !== 'undefined' && !document.hasFocus();
          if (isUserOffline && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification(data.title || 'System Notification', {
                body: data.message || '',
                icon: '/zenith-favicon.png',
                badge: '/zenith-favicon.png',
                data: { url: data.type === 'CONNECTION_REQUEST' || data.type === 'CONNECTION_ACCEPTED' ? '/dashboard/connections' : '/dashboard' }
              });
            }).catch(err => {
              console.error('Failed to trigger native system notification via worker:', err);
            });
          }

          // Toast Alerts
          if (data.type === 'CONNECTION_REQUEST') {
            toast.info(data.message || 'New connection invite received!', {
              action: routerPush ? {
                label: 'View',
                onClick: () => routerPush('/dashboard/connections')
              } : undefined,
              duration: 8000,
            });
          } else if (data.type === 'CONNECTION_ACCEPTED') {
            toast.success(data.message || 'Connection invitation accepted!', {
              action: routerPush ? {
                label: 'View Network',
                onClick: () => routerPush('/dashboard/connections')
              } : undefined,
              duration: 8000,
            });
          } else if (data.type === 'NEWS') {
            toast(data.title || 'Zenith Broadcast', {
              description: data.message,
              duration: 10000,
            });
          } else {
            toast(data.title || 'Alert', {
              description: data.message,
            });
          }
        } catch (err) {
          console.error('Failed to parse socket message:', err);
        }
      };

      socket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.reason || 'No reason given'}`);
        set({ socket: null, isConnected: false });
        
        // Reconnect logic
        if (localStorage.getItem('auth_token')) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Attempting reconnection in ${delay / 1000}s...`);
          reconnectAttempts++;
          reconnectTimeout = setTimeout(() => {
            get().connect(routerPush);
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket encountered an error:', error);
        socket.close();
      };

    } catch (err) {
      console.error('Failed to initialize WebSocket client:', err);
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    set({ socket: null, isConnected: false });
    reconnectAttempts = 0;
  },

  markAsRead: (id) => {
    const updated = get().notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    set({ notifications: updated });
    localStorage.setItem('zenith_notifications', JSON.stringify(updated));
  },

  markAllAsRead: () => {
    const updated = get().notifications.map(n => ({ ...n, read: true }));
    set({ notifications: updated });
    localStorage.setItem('zenith_notifications', JSON.stringify(updated));
  },

  deleteNotification: (id) => {
    const updated = get().notifications.filter(n => n.id !== id);
    set({ notifications: updated });
    localStorage.setItem('zenith_notifications', JSON.stringify(updated));
  },

  clearAll: () => {
    set({ notifications: [] });
    localStorage.removeItem('zenith_notifications');
  },
}));
