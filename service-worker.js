// service-worker.js - AUTO-UPDATING VERSION
const APP_VERSION = 'v3.1.0'; // Increment this when you make changes
const CACHE_NAME = `attendance-track-${APP_VERSION}`;

// Dynamic cache strategy - cache as you go
const urlsToPrecache = [
    // Core app shell
    '/Attendance-Track-v2/',
    '/Attendance-Track-v2/index.html',
    '/Attendance-Track-v2/manifest.json',
    
    // Core assets
    '/Attendance-Track-v2/assets/css/main.css',
    '/Attendance-Track-v2/assets/css/components.css',
    '/Attendance-Track-v2/assets/css/theme.css',
    '/Attendance-Track-v2/assets/js/utils.js',
    '/Attendance-Track-v2/assets/js/attendance-app.js',
    
    // Icons
    '/Attendance-Track-v2/assets/icons/icon-192.png',
    '/Attendance-Track-v2/assets/icons/icon-512.png'
];

// DON'T pre-cache HTML pages (except index) - fetch them fresh
// This allows you to update pages without changing SW version

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
                return self.skipWaiting(); // Activate immediately
            })
    );
});

self.addEventListener('activate', event => {
    console.log(`🚀 Service Worker ${APP_VERSION} activating...`);
    
    event.waitUntil(
        // Clean up old caches
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheName.includes(APP_VERSION)) {
                        console.log(`🗑️ Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log(`✅ ${CACHE_NAME} ready`);
            return self.clients.claim(); // Take control immediately
        })
    );
});

// STRATEGY: Cache-first for assets, Network-first for HTML
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Skip Firebase/external requests
    if (url.origin !== self.location.origin) {
        console.log(`🌐 External: ${url.href}`);
        return fetch(event.request);
    }
    
    // HTML Pages: Network-first with cache fallback
    if (event.request.headers.get('Accept').includes('text/html')) {
        console.log(`📄 HTML request: ${url.pathname}`);
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // Cache the fresh response
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseClone);
                            console.log(`💾 Updated HTML cache: ${url.pathname}`);
                        });
                    return networkResponse;
                })
                .catch(() => {
                    // Network failed, try cache
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                console.log(`📦 Serving HTML from cache: ${url.pathname}`);
                                return cachedResponse;
                            }
                            // Fallback to index.html for SPA routing
                            return caches.match('/Attendance-Track-v2/index.html');
                        });
                })
        );
        return;
    }
    
    // Static Assets: Cache-first with network fallback
    if (event.request.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        console.log(`🎨 Asset request: ${url.pathname}`);
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        console.log(`💾 Serving asset from cache: ${url.pathname}`);
                        return cachedResponse;
                    }
                    
                    // Not in cache, fetch and cache
                    return fetch(event.request)
                        .then(networkResponse => {
                            // Don't cache if not successful
                            if (!networkResponse.ok) return networkResponse;
                            
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                    console.log(`🆕 Cached new asset: ${url.pathname}`);
                                });
                            return networkResponse;
                        });
                })
        );
        return;
    }
    
    // Default: Network-first for API/data requests
    console.log(`🔗 Default request: ${url.pathname}`);
    event.respondWith(
        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});

// ==================== AUTO-UPDATE MECHANISM ====================

// Listen for messages from the page
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        console.log('🚀 Skipping waiting phase');
        self.skipWaiting();
    }
    
    if (event.data === 'checkForUpdates') {
        console.log('🔍 Checking for updates...');
        self.registration.update();
    }
});

// Periodic update check (every hour)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-check') {
        console.log('⏰ Periodic update check');
        self.registration.update();
    }
});

// Background sync for updates
self.addEventListener('sync', event => {
    if (event.tag === 'update-content') {
        console.log('🔄 Background sync for updates');
        event.waitUntil(checkForContentUpdates());
    }
});

async function checkForContentUpdates() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedUrls = await cache.keys();
        
        for (const request of cachedUrls) {
            const url = request.url;
            
            // Don't check external resources
            if (!url.startsWith(self.location.origin)) continue;
            
            try {
                const networkResponse = await fetch(url, { cache: 'no-store' });
                
                if (networkResponse.ok) {
                    const cachedResponse = await cache.match(url);
                    
                    if (!cachedResponse || 
                        networkResponse.headers.get('ETag') !== cachedResponse.headers.get('ETag') ||
                        networkResponse.headers.get('Last-Modified') !== cachedResponse.headers.get('Last-Modified')) {
                        
                        console.log(`🆕 Updating cached file: ${url}`);
                        await cache.put(url, networkResponse.clone());
                    }
                }
            } catch (err) {
                console.log(`⚠️ Could not check ${url}:`, err.message);
            }
        }
        
        console.log('✅ Content update check complete');
    } catch (error) {
        console.error('❌ Update check failed:', error);
    }
}

// Check for updates when coming online
self.addEventListener('online', () => {
    console.log('🌐 Back online - checking for updates');
    checkForContentUpdates();
});
