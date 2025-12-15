// service-worker.js - More robust version
const CACHE_NAME = 'attendance-v2-cache-v2';
const APP_PREFIX = '/Attendance-Track-v2/';

// Only cache essential files that definitely exist
const CACHE_URLS = [
    APP_PREFIX,
    APP_PREFIX + 'index.html',
    APP_PREFIX + 'manifest.json',
    APP_PREFIX + 'assets/vendors/jsPDF.min.js',
    APP_PREFIX + 'assets/vendors/jspdf-autotable.min.js',
    APP_PREFIX + 'assets/vendors/html2canvas.min.js'
];

// Install event - cache only essential files
self.addEventListener('install', event => {
    console.log('Service Worker: Installing');
    
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                console.log('Service Worker: Caching essential files');
                
                // Cache each file individually to handle failures
                for (const url of CACHE_URLS) {
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            await cache.put(url, response);
                            console.log('✓ Cached:', url);
                        } else {
                            console.log('✗ Failed to cache (not found):', url);
                        }
                    } catch (error) {
                        console.log('✗ Failed to cache (error):', url, error.message);
                    }
                }
                
                console.log('Service Worker: Installation complete');
                await self.skipWaiting();
            } catch (error) {
                console.log('Service Worker: Installation failed:', error);
            }
        })()
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating');
    
    event.waitUntil(
        (async () => {
            // Clean up old caches
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
            
            console.log('Service Worker: Claiming clients');
            await self.clients.claim();
        })()
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip chrome-extension and other non-http requests
    if (!event.request.url.startsWith('http')) return;
    
    event.respondWith(
        (async () => {
            try {
                // Try cache first
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return cachedResponse;
                }
                
                // Otherwise fetch from network
                console.log('Service Worker: Fetching from network', event.request.url);
                const networkResponse = await fetch(event.request);
                
                // Cache successful responses for future use
                if (networkResponse && networkResponse.status === 200) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, networkResponse.clone());
                }
                
                return networkResponse;
            } catch (error) {
                console.log('Service Worker: Fetch failed, serving offline page', error);
                
                // If we're offline and it's a page request, serve the index.html
                if (event.request.mode === 'navigate') {
                    const cache = await caches.open(CACHE_NAME);
                    const cachedIndex = await cache.match(APP_PREFIX + 'index.html');
                    if (cachedIndex) {
                        return cachedIndex;
                    }
                }
                
                // Return a generic offline response
                return new Response('Offline content not available', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                        'Content-Type': 'text/plain'
                    })
                });
            }
        })()
    );
});

// Handle messages from the page
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
