// assets/js/main.js - CORRECTED VERSION
console.log("🎯 main.js loading...");

// Global app state
window.appState = {
    user: null,
    theme: 'light',
    isOnline: navigator.onLine,
    isLoading: true
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOMContentLoaded fired");
    initializeApp();
});

function initializeApp() {
    console.log("🚀 Initializing Attendance Track v2");
    
    try {
        // Update loading status
        updateStatus('Checking authentication...');
        
        // 1. Check authentication
        checkAuth();
        
        // 2. Load header
        loadHeader();
        
        // 3. Setup event listeners
        setupEventListeners();
        
        // 4. Load main content
        loadMainContent();
        
        // 5. Update UI
        updateUI();
        
        // 6. Initialize service worker
        initServiceWorker();
        
        window.appState.isLoading = false;
        console.log("✅ App initialized successfully");
        updateStatus('Ready!', 'success');
        
    } catch (error) {
        console.error("❌ Error initializing app:", error);
        updateStatus('Error: ' + error.message, 'error');
        showError(error.message);
    }
}

function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('load-status');
    if (statusEl) {
        statusEl.textContent = message;
        if (type === 'success') {
            statusEl.style.color = 'green';
        } else if (type === 'error') {
            statusEl.style.color = 'red';
        } else if (type === 'warning') {
            statusEl.style.color = 'orange';
        }
    }
    console.log("Status:", message);
}

function checkAuth() {
    const userData = localStorage.getItem('attendance_user');
    if (userData) {
        try {
            window.appState.user = JSON.parse(userData);
            console.log("👤 User found:", window.appState.user.name);
        } catch (e) {
            console.warn("Invalid user data in storage");
            localStorage.removeItem('attendance_user');
        }
    } else {
        console.log("👤 No user logged in");
    }
}

function loadHeader() {
    console.log("📦 Loading header...");
    
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) {
        console.warn("⚠️ header-container not found");
        return;
    }
    
    // Try to load header component
    fetch('components/header.html')
        .then(response => {
            if (!response.ok) throw new Error('Header not found');
            return response.text();
        })
        .then(html => {
            headerContainer.innerHTML = html;
            console.log("✅ Header loaded from component");
        })
        .catch(error => {
            console.warn("⚠️ Using fallback header:", error);
            // Create fallback header
            headerContainer.innerHTML = `
                <header style="
                    background: #405dde;
                    color: white;
                    padding: 15px 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                ">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-clipboard-check fa-lg"></i>
                        <h1 style="margin: 0; font-size: 1.5rem; font-weight: 600;">
                            Attendance Track v2
                        </h1>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        ${window.appState.user ? `
                            <span style="padding: 8px 16px; background: rgba(255,255,255,0.2); border-radius: 4px;">
                                <i class="fas fa-user"></i> ${window.appState.user.name}
                            </span>
                            <button onclick="logout()" style="
                                padding: 8px 16px;
                                background: white;
                                color: #405dde;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </button>
                        ` : `
                            <button onclick="window.location.href='pages/login.html'" style="
                                padding: 8px 16px;
                                background: white;
                                color: #405dde;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                                <i class="fas fa-sign-in-alt"></i> Login
                            </button>
                            <button onclick="startDemoMode()" style="
                                padding: 8px 16px;
                                background: rgba(255,255,255,0.2);
                                color: white;
                                border: 1px solid rgba(255,255,255,0.3);
                                border-radius: 4px;
                                cursor: pointer;
                            ">
                                <i class="fas fa-play-circle"></i> Demo
                            </button>
                        `}
                    </div>
                </header>
            `;
        });
}

function setupEventListeners() {
    console.log("🔧 Setting up event listeners...");
    
    // Online/offline detection
    window.addEventListener('online', function() {
        window.appState.isOnline = true;
        showNotification('Back online', 'success');
    });
    
    window.addEventListener('offline', function() {
        window.appState.isOnline = false;
        showNotification('You are offline', 'warning');
    });
}

function loadMainContent() {
    console.log("📄 Loading main content...");
    
    const appContainer = document.getElementById('app-container');
    if (!appContainer) {
        console.error("❌ app-container not found!");
        return;
    }
    
    // Remove loading content
    const loadingContent = document.getElementById('loading-content');
    if (loadingContent) {
        loadingContent.style.display = 'none';
    }
    
    // Load appropriate content based on auth
    if (window.appState.user) {
        // User is logged in - show dashboard
        appContainer.innerHTML = `
            <div class="dashboard" style="padding: 30px;">
                <div style="margin-bottom: 40px;">
                    <h2 style="color: #333; margin-bottom: 10px;">
                        Welcome back, ${window.appState.user.name}!
                    </h2>
                    <p style="color: #666;">
                        ${window.appState.user.role === 'teacher' ? 'Teacher' : 'Administrator'} • 
                        <span style="color: ${window.appState.isOnline ? '#28a745' : '#dc3545'};">
                            <i class="fas fa-circle fa-xs"></i> ${window.appState.isOnline ? 'Online' : 'Offline'}
                        </span>
                    </p>
                </div>
                
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-bottom: 40px;
                ">
                    <div class="card" style="
                        background: white;
                        padding: 25px;
                        border-radius: 10px;
                        box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                        text-align: center;
                    ">
                        <div style="font-size: 2rem; color: #405dde; margin-bottom: 15px;">
                            <i class="fas fa-clipboard-check"></i>
                        </div>
                        <h3 style="margin-bottom: 10px;">Take Attendance</h3>
                        <p style="color: #666; margin-bottom: 20px;">Record today's attendance</p>
                        <button onclick="window.location.href='pages/attendance.html'" style="
                            padding: 10px 20px;
                            background: #405dde;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            width: 100%;
                        ">
                            Start Attendance
                        </button>
                    </div>
                    
                    <div class="card" style="
                        background: white;
                        padding: 25px;
                        border-radius: 10px;
                        box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                        text-align: center;
                    ">
                        <div style="font-size: 2rem; color: #28a745; margin-bottom: 15px;">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <h3 style="margin-bottom: 10px;">View Reports</h3>
                        <p style="color: #666; margin-bottom: 20px;">Generate attendance reports</p>
                        <button onclick="window.location.href='pages/reports.html'" style="
                            padding: 10px 20px;
                            background: #28a745;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            width: 100%;
                        ">
                            View Reports
                        </button>
                    </div>
                    
                    <div class="card" style="
                        background: white;
                        padding: 25px;
                        border-radius: 10px;
                        box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                        text-align: center;
                    ">
                        <div style="font-size: 2rem; color: #6c757d; margin-bottom: 15px;">
                            <i class="fas fa-cog"></i>
                        </div>
                        <h3 style="margin-bottom: 10px;">Settings</h3>
                        <p style="color: #666; margin-bottom: 20px;">Configure your system</p>
                        <button onclick="window.location.href='pages/settings.html'" style="
                            padding: 10px 20px;
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            width: 100%;
                        ">
                            Go to Settings
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        // User not logged in - show landing page
        appContainer.innerHTML = `
            <div class="landing" style="padding: 40px 20px; text-align: center;">
                <div style="max-width: 800px; margin: 0 auto;">
                    <div style="margin-bottom: 40px;">
                        <h1 style="font-size: 2.5rem; color: #405dde; margin-bottom: 15px;">
                            Complete Attendance Management
                        </h1>
                        <p style="font-size: 1.2rem; color: #666; line-height: 1.6;">
                            Track, manage, and report student attendance efficiently with our comprehensive system.
                            Perfect for schools, colleges, and training institutions.
                        </p>
                    </div>
                    
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 25px;
                        margin: 50px 0;
                    ">
                        <div style="text-align: center;">
                            <div style="font-size: 2.5rem; color: #405dde; margin-bottom: 15px;">
                                <i class="fas fa-users"></i>
                            </div>
                            <h3 style="margin-bottom: 10px;">Student Management</h3>
                            <p style="color: #666;">Manage multiple classes and students</p>
                        </div>
                        
                        <div style="text-align: center;">
                            <div style="font-size: 2.5rem; color: #28a745; margin-bottom: 15px;">
                                <i class="fas fa-chart-pie"></i>
                            </div>
                            <h3 style="margin-bottom: 10px;">Analytics</h3>
                            <p style="color: #666;">Detailed reports and insights</p>
                        </div>
                        
                        <div style="text-align: center;">
                            <div style="font-size: 2.5rem; color: #ffc107; margin-bottom: 15px;">
                                <i class="fas fa-file-export"></i>
                            </div>
                            <h3 style="margin-bottom: 10px;">Export Data</h3>
                            <p style="color: #666;">PDF, Excel, and CSV exports</p>
                        </div>
                    </div>
                    
                    <div style="margin-top: 50px;">
                        <button onclick="window.location.href='pages/login.html'" style="
                            padding: 15px 40px;
                            background: #405dde;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 1.1rem;
                            font-weight: 600;
                            margin: 10px;
                        ">
                            <i class="fas fa-sign-in-alt"></i> Login to Start
                        </button>
                        
                        <button onclick="startDemoMode()" style="
                            padding: 15px 40px;
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 1.1rem;
                            margin: 10px;
                        ">
                            <i class="fas fa-play-circle"></i> Try Demo Mode
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

function updateUI() {
    console.log("🎨 Updating UI...");
    
    // Apply theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    window.appState.theme = savedTheme;
}

function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(function(registration) {
                console.log('✅ Service Worker registered:', registration.scope);
            })
            .catch(function(error) {
                console.warn('⚠️ Service Worker registration failed:', error);
            });
    }
}

function showNotification(message, type = 'info') {
    console.log(`Notification [${type}]: ${message}`);
    
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#405dde'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(function() {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function showError(message) {
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #dc3545;">
                <h2>⚠️ Application Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    padding: 10px 20px;
                    background: #405dde;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 20px;
                ">
                    Reload Application
                </button>
            </div>
        `;
    }
}

// Global functions
window.logout = function() {
    localStorage.removeItem('attendance_user');
    showNotification('Logged out successfully', 'success');
    setTimeout(function() {
        location.reload();
    }, 1000);
};

window.startDemoMode = function() {
    console.log("🚀 Starting demo mode...");
    
    const demoUser = {
        id: 'demo-001',
        name: 'Demo Teacher',
        email: 'demo@school.edu',
        role: 'teacher',
        school: 'Demo Academy',
        demo: true
    };
    
    localStorage.setItem('attendance_user', JSON.stringify(demoUser));
    localStorage.setItem('demo_mode', 'true');
    
    showNotification('Demo mode activated!', 'success');
    
    setTimeout(function() {
        location.reload();
    }, 1500);
};

// Make initializeApp available globally
window.initializeApp = initializeApp;

console.log("✅ main.js setup complete");
