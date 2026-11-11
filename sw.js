/* OZAK ROYAL CHESS — Service Worker: يعمل التطبيق دون إنترنت بعد أول تشغيل */
const VER = 'ozak-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'game.js', 'main.js', 'manifest.json', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'lib/three.min.js'];
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(
    SHELL.concat(CDN).map(u => c.add(new Request(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin' })).catch(() => { })) // ملف مفقود لا يُفشل التثبيت
  )).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => {
    const net = fetch(r).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VER).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => hit || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()));
    return hit || net; // الكاش أولاً، ويُحدَّث في الخلفية عند توفر الشبكة
  }));
});
