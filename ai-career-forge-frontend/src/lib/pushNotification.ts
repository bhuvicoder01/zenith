import api from './api';

/**
 * Converts a base64 URL-safe string to a Uint8Array.
 * Required to pass the VAPID public key to the pushManager subscribe call.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the Service Worker.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;

  if ('serviceWorker' in navigator) {
    try {
      // Register sw.js from the public directory
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('[Service Worker] Registered successfully with scope:', registration.scope);
      return registration;
    } catch (err) {
      console.error('[Service Worker] Registration failed:', err);
      return null;
    }
  }
  return null;
}

/**
 * Requests notification permission and registers Web Push subscription.
 */
export async function subscribeUserToPush(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined') return null;

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Service Workers or Push Messaging not supported by this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      console.warn('[Push] Service Worker ready registration not found.');
      return null;
    }

    // 1. Request Notification Permission
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.log('[Push] Notification permission not granted. State:', permission);
      return null;
    }

    // 2. Fetch VAPID Public Key from Backend
    const vapidKeyRes = await api.get('/notifications/vapid-public-key');
    const vapidPublicKey = vapidKeyRes.data.publicKey;

    if (!vapidPublicKey) {
      console.error('[Push] VAPID public key not returned by backend.');
      return null;
    }

    // 3. Subscribe user on browser push service
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as any
    });

    console.log('[Push] Browser subscription established:', subscription);

    // 4. Send subscription JSON payload to Spring Boot backend
    const subJson = subscription.toJSON();
    await api.post('/notifications/subscribe', subJson);
    console.log('[Push] Backend subscription registered successfully.');

    return subscription;
  } catch (err) {
    console.error('[Push] Failed to register subscription:', err);
    return null;
  }
}

/**
 * Unsubscribes the user from push notifications.
 */
export async function unsubscribeUserFromPush(): Promise<void> {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        // Unsubscribe from browser manager
        await subscription.unsubscribe();
        
        // Notify backend to remove subscription
        await api.post('/notifications/unsubscribe', { endpoint });
        console.log('[Push] User unsubscribed from push notifications successfully.');
      }
    } catch (err) {
      console.error('[Push] Error during unsubscribe process:', err);
    }
  }
}
