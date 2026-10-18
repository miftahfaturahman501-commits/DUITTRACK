const CACHE = "duittrack-pro-v2.0.3";
const FILES = ["./", "./index.html", "./style.css", "./manifest.json", "./core.js", "./charts.js", "./forms.js", "./views.js", "./main.js", "./icon.svg", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
/* stale-while-revalidate: cepat & offline, tetap memperbarui di latar belakang */
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return cached || (await net) || (req.mode === "navigate" ? cache.match("./index.html") : Response.error());
  }));
});
