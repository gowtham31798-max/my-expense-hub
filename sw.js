// Family Spend Hub service worker
// - caches the app shell and CDN libraries so the app opens with no signal (Firestore keeps its own offline cache)
// - shows notifications on Android and focuses the app when one is tapped
const CACHE = 'fsh-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
// never cache auth or database traffic
const SKIP = ['googleapis.com', 'firebaseapp.com', 'firebaseio.com', 'accounts.google.com', 'apis.google.com', 'googleusercontent.com',
  'lakshmanaacharison.com', 'api.mfapi.in', 'currency-api.pages.dev'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // live prices and data are never cached by the service worker (the app keeps its own copies)
  if (e.request.method !== 'GET' || SKIP.some(d => url.hostname.endsWith(d)) || url.pathname.startsWith('/__/') || url.pathname.startsWith('/api/') || url.pathname.includes('/currency-api@')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: url.origin === location.origin })
        .then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./#add');
  }));
});
