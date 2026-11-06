// Shows a notification when the server sends one, and opens the app when it is tapped.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Apex Trophy Solutions', {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'apex',
    renotify: true,
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = (event.notification.data && event.notification.data.url) || '/';
    const view = new URL(url, self.location.origin).searchParams.get('open');
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of open) {
      if ('focus' in c) { await c.focus(); if (view) c.postMessage({ type: 'open', view }); return; }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
