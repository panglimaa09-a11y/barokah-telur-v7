const CACHE = "catatanbarokah-v10";
const ASSETS = ["./", "./index.html", "./styles.css", "./dashboard-final.css", "./app.js", "./manifest.json", "./icons/icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.origin === self.location.origin && (url.pathname === "/" || url.pathname.endsWith("/index.html"))) {
    event.respondWith(
      fetch(event.request)
        .then(async response => {
          const html = await response.clone().text();
          const injected = html.replace(
            /<\/head>/i,
            '<link rel="stylesheet" href="./dashboard-final.css?v=20260917-6"><\/head>'
          );
          const headers = new Headers(response.headers);
          headers.delete("content-length");
          headers.delete("content-encoding");
          const finalResponse = new Response(injected, {
            status: response.status,
            statusText: response.statusText,
            headers
          });
          const copy = finalResponse.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return finalResponse;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
  );
});
