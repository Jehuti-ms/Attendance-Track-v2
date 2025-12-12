// attendance-track-v2/assets/js/main.js

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Attendance Track v2 - Initializing...');
    
    // Check if we're online
    const isOnline = navigator.onLine;
    console.log(`Application is ${isOnline ? 'online' : 'offline'}`);
    
    // Initialize service worker for PWA
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/Attendance-Track-v2/service-worker.js');
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        } catch (error) {
            console.error('ServiceWorker registration failed: ', error);
        }
    }
    
    // Load configuration
    let config = {};
    try {
        const response = await fetch('/Attendance-Track-v2/config.json');
        config = await response.json();
        console.log('Configuration loaded:', config);
    } catch (error) {
        console.error('Failed to load config.json, using defaults:', error);
        config = {
            appName: 'Attendance Track v2',
            version: '2.0.0',
            defaultTheme: 'light',
            apiEndpoint: null
        };
    }
    
    // Set app version in footer
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
        versionElement.textContent = `v${config.version}`;
    }
    
    // Set app name in title
    document.title = config.appName || 'Attendance Track v2';
    
    // Initialize theme
    const savedTheme = localStorage.getItem('user_theme') || config.defaultTheme || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    
    // Initialize main application
    try {
        // Load the main app module
        const { AttendanceApp } = await import('./attendance-app.js');
        window.app = new AttendanceApp(config);
        await window.app.initialize();
        
        console.log('Attendance Track v2 initialized successfully');
        
        // Show welcome message for first-time users
        const firstVisit = !localStorage.getItem('hasVisitedBefore');
        if (firstVisit) {
            localStorage.setItem('hasVisitedBefore', 'true');
            showWelcomeMessage();
        }
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showErrorPage(error);
    }
});

// Show welcome message
function showWelcomeMessage() {
    const welcomeHtml = `
        <div class="welcome-modal">
            <div class="welcome-content">
                <h2>Welcome to Attendance Track v2! 🎉</h2>
                <p>Thank you for choosing our attendance tracking system. Here's what you can do:</p>
                <ul>
                    <li><strong>Setup Classes</strong> - Add your classes and students</li>
                    <li><strong>Take Attendance</strong> - Record daily attendance easily</li>
                    <li><strong>Generate Reports</strong> - Create detailed attendance reports</li>
                    <li><strong>Export Data</strong> - Export in PDF, Excel, or CSV formats</li>
                    <li><strong>Manage Terms</strong> - Configure academic terms and dates</li>
                </ul>
                <p>Get started by setting up your classes in the Setup page.</p>
                <div class="welcome-actions">
                    <button class="btn btn-primary" id="start-tutorial-btn">Start Tutorial</button>
                    <button class="btn btn-secondary" id="skip-tutorial-btn">Skip Tutorial</button>
                </div>
            </div>
        </div>
    `;
    
    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = welcomeHtml;
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('#start-tutorial-btn').addEventListener('click', () => {
        modal.remove();
        startTutorial();
    });
    
    modal.querySelector('#skip-tutorial-btn').addEventListener('click', () => {
        modal.remove();
    });
}

// Start tutorial
function startTutorial() {
    // Tutorial implementation would go here
    console.log('Starting tutorial...');
    // For now, just show a message
    if (window.app && window.app.showToast) {
        window.app.showToast('Tutorial coming soon!', 'info');
    }
}

// Show error page
function showErrorPage(error) {
    const errorHtml = `
        <div class="error-container">
            <div class="error-content">
                <h1>⚠️ Application Error</h1>
                <p>We're sorry, but there was an error loading the application.</p>
                <div class="error-details">
                    <pre>${error.message || error.toString()}</pre>
                </div>
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        <i class="fas fa-redo"></i> Reload Application
                    </button>
                    <button class="btn btn-secondary" onclick="showHelp()">
                        <i class="fas fa-question-circle"></i> Get Help
                    </button>
                </div>
                <div class="error-tips">
                    <h4>Troubleshooting Tips:</h4>
                    <ul>
                        <li>Check your internet connection</li>
                        <li>Clear browser cache and reload</li>
                        <li>Try using a different browser</li>
                        <li>Contact support if the problem persists</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    // Replace entire page content
    document.body.innerHTML = errorHtml;
}

// Show help information
function showHelp() {
    const helpHtml = `
        <div class="help-modal">
            <div class="help-content">
                <h2>Need Help? 📚</h2>
                <p>Here are some resources to help you get started:</p>
                
                <div class="help-resources">
                    <div class="resource-card">
                        <h3><i class="fas fa-book"></i> User Guide</h3>
                        <p>Complete documentation for all features</p>
                        <button class="btn btn-outline-primary" onclick="openUserGuide()">
                            Open Guide
                        </button>
                    </div>
                    
                    <div class="resource-card">
                        <h3><i class="fas fa-video"></i> Video Tutorials</h3>
                        <p>Step-by-step video tutorials</p>
                        <button class="btn btn-outline-primary" onclick="openVideoTutorials()">
                            Watch Videos
                        </button>
                    </div>
                    
                    <div class="resource-card">
                        <h3><i class="fas fa-envelope"></i> Contact Support</h3>
                        <p>Get help from our support team</p>
                        <button class="btn btn-outline-primary" onclick="contactSupport()">
                            Contact Us
                        </button>
                    </div>
                </div>
                
                <div class="help-actions">
                    <button class="btn btn-secondary" onclick="closeHelp()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = helpHtml;
    document.body.appendChild(modal);
}

// Help modal functions
function openUserGuide() {
    window.open('https://docs.example.com/attendance-track-v2', '_blank');
}

function openVideoTutorials() {
    window.open('https://youtube.com/playlist?list=EXAMPLE', '_blank');
}

function contactSupport() {
    window.location.href = 'mailto:support@example.com?subject=Attendance%20Track%20v2%20Support';
}

function closeHelp() {
    const modal = document.querySelector('.help-modal');
    if (modal) {
        modal.remove();
    }
}

// Offline detection
window.addEventListener('online', () => {
    console.log('Application is now online');
    if (window.app && window.app.showToast) {
        window.app.showToast('You are back online', 'success');
    }
});

window.addEventListener('offline', () => {
    console.log('Application is now offline');
    if (window.app && window.app.showToast) {
        window.app.showToast('You are offline. Some features may be limited.', 'warning');
    }
});

// Before unload confirmation
window.addEventListener('beforeunload', (event) => {
    // Check if there are unsaved changes
    const hasUnsavedChanges = localStorage.getItem('has_unsaved_changes') === 'true';
    
    if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Don't show error modal for minor errors
    if (event.error && event.error.message && 
        !event.error.message.includes('Failed to fetch') &&
        !event.error.message.includes('NetworkError')) {
        return;
    }
    
    // Show user-friendly error message
    if (window.app && window.app.showToast) {
        window.app.showToast('An error occurred. Please try again.', 'error');
    }
});

// Export for debugging
window.debugApp = () => {
    return {
        app: window.app,
        localStorage: { ...localStorage },
        config: window.app?.config,
        state: window.app?.state
    };
};
