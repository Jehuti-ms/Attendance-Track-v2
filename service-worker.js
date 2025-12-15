// Service Worker for Attendance Track v2
const CACHE_NAME = 'attendance-track-v2-cache-v1.0';
const APP_PREFIX = '/Attendance-Track-v2/';

// Files to cache
const urlsToCache = [
    APP_PREFIX,
    APP_PREFIX + 'index.html',
    APP_PREFIX + 'login.html',
    APP_PREFIX + 'dashboard.html',
    APP_PREFIX + 'attendance.html',
    APP_PREFIX + 'reports.html',
    APP_PREFIX + 'setup.html',
    APP_PREFIX + 'maintenance.html',
    APP_PREFIX + 'settings.html',
    APP_PREFIX + 'manifest.json',
    APP_PREFIX + 'assets/css/main.css',
    APP_PREFIX + 'assets/css/components.css',
    APP_PREFIX + 'assets/css/theme.css',
    APP_PREFIX + 'assets/js/main.js',
    APP_PREFIX + 'assets/js/utils.js',
    APP_PREFIX + 'assets/js/auth.js',
    APP_PREFIX + 'assets/icons/icon-192.png',
    APP_PREFIX + 'assets/icons/icon-512.png'
];

// Install event
self.addEventListener('install', event => {
    console.log('Service Worker: Installing for', APP_PREFIX);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: Skip waiting');
                return self.skipWaiting();
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker: Claiming clients');
            return self.clients.claim();
        })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    // Only handle same-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                
                return fetch(event.request).then(response => {
                    // Don't cache if not a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return response;
                });
            })
    );
});

// Message handling
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
