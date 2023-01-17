const cacheVersion = 1;

console.log("[Service Worker] Running");

const cacheFiles = async () => {
    const cache = await caches.open(`cache-v${cacheVersion}`);
    console.log("[Service Worker] Caching files");
    await cache.addAll([
        "/", "/index.html", "/main.js", "/sw.js"
    ]);
};

const processRequest = async (e) => {
    const cachedResponse = await caches.match(e.request);
    if (cachedResponse) {
        console.log("[Service Worker] Returning cached response for " + e.request.url);
        return cachedResponse;
    }
    console.log("[Service Worker] No cached response for " + e.request.url);
    return fetch(e.request);
};

self.addEventListener("install", (e) => {
    console.log("[Service Worker] Install");
    e.waitUntil(cacheFiles());
});

self.addEventListener('fetch', (e) => {
    e.respondWith(processRequest(e));
});
