const appName = "kyles-workout-timer";
// change app version to trigger an update and recache
const appVersion = '1.0.2';
const cacheName = `${appName}_v${appVersion}`;

const filesToCache = [
	"index.html",
	"main.js",
	"manifest.webmanifest",
	"settings.js",
	"style.css",
	"textToSpeech.js",
	"utils.js",
	"water-dark.min.css",
	"workoutEditor.js",
];

console.log("[Service Worker] Running");

const cacheFiles = async () => {
	const cache = await caches.open(cacheName);
	console.log("[Service Worker] Caching files");
	await cache.addAll(filesToCache.map(file => new Request(file, { cache: "reload" })));
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

const cacheCleanup = async () => {
	console.log("[Service Worker] Cleaning up cache");
	const keyList = await caches.keys();
	return Promise.all(
		keyList.map((key) => {
			if (key.startsWith(appName) && key !== cacheName) {
				return caches.delete(key);
			}
			return Promise.resolve();
		}),
	);
};

self.addEventListener("install", (e) => {
	console.log("[Service Worker] Install");
	e.waitUntil(cacheFiles());
});

self.addEventListener('fetch', (e) => {
	e.respondWith(processRequest(e));
});

self.addEventListener('activate', (e) => {
	console.log("[Service Worker] Activate");
	e.waitUntil(cacheCleanup());
});
