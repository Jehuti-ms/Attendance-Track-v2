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
                       
