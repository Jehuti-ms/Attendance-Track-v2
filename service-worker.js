// service-worker.js - UPDATED VERSION
const APP_VERSION = 'v3.1.1'; // ⬅️ INCREMENT THIS
const CACHE_NAME = `attendance-track-${APP_VERSION}`;

// REMOVE login.html from pre-cache
const urlsToPrecache = [
    // Core app shell only
    '/Attendance-Track-v2/',
    '/Attendance-Track-v2/index.html',
    '/Attendance-Track-v2/manifest.json',
    
    // Core assets only (no HTML pages)
    '/Attendance-Track-v2/assets/css/main.css',
    '/Attendance-Track-v2/assets/css/components.css',
    '/Attendance-Track-v2/assets/css/theme.css',
    '/Attendance-Track-v2/assets/js/utils.js',
    '/Attendance-Track-v2/assets/js/attendance-app.js',
    
    // Icons
    '/Attendance-Track-v2/assets/icons/icon-192.png',
    '/Attendance-Track-v2/assets/icons/icon-512.png'
];

self.addEventListener('install', event => {
    console.log(`📦 Service Worker ${APP_VERSION} installing...`);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📁 Caching app shell...');
                return cache.addAll(urlsToPrecache);
            })
            .then(() => {
                console.log('✅ App shell cached');
                return self.skipWaiting();
            })
    );
});

self.addEventListener('activate', event => {
    console.log(`🚀 Service Worker ${APP_VERSION} activating...`);
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // DELETE ALL OLD CACHES (not just non-versioned)
                    console.log(`🗑️ Deleting cache: ${cacheName}`);
                    return caches.delete(cacheName);
                })
            );
        })
        .then(() => {
            console.log(`✅ All caches cleared, ${CACHE_NAME} ready`);
            return self.clients.claim();
        })
    );
});

// 🚨 UPDATED FETCH HANDLER - NEVER CACHE HTML
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Skip external requests
    if (url.origin !== self.location.origin) {
        return fetch(event.request);
    }
    
    // 🚨 HTML PAGES: ALWAYS FETCH FRESH, NEVER CACHE
    if (event.request.headers.get('Accept').includes('text/html')) {
        console.log(`📄 FRESH HTML request: ${url.pathname}`);
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Only fallback to index.html for SPA routing
                    if (url.pathname === '/Attendance-Track-v2/' || 
                        url.pathname === '/Attendance-Track-v2/index.html') {
                        return caches.match('/Attendance-Track-v2/index.html');
                    }
                    // For other HTML pages (like login.html), don't cache
                    return new Response('Page not available offline', {
                        status: 404,
                        headers: { 'Content-Type': 'text/html' }
                    });
                })
        );
        return;
    }
    
    // Static Assets: Cache-first
    if (event.request.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json)$/)) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        console.log(`💾 Asset from cache: ${url.pathname}`);
                        return cachedResponse;
                    }
                    
                    return fetch(event.request)
                        .then(networkResponse => {
                            if (!networkResponse.ok) return networkResponse;
                            
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                    console.log(`🆕 New asset cached: ${url.pathname}`);
                                });
                            return networkResponse;
                        });
                })
        );
        return;
    }
    
    // Default: Network only
    event.respondWith(fetch(event.request));
});

// Force update for all clients
self.addEventListener('activate', event => {
    event.waitUntil(
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'SW_UPDATED',
                    version: APP_VERSION
                });
            });
        })
    );
});
