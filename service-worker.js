// service-worker.js - VERSION-AWARE CACHING
const APP_VERSION = '4.1.9'; // MUST MATCH version-manager.js
const CACHE_NAME = `attendance-cache-v${APP_VERSION.replace(/\./g, '-')}`;
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// STATIC ASSETS ONLY - NEVER CACHE HTML
const STATIC_ASSETS = [
    // Core CSS
    './assets/css/main.css',
    './assets/css/components.css', 
    './assets/css/theme.css',
    
    // Core JS (non-HTML)
    './assets/js/utils.js',
    './assets/js/firebase.js',
    './assets/js/version-manager.js',
    
    // Icons
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './favicon.ico',
    
    // Manifest
    './manifest.json',
    
    // Fonts (if any)
    // './assets/fonts/...'
];

// DEBUG: Log version info
console.log(`🚀 Service Worker ${APP_VERSION} initializing...`);

// ==================== INSTALL ====================
self.addEventListener('install', event => {
    console.log(`📦 Service Worker ${APP_VERSION} installing...`);
    
    // Force immediate activation
    self.skipWaiting();
    
    event.waitUntil(
        // Clear ALL old caches first
        caches.keys().then(cacheNames => {
            const deletions = cacheNames.map(cacheName => {
                console.log(`🗑️ Removing old cache: ${cacheName}`);
                return caches.delete(cacheName);
            });
            return Promise.all(deletions);
        }).then(() => {
            // Now cache fresh static assets
            return caches.open(CACHE_NAME)
                .then(cache => {
                    console.log(`📁 Caching static assets for ${APP_VERSION}...`);
                    
                    // Use cache.addAll with individual error handling
                    const cachePromises = STATIC_ASSETS.map(asset => {
                        return cache.add(asset)
                            .then(() => console.log(`  ✅ ${asset}`))
                            .catch(err => console.log(`  ⚠️ Failed to cache ${asset}:`, err.message));
                    });
                    
                    return Promise.all(cachePromises);
                });
        }).then(() => {
            console.log(`✅ ${APP_VERSION} installation complete`);
            
            // Notify all clients about the new version
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_NEW_VERSION',
                        version: APP_VERSION,
                        action: 'reload'
                    });
                });
            });
        })
    );
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', event => {
    console.log(`🚀 Service Worker ${APP_VERSION} activating...`);
    
    event.waitUntil(
        // Clean up old caches
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Keep current cache, delete everything else
                    if (cacheName !== CACHE_NAME) {
                        console.log(`🗑️ Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log(`✅ ${CACHE_NAME} is ready`);
            
            // Clean up expired cache entries
            return cleanupExpiredCache();
        })
        .then(() => self.clients.claim()) // Take control immediately
    );
});

// ==================== FETCH STRATEGY ====================
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const requestUrl = url.pathname + url.search;
    
    // Skip non-GET requests and external resources
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }
    
    // 🚨 CRITICAL: NEVER CACHE HTML PAGES
    if (event.request.headers.get('Accept')?.includes('text/html') || 
        url.pathname.endsWith('.html')) {
        
        console.log(`📄 HTML request (NETWORK ONLY): ${url.pathname}`);
        
        // Strategy: Network first, no caching
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // HTML is never cached
                    return response;
                })
                .catch(error => {
                    console.log(`🌐 Network failed for ${url.pathname}:`, error.message);
                    
                    // Only provide offline fallback for main app shell
                    if (url.pathname === '/' || 
                        url.pathname.endsWith('/index.html') ||
                        url.pathname.endsWith('/Attendance-Track-v2/') ||
                        url.pathname.endsWith('/Attendance-Track-v2/index.html')) {
                        
                        return caches.match('/Attendance-Track-v2/index.html')
                            .then(cached => {
                                if (cached) {
                                    console.log(`📦 Serving cached index.html for offline`);
                                    return cached;
                                }
                                throw error;
                            });
                    }
                    
                    // For other HTML pages, show offline page
                    return caches.match('/Attendance-Track-v2/offline.html')
                        .then(offlinePage => {
                            if (offlinePage) {
                                return offlinePage;
                            }
                            // Generic offline response
                            return new Response(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <title>Offline - Attendance Track</title>
                                    <style>
                                        body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                                        h1 { color: #666; }
                                    </style>
                                </head>
                                <body>
                                    <h1>📶 You're Offline</h1>
                                    <p>Please check your internet connection and try again.</p>
                                    <button onclick="location.reload()">Retry</button>
                                </body>
                                </html>
                            `, {
                                headers: { 'Content-Type': 'text/html' }
                            });
                        });
                })
        );
        return;
    }
    
    // Check if this is a static asset we should cache
    const isStaticAsset = STATIC_ASSETS.some(asset => 
        url.pathname.endsWith(asset) ||
        url.pathname.includes('/assets/')
    );
    
    if (isStaticAsset) {
        console.log(`🎨 Static asset: ${url.pathname}`);
        
        // Strategy: Cache First, then Network
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        console.log(`💾 From cache: ${url.pathname}`);
                        
                        // Check if cache is stale (older than MAX_CACHE_AGE)
                        const cacheDate = new Date(cachedResponse.headers.get('date') || Date.now());
                        const cacheAge = Date.now() - cacheDate.getTime();
                        
                        if (cacheAge > MAX_CACHE_AGE) {
                            console.log(`🔄 Cache stale for ${url.pathname}, fetching fresh`);
                            // Fetch fresh in background
                            fetchAndCache(event.request);
                        }
                        
                        return cachedResponse;
                    }
                    
                    // Not in cache, fetch and cache
                    console.log(`🌐 Fetching fresh: ${url.pathname}`);
                    return fetchAndCache(event.request);
                })
                .catch(() => {
                    // Even if cache fails, try network
                    return fetch(event.request)
                        .catch(() => {
                            // Complete failure
                            return new Response('Asset not available', {
                                status: 404,
                                headers: { 'Content-Type': 'text/plain' }
                            });
                        });
                })
        );
        return;
    }
    
    // Default for API/data requests: Network first
    console.log(`🔗 API/Data: ${url.pathname}`);
    event.respondWith(
        fetch(event.request)
            .catch(() => {
                // Network failed, check cache as fallback
                return caches.match(event.request);
            })
    );
});

// ==================== HELPER FUNCTIONS ====================
async function fetchAndCache(request) {
    try {
        const response = await fetch(request);
        
        if (!response.ok) {
            console.log(`⚠️ Fetch failed for ${request.url}: ${response.status}`);
            return response;
        }
        
        // Clone response for caching
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
            .then(cache => {
                cache.put(request, responseToCache);
                console.log(`💾 Cached: ${new URL(request.url).pathname}`);
            });
        
        return response;
    } catch (error) {
        console.log(`❌ Fetch error for ${request.url}:`, error.message);
        throw error;
    }
}

async function cleanupExpiredCache() {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    const now = Date.now();
    
    for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
                const cachedDate = new Date(dateHeader).getTime();
                const age = now - cachedDate;
                
                if (age > MAX_CACHE_AGE) {
                    console.log(`🧹 Removing expired cache: ${request.url}`);
                    await cache.delete(request);
                }
            }
        }
    }
}

// ==================== MESSAGE HANDLING ====================
self.addEventListener('message', event => {
    console.log('📩 Message received:', event.data);
    
    switch (event.data?.type) {
        case 'SKIP_WAITING':
            console.log('🚀 Skipping waiting phase');
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            console.log('🧹 Clearing all caches');
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
            break;
            
        case 'GET_VERSION':
            event.ports[0]?.postMessage({
                version: APP_VERSION,
                cacheName: CACHE_NAME
            });
            break;
            
        case 'CHECK_UPDATES':
            console.log('🔍 Checking for updates...');
            self.registration.update();
            break;
            
        case 'RELOAD_CLIENTS':
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'FORCE_RELOAD',
                        reason: event.data.reason || 'manual'
                    });
                });
            });
            break;
    }
});

// ==================== PERIODIC SYNC (BACKGROUND UPDATES) ====================
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-check') {
        console.log('⏰ Periodic update check');
        event.waitUntil(checkForUpdates());
    }
});

async function checkForUpdates() {
    try {
        // Check for fresh version of static assets
        const cache = await caches.open(CACHE_NAME);
        
        for (const asset of STATIC_ASSETS) {
            try {
                const networkResponse = await fetch(asset, {
                    headers: { 'Cache-Control': 'no-cache' }
                });
                
                if (networkResponse.ok) {
                    const cachedResponse = await cache.match(asset);
                    
                    // Check if content changed
                    if (!cachedResponse || 
                        networkResponse.headers.get('etag') !== cachedResponse.headers.get('etag') ||
                        networkResponse.headers.get('last-modified') !== cachedResponse.headers.get('last-modified')) {
                        
                        console.log(`🔄 Updating asset: ${asset}`);
                        await cache.put(asset, networkResponse.clone());
                        
                        // Notify clients about updated asset
                        self.clients.matchAll().then(clients => {
                            clients.forEach(client => {
                                client.postMessage({
                                    type: 'ASSET_UPDATED',
                                    asset: asset,
                                    version: APP_VERSION
                                });
                            });
                        });
                    }
                }
            } catch (err) {
                console.log(`⚠️ Could not check ${asset}:`, err.message);
            }
        }
    } catch (error) {
        console.error('❌ Update check failed:', error);
    }
}

// ==================== BACKGROUND SYNC ====================
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        console.log('🔄 Background sync triggered');
        // Implement your background sync logic here
    }
});

// ==================== PUSH NOTIFICATIONS ====================
self.addEventListener('push', event => {
    console.log('🔔 Push notification received');
    
    const options = {
        body: event.data?.text() || 'New update available!',
        icon: './assets/icons/icon-192.png',
        badge: './assets/icons/icon-96.png',
        tag: 'attendance-update',
        data: {
            url: self.location.origin
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('Attendance Track', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clients => {
            if (clients.length > 0) {
                clients[0].focus();
            } else {
                self.clients.openWindow(self.location.origin);
            }
        })
    );
});

// ==================== ERROR HANDLING ====================
self.addEventListener('error', event => {
    console.error('❌ Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('❌ Service Worker unhandled rejection:', event.reason);
});

// ==================== VERSION VALIDATION ====================
// Ensure version matches the HTML page
function validateVersion() {
    // This would check with the version manager
    // Implement if needed
}

// Export version info (for debugging)
self.APP_VERSION = APP_VERSION;
self.CACHE_NAME = CACHE_NAME;
