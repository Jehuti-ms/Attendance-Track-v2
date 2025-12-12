// attendance-track-v2/service-worker.js

const CACHE_NAME = 'attendance-track-v2-cache-v1';
const urlsToCache = [
    '/Attendance-Track-v2/',
    '/Attendance-Track-v2/index.html',
    '/Attendance-Track-v2/manifest.json',
    '/Attendance-Track-v2/assets/css/main.css',
    '/Attendance-Track-v2/assets/css/components.css',
    '/Attendance-Track-v2/assets/css/theme.css',
    '/Attendance-Track-v2/assets/js/main.js',
    '/Attendance-Track-v2/assets/js/attendance-app.js',
    '/Attendance-Track-v2/assets/js/modules/utils.js',
    '/Attendance-Track-v2/assets/js/modules/auth.js',
    '/Attendance-Track-v2/assets/js/modules/dashboard.js',
    '/Attendance-Track-v2/assets/js/modules/setup.js',
    '/Attendance-Track-v2/assets/js/modules/attendance.js',
    '/Attendance-Track-v2/assets/js/modules/reports.js',
    '/Attendance-Track-v2/assets/js/modules/export.js',
    '/Attendance-Track-v2/assets/js/modules/maintenance.js',
    '/Attendance-Track-v2/assets/js/modules/settings.js',
    '/Attendance-Track-v2/assets/js/modules/import.js',
    '/Attendance-Track-v2/assets/icons/icon-192.png',
    '/Attendance-Track-v2/assets/icons/icon-512.png'
];

// Install event
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: Install completed');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Install failed', error);
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    // Remove old caches
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
            console.log('Service Worker: Activate completed');
            return self.clients.claim();
        })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip external resources
    if (!event.request.url.startsWith(self.location.origin)) return;
    
    // For API requests, use network-first strategy
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache successful API responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // For static assets, use cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Update cache in background
                    fetch(event.request)
                        .then(response => {
                            if (response.ok) {
                                caches.open(CACHE_NAME).then(cache => {
                                    cache.put(event.request, response);
                                });
                            }
                        })
                        .catch(() => {
                            // Ignore fetch errors for cache updates
                        });
                    
                    return cachedResponse;
                }
                
                // If not in cache, fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response.ok) return response;
                        
                        // Cache the response
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('Service Worker: Fetch failed', error);
                        
                        // Return offline page for HTML requests
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/Attendance-Track-v2/index.html');
                        }
                        
                        // Return error for other requests
                        return new Response('Network error occurred', {
                            status: 408,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});

// Background sync for offline data
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'sync-attendance') {
        event.waitUntil(syncAttendanceData());
    }
});

async function syncAttendanceData() {
    try {
        // Get pending data from IndexedDB
        const pendingData = await getPendingData();
        
        if (pendingData.length === 0) {
            console.log('No pending data to sync');
            return;
        }
        
        console.log(`Syncing ${pendingData.length} pending records`);
        
        // Send to server
        const response = await fetch('/api/sync-attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ records: pendingData })
        });
        
        if (response.ok) {
            // Clear pending data
            await clearPendingData();
            console.log('Attendance data synced successfully');
            
            // Notify clients
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'sync-complete',
                    count: pendingData.length
                });
            });
        } else {
            throw new Error('Sync failed');
        }
    } catch (error) {
        console.error('Sync error:', error);
        throw error;
    }
}

// IndexedDB for offline data storage
function getPendingData() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('attendance-offline', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['pending'], 'readonly');
            const store = transaction.objectStore('pending');
            const getAllRequest = store.getAll();
            
            getAllRequest.onerror = () => reject(getAllRequest.error);
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pending')) {
                db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

function clearPendingData() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('attendance-offline', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['pending'], 'readwrite');
            const store = transaction.objectStore('pending');
            const clearRequest = store.clear();
            
            clearRequest.onerror = () => reject(clearRequest.error);
            clearRequest.onsuccess = () => resolve();
        };
    });
}

// Push notifications
self.addEventListener('push', event => {
    console.log('Service Worker: Push received', event);
    
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'New notification from Attendance Track',
        icon: '/Attendance-Track-v2/assets/icons/icon-192.png',
        badge: '/Attendance-Track-v2/assets/icons/icon-192.png',
        tag: data.tag || 'attendance-notification',
        data: data.data || {},
        actions: data.actions || []
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Attendance Track', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked', event);
    
    event.notification.close();
    
    const urlToOpen = event.notification.data.url || '/Attendance-Track-v2/';
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(windowClients => {
            // Check if there's already a window/tab open with the target URL
            for (let client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // If not, open a new window/tab
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
