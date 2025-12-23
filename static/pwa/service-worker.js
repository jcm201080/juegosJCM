const CACHE_NAME = "juegos-jcm-v1";

const URLS_TO_CACHE = ["/", "/static/css/juegos_linea.css", "/static/css/style.css"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE);
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
