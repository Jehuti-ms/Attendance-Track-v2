// version-manager.js - ENHANCED VERSION
const APP_VERSION = '2.0.0'; // ⬅️ UPDATE THIS

// Check version on load
function checkVersion() {
    const storedVersion = localStorage.getItem('app_version');
    
    console.log(`📊 Version Check: Stored="${storedVersion}", Current="${APP_VERSION}"`);
    
    if (storedVersion !== APP_VERSION) {
        console.log(`🆕 Version change detected: ${storedVersion || 'none'} → ${APP_VERSION}`);
        
        // Major version change - clear more aggressively
        if (shouldClearAggressively(storedVersion)) {
            console.log('🧹 MAJOR VERSION: Clearing problematic data...');
            clearForMajorUpdate(storedVersion);
        } else {
            // Minor version - gentle cleanup
            console.log('🧼 MINOR VERSION: Light cleanup...');
            clearForMinorUpdate(storedVersion);
        }
        
        // Update stored version
        localStorage.setItem('app_version', APP_VERSION);
        
        // Flag that we just updated (for service worker)
        sessionStorage.setItem('version_just_updated', 'true');
        
        // Handle redirects carefully
        handleVersionChangeRedirect(storedVersion);
    }
    
    // Store in HTML for debugging
    document.documentElement.setAttribute('data-version', APP_VERSION);
    document.documentElement.setAttribute('data-prev-version', storedVersion || 'none');
    
    // Log version info
    console.log(`🚀 App ${APP_VERSION} loaded (previous: ${storedVersion || 'fresh install'})`);
}

function shouldClearAggressively(storedVersion) {
    if (!storedVersion) return false;
    
    // Major version changes (first number changes)
    const currentMajor = parseInt(APP_VERSION.split('.')[0]);
    const storedMajor = parseInt(storedVersion.split('.')[0]);
    
    return currentMajor > storedMajor;
}

function clearForMajorUpdate(oldVersion) {
    console.log(`⚠️ MAJOR UPDATE from ${oldVersion} to ${APP_VERSION}`);
    
    // List of safe keys to preserve
    const PRESERVE_KEYS = [
        'user_settings',      // User preferences
        'theme',              // Theme settings
        'language',           // Language preference
        'notifications',      // Notification settings
        'ui_state'           // UI state (collapsed panels, etc.)
    ];
    
    // Clear localStorage (except preserved items)
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
        if (!PRESERVE_KEYS.includes(key)) {
            localStorage.removeItem(key);
        }
    });
    
    // Always clear auth-related items
    localStorage.removeItem('attendance_user');
    localStorage.removeItem('firebase_user');
    localStorage.removeItem('remember_email');
    
    // Clear all caches
    if ('caches' in window) {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                console.log(`🗑️ Deleting cache: ${cacheName}`);
                caches.delete(cacheName);
            });
        });
    }
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Set flag to prevent redirect loops
    sessionStorage.setItem('version_upgrade_in_progress', 'true');
    
    console.log('✅ Major update cleanup complete');
}

function clearForMinorUpdate(oldVersion) {
    console.log(`🔧 Minor update from ${oldVersion} to ${APP_VERSION}`);
    
    // Only clear problematic items
    const PROBLEMATIC_KEYS = [
        'attendance_user',    // Auth data
        'firebase_user',      // Firebase session
        'sw_cleared',         // Old SW flags
        'force_reload',       // Reload flags
        'dev_mode'           // Dev flags
    ];
    
    PROBLEMATIC_KEYS.forEach(key => localStorage.removeItem(key));
    
    // Clear old caches (keep current version)
    if ('caches' in window) {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                if (!cacheName.includes(APP_VERSION)) {
                    console.log(`🗑️ Deleting old cache: ${cacheName}`);
                    caches.delete(cacheName);
                }
            });
        });
    }
    
    console.log('✅ Minor update cleanup complete');
}

function handleVersionChangeRedirect(oldVersion) {
    // Don't redirect on fresh install
    if (!oldVersion) return;
    
    // Check current page
    const currentPage = window.location.pathname;
    const isLoginPage = currentPage.includes('login.html');
    const isDashboard = currentPage.includes('dashboard.html');
    
    // If we're on dashboard but cleared auth, go to login
    if (isDashboard && !localStorage.getItem('attendance_user')) {
        console.log('🔄 Version update: Redirecting to login (auth cleared)');
        
        // Use delayed redirect to avoid race conditions
        setTimeout(() => {
            // Add version info to URL for tracking
            const loginUrl = `./login.html?v=${APP_VERSION}&from=${oldVersion}&upgrade=true`;
            window.location.replace(loginUrl);
        }, 500);
    }
    // If we're on login page, just reload to get new assets
    else if (isLoginPage) {
        console.log('🔄 Reloading login page with new version');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    // For other pages, prompt user
    else {
        console.log(`ℹ️ New version ${APP_VERSION} loaded`);
        // Optionally show a toast notification
        showVersionToast(APP_VERSION, oldVersion);
    }
}

function showVersionToast(newVersion, oldVersion) {
    // Create a subtle notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <strong>✓ Updated to v${newVersion}</strong>
        <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">
            from v${oldVersion}
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Clear version upgrade flag after page loads
function clearUpgradeFlag() {
    if (sessionStorage.getItem('version_upgrade_in_progress')) {
        console.log('✅ Version upgrade complete, clearing flag');
        sessionStorage.removeItem('version_upgrade_in_progress');
        sessionStorage.removeItem('version_just_updated');
    }
}

// Check version on load
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to ensure everything is loaded
    setTimeout(() => {
        checkVersion();
        
        // Clear upgrade flag after everything settles
        setTimeout(clearUpgradeFlag, 1000);
    }, 100);
});

// Update service worker registration to include version
function registerServiceWorkerWithVersion() {
    if ('serviceWorker' in navigator) {
        // Add version to service worker URL to force update
        const swUrl = `./service-worker.js?v=${APP_VERSION}`;
        
        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log(`✅ Service Worker v${APP_VERSION} registered`);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 New Service Worker found');
                    // Notify user
                    showUpdateNotification();
                });
            })
            .catch(error => {
                console.error('❌ Service Worker registration failed:', error);
            });
    }
}

function showUpdateNotification() {
    // Simple update notification
    if (confirm('A new version is available. Reload now?')) {
        window.location.reload();
    }
}

// Export for debugging
window.appVersion = APP_VERSION;
window.checkVersion = checkVersion;
window.registerServiceWorkerWithVersion = registerServiceWorkerWithVersion;

// Auto-register service worker on supported pages
if (!window.location.pathname.includes('login.html')) {
    setTimeout(registerServiceWorkerWithVersion, 2000);
}// version-manager.js
const APP_VERSION = '3.1.0';

// Check version on load
function checkVersion() {
    const storedVersion = localStorage.getItem('app_version');
    
    if (storedVersion !== APP_VERSION) {
        console.log(`🆕 Version change: ${storedVersion || 'none'} → ${APP_VERSION}`);
        
        // Clear old data if needed
        if (!storedVersion || storedVersion < '3.0.0') {
            console.log('🧹 Clearing old cache...');
            clearOldCache();
        }
        
        // Update stored version
        localStorage.setItem('app_version', APP_VERSION);
        
        // Refresh if coming from older version
        if (storedVersion && storedVersion < APP_VERSION) {
            if (confirm(`New version ${APP_VERSION} available! Reload now?`)) {
                window.location.reload();
            }
        }
    }
    
    // Store in HTML for debugging
    document.documentElement.setAttribute('data-version', APP_VERSION);
}

function clearOldCache() {
    // Clear specific old items
    const oldKeys = ['sw_cleared', 'force_reload', 'dev_mode'];
    oldKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear old cache if Service Worker is being updated
    if ('caches' in window) {
        caches.keys().then(keys => {
            keys.forEach(key => {
                if (!key.includes(APP_VERSION)) {
                    caches.delete(key);
                }
            });
        });
    }
}

// Check version on load
document.addEventListener('DOMContentLoaded', checkVersion);

// Export for debugging
window.appVersion = APP_VERSION;
window.checkVersion = checkVersion;
