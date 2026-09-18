// Service worker for push alerts, Brief Section 2.
//
// Kept to push and notification clicks only. It deliberately does no caching:
// scores change every 30 seconds during games, and a stale cached page is worse
// than a slow one.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Squirtnite FFL', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Squirtnite FFL';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // A tag replaces an older alert about the same thing rather than
      // stacking a pile of them, so a back and forth game does not flood a
      // lock screen.
      tag: data.tag,
      data: { url: data.url || '/feed' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/feed';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
