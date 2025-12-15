// service-worker.js - Fixed for GitHub Pages
const CACHE_NAME = 'attendance-v4-cache';
const BASE_PATH = '/Attendance-Track-v2/';

self.addEventListener('install', event => {
    console.log('Service Worker: Installing for', BASE_PATH);
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activating');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    const requestUrl = new URL(event.request.url);
    
    // Only handle requests to our GitHub Pages site
    if (!requestUrl.hostname.includes('jehuti-ms.github.io')) {
        return;
    }
    
    event.respondWith(
        (async () => {
            try {
                // First, try the network
                const networkResponse = await fetch(event.request);
                return networkResponse;
            } catch (networkError) {
                console.log('Network failed, checking cache for:', event.request.url);
                
                // If network fails, check cache
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(event.request);
                
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // If not in cache and it's a page request, serve index.html
                if (event.request.mode === 'navigate') {
                    const indexResponse = await cache.match(BASE_PATH + 'index.html');
                    if (indexResponse) {
                        return indexResponse;
                    }
                }
                
                // Return offline page or error
                return new Response('Offline - Attendance Track v2', {
                    status: 503,
                    statusText: 'Offline',
                    headers: new Headers({
                        'Content-Type': 'text/html'
                    })
                });
            }
        })()
    );
});
