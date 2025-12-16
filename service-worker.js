// service-worker.js - MINIMAL NO-CACHE VERSION
const APP_VERSION = 'v3.2.0-' + Date.now(); // Unique version

self.addEventListener('install', event => {
    console.log('📦 Installing (no cache)');
    self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', event => {
    console.log('🚀 Activating (clearing all)');
    
    event.waitUntil(
        // Delete ALL caches
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    console.log('🗑️ Deleting:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 🚨 NO CACHING AT ALL - just pass through
self.addEventListener('fetch', event => {
    console.log('🌐 Fetch (no cache):', event.request.url);
    
    // Just fetch from network, no caching
    event.respondWith(fetch(event.request));
});
