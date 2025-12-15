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

// Export functions for use in other scripts
window.initCommon = initCommon;
window.handleLogout = handleLogout;
