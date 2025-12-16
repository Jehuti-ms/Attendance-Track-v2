// auth-manager.js - SIMPLE BULLETPROOF AUTH
class AuthManager {
    constructor() {
        console.log('🔐 AuthManager initialized');
    }
    
    // Simple, reliable auth check
    checkAuth() {
        try {
            const userJson = localStorage.getItem('attendance_user');
            if (!userJson) {
                console.log('❌ No user in localStorage');
                return false;
            }
            
            const user = JSON.parse(userJson);
            const hasEmail = user && user.email;
            
            console.log('Auth check:', { 
                hasUser: !!user, 
                hasEmail: hasEmail,
                userEmail: user?.email 
            });
            
            return hasEmail;
            
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }
    
    // Simple page detection
    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        const pageName = page.replace('.html', '').split('?')[0];
        
        // Handle special cases
        if (pageName === '' || pageName === '/' || pageName === 'index') {
            return 'index';
        }
        
        return pageName;
    }
    
    // Simple redirect
    redirectTo(page) {
        console.log(`🔄 Redirecting to: ${page}`);
        // Use replace to avoid history loops
        window.location.replace(page);
    }
    
    // Main auth guard
    guardRoute() {
        const currentPage = this.getCurrentPage();
        const isAuthenticated = this.checkAuth();
        
        console.log('Route guard:', {
            currentPage,
            isAuthenticated,
            fullPath: window.location.pathname
        });
        
        // Public pages that don't require auth
        const publicPages = ['index', 'login', ''];
        const isPublicPage = publicPages.includes(currentPage);
        
        // Logic matrix
        if (isAuthenticated && isPublicPage) {
            // Logged in but on login page? Go to dashboard
            console.log('✅ User authenticated, redirecting to dashboard');
            this.redirectTo('dashboard.html');
            return false;
        }
        
        if (!isAuthenticated && !isPublicPage) {
            // Not logged in but on protected page? Go to login
            console.log('🔒 User not authenticated, redirecting to login');
            this.redirectTo('index.html');
            return false;
        }
        
        // All good, continue
        console.log('✅ Auth check passed');
        return true;
    }
}

// Create global instance
window.authManager = new AuthManager();
