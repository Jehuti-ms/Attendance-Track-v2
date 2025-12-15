// service-worker.js - Classic JavaScript (NO ES6 modules!)
const CACHE_NAME = 'attendance-v2-final-cache';
const BASE_PATH = '/Attendance-Track-v2/';

// Install event
self.addEventListener('install', function(event) {
    console.log('Service Worker: Installing for', BASE_PATH);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Service Worker: Caching essential files');
                
                // Only cache index.html to avoid errors
                return cache.add(BASE_PATH + 'index.html')
                    .then(function() {
                        console.log('Successfully cached index.html');
                        return self.skipWaiting();
                    })
                    .catch(function(error) {
                        console.log('Cache error:', error);
                        return self.skipWaiting();
                    });
            })
    );
});

// Activate event
self.addEventListener('activate', function(event) {
    console.log('Service Worker: Activating');
    
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(function(cacheNames) {
                return Promise.all(
                    cacheNames.map(function(cacheName) {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

// Fetch event
self.addEventListener('fetch', function(event) {
    var requestUrl = new URL(event.request.url);
    
    // Only handle our GitHub Pages domain
    if (!requestUrl.pathname.includes('/Attendance-Track-v2/')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Return cached response if found
                if (response) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return response;
                }
                
                // Otherwise fetch from network
                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request)
                    .then(function(networkResponse) {
                        // Cache successful responses
                        if (networkResponse && networkResponse.status === 200) {
                            var responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(function(cache) {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(function() {
                        // If fetch fails and it's a page request, return index.html
                        if (event.request.mode === 'navigate') {
                            return caches.match(BASE_PATH + 'index.html');
                        }
                        return new Response('Offline - Attendance Track v2', {
                            status: 503,
                            statusText: 'Offline',
                            headers: new Headers({
                                'Content-Type': 'text/html'
                            })
                        });
                    });
            })
    );
});

// Message handling
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
