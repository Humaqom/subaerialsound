/* Subaerial Sound, W-9000: keeps the deck in the browser, so that once
   opened the site opens again without internet. Online, the page is
   always fetched afresh (a new version shows at once) and the copy kept
   is brought up to date; offline, or when the network does not answer
   within a few seconds, the kept copy is used. Only the site's own files
   are kept: nothing of your music, nothing from other sites. */
const CACHE = "w9000";
const CORE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon-maskable.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function late(ms) { return new Promise((_, no) => setTimeout(() => no(new Error("slow")), ms)); }

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;          /* the visit counter and the like: left alone */
  const page = r.mode === "navigate" && (u.pathname === "/" || u.pathname === "/index.html");
  const key = page ? "/" : u.pathname;
  if (!page && CORE.indexOf(key) < 0) return;        /* anything else the site has: as usual */
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const net = fetch(page ? "/" : r.url, { cache: "no-cache" }).then(res => {
      if (res.ok) c.put(key, res.clone());
      return res;
    });
    try {
      return await Promise.race([net, late(page ? 5000 : 8000)]);
    } catch (_) {
      const kept = await c.match(key);
      if (kept) return kept;
      return net;                                     /* nothing kept yet: wait for the network after all */
    }
  })());
});
