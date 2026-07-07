// Self-destructing service worker — clears all caches and unregisters itself
self.addEventListener('install', () => {
  (self as any).skipWaiting();
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => (self as any).clients.claim())
      .then(() => (self as any).registration.unregister())
  );
});
