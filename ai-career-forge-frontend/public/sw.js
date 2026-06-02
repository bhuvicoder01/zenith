// ZENITH Service Worker for Web Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) {
    console.log('[Service Worker] Push event received with no data.');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.warn('[Service Worker] Push event data was not JSON:', event.data.text());
    data = {
      title: 'ZENITH Notification',
      body: event.data.text()
    };
  }

  const title = data.title || 'ZENITH Update';
  const options = {
    body: data.body || 'New alert from your Career Orchestrator.',
    icon: '/zenith-favicon.png',
    badge: '/zenith-favicon.png',
    data: data.data || { url: '/dashboard' },
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'open',
        title: 'Open App'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  let targetUrl = '/dashboard';
  if (event.notification.data && event.notification.data.url) {
    targetUrl = event.notification.data.url;
  }

  // Handle actions if clicked
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function (windowClients) {
      // If a window is already open at the site, focus it
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        let clientUrl = new URL(client.url);
        // Match base domain
        if (clientUrl.origin === self.location.origin) {
          if ('focus' in client) {
            // Send client to the correct sub-route if possible
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
