// assets/js/main.js - COMPLETE FILE (NO EXPORTS)
console.log("🎯 Attendance Track v2 - main.js loading");

// ==================== GLOBAL APP STATE ====================
window.appState = {
    user: null,
    theme: 'light',
    isOnline: navigator.onLine,
    isLoading: true,
    currentPage: window.location.pathname.split('/').pop() || 'index.html'
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOM ready");
    
    // Update loading status
    updateStatus('Initializing application...');
    
    // Initialize the app
    setTimeout(function() {
        try {
            initializeApp();
        } catch (error) {
            console.error("❌ Initialization error:", error);
            updateStatus('Error: ' + error.message, 'error');
            showError(error.message);
        }
    }, 100);
});

// ==================== MAIN APP FUNCTIONS ====================
function initializeApp() {
    console.log("🚀 Initializing Attendance Track v2");
    
    // 1. Check authentication
    checkAuth();
    
    // 2. Load header
    loadHeader();
    
    // 3. Load main content
    loadMainContent();
    
    // 4. Setup event listeners
    setupEventListeners();
    
    // 5. Initialize service worker
    initServiceWorker();
    
    // 6. Update UI
    updateUI();
    
    window.appState.isLoading = false;
    console.log("✅ App initialized successfully");
    updateStatus('Ready!', 'success');
    
    // Hide loading after delay
    setTimeout(function() {
        const loadingContent = document.getElementById('loading-content');
        if (loadingContent) {
            loadingContent.style.opacity = '0';
            setTimeout(function() {
                loadingContent.style.display = 'none';
            }, 300);
        }
    }, 500);
}

function updateStatus(message, type) {
    const statusEl = document.getElementById('load-status');
    if (statusEl) {
        statusEl.textContent = message;
        if (type === 'success') {
            statusEl.style.color = '#28a745';
        } else if (type === 'error') {
            statusEl.style.color = '#dc3545';
        } else if (type === 'warning') {
            statusEl.style.color = '#ffc107';
        } else {
            statusEl.style.color = '#405dde';
        }
    }
    console.log("Status:", message);
}

function checkAuth() {
    console.log("🔐 Checking authentication...");
    
    try {
        const userData = localStorage.getItem('attendance_user');
        if (userData) {
            window.appState.user = JSON.parse(userData);
            console.log("👤 User found:", window.appState.user.name);
        } else {
            console.log("👤 No user logged in");
        }
    } catch (error) {
        console.warn("⚠️ Error parsing user data:", error);
        localStorage.removeItem('attendance_user');
    }
}

function loadHeader() {
    console.log("📦 Loading header...");
    
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) {
        console.warn("⚠️ header-container not found");
        return;
    }
    
    // Create header HTML
    headerContainer.innerHTML = `
        <header style="
            background: #405dde;
            color: white;
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            position: relative;
            z-index: 1000;
        ">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 1.5rem;">
                    <i class="fas fa-clipboard-check"></i>
                </div>
                <div>
                    <h1 style="margin: 0; font-size: 1.3rem; font-weight: 600;">
                        Attendance Track v2
                    </h1>
                    <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 2px;">
                        <span id="online-status" style="color: ${window.appState.isOnline ? '#90ee90' : '#ff6b6b'};">
                            <i class="fas fa-circle fa-xs"></i> ${window.appState.isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px;">
                ${window.appState.user ? `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="
                            width: 36px;
                            height: 36px;
                            background: rgba(255,255,255,0.2);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500; font-size: 0.9rem;">
                                ${window.appState.user.name}
                            </div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">
                                ${window.appState.user.role || 'User'}
                            </div>
                        </div>
                    </div>
                    <button onclick="logout()" style="
                        padding: 8px 16px;
                        background: rgba(255,255,255,0.9);
                        color: #405dde;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9rem;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='white'"
                     onmouseout="this.style.background='rgba(255,255,255,0.9)'">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                ` : `
                    <button onclick="goToLogin()" style="
                        padding: 8px 16px;
                        background: rgba(255,255,255,0.9);
                        color: #405dde;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9rem;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='white'"
                     onmouseout="this.style.background='rgba(255,255,255,0.9)'">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </button>
                    <button onclick="startDemoMode()" style="
                        padding: 8px 16px;
                        background: transparent;
                        color: white;
                        border: 1px solid rgba(255,255,255,0.3);
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.9rem;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                     onmouseout="this.style.background='transparent'">
                        <i class="fas fa-play-circle"></i> Try Demo
                    </button>
                `}
            </div>
        </header>
    `;
}

function loadMainContent() {
    console.log("📄 Loading main content...");
    
    const appContainer = document.getElementById('app-container');
    if (!appContainer) {
        console.error("❌ app-container not found!");
        return;
    }
    
    // Remove loading indicator
    const loadingContent = document.getElementById('loading-content');
    if (loadingContent) {
        loadingContent.style.transition = 'opacity 0.3s ease';
        loadingContent.style.opacity = '0';
        setTimeout(function() {
            loadingContent.style.display = 'none';
        }, 300);
    }
    
    // Load content based on authentication
    if (window.appState.user) {
        loadDashboardContent(appContainer);
    } else {
        loadLandingContent(appContainer);
    }
}

function loadDashboardContent(container) {
    container.innerHTML = `
        <div style="padding: 30px; max-width: 1200px; margin: 0 auto;">
            <!-- Welcome section -->
            <div style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px;
                margin-bottom: 30px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            ">
                <h2 style="margin: 0 0 10px 0; font-size: 1.8rem;">
                    Welcome back, ${window.appState.user.name}!
                </h2>
                <p style="margin: 0; opacity: 0.9;">
                    ${window.appState.user.role === 'teacher' ? 'Teacher Dashboard' : 'Administrator Dashboard'} • 
                    Last login: Today
                </p>
            </div>
            
            <!-- Quick Stats -->
            <div style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            ">
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.08);
                    text-align: center;
                ">
                    <div style="font-size: 2rem; color: #405dde; margin-bottom: 10px;">
                        <i class="fas fa-users"></i>
                    </div>
                    <div style="font-size: 1.8rem; font-weight: 600; color: #333;">
                        24
                    </div>
                    <div style="color: #666; font-size: 0.9rem;">
                        Total Students
                    </div>
                </div>
                
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.08);
                    text-align: center;
                ">
                    <div style="font-size: 2rem; color: #28a745; margin-bottom: 10px;">
                        <i class="fas fa-clipboard-check"></i>
                    </div>
                    <div style="font-size: 1.8rem; font-weight: 600; color: #333;">
                        92%
                    </div>
                    <div style="color: #666; font-size: 0.9rem;">
                        Attendance Rate
                    </div>
                </div>
                
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.08);
                    text-align: center;
                ">
                    <div style="font-size: 2rem; color: #ffc107; margin-bottom: 10px;">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <div style="font-size: 1.8rem; font-weight: 600; color: #333;">
                        5
                    </div>
                    <div style="color: #666; font-size: 0.9rem;">
                        Classes Today
                    </div>
                </div>
                
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.08);
                    text-align: center;
                ">
                    <div style="font-size: 2rem; color: #dc3545; margin-bottom: 10px;">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div style="font-size: 1.8rem; font-weight: 600; color: #333;">
                        3
                    </div>
                    <div style="color: #666; font-size: 0.9rem;">
                        Pending Actions
                    </div>
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div style="margin-bottom: 40px;">
                <h3 style="color: #333; margin-bottom: 20px;">Quick Actions</h3>
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                ">
                    <button onclick="goToAttendance()" style="
                        background: white;
                        border: none;
                        padding: 25px;
                        border-radius: 8px;
                        cursor: pointer;
                        text-align: left;
                        box-shadow: 0 3px 10px rgba(0,0,0,0.08);
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.12)'"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 10px rgba(0,0,0,0.08)'">
                        <div style="
                            width: 50px;
                            height: 50px;
                            background: #405dde;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 1.3rem;
                        ">
                            <i class="fas fa-clipboard-check"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #333; margin-bottom: 5px;">
                                Take Attendance
                            </div>
                            <div style="color: #666; font-size: 0.9rem;">
                                Record today's attendance
                            </div>
                        </div>
                    </button>
                    
                    <button onclick="goToReports()" style="
                        background: white;
                        border: none;
                        padding: 25px;
                        border-radius: 8px;
                        cursor: pointer;
                        text-align: left;
                        box-shadow: 0 3px 10px rgba(0,0,0,0.08);
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.12)'"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 10px rgba(0,0,0,0.08)'">
                        <div style="
                            width: 50px;
                            height: 50px;
                            background: #28a745;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 1.3rem;
                        ">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #333; margin-bottom: 5px;">
                                View Reports
                            </div>
                            <div style="color: #666; font-size: 0.9rem;">
                                Generate attendance reports
                            </div>
                        </div>
                    </button>
                    
                    <button onclick="goToSettings()" style="
                        background: white;
                        border: none;
                        padding: 25px;
                        border-radius: 8px;
                        cursor: pointer;
                        text-align: left;
                        box-shadow: 0 3px 10px rgba(0,0,0,0.08);
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.12)'"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 10px rgba(0,0,0,0.08)'">
                        <div style="
                            width: 50px;
                            height: 50px;
                            background: #6c757d;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 1.3rem;
                        ">
                            <i class="fas fa-cog"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #333; margin-bottom: 5px;">
                                Settings
                            </div>
                            <div style="color: #666; font-size: 0.9rem;">
                                Configure your system
                            </div>
                        </div>
                    </button>
                </div>
            </div>
            
            <!-- Recent Activity -->
            <div style="
                background: white;
                padding: 25px;
                border-radius: 8px;
                box-shadow: 0 3px 10px rgba(0,0,0,0.08);
            ">
                <h3 style="color: #333; margin-bottom: 20px;">Recent Activity</h3>
                <div style="color: #666;">
                    <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                        <i class="fas fa-check-circle" style="color: #28a745; margin-right: 10px;"></i>
                        Attendance taken for Mathematics 101 - Today, 9:00 AM
                    </div>
                    <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                        <i class="fas fa-file-export" style="color: #405dde; margin-right: 10px;"></i>
                        Report exported for Week 45 - Yesterday, 3:30 PM
                    </div>
                    <div style="padding: 10px 0;">
                        <i class="fas fa-user-plus" style="color: #ffc107; margin-right: 10px;"></i>
                        3 new students added - Monday, 10:15 AM
                    </div>
                </div>
            </div>
        </div>
    `;
}

function loadLandingContent(container) {
    container.innerHTML = `
        <div style="padding: 40px 20px; text-align: center;">
            <div style="max-width: 1000px; margin: 0 auto;">
                <!-- Hero Section -->
                <div style="margin-bottom: 60px;">
                    <div style="
                        width: 100px;
                        height: 100px;
                        background: linear-gradient(135deg, #405dde, #667eea);
                        border-radius: 25px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 30px;
                        color: white;
                        font-size: 3rem;
                        box-shadow: 0 10px 30px rgba(64, 93, 222, 0.3);
                    ">
                        <i class="fas fa-clipboard-check"></i>
                    </div>
                    
                    <h1 style="
                        font-size: 3rem;
                        color: #333;
                        margin-bottom: 20px;
                        background: linear-gradient(135deg, #405dde, #667eea);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    ">
                        Attendance Track v2
                    </h1>
                    
                    <p style="
                        font-size: 1.3rem;
                        color: #666;
                        line-height: 1.6;
                        max-width: 700px;
                        margin: 0 auto 40px;
                    ">
                        The complete solution for tracking, managing, and reporting student attendance.
                        Perfect for schools, colleges, and training institutions.
                    </p>
                </div>
                
                <!-- Features Grid -->
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 30px;
                    margin-bottom: 60px;
                ">
                    <div style="
                        background: white;
                        padding: 35px 25px;
                        border-radius: 15px;
                        text-align: center;
                        box-shadow: 0 8px 25px rgba(0,0,0,0.08);
                        transition: all 0.3s ease;
                        border: 1px solid #f0f0f0;
                    " onmouseover="this.style.transform='translateY(-10px)'; this.style.boxShadow='0 15px 35px rgba(0,0,0,0.12)'"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.08)'">
                        <div style="
                            width: 70px;
                            height: 70px;
                            background: linear-gradient(135deg, #405dde, #667eea);
                            border-radius: 15px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 25px;
                            color: white;
                            font-size: 1.8rem;
                        ">
                            <i class="fas fa-users"></i>
                        </div>
                        <h3 style="color: #333; margin-bottom: 15px; font-size: 1.3rem;">
                            Student Management
                        </h3>
                        <p style="color: #666; line-height: 1.6; font-size: 0.95rem;">
                            Easily manage multiple classes and students with an intuitive interface.
                        </p>
                    </div>
                    
                    <div style="
                        background: white;
                        padding: 35px 25px;
                        border-radius: 15px;
                        text-align: center;
                        box-shadow: 0 8px 25px rgba(0,0,0,0.08);
                        transition: all 0.3s ease;
                        border: 1px solid #f0f0f0;
                    " onmouseover="this.style.transform='translateY(-10px)'; this.style.boxShadow='0 15px 35px rgba(0,0,0,0.12)'"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.08)'">
                        <div style="
                            width: 70px;
                            height: 70px;
                            background: linear-gradient(135deg, #28a745, #20c997);
                            border-radius: 15px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 25px;
                            color: white;
                            font-size: 1.8rem;
                        ">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                        <h3 style="color: #333; margin-bottom: 15px; font-size: 1.3rem;">
                            Analytics & Reports
                        </h3>
                        <p style="color: #666; line-height: 1.6; font-size: 0.95rem;">
                            Generate detailed reports and gain insights with comprehensive analytics.
                        </p>
                    </div>
                    
                    <div style="
                        background: white;
                        padding: 35px 25px;
                        border-radius: 15px;
                        text-align: center;
                        box-shadow: 0 8px 25px rgba(0,0,0,0.08);
                        transition: all 0.3s ease;
                        border: 1px solid #f0f0f0;
                    " onmouseover="this.style.transform='translateY(-10px)'; this.style.boxShadow='0 15px 35px rgba(0,0,0,0.12)'"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.08)'">
                        <div style="
                            width: 70px;
                            height: 70px;
                            background: linear-gradient(135deg, #ffc107, #fd7e14);
                            border-radius: 15px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 25px;
                            color: white;
                            font-size: 1.8rem;
                        ">
                            <i class="fas fa-file-export"></i>
                        </div>
                        <h3 style="color: #333; margin-bottom: 15px; font-size: 1.3rem;">
                            Export Data
                        </h3>
                        <p style="color: #666; line-height: 1.6; font-size: 0.95rem;">
                            Export attendance data in multiple formats including PDF, Excel, and CSV.
                        </p>
                    </div>
                </div>
                
                <!-- Call to Action -->
                <div style="
                    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                    padding: 50px;
                    border-radius: 15px;
                    border: 1px solid #dee2e6;
                ">
                    <h2 style="color: #333; margin-bottom: 20px; font-size: 2rem;">
                        Ready to Get Started?
                    </h2>
                    <p style="color: #666; margin-bottom: 40px; font-size: 1.1rem; max-width: 600px; margin-left: auto; margin-right: auto;">
                        Join thousands of educators who trust Attendance Track for their attendance management needs.
                    </p>
                    
                    <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="goToLogin()" style="
                            padding: 18px 45px;
                            background: linear-gradient(135deg, #405dde, #667eea);
                            color: white;
                            border: none;
                            border-radius: 10px;
                            cursor: pointer;
                            font-size: 1.1rem;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 25px rgba(64, 93, 222, 0.3)'"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                            <i class="fas fa-sign-in-alt"></i>
                            Login to Start
                        </button>
                        
                        <button onclick="startDemoMode()" style="
                            padding: 18px 45px;
                            background: white;
                            color: #405dde;
                            border: 2px solid #405dde;
                            border-radius: 10px;
                            cursor: pointer;
                            font-size: 1.1rem;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 25px rgba(0,0,0,0.1)'"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                            <i class="fas fa-play-circle"></i>
                            Try Demo Mode
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupEventListeners() {
    console.log("🔧 Setting up event listeners...");
    
    // Update online status in header
    window.addEventListener('online', function() {
        window.appState.isOnline = true;
        updateOnlineStatus();
        showNotification('You are back online', 'success');
    });
    
    window.addEventListener('offline', function() {
        window.appState.isOnline = false;
        updateOnlineStatus();
        showNotification('You are offline. Some features may not work.', 'warning');
    });
}

function updateOnlineStatus() {
    const onlineStatus = document.getElementById('online-status');
    if (onlineStatus) {
        onlineStatus.innerHTML = `
            <i class="fas fa-circle fa-xs"></i> ${window.appState.isOnline ? 'Online' : 'Offline'}
        `;
        onlineStatus.style.color = window.appState.isOnline ? '#90ee90' : '#ff6b6b';
    }
}

function updateUI() {
    console.log("🎨 Updating UI...");
    
    // Apply theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    window.appState.theme = savedTheme;
    
    // Update online status
    updateOnlineStatus();
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

function showNotification(message, type) {
    console.log(`Notification [${type}]: ${message}`);
    
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#405dde'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(-20px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    toastContainer.appendChild(toast);
    
    // Remove after 4 seconds
    setTimeout(function() {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

function showError(message) {
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <div style="font-size: 4rem; color: #dc3545; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h2 style="color: #333; margin-bottom: 15px;">
                    Application Error
                </h2>
                <p style="color: #666; margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
                    ${message}
                </p>
                <button onclick="location.reload()" style="
                    padding: 12px 30px;
                    background: #405dde;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 500;
                ">
                    <i class="fas fa-redo"></i> Reload Application
                </button>
            </div>
        `;
    }
}

// ==================== GLOBAL FUNCTIONS ====================
// Helper to get the correct base path
window.getBasePath = function() {
    // If we're on GitHub Pages
    if (window.location.hostname.includes('github.io')) {
        const pathParts = window.location.pathname.split('/');
        const repoName = pathParts[1]; // Get repo name from URL
        return `/${repoName}/`;
    }
    return '/';
};

window.goToLogin = function() {
    const basePath = window.getBasePath();
    window.location.href = `${basePath}pages/login.html`;
};

window.goToAttendance = function() {
    const basePath = window.getBasePath();
    window.location.href = `${basePath}pages/attendance.html`;
};

window.goToReports = function() {
    const basePath = window.getBasePath();
    window.location.href = `${basePath}pages/reports.html`;
};

window.goToSettings = function() {
    const basePath = window.getBasePath();
    window.location.href = `${basePath}pages/settings.html`;
};

window.goToDashboard = function() {
    const basePath = window.getBasePath();
    window.location.href = `${basePath}pages/dashboard.html`;
};

window.logout = function() {
    localStorage.removeItem('attendance_user');
    localStorage.removeItem('demo_mode');
    showNotification('Logged out successfully', 'success');
    setTimeout(function() {
        window.goToLogin();
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
    
    showNotification('Demo mode activated! Loading dashboard...', 'success');
    
    setTimeout(function() {
        window.goToDashboard();
    }, 1500);
};

// ==================== EXPOSE MAIN FUNCTION ====================
window.initializeApp = initializeApp;

console.log("✅ main.js setup complete - Ready to initialize");
