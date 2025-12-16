// version-manager.js
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
