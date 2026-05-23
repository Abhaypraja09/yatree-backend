const CACHE_NAME = 'logkaro-v16';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json?v=15',
                '/logos.png'
            ]).catch(() => {
                // Silently fail if some assets are not available yet
                console.log('PWA: Initial cache failed, will retry on fetch.');
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Ignore non-GET requests (like POST/PUT/DELETE API calls)
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request).then((response) => {
                if (response) {
                    return response;
                }
                
                // If nothing in cache, return a generic offline response
                // This prevents the "Failed to convert value to 'Response'" error
                if (event.request.url.includes('/api/')) {
                    return new Response(JSON.stringify({ success: false, message: 'You are offline or network error' }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                return new Response('Offline - Network Error', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            });
        })
    );
});
