/* ClassNest service worker — bump VERSION on every upload so phones get the new build */
const VERSION = 'classnest-1.1.0';
const APP_CACHE = VERSION + '-app';
const SHELL = ['./', './index.html', './manifest.json', './privacy_policy.html', './icon-192.png', './icon-512.png', './appnest-assistant.js'];
const NEVER = /generativelanguage\.googleapis\.com|api\.anthropic\.com|api\.openai\.com/;

self.addEventListener('install', e => {
  // file-by-file (not addAll): one missing file must not leave the whole offline cache empty
  e.waitUntil(caches.open(APP_CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('classnest-') && k !== APP_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(NEVER.test(url.host)) return;                 // AI calls: always network, never cached
  if(url.origin !== self.location.origin) return;  // CDN / fonts / blob: pass-through
  // network-first for the app shell (with a cheap ETag revalidation), cache as offline fallback
  e.respondWith(
    fetch(req, {cache: 'no-cache'}).then(res => {
      if(res && res.ok && res.type === 'basic'){ const copy = res.clone(); caches.open(APP_CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
    const w = list.find(c => 'focus' in c);
    return w ? w.focus() : self.clients.openWindow('./index.html');
  }));
});
