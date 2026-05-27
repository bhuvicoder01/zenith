import { create } from 'zustand';
import { toast } from 'sonner';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

interface NotificationStore {
  socket: WebSocket | null;
  isConnected: boolean;
  notifications: NotificationItem[];
  connect: (routerPush?: (url: string) => void) => void;
  disconnect: () => void;
  loadSavedNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  socket: null,
  isConnected: false,
  notifications: [],

  loadSavedNotifications: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zenith_notifications');
      if (saved) {
        try {
          set({ notifications: JSON.parse(saved) });
        } catch (e) {
          console.error('Failed to parse saved notifications:', e);
        }
      }
    }
  },

  connect: (routerPush) => {
    // Don't connect if already connected or connecting
    if (get().isConnected || get().socket) return;

    // Load initial list from local storage first
    get().loadSavedNotifications();

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    const wsUrl = `${baseUrl
      .replace('/api/v1', '/ws/notifications')
      .replace('http://', 'ws://')
      .replace('https://', 'wss://')}?token=${token}`;

    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('Zenith WebSocket Notification channel open.');
        set({ socket, isConnected: true });
        reconnectAttempts = 0;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received notification:', data);

          if (data.type === 'SYSTEM') {
            console.log('Live Connection:', data.message);
            return; // Don't persist heartbeat system checks
          }

          // Build notification item
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
