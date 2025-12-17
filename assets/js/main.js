// main.js - Common functionality across all pages

function initCommon() {
    initializeNavigation();
    setupEventListeners();
    checkAuth();
}

function initializeNavigation() {
    // Highlight current page in nav
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
        
        // Add click handler for smooth navigation
        link.addEventListener('click', function(e) {
            if (linkHref === currentPage) {
                e.preventDefault();
                return;
            }
            
            // Add loading state
            document.body.classList.add('page-loading');
        });
    });
    
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        });
    }
}

function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Theme toggle (if you have one)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }
}

function checkAuth() {
    const protectedPages = ['dashboard', 'setup', 'attendance', 'reports', 'maintenance', 'settings'];
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    
    if (protectedPages.includes(currentPage)) {
        const user = localStorage.getItem('user');
        const authToken = localStorage.getItem('authToken');
        
        if (!user || !authToken) {
            window.location.href = 'login.html';
            return;
        }
        
        // Display user info
        const userElement = document.getElementById('currentUser');
        if (userElement) {
            try {
                const userData = JSON.parse(user);
                userElement.textContent = userData.name || 'User';
            } catch (e) {
                userElement.textContent = 'User';
            }
        }
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Auto-update Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration.scope);
                
                // Check for updates immediately
                registration.update();
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 New Service Worker found!');
                    
                    newWorker.addEventListener('statechange', () => {
                        console.log('📊 Service Worker state:', newWorker.state);
                        
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New update available
                                console.log('🆕 New version available!');
                                showUpdateNotification(registration);
                            } else {
                                // First install
                                console.log('📦 App installed for first time');
                            }
                        }
                    });
                });
                
                // Periodically check for updates (every 30 minutes)
                setInterval(() => {
                    registration.update();
                    console.log('⏰ Periodic update check');
                }, 30 * 60 * 1000);
                
                return registration;
            })
            .catch(err => {
                console.error('❌ Service Worker registration failed:', err);
            });
    }
}

// Show update notification
function showUpdateNotification(registration) {
    // Create a subtle notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <span>🔄 New version available!</span>
        <button style="background: white; color: #4CAF50; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;">
            Update
        </button>
        <button style="background: transparent; color: white; border: 1px solid white; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
            Later
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Update button
    notification.querySelector('button:first-of-type').addEventListener('click', () => {
        // Tell the waiting Service Worker to take over
        if (registration.waiting) {
            registration.waiting.postMessage('skipWaiting');
        }
        window.location.reload();
    });
    
    // Later button
    notification.querySelector('button:last-of-type').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto-hide after 30 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 30000);
}

// Check for updates when page loads
document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    
    // Check for updates when coming back online
    window.addEventListener('online', () => {
        console.log('🌐 Online - checking for updates');
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage('checkForUpdates');
        }
    });
});

// Manual update check function
function checkForUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
                registration.update().then(() => {
                    console.log('🔍 Update check completed');
                    alert('Update check completed!');
                });
            }
        });
    }
}

// Expose for dev tools
window.checkForUpdates = checkForUpdates;
window.forceUpdate = function() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
                registration.unregister();
                console.log('🔄 Service Worker unregistered');
            });
            
            // Clear all caches
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    caches.delete(cacheName);
                    console.log(`🗑️ Deleted cache: ${cacheName}`);
                });
            }).then(() => {
                alert('Cache cleared! Reloading...');
                window.location.reload();
            });
        });
    }
};

// User Status Management
function initUserStatus() {
    const statusElement = document.getElementById('userStatus');
    const statusDot = statusElement.querySelector('.status-dot');
    const statusText = statusElement.querySelector('.status-text');
    
    // Set initial status based on connection
    function updateConnectionStatus() {
        if (navigator.onLine) {
            setUserStatus('online', 'Online');
        } else {
            setUserStatus('offline', 'Offline');
        }
    }
    
    // Function to manually set status
    function setUserStatus(status, text = null) {
        // Remove all status classes
        statusElement.classList.remove('online', 'offline', 'away', 'busy');
        
        // Add new status class
        statusElement.classList.add(status);
        
        // Update text if provided
        if (text) {
            statusText.textContent = text;
            statusElement.title = text;
        }
        
        // Special handling for each status
        switch(status) {
            case 'online':
                statusElement.title = 'Online - Connected to server';
                break;
            case 'offline':
                statusElement.title = 'Offline - No internet connection';
                break;
            case 'away':
                statusElement.title = 'Away - Idle for 5+ minutes';
                break;
            case 'busy':
                statusElement.title = 'Busy - Do not disturb';
                break;
        }
    }
    
    // Auto-detect network status
    window.addEventListener('online', () => setUserStatus('online', 'Online'));
    window.addEventListener('offline', () => setUserStatus('offline', 'Offline'));
    
    // Detect user idle/away time (optional)
    let idleTime = 0;
    const idleInterval = setInterval(() => {
        idleTime++;
        if (idleTime > 5 && statusElement.classList.contains('online')) { // 5 minutes
            setUserStatus('away', 'Away');
        }
    }, 60000); // Check every minute
    
    // Reset idle time on user activity
    ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
        document.addEventListener(event, () => {
            idleTime = 0;
            if (navigator.onLine && statusElement.classList.contains('away')) {
                setUserStatus('online', 'Online');
            }
        });
    });
    
    // Initialize
    updateConnectionStatus();
    
    // Make function available globally
    window.app = window.app || {};
    window.app.setUserStatus = setUserStatus;
    window.app.updateUserStatus = updateConnectionStatus;
}

// Update username (call this when user data loads)
function updateUserName(name) {
    const userElement = document.getElementById('currentUser');
    if (name) {
        userElement.textContent = name;
        
        // Set user initials for avatar if using Option 2 later
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        localStorage.setItem('userInitials', initials);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for app to load
    setTimeout(initUserStatus, 1000);
    
    // Example: Set username after login
    // updateUserName("John Doe");
});

// Export functions for use in other scripts
window.initCommon = initCommon;
window.handleLogout = handleLogout;
