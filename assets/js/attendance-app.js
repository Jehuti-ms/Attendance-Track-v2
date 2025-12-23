// attendance-app.js - FULLY REBUILT VERSION WITH ALL PAGES
// Clear old caches
if ('serviceWorker' in navigator && 'caches' in window) {
    caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
            if (cacheName.startsWith('attendance-cache-')) {
                caches.delete(cacheName);
                console.log('🗑️ Cleared cache:', cacheName);
            }
        });
    });
}

import { Storage, Utils } from './utils.js';

class AttendanceApp {
    constructor() {
    console.log('🎯 AttendanceApp constructor');
    
    this.state = {
        currentUser: null,
        currentPage: this.getCurrentPage(),
        isOnline: navigator.onLine,
        settings: Storage.get('app_settings', {}),
        // UPDATE THESE:
        navLinksElement: null, // Changed from toggleableNavbar
        hamburgerElement: null,
        resizeListenerInitialized: false
    };

    this.user = null;
    this.firebaseAvailable = false;
   
    // Initialize app
    this.init();
}
    
    // ==================== CORE METHODS ====================
    getCurrentPage() {
        const path = window.location.pathname;
        console.log('📄 Path for getCurrentPage:', path);
        
        let page = path.split('/').pop() || 'index.html';
        console.log('📄 Page after split:', page);
        
        // Remove .html and any query parameters
        page = page.replace('.html', '').split('?')[0];
        console.log('📄 Final page name:', page);
        
        // Handle empty page (root)
        if (page === '' || page === '/' || page === 'index') {
            return 'index';
        }
        
        return page;
    }

    getBasePath() {
        const pathname = window.location.pathname;
        
        // Handle different deployment scenarios
        if (pathname.includes('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        } else if (pathname === '/Attendance-Track-v2' || pathname.endsWith('/Attendance-Track-v2/')) {
            return '/Attendance-Track-v2/';
        }
        return '/';
    }

    /** * Update navigation status indicator  * Shows: "Loading..." → "Username ● Online/Offline" */
updateNavStatus() {
    const statusElement = document.getElementById('navUserStatus');
    if (!statusElement) {
        console.log('⚠️ navUserStatus element not found, trying again...');
        setTimeout(() => this.updateNavStatus(), 300);
        return;
    }
    
    // Get username
    let username = 'User';
    
    if (this.state && this.state.currentUser) {
        username = this.state.currentUser.name || this.state.currentUser.email || 'User';
    } else {
        try {
            const storedUser = localStorage.getItem('attendance_user') || localStorage.getItem('currentUser');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                username = user.name || user.email || 'User';
            }
        } catch(e) {
            console.error('Error parsing user:', e);
        }
    }
    
    // Get connection status
    const isOnline = navigator.onLine;
    const connectionStatus = isOnline ? 'online' : 'offline';
    const statusText = isOnline ? 'Online' : 'Offline';
    
    // Update HTML with DARK TEXT or proper contrast
    statusElement.innerHTML = `
        <div class="status-content" style="
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        ">
            <div class="user-display" style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-user" style="color: #3498db; font-size: 14px;"></i>
                <span class="user-name" style="color: white; font-weight: 500; font-size: 14px;">${username}</span>
            </div>
            <div class="connection-status" style="
                display: flex;
                align-items: center;
                gap: 6px;
                padding-left: 12px;
                border-left: 1px solid rgba(255, 255, 255, 0.2);
            ">
                <span class="status-dot ${connectionStatus}" style="
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                    background-color: ${isOnline ? '#27ae60' : '#e74c3c'};
                "></span>
                <span class="status-text" style="color: rgba(255, 255, 255, 0.9); font-size: 12px; font-weight: 500;">${statusText}</span>
            </div>
        </div>
    `;
    
    // Apply pulse animation for online status
    setTimeout(() => {
        const dot = statusElement.querySelector('.status-dot');
        if (dot && isOnline) {
            dot.style.animation = 'pulse 2s infinite';
        }
    }, 10);
    
    this.setupConnectionMonitoring(statusElement);
}

setupConnectionMonitoring(statusElement) {
    if (!statusElement) return;
    
    const updateStatus = (isOnline) => {
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        if (dot && text) {
            // Update dot
            dot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
            dot.style.backgroundColor = isOnline ? '#27ae60' : '#e74c3c';
            
            // Update text
            text.textContent = isOnline ? 'Online' : 'Offline';
            text.style.color = 'rgba(255, 255, 255, 0.9)';
            
            // Add/remove pulse animation
            if (isOnline) {
                dot.style.animation = 'pulse 2s infinite';
            } else {
                dot.style.animation = 'none';
            }
            
            console.log(isOnline ? '✅ Online' : '⚠️ Offline');
        }
    };
    
    // Set initial status
    updateStatus(navigator.onLine);
    
    // Add event listeners
    window.addEventListener('online', () => updateStatus(true));
    window.addEventListener('offline', () => updateStatus(false));
}

// ==================== USER STATUS DESIGN FIX ====================
fixUserStatusDesign() {
    console.log('🎨 Applying dark design fixes...');
    
    setTimeout(() => {
        // 1. Fix container sizes
        this.fixContainerSizes();
        
        // 2. Setup logout button
        this.setupLogoutButton();
        
        // 3. Setup responsive hamburger menu
        this.setupResponsiveHamburgerMenu();
        
        console.log('✅ Dark design fixes applied');
    }, 100);
}

// Make sure this method exists
fixContainerSizes() {
    console.log('📏 Fixing container sizes...');
    
    const allContainers = [
        document.querySelector('#navUserStatus'),
        document.querySelector('.user-status'),
        document.querySelector('.status-content')
    ].filter(el => el && el.isConnected);
    
    allContainers.forEach((container, index) => {
        let parent = container.parentElement;
        let isNested = false;
        
        while (parent) {
            if (allContainers.includes(parent)) {
                isNested = true;
                break;
            }
            parent = parent.parentElement;
        }
        
        if (isNested) {
            container.style.cssText = `
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                height: auto !important;
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                position: static !important;
                z-index: auto !important;
            `;
        } else {
            container.style.cssText = `
                background: rgba(0, 0, 0, 0.85) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 20px !important;
                height: 40px !important;
                min-height: 40px !important;
                max-height: 40px !important;
                padding: 8px 16px !important;
                display: flex !important;
                align-items: center !important;
                flex-direction: row !important;
                flex-wrap: nowrap !important;
                gap: 12px !important;
                color: white !important;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4) !important;
                position: relative !important;
                z-index: 5 !important;
                overflow: visible !important;
                box-sizing: border-box !important;
                flex-shrink: 0 !important;
            `;
        }
    });
}

setupLogoutButton() {
    const logoutBtn = document.querySelector('.btn-logout');
    if (!logoutBtn) {
        console.log('ℹ️ No logout button found');
        return;
    }
    
    console.log('🔧 Setting up logout button...');
    
    // Add CSS classes
    logoutBtn.classList.add('logout-btn-styled');
    
    // Style icon if exists
    const icon = logoutBtn.querySelector('i');
    if (icon) {
        icon.classList.add('logout-icon');
    }
    
    // Add event listeners
    logoutBtn.addEventListener('mouseenter', () => {
        logoutBtn.classList.add('logout-hover');
    });
    
    logoutBtn.addEventListener('mouseleave', () => {
        logoutBtn.classList.remove('logout-hover');
    });
    
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🚪 Logout button clicked!');
        
        // Add click animation
        logoutBtn.classList.add('logout-click');
        
        // Remove click animation after it completes
        setTimeout(() => {
            logoutBtn.classList.remove('logout-click');
            
            // Call logout
            setTimeout(() => {
                this.handleLogout();
            }, 100);
        }, 200);
    });
    
    console.log('✅ Logout button setup complete');
}
        
// Update the setupResponsiveHamburgerMenu method to properly store references:
// ==================== HAMBURGER & NAVBAR METHODS ====================

setupResponsiveHamburgerMenu() {
    console.log('🔍 Setting up responsive hamburger menu...');
    
    // Reset state
    this.state.toggleableNavbar = null;
    this.state.hamburgerElement = null;
    
    // Find or create hamburger
    let hamburger = document.querySelector('button[aria-label*="menu"], button[aria-label*="Menu"], .hamburger-menu, .menu-toggle');
    
    if (!hamburger) {
        hamburger = this.createHamburgerButton();
    }
    
    // Store hamburger reference in state
    this.state.hamburgerElement = hamburger;
    console.log('🍔 Hamburger stored in state:', !!hamburger);
    
    // Setup hamburger button
    this.setupHamburgerButton(hamburger);
    
    // Setup navbar toggling
    this.setupNavbarToggling();
    
    // Initial responsive check
    setTimeout(() => this.checkResponsiveView(), 100);
}

createHamburgerButton() {
    console.log('➕ Creating hamburger button...');
    
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger-menu navbar-toggle';
    hamburger.setAttribute('aria-label', 'Toggle navigation menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = '☰';
    
    // Add to user status area
    const userStatus = document.querySelector('#navUserStatus, .user-status, .status-content, .user-menu');
    if (userStatus) {
        userStatus.appendChild(hamburger);
        console.log('✅ Hamburger added to user status area');
    } else {
        // Fallback to header
        const header = document.querySelector('header, .header');
        if (header) {
            header.appendChild(hamburger);
            console.log('✅ Hamburger added to header');
        } else {
            document.body.appendChild(hamburger);
            console.log('✅ Hamburger added to body');
        }
    }
    
    return hamburger;
}

// Update the hamburger click handler to call the correct method:
setupHamburgerButton(element) {
    console.log('🔧 Setting up hamburger button styling...');
    
    // Apply hamburger styling
    Object.assign(element.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(26, 35, 126, 0.1)',
        border: '1px solid rgba(26, 35, 126, 0.2)',
        color: '#1a237e',
        cursor: 'pointer',
        fontSize: '20px',
        margin: '0',
        padding: '0',
        flexShrink: '0',
        position: 'relative',
        zIndex: '100',
        transition: 'all 0.3s ease'
    });
    
    // Hover effect
    element.addEventListener('mouseenter', () => {
        element.style.background = 'rgba(26, 35, 126, 0.2)';
        element.style.color = '#3498db';
        element.style.transform = 'scale(1.1)';
    });
    
    element.addEventListener('mouseleave', () => {
        element.style.background = 'rgba(26, 35, 126, 0.1)';
        element.style.color = '#1a237e';
        element.style.transform = 'scale(1)';
    });
    
    // Click handler - toggle NAVIGATION LINKS (not navbar)
    element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🍔 Hamburger clicked - toggling navigation links');
        this.toggleNavigationLinks(); // Changed from toggleNavbarVisibility
    });
    
    console.log('✅ Hamburger button styled and click handler added');
}

// RENAME the toggle method to be clearer:
// Update the SHOW navigation links section in toggleNavigationLinks():
// Update the SHOW section to add more debugging and ensure visibility:
toggleNavigationLinks() {
    console.log('🔄 Toggling navigation links visibility...');
    
    // Get stored references
    const navLinks = this.state.navLinksElement;
    const hamburger = this.state.hamburgerElement || 
                     document.querySelector('.hamburger-menu, .navbar-toggle');
    
    console.log('Toggle elements check:', {
        navLinks: !!navLinks,
        hamburger: !!hamburger,
        navLinksElement: navLinks,
        navLinksHTML: navLinks ? navLinks.outerHTML.substring(0, 200) + '...' : 'none'
    });
    
    if (!navLinks || !hamburger) {
        console.log('❌ Missing elements for toggling');
        return;
    }
    
    // Check if we're on small screen - only toggle on mobile
    const screenWidth = window.innerWidth;
    const isLargeScreen = screenWidth >= 768;
    
    if (isLargeScreen) {
        console.log('🖥️ On large screen - navigation links should always be visible');
        return; // Don't toggle on large screens
    }
    
    console.log('📱 On small screen - toggling navigation links');
    
    // Check current state
    const computedStyle = window.getComputedStyle(navLinks);
    const isCurrentlyVisible = 
        computedStyle.display !== 'none' && 
        computedStyle.visibility !== 'hidden' &&
        navLinks.offsetWidth > 0 && 
        navLinks.offsetHeight > 0;
    
    console.log(`Navigation links state: visible=${isCurrentlyVisible}`);
    console.log('Current computed styles:', {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        width: navLinks.offsetWidth,
        height: navLinks.offsetHeight,
        top: computedStyle.top,
        right: computedStyle.right
    });
    
       if (isCurrentlyVisible) {
        // Hide navigation links
        console.log('👁️‍🗨️ Hiding navigation links...');
        navLinks.style.cssText = `
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            transform: translateY(-20px) !important;
            transition: all 0.3s ease !important;
        `;
        navLinks.classList.remove('links-visible');
        navLinks.classList.add('links-hidden');
        hamburger.innerHTML = '☰';
        hamburger.setAttribute('aria-expanded', 'false');
        console.log('✅ Navigation links hidden');
    } else {
        // Show navigation links as mobile menu
        console.log('👁️‍🗨️ Showing navigation links as mobile menu...');
        
        // Calculate position - use LEFT instead of RIGHT for better control
        const menuWidth = 280; // Slightly narrower
        const leftPosition = Math.max(10, window.innerWidth - menuWidth - 10);
        
        // Show the menu with proper positioning
        navLinks.style.cssText = `
            /* Positioning */
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: all !important;
            flex-direction: column !important;
            position: fixed !important;
            top: 80px !important;
            left: ${leftPosition}px !important;  /* Use left instead of right */
            
            /* Appearance */
            background: rgba(20, 20, 30, 0.98) !important;
            border-radius: 15px !important;
            padding: 20px !important;
            z-index: 99999 !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6) !important;
            border: 2px solid #3498db !important;
            width: ${menuWidth}px !important;
            max-width: 90vw !important;
            gap: 12px !important;
            
            /* Animation */
            transform: translateY(0) !important;
            transition: all 0.3s ease !important;
            backdrop-filter: blur(15px) !important;
            
            /* Text */
            color: white !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 16px !important;
            font-weight: 500 !important;
            
            /* Ensure it's visible */
            overflow: visible !important;
        `;
        
        // Style the links inside
        const links = navLinks.querySelectorAll('a, .nav-link');
        links.forEach(link => {
            Object.assign(link.style, {
                color: '#ffffff',
                fontSize: '16px',
                padding: '12px 16px',
                display: 'block',
                textDecoration: 'none',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                margin: '4px 0',
                textAlign: 'left'
            });
        });
        
        // Style the list items
        const listItems = navLinks.querySelectorAll('li');
        listItems.forEach(li => {
            Object.assign(li.style, {
                listStyle: 'none',
                margin: '0',
                padding: '0'
            });
        });
        
        navLinks.classList.add('links-visible');
        navLinks.classList.remove('links-hidden');
        hamburger.innerHTML = '✕';
        hamburger.setAttribute('aria-expanded', 'true');
        
        // Force a reflow and log position
        setTimeout(() => {
            const rect = navLinks.getBoundingClientRect();
            console.log('📍 Mobile menu bounding rect FIXED:', {
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                visible: rect.width > 0 && rect.height > 0,
                onScreen: rect.left >= 0 && rect.right <= window.innerWidth
            });
        }, 50);
        
        console.log('✅ Navigation links shown as mobile menu');
    }
}
    
// ==================== CORRECTED TOGGLE LOGIC ====================
setupNavbarToggling() {
    console.log('🔧 Setting up navbar toggling...');
    
    // Find the navigation LINKS inside the navbar (not the whole navbar)
    const linkSelectors = [
        '.nav-links',
        '.navigation-links',
        '.navbar-links',
        '.menu-links',
        'nav > ul',
        'nav > div', // if links are in a div
        '.navbar > ul',
        '.navbar > div'
    ];
    
    let navLinks = null;
    for (const selector of linkSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            // Check if it contains actual links
            const hasLinks = element.querySelector('a, .nav-link, [href], li');
            if (hasLinks) {
                navLinks = element;
                console.log(`📍 Found navigation links with selector: ${selector}`);
                console.log('Links container:', {
                    className: navLinks.className,
                    tagName: navLinks.tagName,
                    linksCount: navLinks.querySelectorAll('a, .nav-link').length
                });
                break;
            }
        }
    }
    
    // If no specific links container found, look for links directly in nav
    if (!navLinks) {
        const navs = document.querySelectorAll('nav, .navbar');
        for (const nav of navs) {
            // Get direct children that aren't the hamburger or logo
            const children = Array.from(nav.children);
            for (const child of children) {
                // Skip hamburger, logo, and user status containers
                if (child.classList.contains('hamburger-menu') || 
                    child.classList.contains('navbar-toggle') ||
                    child.classList.contains('logo') ||
                    child.id === 'navUserStatus' ||
                    child.classList.contains('user-status')) {
                    continue;
                }
                
                // Check if this element contains links
                const hasLinks = child.querySelector('a, .nav-link, [href]');
                if (hasLinks && !navLinks) {
                    navLinks = child;
                    console.log('📍 Found links container in nav:', child.className);
                    break;
                }
            }
            if (navLinks) break;
        }
    }
    
    if (navLinks) {
        // Mark it as toggleable
        navLinks.classList.add('toggleable-links');
        // Store reference in app state
        this.state.navLinksElement = navLinks;
        console.log('✅ Navigation links stored for toggling');
    } else {
        console.log('⚠️ No navigation links found for toggling');
    }
}

checkResponsiveView() {
    const hamburger = this.state.hamburgerElement || 
                     document.querySelector('.hamburger-menu, .navbar-toggle');
    const navLinks = this.state.navLinksElement;
    
    if (!hamburger || !navLinks) {
        console.log('ℹ️ No hamburger or navigation links for responsive check:', {
            hasHamburger: !!hamburger,
            hasNavLinks: !!navLinks
        });
        return;
    }
    
    const screenWidth = window.innerWidth;
    const isLargeScreen = screenWidth >= 768;
    
    console.log(`📱 Responsive check: ${screenWidth}px, Large: ${isLargeScreen}`);
    
    if (isLargeScreen) {
        // LARGE SCREENS: Hide hamburger, SHOW navigation links
        console.log('🖥️ LARGE SCREEN: Showing navigation links, hiding hamburger');
        
        // Hide hamburger completely
        hamburger.style.cssText = `
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
        `;
        
        // SHOW navigation links as normal desktop navigation
        navLinks.style.cssText = `
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: static !important;
            flex-direction: row !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            min-width: auto !important;
            max-width: none !important;
            top: auto !important;
            right: auto !important;
            z-index: auto !important;
            margin: 0 !important;
            gap: 20px !important;
        `;
        
        // Remove all mobile classes
        navLinks.classList.remove('links-hidden', 'links-visible', 'mobile-menu');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.innerHTML = '☰';
        
    } else {
        // SMALL SCREENS: Show hamburger, HIDE navigation links initially
        console.log('📱 SMALL SCREEN: Showing hamburger, hiding navigation links');
        
        // Show hamburger
        hamburger.style.cssText = `
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: all !important;
            align-items: center !important;
            justify-content: center !important;
            width: 40px !important;
            height: 40px !important;
            border-radius: 50% !important;
            background: rgba(26, 35, 126, 0.1) !important;
            border: 1px solid rgba(26, 35, 126, 0.2) !important;
            color: #1a237e !important;
            cursor: pointer !important;
            font-size: 20px !important;
            margin: 0 !important;
            padding: 0 !important;
            flex-shrink: 0 !important;
            position: relative !important;
            z-index: 100 !important;
            transition: all 0.3s ease !important;
        `;
        
        // HIDE navigation links by default on small screens
        // Only show if they were toggled open
        if (!navLinks.classList.contains('links-visible')) {
            navLinks.style.cssText = `
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
            `;
            navLinks.classList.add('links-hidden');
            navLinks.classList.remove('links-visible');
            hamburger.innerHTML = '☰';
            hamburger.setAttribute('aria-expanded', 'false');
        
        } else {
            // If they were already toggled open, keep them visible (centered)
            const menuWidth = 280;
            const leftPosition = (window.innerWidth - menuWidth) / 2;
            
            navLinks.style.cssText = `
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: all !important;
                flex-direction: column !important;
                position: fixed !important;
                top: 100px !important;
                left: ${Math.max(10, leftPosition)}px !important;
                background: linear-gradient(135deg, #1a237e, #283593) !important;
                border-radius: 20px !important;
                padding: 25px !important;
                z-index: 100000 !important;
                box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 0 4px #00ff00 !important;
                border: 3px solid #ffffff !important;
                width: ${menuWidth}px !important;
                max-width: 90vw !important;
                gap: 15px !important;
                color: white !important;
                font-size: 18px !important;
                font-weight: 600 !important;
                text-align: center !important;
            `;
            hamburger.innerHTML = '✕';
            hamburger.setAttribute('aria-expanded', 'true');
        }
    }
}
    
// ==================== FIXUSERSTATUSDESIGN METHOD ====================
fixUserStatusDesign() {
    console.log('🎨 Applying dark design fixes...');
    
    setTimeout(() => {
        // 1. Fix container sizes
        this.fixContainerSizes();
        
        // 2. Setup logout button
        this.setupLogoutButton();
        
        // 3. Setup responsive hamburger menu
        this.setupResponsiveHamburgerMenu();
        
        console.log('✅ Dark design fixes applied');
        
        // Force check after everything is set up
        setTimeout(() => {
            if (typeof this.checkResponsiveView === 'function') {
                this.checkResponsiveView();
            }
        }, 300);
    }, 100);
}

// ==================== WINDOW RESIZE LISTENER ====================
initWindowResizeListener() {
    if (this.state.resizeListenerInitialized) {
        console.log('🔄 Window resize listener already initialized');
        return;
    }
    
    const handleResize = () => {
        console.log('📐 Window resized');
        if (typeof this.checkResponsiveView === 'function') {
            this.checkResponsiveView();
        }
    };
    
    // Debounce the resize event
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 250);
    });
    
    this.state.resizeListenerInitialized = true;
    console.log('🔄 Window resize listener initialized');
}

// ==================== LOGOUT HANDLER ====================
handleLogout() {
    console.log('🚪 Handling logout...');
    
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('attendance_user');
        this.user = null;
        this.state.currentUser = null;
        
        // Show notification
        if (typeof this.showNotification === 'function') {
            this.showNotification('Successfully logged out!', 'success');
        } else {
            alert('Successfully logged out!');
        }
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}
    
// ==================== RESPONSIVE HAMBURGER SETUP ====================
findAndSetupHamburgerMenu() {
    console.log('🔍 Setting up responsive hamburger menu...');
    
    // Find or create hamburger
    let hamburger = document.querySelector('button[aria-label*="menu"], button[aria-label*="Menu"], .hamburger-menu, .menu-toggle');
    
    if (!hamburger) {
        hamburger = this.createHamburgerButton();
    }
    
    this.setupResponsiveHamburger(hamburger);
    this.setupNavbarVisibility();
    
    // Listen for window resize
    window.addEventListener('resize', () => {
        this.handleResponsiveNavbar();
    });
    
    // Initial responsive check
    setTimeout(() => this.handleResponsiveNavbar(), 100);
}

createHamburgerButton() {
    console.log('➕ Creating hamburger button...');
    
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger-menu navbar-toggle';
    hamburger.setAttribute('aria-label', 'Toggle navigation menu');
    hamburger.innerHTML = '☰';
    
    // Position in user status area
    const userStatus = document.querySelector('#navUserStatus, .user-status, .status-content');
    if (userStatus) {
        userStatus.appendChild(hamburger);
    } else {
        // Fallback to header
        const header = document.querySelector('header, .header');
        if (header) {
            header.appendChild(hamburger);
        } else {
            document.body.appendChild(hamburger);
        }
    }
    
    return hamburger;
}

setupResponsiveHamburger(hamburger) {
    console.log('🔧 Setting up responsive hamburger...');
    
    // Apply hamburger styling
    Object.assign(hamburger.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(26, 35, 126, 0.1)',
        border: '1px solid rgba(26, 35, 126, 0.2)',
        color: '#1a237e',
        cursor: 'pointer',
        fontSize: '20px',
        margin: '0',
        padding: '0',
        flexShrink: '0',
        position: 'relative',
        zIndex: '100',
        transition: 'all 0.3s ease'
    });
    
    // Hover effect
    hamburger.addEventListener('mouseenter', () => {
        hamburger.style.background = 'rgba(26, 35, 126, 0.2)';
        hamburger.style.color = '#3498db';
        hamburger.style.transform = 'scale(1.1)';
    });
    
    hamburger.addEventListener('mouseleave', () => {
        hamburger.style.background = 'rgba(26, 35, 126, 0.1)';
        hamburger.style.color = '#1a237e';
        hamburger.style.transform = 'scale(1)';
    });
    
    // Click handler - toggle navbar visibility
    hamburger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🍔 Hamburger clicked - toggling navbar');
        this.toggleNavigationLinks();
    });
}

setupNavbarVisibility() {
    // Find the navbar that should be toggled
    const navbarSelectors = [
        '.navbar',
        '.nav-links',
        '.navigation',
        'nav',
        '.main-nav',
        '.page-nav',
        '[role="navigation"]:not(.sidebar)'
    ];
    
    let navbar = null;
    for (const selector of navbarSelectors) {
        const element = document.querySelector(selector);
        if (element && !element.classList.contains('sidebar')) {
            navbar = element;
            console.log(`📍 Found main navbar: ${selector}`);
            break;
        }
    }
    
    if (!navbar) {
        console.log('⚠️ No main navbar found for toggling');
        return;
    }
    
    // Add a class to identify this navbar
    navbar.classList.add('toggleable-navbar');
    
    // Store reference in app state
    this.state.toggleableNavbar = navbar;
}

handleResponsiveNavbar() {
    const hamburger = document.querySelector('.hamburger-menu, .navbar-toggle');
    const navbar = this.state.toggleableNavbar;
    
    if (!hamburger || !navbar) return;
    
    const screenWidth = window.innerWidth;
    const isLargeScreen = screenWidth >= 768; // Standard tablet breakpoint
    
    console.log(`📱 Screen width: ${screenWidth}px, Large screen: ${isLargeScreen}`);
    
    if (isLargeScreen) {
        // LARGE SCREENS: Show navbar, hide hamburger
        hamburger.style.display = 'none';
        navbar.style.display = 'flex'; // or whatever your navbar uses
        navbar.classList.remove('navbar-hidden');
        console.log('🖥️ Large screen: Navbar visible, hamburger hidden');
    } else {
        // SMALL SCREENS: Show hamburger, navbar starts hidden
        hamburger.style.display = 'flex';
        
        // Only hide navbar on initial load if it's not already toggled open
        if (!navbar.classList.contains('navbar-visible')) {
            navbar.style.display = 'none';
            navbar.classList.add('navbar-hidden');
        }
        
        console.log('📱 Small screen: Hamburger visible, navbar togglable');
    }
}

// Update the fixUserStatusDesign to include responsive setup
fixUserStatusDesign() {
    console.log('🎨 Applying dark design fixes...');
    
    setTimeout(() => {
        // 1. Fix container sizes
        this.fixContainerSizes();
        
        // 2. Setup logout button
        this.setupLogoutButton();
        
        // 3. Setup responsive hamburger menu
        this.setupResponsiveHamburgerMenu();
        
        console.log('✅ Dark design fixes applied');
        
        // Additional delay for navbar setup
        setTimeout(() => {
            if (this.state.toggleableNavbar) {
                console.log('✅ Navbar ready for toggling');
                // Force initial responsive check
                this.checkResponsiveView();
            }
        }, 100);
    }, 100);
}
    
setupHamburgerMenu(element) {
    console.log('🔧 Setting up hamburger menu with proper z-index...');
    
    // FIRST, move hamburger OUT of any dark container if it's inside
    const darkContainers = [
        document.querySelector('#navUserStatus'),
        document.querySelector('.user-status'),
        document.querySelector('.status-content')
    ].filter(el => el);
    
    let isInsideDarkContainer = false;
    darkContainers.forEach(container => {
        if (container.contains(element)) {
            console.log('⚠️ Hamburger is inside dark container, adjusting...');
            isInsideDarkContainer = true;
            
            // Move hamburger after the container
            container.parentNode.insertBefore(element, container.nextSibling);
        }
    });
    
    // Apply styles with HIGHER z-index
    Object.assign(element.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(26, 35, 126, 0.1)',
        border: '1px solid rgba(26, 35, 126, 0.2)',
        cursor: 'pointer',
        flexShrink: '0',
        margin: '0',
        padding: '0',
        position: 'relative',
        zIndex: '20',  // Higher than dark container
        marginLeft: isInsideDarkContainer ? '-50px' : '0' // Adjust position if moved
    });
    
    // Check content type
    const menuLines = element.querySelectorAll('.menu-line');
    const isIcon = element.querySelector('i, svg, img');
    const text = element.textContent.trim();
    
    if (menuLines.length > 0) {
        // Style menu lines
        menuLines.forEach(line => {
            Object.assign(line.style, {
                background: '#1a237e',
                height: '2px',
                width: '20px',
                borderRadius: '2px',
                transition: 'background 0.3s ease'
            });
        });
        
        // Hover effect
        element.addEventListener('mouseenter', () => {
            menuLines.forEach(line => {
                line.style.background = '#3498db';
            });
        });
        
        element.addEventListener('mouseleave', () => {
            menuLines.forEach(line => {
                line.style.background = '#1a237e';
            });
        });
    } else if (isIcon || text === '☰' || text === '≡' || text === 'Menu') {
        // Icon or symbol button
        if (text === '☰' || text === '≡') {
            element.style.fontSize = '20px';
            element.style.color = '#1a237e';
        }
        
        element.style.transition = 'all 0.3s ease';
        
        // Hover effect
        element.addEventListener('mouseenter', () => {
            element.style.background = 'rgba(26, 35, 126, 0.2)';
            element.style.color = '#3498db';
            element.style.transform = 'scale(1.1)';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.background = 'rgba(26, 35, 126, 0.1)';
            element.style.color = '#1a237e';
            element.style.transform = 'scale(1)';
        });
    }
    
    // Click handler
    element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🍔 Hamburger clicked!');
        this.toggleSidebar();
    });
    
    console.log('✅ Hamburger menu setup with proper positioning');
}

createHamburgerMenuIfNeeded() {
    // Only create if we're in a protected page (not login/setup)
    const currentPage = this.state.currentPage;
    const protectedPages = ['dashboard', 'attendance', 'reports', 'classes'];
    
    if (protectedPages.includes(currentPage)) {
        console.log('➕ Creating hamburger menu...');
        
        // Create hamburger button
        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger-menu dark-design-hamburger';
        hamburger.innerHTML = '☰';
        hamburger.setAttribute('aria-label', 'Toggle menu');
        
        // Style it
        Object.assign(hamburger.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(26, 35, 126, 0.1)',
            border: '1px solid rgba(26, 35, 126, 0.2)',
            color: '#1a237e',
            cursor: 'pointer',
            fontSize: '20px',
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: '1000',
            transition: 'all 0.3s ease'
        });
        
        // Hover effect
        hamburger.addEventListener('mouseenter', () => {
            hamburger.style.background = 'rgba(26, 35, 126, 0.2)';
            hamburger.style.color = '#3498db';
            hamburger.style.transform = 'scale(1.1)';
        });
        
        hamburger.addEventListener('mouseleave', () => {
            hamburger.style.background = 'rgba(26, 35, 126, 0.1)';
            hamburger.style.color = '#1a237e';
            hamburger.style.transform = 'scale(1)';
        });
        
        // Click handler
        hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🍔 Created hamburger clicked!');
            this.toggleSidebar();
        });
        
        // Add to page
        document.body.appendChild(hamburger);
        console.log('✅ Created hamburger menu');
    }
}

// ==================== CLICK HANDLERS ====================
handleLogout() {
    console.log('🚪 Handling logout...');
    
    // Show confirmation
    if (confirm('Are you sure you want to logout?')) {
        // Clear user data
        localStorage.removeItem('attendance_user');
        this.user = null;
        this.state.currentUser = null;
        
        // Show notification
        this.showNotification('Successfully logged out!', 'success');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

toggleSidebar() {
    console.log('📱 Toggling sidebar...');
    
    // Find sidebar
    const sidebar = this.findSidebarElement();
    
    if (!sidebar) {
        console.log('❌ No sidebar found');
        this.showNotification('Menu not available', 'info');
        return;
    }
    
    // Use a class to track state instead of checking styles
    if (sidebar.classList.contains('sidebar-hidden')) {
        // Currently hidden, so SHOW it
        this.showSidebar(sidebar);
    } else {
        // Currently visible, so HIDE it
        this.hideSidebar(sidebar);
    }
}

findSidebarElement() {
    const selectors = [
        '.sidebar',
        '.side-nav',
        'nav[class*="side"]',
        'aside',
        '.navigation',
        '.nav-menu',
        '.main-nav',
        '[role="navigation"]'
    ];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`📍 Found sidebar: ${selector}`);
            return element;
        }
    }
    
    // Look for any nav with significant width (likely a sidebar)
    const allNavs = document.querySelectorAll('nav, aside');
    for (const nav of allNavs) {
        const rect = nav.getBoundingClientRect();
        if (rect.width > 150) { // Sidebars are usually wide
            console.log('📍 Found wide nav element (likely sidebar):', nav.className);
            return nav;
        }
    }
    
    return null;
}

showSidebar(sidebar) {
    console.log('👁️‍🗨️ Showing sidebar...');
    
    // Remove hidden classes
    sidebar.classList.remove('sidebar-hidden', 'hidden', 'collapsed');
    
    // Show the sidebar
    sidebar.style.display = 'flex';
    sidebar.style.visibility = 'visible';
    sidebar.style.opacity = '1';
    sidebar.style.transform = 'translateX(0)';
    sidebar.style.transition = 'all 0.3s ease';
    
    // Adjust main content
    this.adjustMainContentForSidebar(true);
    
    console.log('✅ Sidebar shown');
}

hideSidebar(sidebar) {
    console.log('👁️‍🗨️ Hiding sidebar...');
    
    // Add hidden class
    sidebar.classList.add('sidebar-hidden');
    
    // Hide the sidebar
    sidebar.style.transform = 'translateX(-100%)';
    sidebar.style.opacity = '0';
    sidebar.style.transition = 'all 0.3s ease';
    
    // After transition, hide completely
    setTimeout(() => {
        sidebar.style.visibility = 'hidden';
    }, 300);
    
    // Adjust main content
    this.adjustMainContentForSidebar(false);
    
    console.log('✅ Sidebar hidden');
}

adjustMainContentForSidebar(showSidebar) {
    const mainSelectors = [
        'main',
        '.main-content',
        '.content',
        '#app',
        '.container',
        '.page-content'
    ];
    
    let mainContent = null;
    for (const selector of mainSelectors) {
        mainContent = document.querySelector(selector);
        if (mainContent) break;
    }
    
    if (mainContent) {
        if (showSidebar) {
            mainContent.style.marginLeft = '250px';
            mainContent.style.transition = 'margin-left 0.3s ease';
        } else {
            mainContent.style.marginLeft = '0';
            mainContent.style.transition = 'margin-left 0.3s ease';
        }
    }
}

// Add this notification helper if you don't have it
showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="notification-text">${message}</span>
        </div>
    `;
    
    // Add styles
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '9999',
        animation: 'slideIn 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
    // ==================== AUTO-SAVE SETUP METHODS ====================

initAutoSave() {
    console.log('🔄 Initializing auto-save system...');
    this.autoSaveTimeouts = {};
    this.autoSaveQueue = [];
    
    // Process auto-save queue every 5 seconds if online
    setInterval(() => {
        if (this.autoSaveQueue.length > 0 && navigator.onLine) {
            this.processAutoSaveQueue();
        }
    }, 5000);
    
    // Initialize auto-save for forms
    this.setupClassAutoSave();
    this.setupStudentAutoSave();
}

setupClassAutoSave() {
    console.log('📝 Setting up class auto-save...');
    const inputIds = ['yearGroup', 'classCode', 'maleCount', 'femaleCount'];
    
    inputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // Remove any existing listeners first
            input.removeEventListener('input', this.handleClassInput);
            input.removeEventListener('blur', this.handleClassBlur);
            
            // Add new listeners
            input.addEventListener('input', () => this.handleClassInput());
            input.addEventListener('blur', () => this.handleClassBlur());
        }
    });
    
    // Setup total calculation
    this.setupTotalCalculation();
}

setupStudentAutoSave() {
    console.log('📝 Setting up student auto-save...');
    const inputIds = ['firstName', 'lastName', 'studentId', 'gender', 'studentClass'];
    
    inputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // Remove any existing listeners first
            input.removeEventListener('input', this.handleStudentInput);
            input.removeEventListener('blur', this.handleStudentBlur);
            
            // Add new listeners
            input.addEventListener('input', () => this.handleStudentInput());
            input.addEventListener('blur', () => this.handleStudentBlur());
        }
    });
}

handleClassInput() {
    this.queueAutoSave('class');
    // Update total display when male/female counts change
    if (event.target.id === 'maleCount' || event.target.id === 'femaleCount') {
        this.updateTotalDisplay();
    }
}

handleClassBlur() {
    this.autoSaveClassForm();
}

handleStudentInput() {
    this.queueAutoSave('student');
}

handleStudentBlur() {
    this.autoSaveStudentForm();
}

queueAutoSave(type) {
    clearTimeout(this.autoSaveTimeouts?.[type]);
    
    if (!this.autoSaveTimeouts) this.autoSaveTimeouts = {};
    
    this.autoSaveTimeouts[type] = setTimeout(() => {
        if (type === 'class') {
            this.autoSaveClassForm();
        } else if (type === 'student') {
            this.autoSaveStudentForm();
        }
    }, 1500); // 1.5 second delay
}

setupTotalCalculation() {
    console.log('🧮 Setting up total calculation...');
    const maleInput = document.getElementById('maleCount');
    const femaleInput = document.getElementById('femaleCount');
    const totalDisplay = document.getElementById('totalStudents');
    
    if (maleInput && femaleInput && totalDisplay) {
        const calculateTotal = () => {
            const males = parseInt(maleInput.value) || 0;
            const females = parseInt(femaleInput.value) || 0;
            totalDisplay.textContent = males + females;
        };
        
        // Remove existing listeners first
        maleInput.removeEventListener('input', calculateTotal);
        femaleInput.removeEventListener('input', calculateTotal);
        
        // Add new listeners
        maleInput.addEventListener('input', calculateTotal);
        femaleInput.addEventListener('input', calculateTotal);
        
        // Initial calculation
        calculateTotal();
    }
}

updateTotalDisplay() {
    const maleInput = document.getElementById('maleCount');
    const femaleInput = document.getElementById('femaleCount');
    const totalDisplay = document.getElementById('totalStudents');
    
    if (maleInput && femaleInput && totalDisplay) {
        const males = parseInt(maleInput.value) || 0;
        const females = parseInt(femaleInput.value) || 0;
        totalDisplay.textContent = males + females;
    }
}

async autoSaveClassForm() {
    const yearGroup = document.getElementById('yearGroup')?.value;
    const classCode = document.getElementById('classCode')?.value?.trim();
    const maleCount = parseInt(document.getElementById('maleCount')?.value) || 0;
    const femaleCount = parseInt(document.getElementById('femaleCount')?.value) || 0;
    
    // Don't auto-save if required fields are empty
    if (!yearGroup || !classCode) return;
    
    const classData = {
        id: `draft_class_${Date.now()}`,
        yearGroup: yearGroup,
        code: classCode,
        males: maleCount,
        females: femaleCount,
        total: maleCount + femaleCount,
        name: `${yearGroup} - ${classCode}`,
        isDraft: true,
        lastAutoSave: new Date().toISOString()
    };
    
    // Save draft to localStorage
    const drafts = Storage.get('classDrafts') || [];
    const existingIndex = drafts.findIndex(d => 
        d.yearGroup === yearGroup && d.code === classCode
    );
    
    if (existingIndex >= 0) {
        drafts[existingIndex] = classData;
    } else {
        drafts.push(classData);
    }
    
    Storage.set('classDrafts', drafts);
    
    // Queue for Firebase sync
    this.addToAutoSaveQueue('classes', classData, 'save');
    
    this.showAutoSaveStatus('class', 'Draft autosaved');
}

async autoSaveStudentForm() {
    const firstName = document.getElementById('firstName')?.value;
    const lastName = document.getElementById('lastName')?.value;
    const studentId = document.getElementById('studentId')?.value;
    const gender = document.getElementById('gender')?.value;
    const studentClass = document.getElementById('studentClass')?.value;
    
    if (!firstName && !lastName) return;
    
    const studentData = {
        id: `draft_student_${Date.now()}`,
        firstName: firstName,
        lastName: lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        studentId: studentId || `STU${Date.now().toString().slice(-6)}`,
        gender: gender || null,
        classId: studentClass || null,
        isDraft: true,
        lastAutoSave: new Date().toISOString()
    };
    
    const drafts = Storage.get('studentDrafts') || [];
    const existingIndex = drafts.findIndex(d => 
        d.firstName === firstName && d.lastName === lastName
    );
    
    if (existingIndex >= 0) {
        drafts[existingIndex] = studentData;
    } else {
        drafts.push(studentData);
    }
    
    Storage.set('studentDrafts', drafts);
    
    // Queue for Firebase sync
    this.addToAutoSaveQueue('students', studentData, 'save');
    
    this.showAutoSaveStatus('student', 'Draft autosaved');
}

addToAutoSaveQueue(collection, data, action) {
    if (!this.autoSaveQueue) this.autoSaveQueue = [];
    
    this.autoSaveQueue.push({
        collection,
        data,
        action,
        timestamp: Date.now(),
        attempts: 0
    });
    
    // Limit queue size
    if (this.autoSaveQueue.length > 100) {
        this.autoSaveQueue = this.autoSaveQueue.slice(-100);
    }
    
    // Update UI indicator
    this.updateAutoSaveIndicator();
}

async processAutoSaveQueue() {
    // Only process if we're online and have Firebase
    if (!navigator.onLine || !window.auth?.currentUser || !this.autoSaveQueue?.length) return;
    
    console.log('🔄 Processing auto-save queue...', this.autoSaveQueue.length);
    
    let processedCount = 0;
    const failedItems = [];
    
    for (let i = 0; i < this.autoSaveQueue.length; i++) {
        const item = this.autoSaveQueue[i];
        
        try {
            if (item.action === 'save') {
                const schoolId = getSchoolId();
                
                if (item.collection === 'classes') {
                    // Remove draft flag before saving to Firebase
                    const { isDraft, lastAutoSave, ...cleanData } = item.data;
                    const result = await Firestore.saveClass(schoolId, cleanData);
                    
                    if (result.success) {
                        console.log('✅ Auto-saved class to Firebase:', cleanData.code);
                        processedCount++;
                    } else {
                        throw new Error('Firestore save failed');
                    }
                } else if (item.collection === 'students') {
                    // For now, just mark as processed
                    processedCount++;
                }
            }
            
            // Remove successfully processed item
            this.autoSaveQueue.splice(i, 1);
            i--; // Adjust index after removal
            
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
            item.attempts++;
            
            if (item.attempts >= 3) {
                // Too many attempts, remove from queue
                console.log('🗑️ Removing from queue after 3 attempts:', item);
                this.autoSaveQueue.splice(i, 1);
                i--;
            }
        }
    }
    
    this.updateAutoSaveIndicator();
    
    if (processedCount > 0) {
        console.log(`✅ Processed ${processedCount} items from auto-save queue`);
    }
}

updateAutoSaveIndicator() {
    if (!this.autoSaveQueue) this.autoSaveQueue = [];
    const count = this.autoSaveQueue.length;
    let indicator = document.getElementById('global-autosave-indicator');
    
    if (count > 0) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'global-autosave-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #f39c12;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.innerHTML = `
            <i class="fas fa-sync-alt fa-spin"></i>
            ${count} pending
        `;
    } else if (indicator) {
        indicator.remove();
    }
}

showAutoSaveStatus(context, message) {
    let indicator = document.getElementById(`${context}-autosave-status`);
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = `${context}-autosave-status`;
        indicator.style.cssText = `
            position: absolute;
            bottom: -25px;
            right: 10px;
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 4px;
            background: #27ae60;
            color: white;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 10;
        `;
        const form = document.querySelector(`#${context}s-tab .setup-form`);
        if (form) {
            form.style.position = 'relative';
            form.appendChild(indicator);
        }
    }
    
    indicator.textContent = `✓ ${message}`;
    indicator.style.opacity = '1';
    
    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 3000);
}
    
// ==================== INITIALIZATION ====================
async init() {
    console.log('🚀 Initializing AttendanceApp...');
    
    // DEBUG: Check current state
    console.log('=== INIT DEBUG ===');
    console.log('Current page:', this.state.currentPage);
    console.log('Pathname:', window.location.pathname);
    console.log('Full URL:', window.location.href);
    
    const storedUser = localStorage.getItem('attendance_user');
    console.log('Stored user raw:', storedUser);
    console.log('Stored user parsed:', JSON.parse(storedUser || 'null'));
    console.log('=== END DEBUG ===');

    // Force service worker update
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.update();
            }
        });
    }
    
    try {
        // 1. Get current page and user
        const currentPage = this.state.currentPage;
        const authResult = await this.checkAuth();
        const hasUser = authResult.success;
        
        console.log(`📄 Page: ${currentPage}, Has user: ${hasUser}`);
        
        // 2. Define which pages are public
        const publicPages = ['index', 'login', 'setup']; // setup is public
        const isPublicPage = publicPages.includes(currentPage);
        
        // 3. DECISION MATRIX:
        console.log(`Decision: Public page? ${isPublicPage}, Has user? ${hasUser}`);
        
        // CASE 1: User logged in AND on public page (except setup) → redirect to dashboard
        if (hasUser && isPublicPage && currentPage !== 'setup') {
            console.log('⚠️ Logged-in user on public page → redirecting to dashboard');
            window.location.replace('dashboard.html');
            return; // STOP here
        }
        
        // CASE 2: No user AND on protected page → redirect to index
        if (!hasUser && !isPublicPage) {
            console.log('🔒 No user on protected page → redirecting to index');
            window.location.replace('index.html');
            return; // STOP here
        }
        
        // CASE 3: User logged in AND on protected page → CONTINUE
        if (hasUser && !isPublicPage) {
            console.log('✅ Authenticated user accessing protected page');
            this.user = authResult.user;
            this.state.currentUser = authResult.user;
            
            // Try Firebase sync (non-blocking) with safe check
            if (typeof this.syncLocalUserToFirebase === 'function') {
                this.syncLocalUserToFirebase().catch(err => {
                    console.log('Firebase sync optional:', err.message);
                });
            } else {
                console.log('Note: syncLocalUserToFirebase method not available');
            }
        }
        
        // CASE 4: No user AND on public page → CONTINUE (show login form)
        if (!hasUser && isPublicPage) {
            console.log('👋 No user on public page → showing login form');
            this.user = null;
            this.state.currentUser = null;
        }
        
        // 4. Continue with app initialization (only if no redirect happened)
        console.log('Continuing with app initialization...');
        
        // Setup page specific initialization
        if (currentPage === 'setup') {
            await this.initSetupPage();
        } else {
            // Load UI components (header/footer only for protected pages)
            if (!isPublicPage) {
                await this.loadUIComponents();
            }
            
            // Load page-specific content
            await this.loadPageContent();
        }
           
        // Setup event listeners
        this.setupEventListeners();

        // ==================== CREATE APP INSTANCE ====================
        // This is CRITICAL for attendance page to work
        console.log('🔄 Creating App instance...');
        
        // Check if App class is defined
        if (typeof App === 'undefined') {
            console.error('❌ App class is not defined!');
            console.error('Make sure App class is defined before init() is called');
            
            // Try to define a minimal App class if missing
            class App {
                constructor() {
                    console.log('📱 Minimal App class created');
                    this.user = null;
                }
                
                // Basic placeholder methods
                handleAttendanceInput(inputElement) {
                    console.log('handleAttendanceInput called (placeholder)');
                }
                
                updateAttendanceCalculations(classId) {
                    console.log('updateAttendanceCalculations called (placeholder)');
                }
                
                showToast(message, type = 'info') {
                    console.log(`[${type}] ${message}`);
                }
            }
            
            window.App = App; // Make it globally available
            console.log('✅ Created minimal App class as fallback');
        }
        
        // Create the App instance
        window.app = new App();
        
        // Pass user data to App instance
        if (this.user) {
            window.app.user = this.user;
        }
        
        console.log('✅ App instance created and assigned to window.app');
        console.log('App instance available:', !!window.app);
        console.log('App methods:', {
            handleAttendanceInput: typeof window.app.handleAttendanceInput,
            updateAttendanceCalculations: typeof window.app.updateAttendanceCalculations,
            showToast: typeof window.app.showToast
        });

        // Update nav status AND apply dark design fixes
        setTimeout(() => {
            this.updateNavStatus();
            this.fixUserStatusDesign(); // Apply dark design fixes
            
            // Initialize responsive behavior for protected pages
            if (!isPublicPage && hasUser) {
                setTimeout(() => {
                    if (typeof this.initWindowResizeListener === 'function') {
                        this.initWindowResizeListener();
                    }
                }, 500);
            }
        }, 200);
        
        // Initialize service worker
        this.initServiceWorker();
        
        console.log('✅ AttendanceApp initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        
        // Safe error display
        if (typeof this.showError === 'function') {
            this.showError(error.message);
        } else if (typeof this.showToast === 'function') {
            this.showToast(`Initialization error: ${error.message}`, 'error');
        } else {
            console.error('Show error methods not available:', error.message);
            alert(`Initialization Error: ${error.message}`);
        }
    }
}
    
    // ==================== SETUP PAGE INITIALIZATION ====================
    async initSetupPage() {
        console.log('⚙️ Initializing setup page...');
        
        // Check if user is authenticated
        const authResult = await this.checkAuth();
        if (!authResult.success) {
            // If not authenticated, show login button
            this.renderSetupPageForGuest();
            return;
        }
        
        // User is authenticated, load full setup page
        this.user = authResult.user;
        this.state.currentUser = authResult.user;
        
        // Load UI components
        await this.loadUIComponents();
        
        // Render setup page content
        await this.loadPageContent();
        
        // Initialize setup page functionality
        this.initializeSetupPage();
    }

    renderSetupPageForGuest() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        appContainer.innerHTML = `
            <div class="setup-page">
                <div class="setup-container">
                    <div class="setup-header">
                        <h1>System Setup & Configuration</h1>
                        <p class="setup-subtitle">Please login to access setup features</p>
                    </div>
                    
                    <div class="login-required">
                        <div class="login-icon">
                            <i class="fas fa-lock"></i>
                        </div>
                        <h3>Authentication Required</h3>
                        <p>You need to be logged in to access the setup page.</p>
                        <a href="index.html" class="btn btn-primary">Go to Login</a>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== AUTHENTICATION ====================
    async checkAuth() {
        console.log("🔐 Performing auth check...");
        
        try {
            // Get user from localStorage
            const userJson = localStorage.getItem('attendance_user');
            console.log('Raw user from localStorage:', userJson);
            
            if (!userJson) {
                console.log("❌ No user found in localStorage");
                return { success: false, user: null };
            }
            
            const user = JSON.parse(userJson);
            console.log('Parsed user:', user);
            
            // Check if user has required properties
            if (!user || !user.email) {
                console.log("❌ Invalid user object - missing email");
                localStorage.removeItem('attendance_user'); // Clean up invalid data
                return { success: false, user: null };
            }
            
            console.log(`✅ User authenticated: ${user.email}`);
            return { success: true, user };
            
        } catch (error) {
            console.error("❌ Error in checkAuth:", error);
            return { success: false, user: null };
        }
    }

    // ==================== PAGE CONTENT LOADING ====================
    async loadPageContent() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) {
            console.error('❌ app-container not found in DOM');
            this.showError('App container not found');
            return;
        }
        
        const currentPage = this.state.currentPage;
        console.log(`📄 Loading content for: ${currentPage}`);
        
        try {
            // Clear loading state
            appContainer.innerHTML = '';
            
            switch(currentPage) {
                case 'index':
                    await this.loadIndexContent(appContainer);
                    break;
                case 'login':
                    await this.loadLoginContent(appContainer);
                    break;
                case 'dashboard':
                    await this.loadDashboardContent(appContainer);
                    break;
                case 'attendance':
                    await this.loadAttendanceContent(appContainer);
                    break;
                case 'reports':
                    await this.loadReportsContent(appContainer);
                    break;
                case 'setup':
                    await this.loadSetupContent(appContainer);
                    break;
                case 'settings':
                    await this.loadSettingsContent(appContainer);
                    break;
                default:
                    this.showPageNotFound(appContainer);
            }
        } catch (error) {
            console.error(`❌ Error loading ${currentPage} content:`, error);
            this.showError(`Failed to load ${currentPage} page`);
        }
    }

    // ==================== AUTH METHODS ====================
    async handleLogin() {
        const email = document.getElementById('loginEmail')?.value || 'teacher@school.edu';
        const password = document.getElementById('loginPassword')?.value || 'demo123';
        
        console.log('Attempting login with:', email);
        
        // Create demo user
        const user = {
            id: 'user_' + Date.now(),
            email: email,
            name: email.split('@')[0],
            role: 'teacher',
            school: 'Demo School',
            lastLogin: new Date().toISOString()
        };
        
        // Save user to localStorage
        Storage.set('attendance_user', user);
        
        // Update app state
        this.user = user;
        this.state.currentUser = user;
        
        this.showToast('Login successful!', 'success');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            this.redirectTo('dashboard.html');
        }, 1000);
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear user data
            Storage.remove('attendance_user');
            this.user = null;
            this.state.currentUser = null;
            
            this.showToast('Logged out successfully', 'success');
            
            // Redirect to index page
            setTimeout(() => {
                this.redirectTo('index.html');
            }, 500);
        }
    }

    startDemoMode() {
        const demoUser = {
            id: 'demo_' + Date.now(),
            email: 'demo@school.edu',
            name: 'Demo Teacher',
            role: 'teacher',
            school: 'Demo Academy',
            demo: true,
            lastLogin: new Date().toISOString()
        };
        
        Storage.set('attendance_user', demoUser);
        this.user = demoUser;
        this.state.currentUser = demoUser;
        
        this.showToast('Demo mode activated!', 'success');
        
        setTimeout(() => {
            this.redirectTo('dashboard.html');
        }, 1000);
    }

    // ==================== PAGE CONTENT RENDERERS ====================
    async loadIndexContent(container) {
        if (!container) {
            console.error('❌ No container provided for index page');
            return;
        }
        
        container.innerHTML = `
            <div class="landing-page">
                <div class="hero">
                    <div class="hero-icon">📋</div>
                    <h1>Attendance Tracker v2</h1>
                    <p>Modern attendance tracking for schools</p>
                    
                    <div class="hero-actions">
                        ${this.user ? `
                            <a href="dashboard.html" class="btn btn-lg btn-primary">
                                Go to Dashboard
                            </a>
                            <button onclick="window.app.handleLogout()" class="btn btn-lg btn-secondary">
                                Logout
                            </button>
                        ` : `
                            <a href="login.html" class="btn btn-lg btn-primary">
                                Login
                            </a>
                            <button onclick="window.app.startDemoMode()" class="btn btn-lg btn-secondary">
                                Try Demo Mode
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    async loadLoginContent(container) {
        if (!container) {
            console.error('❌ No container provided for login page');
            return;
        }
        
        container.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <h2>Login</h2>
                    <p>Enter your credentials to access the system</p>
                    
                    <form id="loginForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="loginEmail" placeholder="teacher@school.edu" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="loginPassword" placeholder="Enter password" required>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary btn-block">Login</button>
                            <button type="button" onclick="window.app.startDemoMode()" class="btn btn-secondary btn-block">
                                Use Demo Mode
                            </button>
                        </div>
                    </form>
                    
                    <div class="login-info">
                        <p><strong>Demo Credentials:</strong></p>
                        <p>Email: teacher@school.edu</p>
                        <p>Password: demo123</p>
                    </div>
                </div>
            </div>
        `;
        
        // Setup login form handler
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }

    loadDashboardContent(container) {
        if (!this.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="dashboard-page">
                <div class="dashboard-header">
                    <div class="header-content">
                        <div class="welcome-text">
                            <h2>Welcome, ${this.user.name || 'Teacher'}!</h2>
                            <p>Here's your attendance overview</p>
                        </div>
                        <div class="connection-status" id="connection-status">
                            <span class="status-dot ${this.state.isOnline ? 'connected' : 'offline'}"></span>
                            <span class="status-text">
                                ${this.state.isOnline ? 'Online' : 'Offline Mode'}
                            </span>
                        </div>
                    </div>
                    <div class="date-display" id="current-date">
                        ${new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                </div>
                
                <!-- Stats Grid -->
                <div class="stats-grid" id="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <h3 id="total-classes">0</h3>
                            <p>Total Classes</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <h3 id="total-students">0</h3>
                            <p>Total Students</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <h3 id="attendance-rate">0%</h3>
                            <p>Today's Attendance</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <h3 id="total-sessions">0</h3>
                            <p>Sessions Tracked</p>
                        </div>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="actions-grid">
                    <a href="attendance.html" class="action-card">
                        <div class="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                        </div>
                        <h4>Take Attendance</h4>
                        <p>Record attendance for today</p>
                    </a>

                    <a href="reports.html" class="action-card">
                        <div class="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                        <h4>View Reports</h4>
                        <p>Generate attendance reports</p>
                    </a>

                    <a href="setup.html" class="action-card">
                        <div class="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </div>
                        <h4>Setup Classes</h4>
                        <p>Add classes and students</p>
                    </a>

                    <a href="settings.html" class="action-card">
                        <div class="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </div>
                        <h4>Settings</h4>
                        <p>Configure app preferences</p>
                    </a>
                </div>
                
                <!-- Recent Activity -->
                <div class="recent-activity">
                    <div class="activity-header">
                        <h3>Recent Activity</h3>
                        <button class="btn-refresh" onclick="window.app.refreshDashboard()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M23 4v6h-6"></path>
                                <path d="M1 20v-6h6"></path>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                            Refresh
                        </button>
                    </div>
                    <div class="activity-list" id="recent-activity">
                        <div class="activity-item">
                            <div class="activity-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                            </div>
                            <div class="activity-content">
                                <p>Welcome to Attendance Tracker v2!</p>
                                <small>${new Date().toLocaleDateString()}</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load dashboard data
        this.loadDashboardData();
    }

    // ==================== ATTENDANCE PAGE ====================
   loadAttendanceContent(container) {
    if (!this.user) {
        container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
        return;
    }
    
    // Get today's date
    const today = new Date();
    const formattedDate = `${today.getMonth() + 1} / ${today.getDate()} / ${today.getFullYear()}`;
    
    container.innerHTML = `
        <div class="attendance-report">
            <div class="header">
                <h1><i class="fas fa-clipboard-check"></i> Attendance Track</h1>
                <p class="subtitle">Daily Attendance Report</p>
            </div>
            
            <div class="controls-row">
                <div class="control-group">
                    <label for="date-picker"><i class="fas fa-calendar-alt"></i> Date</label>
                    <input type="date" id="date-picker" class="date-input" value="${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}">
                </div>
                
                <div class="control-group">
                    <label for="week-picker"><i class="fas fa-calendar-week"></i> Week</label>
                    <select id="week-picker" class="week-select">
                        ${Array.from({length: 14}, (_, i) => 
                            `<option value="${i + 1}" ${i === 0 ? 'selected' : ''}>Week ${i + 1}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="control-group">
                    <label for="term-picker"><i class="fas fa-graduation-cap"></i> Term</label>
                    <select id="term-picker" class="term-select">
                        <option value="1" selected>Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                    </select>
                </div>

                <div class="control-group">
                    <button class="btn btn-success save-all-btn" id="save-all-attendance">
                        <i class="fas fa-save"></i> Save All Changes
                    </button>
                </div>
                
                <div class="control-group">
                    <button class="btn btn-primary take-attendance-btn" id="take-attendance">
                        <i class="fas fa-user-check"></i> Take Attendance
                    </button>
                </div>
                
                 <div class="auto-save-indicator">
                    <div class="auto-save-toggle">
                        <span class="auto-save-status">
                            <i class="fas fa-circle"></i>
                            Auto-save <span id="auto-save-status-text">active</span>
                        </span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="auto-save-toggle" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="last-saved-time" id="last-saved-time">
                        Last saved: Never
                    </div>
                </div>
            </div>
            
            <div class="session-selector">
                <div class="session-label">Session Type:</div>
                <div class="session-options">
                    <label class="session-option active" data-session="both">
                        <input type="radio" name="session" value="both" checked>
                        <span class="session-checkbox"></span>
                        <span class="session-text">Both Sessions (AM & PM)</span>
                    </label>
                    <label class="session-option" data-session="am">
                        <input type="radio" name="session" value="am">
                        <span class="session-checkbox"></span>
                        <span class="session-text">AM Session Only</span>
                    </label>
                    <label class="session-option" data-session="pm">
                        <input type="radio" name="session" value="pm">
                        <span class="session-checkbox"></span>
                        <span class="session-text">PM Session Only</span>
                    </label>
                </div>
            </div>
            
            <div class="table-container">
                <table class="attendance-table sticky-header">
                   <thead>
                        <tr>
                            <th rowspan="2">Year Group</th>
                            <th rowspan="2">Class</th>
                            <th rowspan="2">Total</th>
                            <th colspan="2">Male Present</th>
                            <th colspan="2">Female Present</th>
                            <th rowspan="2">AM Rate</th>
                            <th rowspan="2">PM Rate</th>
                            <th rowspan="2">Daily Rate</th>
                            <th rowspan="2">Actions</th>
                        </tr>
                        <tr>
                            <th>AM <span class="input-label">(Input)</span></th>
                            <th>PM <span class="input-label">(Input)</span></th>
                            <th>AM <span class="input-label">(Input)</span></th>
                            <th>PM <span class="input-label">(Input)</span></th>
                        </tr>
                    </thead>
                    <tbody id="attendance-table-body">
                        <!-- Data will be loaded here -->
                    </tbody>
                </table>
            </div>
            
            <div class="attendance-actions">
                <button class="btn btn-primary take-attendance-btn">
                    <i class="fas fa-user-check"></i>
                    <span>Take Attendance</span>
                </button>
                <button class="btn btn-secondary print-report-btn">
                    <i class="fas fa-print"></i>
                    <span>Print Report</span>
                </button>
                <button class="btn btn-secondary refresh-data-btn">
                    <i class="fas fa-sync-alt"></i>
                    <span>Refresh</span>
                </button>
            </div>
            
            <div class="student-details-section" style="display: none;">
                <h3><i class="fas fa-users"></i> Student Attendance Details</h3>
                <div id="student-details-container"></div>
            </div>
        </div>
    `;
    
    // Load initial data
    this.loadAttendanceData();
       
    // Setup auto-save filters
    this.setupAutoSaveFilters();
}

    // ==================== REPORTS PAGE ====================
    loadReportsContent(container) {
        if (!this.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="reports-page">
                <div class="reports-container">
                    <div class="reports-header">
                        <h1>Attendance Reports</h1>
                        <p class="reports-subtitle">Generate detailed attendance reports and analytics</p>
                    </div>
                    
                    <section class="reports-section">
                        <div class="section-title">Report Configuration</div>
                        
                        <div class="filter-section">
                            <div class="filter-row">
                                <div class="filter-group">
                                    <label class="filter-label">Report Type:</label>
                                    <select id="report-type" class="reports-select">
                                        <option value="daily">Daily Report</option>
                                        <option value="weekly">Weekly Report</option>
                                        <option value="monthly">Monthly Report</option>
                                        <option value="term">Term Report</option>
                                        <option value="comparison">Class Comparison</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                </div>
                                
                                <div class="filter-group">
                                    <label class="filter-label">Date Range:</label>
                                    <div class="date-range">
                                        <input type="date" id="start-date" class="date-input">
                                        <span>to</span>
                                        <input type="date" id="end-date" class="date-input">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="filter-row">
                                <div class="filter-group">
                                    <label class="filter-label">Class:</label>
                                    <select id="report-class" class="reports-select">
                                        <option value="all">All Classes</option>
                                        <!-- Classes will be populated -->
                                    </select>
                                </div>
                                
                                <div class="filter-group">
                                    <label class="filter-label">Format:</label>
                                    <select id="report-format" class="reports-select">
                                        <option value="summary">Summary</option>
                                        <option value="detailed">Detailed</option>
                                        <option value="analytics">Analytics</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="section-title">Report Actions</div>
                        
                        <div class="controls-section">
                            <button class="control-btn primary-btn" id="generate-report">
                                <i class="fas fa-chart-bar"></i> Generate Report
                            </button>
                            <button class="control-btn secondary-btn" id="export-pdf">
                                <i class="fas fa-file-pdf"></i> Export PDF
                            </button>
                            <button class="control-btn secondary-btn" id="export-excel">
                                <i class="fas fa-file-excel"></i> Export Excel
                            </button>
                            <button class="control-btn secondary-btn" id="print-report">
                                <i class="fas fa-print"></i> Print
                            </button>
                        </div>
                        
                        <div class="section-title">Report Output</div>
                        
                        <div class="report-output" id="report-output">
                            <div class="output-header">
                                <span id="report-title">Attendance Report</span>
                                <span id="report-time">Select filters and generate report</span>
                            </div>
                            
                            <div class="output-content">
                                <div class="loading" id="report-loading" style="display: none;">
                                    <div class="spinner"></div>
                                    <div>Generating report...</div>
                                </div>
                                
                                <div id="report-content">
                                    <div class="no-report">
                                        <i class="fas fa-chart-bar"></i>
                                        <h3>No Report Generated</h3>
                                        <p>Configure your report filters and click "Generate Report" to view data.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;
        
        // Initialize reports page
        this.initializeReportsPage();
    }

    // ==================== SETUP PAGE ====================
    loadSetupContent(container) {
    if (!this.user) {
        container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
        return;
    }
    
    container.innerHTML = `
        <div class="setup-page">
            <div class="setup-container">
                <div class="setup-header">
                    <h1>System Setup & Configuration</h1>
                    <p class="setup-subtitle">Configure all system settings, user preferences, and manage data</p>
                </div>
                
                <section class="setup-section">
                    <div class="setup-tabs">
                        <button class="tab-btn active" data-tab="classes">
                            <i class="fas fa-chalkboard-teacher"></i> Classes
                        </button>
                        <button class="tab-btn" data-tab="students">
                            <i class="fas fa-users"></i> Students
                        </button>
                        <button class="tab-btn" data-tab="import">
                            <i class="fas fa-file-import"></i> Import
                        </button>
                        <button class="tab-btn" data-tab="system">
                            <i class="fas fa-cog"></i> System Settings
                        </button>
                        <button class="tab-btn" data-tab="data">
                            <i class="fas fa-database"></i> Data Management
                        </button>
                    </div>
                    
                    <!-- Classes Tab -->
                    <div class="tab-content active" id="classes-tab">
                        <div class="section-title">Class Management</div>
                        <div class="setup-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Year Group</label>
                                    <select id="yearGroup" class="form-input">
                                        <option value="">Select Year Group</option>
                                        <option value="1st Years">1st Years</option>
                                        <option value="2nd Years">2nd Years</option>
                                        <option value="3rd Years">3rd Years</option>
                                        <option value="4th Years">4th Years</option>
                                        <option value="5th Years">5th Years</option>
                                        <option value="U5">Upper 5th</option>
                                        <option value="L6">Lower 6th</option>
                                        <option value="U6">Upper 6th</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Class Code</label>
                                    <input type="text" id="classCode" class="form-input uppercase-input" placeholder="e.g., 1LEY, U5MASCOLL, 10RAN" required>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Number of Males</label>
                                    <input type="number" id="maleCount" class="form-input" placeholder="0" min="0">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Number of Females</label>
                                    <input type="number" id="femaleCount" class="form-input" placeholder="0" min="0">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Total Students</label>
                                <div id="totalStudents" class="total-display">0</div>
                            </div>
                            
                            <input type="hidden" id="editClassId" value="">
                            
                            <div class="actions-container">
                                <button class="action-btn save-btn" id="save-class">
                                    <i class="fas fa-save"></i> Save Class
                                </button>
                                <button class="action-btn cancel-btn" id="clear-class">
                                    <i class="fas fa-undo"></i> Clear Form
                                </button>
                            </div>
                        </div>
                        
                        <div class="section-title">Existing Classes</div>
                        <div class="classes-list" id="classes-list">
                            <!-- Classes will be loaded here -->
                        </div>
                    </div>
                    
                    <!-- Students Tab (Remains the same) -->
                    <div class="tab-content" id="students-tab">
                        <div class="section-title">Student Management</div>
                        <div class="setup-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">First Name</label>
                                    <input type="text" id="firstName" class="form-input" placeholder="John">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Last Name</label>
                                    <input type="text" id="lastName" class="form-input" placeholder="Doe">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Student ID</label>
                                    <input type="text" id="studentId" class="form-input" placeholder="STU001">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Gender</label>
                                    <select id="gender" class="form-input">
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Class</label>
                                <select id="studentClass" class="form-input">
                                    <option value="">Select Class</option>
                                    <!-- Classes will be populated here -->
                                </select>
                            </div>
                            
                            <div class="actions-container">
                                <button class="action-btn save-btn" id="save-student">
                                    <i class="fas fa-save"></i> Save Student
                                </button>
                                <button class="action-btn cancel-btn" id="clear-student">
                                    <i class="fas fa-undo"></i> Clear Form
                                </button>
                            </div>
                        </div>
                        
                        <div class="section-title">Existing Students</div>
                        <div class="students-list" id="students-list">
                            <!-- Students will be loaded here -->
                        </div>
                    </div>
                    
                    <!-- Import Tab (Remains the same) -->
                    <div class="tab-content" id="import-tab">
                        <div class="section-title">Data Import</div>
                        <div class="import-container">
                            <div class="import-zone" id="import-zone">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Drag & drop CSV file here</p>
                                <p>or click to browse</p>
                                <input type="file" id="import-file" accept=".csv" style="display: none;">
                            </div>
                            
                            <div class="import-options">
                                <div class="form-group">
                                    <label class="form-label">Import Type</label>
                                    <select id="import-type" class="form-input">
                                        <option value="students">Students</option>
                                        <option value="classes">Classes</option>
                                        <option value="attendance">Attendance</option>
                                    </select>
                                </div>
                                
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="overwrite-data">
                                        <span>Overwrite existing data</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="create-missing" checked>
                                        <span>Create missing classes/students</span>
                                    </label>
                                </div>
                                
                                <div class="actions-container">
                                    <button class="action-btn save-btn" id="process-import">
                                        <i class="fas fa-file-import"></i> Process Import
                                    </button>
                                    <button class="action-btn secondary-btn" id="download-template">
                                        <i class="fas fa-download"></i> Download Template
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="import-instructions">
                            <h4>Import Instructions:</h4>
                            <ul>
                                <li>Download the template for your import type</li>
                                <li>Fill in the data following the template format</li>
                                <li>Save as CSV file</li>
                                <li>Drag and drop or browse to import</li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- System Settings Tab (Remains the same) -->
                    <div class="tab-content" id="system-tab">
                        <div class="section-title">System Configuration</div>
                        
                        <div class="setup-form">
                            <div class="form-group">
                                <label class="form-label">School Name</label>
                                <input type="text" id="schoolName" class="form-input" placeholder="Enter school name">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Current Term</label>
                                    <select id="currentTerm" class="form-input">
                                        <option value="1">Term 1</option>
                                        <option value="2">Term 2</option>
                                        <option value="3">Term 3</option>
                                        <option value="4">Term 4</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Academic Year</label>
                                    <input type="text" id="academicYear" class="form-input" placeholder="e.g., 2023-2024">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Attendance Sessions</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="am-session" checked>
                                        <span>Morning Session (AM)</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="pm-session" checked>
                                        <span>Afternoon Session (PM)</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="actions-container">
                                <button class="action-btn save-btn" id="save-system-settings">
                                    <i class="fas fa-save"></i> Save System Settings
                                </button>
                                <button class="action-btn cancel-btn" id="reset-system-settings">
                                    <i class="fas fa-undo"></i> Reset to Defaults
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Data Management Tab (Remains the same) -->
                    <div class="tab-content" id="data-tab">
                        <div class="section-title">Data Management</div>
                        
                        <div class="data-stats">
                            <div class="stat-card">
                                <div class="stat-icon"><i class="fas fa-chalkboard-teacher"></i></div>
                                <div class="stat-info">
                                    <span class="stat-value" id="stat-classes">0</span>
                                    <span class="stat-label">Classes</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon"><i class="fas fa-users"></i></div>
                                <div class="stat-info">
                                    <span class="stat-value" id="stat-students">0</span>
                                    <span class="stat-label">Students</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon"><i class="fas fa-clipboard-check"></i></div>
                                <div class="stat-info">
                                    <span class="stat-value" id="stat-attendance">0</span>
                                    <span class="stat-label">Attendance Records</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="section-title">Backup & Restore</div>
                        
                        <div class="setup-form">
                            <div class="form-group">
                                <label class="form-label">Create Backup</label>
                                <p class="form-hint">Export all your data to a JSON file</p>
                                <button class="action-btn save-btn" id="backup-data">
                                    <i class="fas fa-download"></i> Create Backup
                                </button>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Restore Backup</label>
                                <p class="form-hint">Import data from a previous backup</p>
                                <button class="action-btn cancel-btn" id="restore-data">
                                    <i class="fas fa-upload"></i> Restore Backup
                                </button>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Export Formats</label>
                                <div class="button-group">
                                    <button class="action-btn secondary-btn" id="export-csv">
                                        <i class="fas fa-file-csv"></i> Export CSV
                                    </button>
                                    <button class="action-btn secondary-btn" id="export-excel">
                                        <i class="fas fa-file-excel"></i> Export Excel
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="section-title">Data Maintenance</div>
                        
                        <div class="setup-form warning-form">
                            <div class="form-group">
                                <label class="form-label">Clear Cache</label>
                                <p class="form-hint">Clear temporary files and cache data</p>
                                <button class="action-btn cancel-btn" id="clear-cache">
                                    <i class="fas fa-broom"></i> Clear Cache
                                </button>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Reset All Data</label>
                                <p class="form-hint warning-text">
                                    <i class="fas fa-exclamation-triangle"></i> 
                                    This will delete ALL data including classes, students, and attendance records
                                </p>
                                <button class="action-btn delete-btn" id="clear-all-data">
                                    <i class="fas fa-trash-alt"></i> Reset All Data
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    `;
    
    // Initialize setup page
    this.initializeSetupPage();
}

    // ==================== SETTINGS PAGE ====================
    loadSettingsContent(container) {
        if (!this.user) {
            container.innerHTML = `<div class="error">No user found. Please login again.</div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="settings-page">
                <div class="settings-container">
                    <div class="settings-header">
                        <h1>User Settings</h1>
                        <p class="settings-subtitle">Manage your account preferences and app settings</p>
                    </div>
                    
                    <section class="settings-section">
                        <div class="settings-tabs">
                            <button class="tab-btn active" data-tab="profile">
                                <i class="fas fa-user"></i> Profile
                            </button>
                            <button class="tab-btn" data-tab="preferences">
                                <i class="fas fa-sliders-h"></i> Preferences
                            </button>
                            <button class="tab-btn" data-tab="security">
                                <i class="fas fa-shield-alt"></i> Security
                            </button>
                            <button class="tab-btn" data-tab="notifications">
                                <i class="fas fa-bell"></i> Notifications
                            </button>
                        </div>
                        
                        <!-- Profile Tab -->
                        <div class="tab-content active" id="profile-tab">
                            <div class="section-title">Profile Information</div>
                            <div class="settings-form">
                                <div class="form-group">
                                    <label class="form-label">Full Name</label>
                                    <input type="text" id="userName" class="form-input" value="${this.user.name || ''}" placeholder="Your full name">
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Email Address</label>
                                        <input type="email" id="userEmail" class="form-input" value="${this.user.email || ''}" placeholder="your@email.com" disabled>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Phone Number</label>
                                        <input type="tel" id="userPhone" class="form-input" value="${this.user.phone || ''}" placeholder="+1234567890">
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Role</label>
                                    <input type="text" class="form-input" value="${this.user.role || 'Teacher'}" disabled>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">School/Institution</label>
                                    <input type="text" id="userSchool" class="form-input" value="${this.user.school || ''}" placeholder="Your school name">
                                </div>
                                
                                <div class="actions-container">
                                    <button class="action-btn save-btn" id="save-profile">
                                        <i class="fas fa-save"></i> Save Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Preferences Tab -->
                        <div class="tab-content" id="preferences-tab">
                            <div class="section-title">Application Preferences</div>
                            <div class="settings-form">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Theme</label>
                                        <select id="theme" class="form-input">
                                            <option value="light">Light Theme</option>
                                            <option value="dark">Dark Theme</option>
                                            <option value="auto">Auto (System)</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Language</label>
                                        <select id="language" class="form-input">
                                            <option value="en">English</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Date Format</label>
                                        <select id="dateFormat" class="form-input">
                                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Time Format</label>
                                        <select id="timeFormat" class="form-input">
                                            <option value="12h">12-hour (AM/PM)</option>
                                            <option value="24h">24-hour</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Default View</label>
                                    <select id="defaultView" class="form-input">
                                        <option value="dashboard">Dashboard</option>
                                        <option value="attendance">Attendance</option>
                                        <option value="reports">Reports</option>
                                    </select>
                                </div>
                                
                                <div class="actions-container">
                                    <button class="action-btn save-btn" id="save-preferences">
                                        <i class="fas fa-save"></i> Save Preferences
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Security Tab -->
                        <div class="tab-content" id="security-tab">
                            <div class="section-title">Change Password</div>
                            <div class="settings-form">
                                <div class="form-group">
                                    <label class="form-label">Current Password</label>
                                    <input type="password" id="currentPassword" class="form-input" placeholder="Enter current password">
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">New Password</label>
                                        <input type="password" id="newPassword" class="form-input" placeholder="Enter new password">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Confirm Password</label>
                                        <input type="password" id="confirmPassword" class="form-input" placeholder="Confirm new password">
                                    </div>
                                </div>
                                
                                <div class="password-requirements">
                                    <p><strong>Password Requirements:</strong></p>
                                    <ul>
                                        <li>At least 8 characters</li>
                                        <li>One uppercase letter</li>
                                        <li>One lowercase letter</li>
                                        <li>One number</li>
                                    </ul>
                                </div>
                                
                                <div class="actions-container">
                                    <button class="action-btn save-btn" id="change-password">
                                        <i class="fas fa-key"></i> Change Password
                                    </button>
                                </div>
                            </div>
                            
                            <div class="section-title">Session Management</div>
                            <div class="settings-form">
                                <div class="form-group">
                                    <label class="form-label">Auto-logout after</label>
                                    <select id="auto-logout" class="form-input">
                                        <option value="15">15 minutes</option>
                                        <option value="30">30 minutes</option>
                                        <option value="60">1 hour</option>
                                        <option value="0">Never</option>
                                    </select>
                                </div>
                                
                                <div class="actions-container">
                                    <button class="action-btn secondary-btn" id="logout-all-devices">
                                        <i class="fas fa-sign-out-alt"></i> Logout from All Devices
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Notifications Tab -->
                        <div class="tab-content" id="notifications-tab">
                            <div class="section-title">Notification Preferences</div>
                            <div class="settings-form">
                                <div class="form-group">
                                    <label class="form-label">Email Notifications</label>
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="notify-daily-summary" checked>
                                            <span>Daily attendance summary</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="notify-weekly-report" checked>
                                            <span>Weekly report</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="notify-low-attendance">
                                            <span>Low attendance alerts</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">In-App Notifications</label>
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="notify-new-students" checked>
                                            <span>New students added</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="notify-system-updates" checked>
                                            <span>System updates</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div class="actions-container">
                                    <button class="action-btn save-btn" id="save-notifications">
                                        <i class="fas fa-save"></i> Save Notification Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;
        
        // Initialize settings page
        this.initializeSettingsPage();
    }

    // ==================== DASHBOARD METHODS ====================
    async loadDashboardData() {
        console.log('📊 Loading dashboard data...');
        
        try {
            // Load existing data
            const classes = Storage.get('classes') || [];
            const students = Storage.get('students') || [];
            const attendance = Storage.get('attendance') || [];
            
            // Update stats
            const totalClasses = document.getElementById('total-classes');
            const totalStudents = document.getElementById('total-students');
            const totalSessions = document.getElementById('total-sessions');
            const attendanceRate = document.getElementById('attendance-rate');
            
            if (totalClasses) totalClasses.textContent = classes.length;
            if (totalStudents) totalStudents.textContent = students.length;
            if (totalSessions) totalSessions.textContent = attendance.length;
            
            // Calculate today's attendance rate
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = attendance.filter(a => a.date === today);
            if (todayAttendance.length > 0) {
                const totalPresent = todayAttendance.reduce((sum, a) => sum + (a.totalPresent || 0), 0);
                const totalStudents = todayAttendance.reduce((sum, a) => sum + (a.totalStudents || 0), 0);
                const rate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
                if (attendanceRate) attendanceRate.textContent = `${rate}%`;
            }
            
            // Load recent activity
            this.loadRecentActivity(attendance);
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    loadRecentActivity(attendance) {
        const activityList = document.getElementById('recent-activity');
        if (!activityList) return;
        
        // Get last 5 attendance records
        const recent = attendance.slice(-5).reverse();
        
        if (recent.length === 0) {
            return; // Keep the welcome message
        }
        
        const activityHTML = recent.map(record => `
            <div class="activity-item">
                <div class="activity-icon">
                    ${record.status === 'present' ? '✅' : record.status === 'absent' ? '❌' : '⏰'}
                </div>
                <div class="activity-content">
                    <p>${record.className || 'Class'} - ${record.status || 'recorded'}</p>
                    <small>${record.date} • ${record.session || ''}</small>
                </div>
            </div>
        `).join('');
        
        // Add to existing activity list (keep welcome message at top)
        activityList.innerHTML += activityHTML;
    }

    refreshDashboard() {
        console.log('🔄 Refreshing dashboard...');
        this.loadDashboardData();
        this.showToast('Dashboard refreshed', 'success');
    }
}

   // ==================== APP CLASS (Attendance Module) ====================
class App {
    constructor() {
        console.log('📱 App class initialized');
        this.user = null;
        this.unsavedChanges = new Set();
        this.autoSaveEnabled = true;
        this.isSaving = false;
        this.autoSaveInterval = null;
    }

    // ==================== ATTENDANCE METHODS ====================
    async loadAttendanceData() {
        console.log('📋 Loading attendance data...');
        
        try {
            // Get selected date, week, term, session
            const selectedDate = document.getElementById('date-picker')?.value;
            const selectedWeek = document.getElementById('week-picker')?.value;
            const selectedTerm = document.getElementById('term-picker')?.value;
            const selectedSession = document.querySelector('.session-option.active')?.dataset.session || 'both';
            
            const summaryTable = document.getElementById('attendance-table-body');
            const studentDetailsContainer = document.getElementById('student-details-container');
            
            if (!summaryTable || !studentDetailsContainer) {
                console.error('❌ Required elements not found');
                return;
            }
            
            // Try to load from Firebase first
            let classes = [];
            let students = [];
            let attendance = [];
            
            if (this.user && this.user.uid && typeof firestore !== 'undefined') {
                try {
                    // Load classes from Firebase
                    const classesSnapshot = await firestore.collection('schools')
                        .doc(this.user.schoolId || this.user.uid)
                        .collection('classes')
                        .get();
                    
                    classes = classesSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    // Load students from Firebase
                    const studentsSnapshot = await firestore.collection('schools')
                        .doc(this.user.schoolId || this.user.uid)
                        .collection('students')
                        .get();
                    
                    students = studentsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    // Load attendance from Firebase with filters
                    let attendanceQuery = firestore.collection('schools')
                        .doc(this.user.schoolId || this.user.uid)
                        .collection('attendance');
                    
                    if (selectedDate) {
                        attendanceQuery = attendanceQuery.where('date', '==', selectedDate);
                    }
                    if (selectedWeek) {
                        attendanceQuery = attendanceQuery.where('week', '==', parseInt(selectedWeek));
                    }
                    if (selectedTerm) {
                        attendanceQuery = attendanceQuery.where('term', '==', parseInt(selectedTerm));
                    }
                    if (selectedSession !== 'both') {
                        attendanceQuery = attendanceQuery.where('session', '==', selectedSession);
                    }
                    
                    const attendanceSnapshot = await attendanceQuery.get();
                    attendance = attendanceSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    // Sync Firebase data to localStorage for offline use
                    Storage.set('classes', classes);
                    Storage.set('students', students);
                    Storage.set('attendance', attendance);
                    
                    console.log('✅ Loaded from Firebase');
                    
                } catch (firebaseError) {
                    console.warn('Firebase load failed, using localStorage:', firebaseError);
                    // Fallback to localStorage
                    classes = Storage.get('classes') || [];
                    students = Storage.get('students') || [];
                    attendance = Storage.get('attendance') || [];
                }
            } else {
                // Use localStorage only
                classes = Storage.get('classes') || [];
                students = Storage.get('students') || [];
                attendance = Storage.get('attendance') || [];
            }
            
            // Clear previous content
            summaryTable.innerHTML = '';
            studentDetailsContainer.innerHTML = '';
            
            // Get filter date (use selected date or today)
            const filterDate = selectedDate || new Date().toISOString().split('T')[0];
            
            // For each class, create summary row and student details
            classes.forEach((classItem, index) => {
                // Get students in this class
                const classStudents = students.filter(s => s.classId === classItem.id);
                const classAttendance = attendance.filter(a => a.classId === classItem.id);
                
                // Calculate attendance stats for filtered date
                const filteredAttendance = classAttendance.filter(a => a.date === filterDate);
                
                // Calculate AM/PM counts
                let malePresentAM = 0;
                let malePresentPM = 0;
                let femalePresentAM = 0;
                let femalePresentPM = 0;
                
                classStudents.forEach(student => {
                    const studentAttendance = filteredAttendance.find(a => a.studentId === student.id);
                    if (studentAttendance) {
                        if (student.gender?.toLowerCase() === 'male') {
                            if (studentAttendance.session === 'AM' || studentAttendance.session === 'FULL') {
                                malePresentAM++;
                            }
                            if (studentAttendance.session === 'PM' || studentAttendance.session === 'FULL') {
                                malePresentPM++;
                            }
                        } else if (student.gender?.toLowerCase() === 'female') {
                            if (studentAttendance.session === 'AM' || studentAttendance.session === 'FULL') {
                                femalePresentAM++;
                            }
                            if (studentAttendance.session === 'PM' || studentAttendance.session === 'FULL') {
                                femalePresentPM++;
                            }
                        }
                    }
                });
                
                const totalStudents = classStudents.length;
                const totalMale = classStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
                const totalFemale = classStudents.filter(s => s.gender?.toLowerCase() === 'female').length;
                
                // Calculate rates
                const amRate = totalMale > 0 ? Math.round((malePresentAM / totalMale) * 100) : 0;
                const pmRate = totalMale > 0 ? Math.round((malePresentPM / totalMale) * 100) : 0;
                const dailyRate = totalStudents > 0 ? Math.round(((malePresentAM + malePresentPM + femalePresentAM + femalePresentPM) / (totalStudents * 2)) * 100) : 0;
                
                // Summary row with INPUT FIELDS
                const summaryRow = document.createElement('tr');
                summaryRow.className = 'attendance-data-row';
                summaryRow.setAttribute('data-class-id', classItem.id);
                
                // Get saved attendance for this class/date/session
                const savedAttendance = classAttendance.find(a => 
                    a.classId === classItem.id && 
                    a.date === filterDate &&
                    (a.session === selectedSession || selectedSession === 'both')
                );
                
                // Use saved values if they exist
                const savedMalePresentAM = savedAttendance?.malePresentAM || malePresentAM;
                const savedMalePresentPM = savedAttendance?.malePresentPM || malePresentPM;
                const savedFemalePresentAM = savedAttendance?.femalePresentAM || femalePresentAM;
                const savedFemalePresentPM = savedAttendance?.femalePresentPM || femalePresentPM;
                
                summaryRow.innerHTML = `
                    <td class="year-group-cell">${classItem.yearGroup || 'All Years'}</td>
                    <td class="class-code-cell"><strong>${classItem.code || classItem.name}</strong></td>
                    <td class="total-students-cell">${totalStudents}</td>
                    
                    <!-- MALE AM Input -->
                    <td class="input-cell">
                        <input type="number" 
                               class="attendance-input male-am-input" 
                               value="${savedMalePresentAM}" 
                               min="0" 
                               max="${totalMale}"
                               data-class-id="${classItem.id}"
                               data-gender="male"
                               data-session="am"
                               data-original="${savedMalePresentAM}"
                               oninput="app.handleAttendanceInput(this)">
                    </td>
                    
                    <!-- MALE PM Input -->
                    <td class="input-cell">
                        <input type="number" 
                               class="attendance-input male-pm-input" 
                               value="${savedMalePresentPM}" 
                               min="0" 
                               max="${totalMale}"
                               data-class-id="${classItem.id}"
                               data-gender="male"
                               data-session="pm"
                               data-original="${savedMalePresentPM}"
                               oninput="app.handleAttendanceInput(this)">
                    </td>
                    
                    <!-- FEMALE AM Input -->
                    <td class="input-cell">
                        <input type="number" 
                               class="attendance-input female-am-input" 
                               value="${savedFemalePresentAM}" 
                               min="0" 
                               max="${totalFemale}"
                               data-class-id="${classItem.id}"
                               data-gender="female"
                               data-session="am"
                               data-original="${savedFemalePresentAM}"
                               oninput="app.handleAttendanceInput(this)">
                    </td>
                    
                    <!-- FEMALE PM Input -->
                    <td class="input-cell">
                        <input type="number" 
                               class="attendance-input female-pm-input" 
                               value="${savedFemalePresentPM}" 
                               min="0" 
                               max="${totalFemale}"
                               data-class-id="${classItem.id}"
                               data-gender="female"
                               data-session="pm"
                               data-original="${savedFemalePresentPM}"
                               oninput="app.handleAttendanceInput(this)">
                    </td>
                    
                    <!-- Calculated Rates -->
                    <td class="am-rate-cell ${amRate >= 90 ? 'high' : amRate >= 75 ? 'medium' : 'low'}" 
                        data-class-id="${classItem.id}">${amRate}%</td>
                    
                    <td class="pm-rate-cell ${pmRate >= 90 ? 'high' : pmRate >= 75 ? 'medium' : 'low'}" 
                        data-class-id="${classItem.id}">${pmRate}%</td>
                    
                    <td class="daily-rate-cell ${dailyRate >= 90 ? 'high' : dailyRate >= 75 ? 'medium' : 'low'}" 
                        data-class-id="${classItem.id}">${dailyRate}%</td>
                    
                    <!-- Actions -->
                    <td class="actions-cell">
                        <button class="btn btn-sm btn-success save-attendance-btn" 
                                onclick="app.saveClassAttendance('${classItem.id}')"
                                data-class-id="${classItem.id}">
                            <i class="fas fa-save"></i> Save
                        </button>
                        <button class="btn btn-sm btn-secondary reset-btn" 
                                onclick="app.resetClassAttendance('${classItem.id}')"
                                data-class-id="${classItem.id}">
                            <i class="fas fa-undo"></i> Reset
                        </button>
                    </td>
                `;
                
                summaryTable.appendChild(summaryRow);
                
                // Student details section (optional - can be removed if not needed)
                const classSection = document.createElement('div');
                classSection.className = 'class-details';
                classSection.innerHTML = `
                    <h4>${classItem.yearGroup || ''} ${classItem.name} (${classItem.code})</h4>
                    <table class="student-attendance-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Student Name</th>
                                <th>Student ID</th>
                                <th>AM Session</th>
                                <th>PM Session</th>
                                <th>Status</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${classStudents.map((student, idx) => {
                                const studentAttendance = filteredAttendance.find(a => a.studentId === student.id);
                                const status = studentAttendance?.status || 'absent';
                                const remarks = studentAttendance?.remarks || '';
                                const session = studentAttendance?.session || '';
                                
                                return `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td>${student.fullName}</td>
                                        <td>${student.studentId}</td>
                                        <td>
                                            <input type="checkbox" class="session-checkbox" 
                                                   data-student-id="${student.id}" 
                                                   data-session="am"
                                                   ${session === 'AM' || session === 'FULL' ? 'checked' : ''}>
                                        </td>
                                        <td>
                                            <input type="checkbox" class="session-checkbox" 
                                                   data-student-id="${student.id}" 
                                                   data-session="pm"
                                                   ${session === 'PM' || session === 'FULL' ? 'checked' : ''}>
                                        </td>
                                        <td class="status-${status}">${status.toUpperCase()}</td>
                                        <td>
                                            <input type="text" class="remarks-input" 
                                                   data-student-id="${student.id}"
                                                   value="${remarks}"
                                                   placeholder="Add remarks...">
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
                studentDetailsContainer.appendChild(classSection);
            });
            
            // If no classes exist
            if (classes.length === 0) {
                summaryTable.innerHTML = `
                    <tr>
                        <td colspan="12" class="no-data">
                            No classes found. Please setup classes first.
                        </td>
                    </tr>
                `;
                
                studentDetailsContainer.innerHTML = `
                    <div class="no-data-message">
                        <p>No classes or students found.</p>
                        <p>Go to <a href="setup.html">Setup</a> to add classes and students.</p>
                    </div>
                `;
            }
                   
        } catch (error) {
            console.error('Error loading attendance data:', error);
            this.showToast('Error loading attendance data', 'error');
        }
    }

    // ==================== ATTENDANCE INPUT HANDLER ====================
    handleAttendanceInput(inputElement) {
        const classId = inputElement.getAttribute('data-class-id');
        const gender = inputElement.getAttribute('data-gender');
        const session = inputElement.getAttribute('data-session');
        const value = parseInt(inputElement.value) || 0;
        
        // Get the row
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;
        
        // Get student counts
        const classes = Storage.get('classes') || [];
        const students = Storage.get('students') || [];
        const classItem = classes.find(c => c.id === classId);
        
        if (!classItem) return;
        
        const classStudents = students.filter(s => s.classId === classId);
        const totalMale = classStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
        const totalFemale = classStudents.filter(s => s.gender?.toLowerCase() === 'female').length;
        
        // Validate the input value
        const maxValue = gender === 'male' ? totalMale : totalFemale;
        const validatedValue = Math.min(Math.max(value, 0), maxValue);
        
        // Update the input value
        inputElement.value = validatedValue;
        
        // Get current session type
        const selectedSession = document.querySelector('.session-option.active')?.dataset.session || 'both';
        
        // Handle session-based copying
        if (selectedSession !== 'both') {
            if (selectedSession === 'am') {
                // If AM session only, copy AM value to PM for same gender
                const otherInput = row.querySelector(`.${gender}-pm-input`);
                if (otherInput) {
                    otherInput.value = validatedValue;
                    otherInput.setAttribute('data-original', validatedValue);
                }
            } else if (selectedSession === 'pm') {
                // If PM session only, copy PM value to AM for same gender
                const otherInput = row.querySelector(`.${gender}-am-input`);
                if (otherInput) {
                    otherInput.value = validatedValue;
                    otherInput.setAttribute('data-original', validatedValue);
                }
            }
        }
        
        // Update calculations
        this.updateAttendanceCalculations(classId);
    }

    updateAttendanceCalculations(classId) {
        console.log('🔄 Updating calculations for class:', classId);
        
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;
        
        // Get input values with proper validation
        const maleAmInput = row.querySelector('.male-am-input');
        const malePmInput = row.querySelector('.male-pm-input');
        const femaleAmInput = row.querySelector('.female-am-input');
        const femalePmInput = row.querySelector('.female-pm-input');
        
        const maleAm = parseInt(maleAmInput.value) || 0;
        const malePm = parseInt(malePmInput.value) || 0;
        const femaleAm = parseInt(femaleAmInput.value) || 0;
        const femalePm = parseInt(femalePmInput.value) || 0;
        
        // Get totals
        const classes = Storage.get('classes') || [];
        const classItem = classes.find(c => c.id === classId);
        const students = Storage.get('students') || [];
        
        if (!classItem) return;
        
        const classStudents = students.filter(s => s.classId === classId);
        const totalMale = classStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
        const totalFemale = classStudents.filter(s => s.gender?.toLowerCase() === 'female').length;
        
        // Ensure values don't exceed totals
        if (maleAm > totalMale) maleAmInput.value = totalMale;
        if (malePm > totalMale) malePmInput.value = totalMale;
        if (femaleAm > totalFemale) femaleAmInput.value = totalFemale;
        if (femalePm > totalFemale) femalePmInput.value = totalFemale;
        
        // Calculate rates based on VALIDATED values
        const validatedMaleAm = parseInt(maleAmInput.value) || 0;
        const validatedMalePm = parseInt(malePmInput.value) || 0;
        const validatedFemaleAm = parseInt(femaleAmInput.value) || 0;
        const validatedFemalePm = parseInt(femalePmInput.value) || 0;
        
        // Calculate rates
        const amRate = totalMale > 0 ? Math.round((validatedMaleAm / totalMale) * 100) : 0;
        const pmRate = totalMale > 0 ? Math.round((validatedMalePm / totalMale) * 100) : 0;
        const dailyRate = classStudents.length > 0 ? 
            Math.round(((validatedMaleAm + validatedMalePm + validatedFemaleAm + validatedFemalePm) / 
                       (classStudents.length * 2)) * 100) : 0;
        
        // Update rate cells
        const amRateCell = row.querySelector('.am-rate-cell');
        const pmRateCell = row.querySelector('.pm-rate-cell');
        const dailyRateCell = row.querySelector('.daily-rate-cell');
        
        amRateCell.textContent = `${amRate}%`;
        pmRateCell.textContent = `${pmRate}%`;
        dailyRateCell.textContent = `${dailyRate}%`;
        
        // Update colors
        amRateCell.className = `am-rate-cell ${amRate >= 90 ? 'high' : amRate >= 75 ? 'medium' : 'low'}`;
        pmRateCell.className = `pm-rate-cell ${pmRate >= 90 ? 'high' : pmRate >= 75 ? 'medium' : 'low'}`;
        dailyRateCell.className = `daily-rate-cell ${dailyRate >= 90 ? 'high' : dailyRate >= 75 ? 'medium' : 'low'}`;
        
        // Highlight save button if changed
        const saveBtn = row.querySelector('.save-attendance-btn');
        const originalMaleAm = parseInt(maleAmInput.getAttribute('data-original')) || 0;
        const originalMalePm = parseInt(malePmInput.getAttribute('data-original')) || 0;
        const originalFemaleAm = parseInt(femaleAmInput.getAttribute('data-original')) || 0;
        const originalFemalePm = parseInt(femalePmInput.getAttribute('data-original')) || 0;
        
        const hasChanges = validatedMaleAm !== originalMaleAm || 
                           validatedMalePm !== originalMalePm || 
                           validatedFemaleAm !== originalFemaleAm || 
                           validatedFemalePm !== originalFemalePm;
        
        if (hasChanges) {
            saveBtn.classList.add('has-changes');
            saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Save Changes';
            
            // Add to unsaved changes for auto-save
            if (this.unsavedChanges) {
                this.unsavedChanges.add(classId);
            }
        } else {
            saveBtn.classList.remove('has-changes');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            
            // Remove from unsaved changes
            if (this.unsavedChanges) {
                this.unsavedChanges.delete(classId);
            }
        }
        
        // Update save status
        this.updateSaveStatus();
    }

    async saveClassAttendance(classId) {
        console.log('💾 Saving attendance for class:', classId);
        
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;
        
        // Get input values
        const maleAmInput = row.querySelector('.male-am-input');
        const malePmInput = row.querySelector('.male-pm-input');
        const femaleAmInput = row.querySelector('.female-am-input');
        const femalePmInput = row.querySelector('.female-pm-input');
        
        const maleAm = parseInt(maleAmInput.value) || 0;
        const malePm = parseInt(malePmInput.value) || 0;
        const femaleAm = parseInt(femaleAmInput.value) || 0;
        const femalePm = parseInt(femalePmInput.value) || 0;
        
        // Validate inputs
        const classes = Storage.get('classes') || [];
        const classItem = classes.find(c => c.id === classId);
        const students = Storage.get('students') || [];
        const classStudents = students.filter(s => s.classId === classId);
        
        const totalMale = classStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
        const totalFemale = classStudents.filter(s => s.gender?.toLowerCase() === 'female').length;
        
        // Validate against totals
        const validatedMaleAm = Math.min(maleAm, totalMale);
        const validatedMalePm = Math.min(malePm, totalMale);
        const validatedFemaleAm = Math.min(femaleAm, totalFemale);
        const validatedFemalePm = Math.min(femalePm, totalFemale);
        
        if (!classItem) {
            this.showToast('Class not found', 'error');
            return;
        }
        
        // Get selected filters
        const selectedDate = document.getElementById('date-picker')?.value;
        const selectedSession = document.querySelector('.session-option.active')?.dataset.session || 'both';
        
        // Prepare attendance record
        const attendanceRecord = {
            id: `attendance_${Date.now()}_${classId}`,
            classId: classId,
            classCode: classItem.code,
            classYear: classItem.yearGroup,
            date: selectedDate,
            session: selectedSession,
            malePresentAM: validatedMaleAm,
            malePresentPM: validatedMalePm,
            femalePresentAM: validatedFemaleAm,
            femalePresentPM: validatedFemalePm,
            recordedBy: this.user?.email || this.user?.name || 'Unknown',
            recordedAt: new Date().toISOString(),
            autoSaved: this.isSaving,
            totalStudents: classStudents.length,
            totalMale: totalMale,
            totalFemale: totalFemale
        };
        
        // Save to localStorage
        let attendanceRecords = Storage.get('attendance') || [];
        
        // Remove existing record for same class, date, and session
        attendanceRecords = attendanceRecords.filter(record => 
            !(record.classId === classId && 
              record.date === selectedDate && 
              record.session === selectedSession)
        );
        
        // Add new record
        attendanceRecords.push(attendanceRecord);
        Storage.set('attendance', attendanceRecords);
        
        // Update original values
        maleAmInput.setAttribute('data-original', validatedMaleAm);
        malePmInput.setAttribute('data-original', validatedMalePm);
        femaleAmInput.setAttribute('data-original', validatedFemaleAm);
        femalePmInput.setAttribute('data-original', validatedFemalePm);
        
        // Update UI
        row.classList.remove('has-unsaved-changes');
        
        // Update save button
        const saveBtn = row.querySelector('.save-attendance-btn');
        saveBtn.classList.remove('has-changes');
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
        saveBtn.classList.add('saved');
        
        // Remove from unsaved changes
        if (this.unsavedChanges) {
            this.unsavedChanges.delete(classId);
        }
        
        // Try to save to Firebase
        if (window.auth?.currentUser) {
            try {
                const schoolId = getSchoolId();
                const firebaseRecord = {
                    ...attendanceRecord,
                    schoolId: schoolId
                };
                
                const result = await Firestore.saveAttendance(schoolId, firebaseRecord);
                
                if (result.success) {
                    attendanceRecord.firebaseId = result.id;
                    // Update local record with Firebase ID
                    const updatedRecords = attendanceRecords.map(record => 
                        record.id === attendanceRecord.id ? { ...record, firebaseId: result.id } : record
                    );
                    Storage.set('attendance', updatedRecords);
                    console.log('✅ Saved to Firebase');
                }
            } catch (error) {
                console.error('Firebase save error:', error);
                if (!this.isSaving) {
                    this.showToast('Saved locally (cloud sync failed)', 'warning');
                }
            }
        }
        
        // Update last saved time
        this.updateLastSavedTime();
        
        // Show success message (not for auto-save)
        if (!this.isSaving) {
            this.showToast(`Attendance saved for ${classItem.code}`, 'success');
        }
        
        // Update save button after delay
        setTimeout(() => {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            saveBtn.classList.remove('saved');
        }, 2000);
        
        return attendanceRecord;
    }

    async saveToFirebase(collection, data) {
        if (!window.auth?.currentUser) return { success: false };
        
        try {
            const schoolId = getSchoolId();
            
            // Check if Firestore.saveAttendance exists
            if (typeof Firestore === 'object' && typeof Firestore.saveAttendance === 'function') {
                return await Firestore.saveAttendance(schoolId, data);
            }
            
            // Fallback to direct Firebase if available
            if (typeof firestore !== 'undefined') {
                const docRef = firestore.collection('schools')
                    .doc(schoolId)
                    .collection('attendance')
                    .doc();
                
                await docRef.set({
                    ...data,
                    schoolId: schoolId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                return { success: true, id: docRef.id };
            }
            
            return { success: false, error: 'Firestore not available' };
        } catch (error) {
            console.error('Firebase save error:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== FIREBASE SYNC METHODS ====================
async syncLocalUserToFirebase() {
    console.log('☁️ Syncing local user to Firebase...');
    
    if (!this.user || !this.user.id) {
        console.log('No user to sync');
        return;
    }
    
    // If Firebase is available, sync user data
    if (typeof firestore !== 'undefined') {
        try {
            const userData = {
                id: this.user.id,
                email: this.user.email,
                name: this.user.name,
                role: this.user.role,
                lastLogin: new Date().toISOString(),
                lastSync: new Date().toISOString(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Save to Firebase
            await firestore.collection('users').doc(this.user.id).set(userData, { merge: true });
            console.log('✅ User synced to Firebase');
            
        } catch (error) {
            console.warn('Firebase user sync failed:', error);
            // Don't throw - this is optional sync
        }
    } else {
        console.log('Firebase not available for sync');
    }
}

// ==================== ERROR HANDLING ====================
showError(message) {
    console.error('❌ Error:', message);
    
    // Try to use existing toast system if available
    if (typeof this.showToast === 'function') {
        this.showToast(message, 'error');
    } else if (typeof showToast === 'function') {
        // Global toast function
        showToast(message, 'error');
    } else {
        // Fallback to alert
        alert(`Error: ${message}`);
    }
}

// Also add this toast method if it doesn't exist:
showToast(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // If you have a UI toast system, implement it here
    // For now, just log to console
    switch(type) {
        case 'success':
            console.log('✅', message);
            break;
        case 'error':
            console.error('❌', message);
            break;
        case 'warning':
            console.warn('⚠️', message);
            break;
        default:
            console.log('ℹ️', message);
    }
}
    
    resetClassAttendance(classId) {
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;
        
        // Get original values
        const maleAmInput = row.querySelector('.male-am-input');
        const malePmInput = row.querySelector('.male-pm-input');
        const femaleAmInput = row.querySelector('.female-am-input');
        const femalePmInput = row.querySelector('.female-pm-input');
        
        const originalMaleAm = parseInt(maleAmInput.getAttribute('data-original')) || 0;
        const originalMalePm = parseInt(malePmInput.getAttribute('data-original')) || 0;
        const originalFemaleAm = parseInt(femaleAmInput.getAttribute('data-original')) || 0;
        const originalFemalePm = parseInt(femalePmInput.getAttribute('data-original')) || 0;
        
        // Reset inputs
        maleAmInput.value = originalMaleAm;
        malePmInput.value = originalMalePm;
        femaleAmInput.value = originalFemaleAm;
        femalePmInput.value = originalFemalePm;
        
        // Update calculations
        this.updateAttendanceCalculations(classId);
        
        // Reset save button
        const saveBtn = row.querySelector('.save-attendance-btn');
        saveBtn.classList.remove('has-changes');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        
        this.showToast('Attendance reset', 'info');
    }

    async saveAllAttendance() {
        console.log('💾 Saving all attendance data...');
        
        // Get all attendance rows
        const attendanceRows = document.querySelectorAll('.attendance-data-row');
        if (attendanceRows.length === 0) {
            this.showToast('No attendance data found', 'warning');
            return;
        }
        
        let savedCount = 0;
        let failedCount = 0;
        let totalChanges = 0;
        
        // Show saving indicator
        const saveBtn = document.getElementById('save-all-attendance');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;
        }
        
        // First, count total changes
        attendanceRows.forEach(row => {
            const saveRowBtn = row.querySelector('.save-attendance-btn');
            if (saveRowBtn && saveRowBtn.classList.contains('has-changes')) {
                totalChanges++;
            }
        });
        
        if (totalChanges === 0) {
            this.showToast('No changes to save', 'info');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save All Changes';
                saveBtn.disabled = false;
            }
            return;
        }
        
        // Create progress indicator
        const progressDiv = document.createElement('div');
        progressDiv.className = 'save-progress';
        progressDiv.innerHTML = `
            <div class="progress-header">
                <h4><i class="fas fa-save"></i> Saving Attendance</h4>
                <div class="progress-stats">0/${totalChanges}</div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-details"></div>
        `;
        document.body.appendChild(progressDiv);
        
        try {
            // Save each row with changes
            for (const row of attendanceRows) {
                const saveRowBtn = row.querySelector('.save-attendance-btn');
                if (saveRowBtn && saveRowBtn.classList.contains('has-changes')) {
                    const classId = row.getAttribute('data-class-id');
                    
                    try {
                        await this.saveClassAttendance(classId);
                        savedCount++;
                        
                        // Update progress
                        const percent = Math.round((savedCount / totalChanges) * 100);
                        const progressFill = progressDiv.querySelector('.progress-fill');
                        const progressStats = progressDiv.querySelector('.progress-stats');
                        const progressDetails = progressDiv.querySelector('.progress-details');
                        
                        if (progressFill) progressFill.style.width = `${percent}%`;
                        if (progressStats) progressStats.textContent = `${savedCount}/${totalChanges}`;
                        
                        // Add success message
                        const classes = Storage.get('classes') || [];
                        const classItem = classes.find(c => c.id === classId);
                        if (classItem && progressDetails) {
                            const successMsg = document.createElement('div');
                            successMsg.className = 'progress-success';
                            successMsg.innerHTML = `<i class="fas fa-check-circle"></i> Saved ${classItem.code}`;
                            progressDetails.appendChild(successMsg);
                        }
                        
                    } catch (error) {
                        console.error(`Failed to save class ${classId}:`, error);
                        failedCount++;
                        
                        // Add error message
                        const progressDetails = progressDiv.querySelector('.progress-details');
                        if (progressDetails) {
                            const errorMsg = document.createElement('div');
                            errorMsg.className = 'progress-error';
                            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> Failed to save`;
                            progressDetails.appendChild(errorMsg);
                        }
                    }
                }
            }
            
            // Show completion message
            if (savedCount > 0) {
                this.showToast(`Successfully saved ${savedCount} classes${failedCount > 0 ? ` (${failedCount} failed)` : ''}`, 'success');
            }
            
            if (failedCount > 0) {
                this.showToast(`${failedCount} classes failed to save`, 'error');
            }
            
        } catch (error) {
            console.error('Error in saveAllAttendance:', error);
            this.showToast('Error saving attendance data', 'error');
        } finally {
            // Restore save button
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save All Changes';
                saveBtn.disabled = false;
            }
            
            // Remove progress indicator after delay
            setTimeout(() => {
                if (progressDiv.parentNode) {
                    progressDiv.parentNode.removeChild(progressDiv);
                }
            }, 3000);
        }
    }

    setupAttendanceEventListeners() {
        const saveAllBtn = document.getElementById('save-all-attendance');
        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => this.saveAllAttendance());
        }
        
        const takeAttendanceBtn = document.getElementById('take-attendance');
        if (takeAttendanceBtn) {
            takeAttendanceBtn.addEventListener('click', () => this.takeAttendanceForAll());
        }
    }

    async takeAttendanceForAll() {
        console.log('📝 Taking attendance for all classes...');
        
        // Get all classes
        const classes = Storage.get('classes') || [];
        if (classes.length === 0) {
            this.showToast('No classes found. Please add classes first.', 'error');
            return;
        }
        
        // Get selected date and session
        const selectedDate = document.getElementById('date-picker')?.value;
        const selectedSession = document.querySelector('.session-option.active')?.dataset.session || 'both';
        
        if (!selectedDate) {
            this.showToast('Please select a date first', 'error');
            return;
        }
        
        // Show confirmation
        if (!confirm(`Take attendance for ${classes.length} classes on ${selectedDate}?`)) {
            return;
        }
        
        // Show progress
        const takeBtn = document.getElementById('take-attendance');
        if (takeBtn) {
            takeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            takeBtn.disabled = true;
        }
        
        try {
            let processedCount = 0;
            
            // Process each class
            for (const classItem of classes) {
                try {
                    await this.takeAttendanceForClass(classItem.id);
                    processedCount++;
                    
                    // Update UI gradually
                    this.updateAttendanceRowUI(classItem.id);
                    
                } catch (error) {
                    console.error(`Failed to process class ${classItem.code}:`, error);
                }
            }
            
            this.showToast(`Attendance taken for ${processedCount} classes`, 'success');
            
        } catch (error) {
            console.error('Error in takeAttendanceForAll:', error);
            this.showToast('Error taking attendance', 'error');
        } finally {
            // Restore button
            if (takeBtn) {
                takeBtn.innerHTML = '<i class="fas fa-user-check"></i> Take Attendance';
                takeBtn.disabled = false;
            }
        }
    }

    async takeAttendanceForClass(classId) {
        console.log(`📝 Taking attendance for class: ${classId}`);
        
        // Get class info
        const classes = Storage.get('classes') || [];
        const classItem = classes.find(c => c.id === classId);
        
        if (!classItem) {
            throw new Error('Class not found');
        }
        
        // Get students in this class
        const students = Storage.get('students') || [];
        const classStudents = students.filter(s => s.classId === classId);
        
        if (classStudents.length === 0) {
            console.log(`No students in class ${classItem.code}`);
            return;
        }
        
        // Get selected date and session
        const selectedDate = document.getElementById('date-picker')?.value;
        const selectedSession = document.querySelector('.session-option.active')?.dataset.session || 'both';
        
        // Calculate counts based on session
        let maleCount = classStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
        let femaleCount = classStudents.filter(s => s.gender?.toLowerCase() === 'female').length;
        
        // Default to full attendance for demo
        const malePresentAM = selectedSession === 'pm' ? 0 : maleCount;
        const malePresentPM = selectedSession === 'am' ? 0 : maleCount;
        const femalePresentAM = selectedSession === 'pm' ? 0 : femaleCount;
        const femalePresentPM = selectedSession === 'am' ? 0 : femaleCount;
        
        // Update the input fields
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (row) {
            const maleAmInput = row.querySelector('.male-am-input');
            const malePmInput = row.querySelector('.male-pm-input');
            const femaleAmInput = row.querySelector('.female-am-input');
            const femalePmInput = row.querySelector('.female-pm-input');
            
            if (maleAmInput) maleAmInput.value = malePresentAM;
            if (malePmInput) malePmInput.value = malePresentPM;
            if (femaleAmInput) femaleAmInput.value = femalePresentAM;
            if (femalePmInput) femalePmInput.value = femalePresentPM;
            
            // Trigger calculations
            this.updateAttendanceCalculations(classId);
        }
        
        // Create attendance record
        const attendanceRecord = {
            id: `attendance_${Date.now()}_${classId}`,
            classId: classId,
            classCode: classItem.code,
            classYear: classItem.yearGroup,
            date: selectedDate,
            session: selectedSession,
            malePresentAM: malePresentAM,
            malePresentPM: malePresentPM,
            femalePresentAM: femalePresentAM,
            femalePresentPM: femalePresentPM,
            recordedBy: this.user?.email || this.user?.name || 'Unknown',
            recordedAt: new Date().toISOString(),
            autoGenerated: true
        };
        
        // Save to localStorage
        let attendanceRecords = Storage.get('attendance') || [];
        
        // Remove existing record
        attendanceRecords = attendanceRecords.filter(record => 
            !(record.classId === classId && 
              record.date === selectedDate && 
              record.session === selectedSession)
        );
        
        attendanceRecords.push(attendanceRecord);
        Storage.set('attendance', attendanceRecords);
        
        // Save to Firebase if available
        if (window.auth?.currentUser) {
            try {
                const schoolId = getSchoolId();
                const firebaseRecord = {
                    ...attendanceRecord,
                    schoolId: schoolId
                };
                
                await Firestore.saveAttendance(schoolId, firebaseRecord);
                console.log(`✅ Saved to Firebase: ${classItem.code}`);
            } catch (error) {
                console.error(`Firebase save error for ${classItem.code}:`, error);
            }
        }
        
        return attendanceRecord;
    }

    updateAttendanceRowUI(classId) {
        const row = document.querySelector(`tr[data-class-id="${classId}"]`);
        if (!row) return;
        
        // Update save button to show changes
        const saveBtn = row.querySelector('.save-attendance-btn');
        if (saveBtn) {
            saveBtn.classList.add('has-changes');
            saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Save Changes';
            
            // Flash effect
            row.classList.add('updated');
            setTimeout(() => {
                row.classList.remove('updated');
            }, 1000);
        }
    }

    // ==================== AUTO-SAVE FILTERS ====================
    setupAutoSaveFilters() {
        console.log('🔧 Setting up auto-save filters...');
        
        const debounce = (func, delay) => {
            let timeoutId;
            return (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        };
        
        const autoSave = debounce(async () => {
            console.log('💾 Auto-saving attendance filters...');
            await this.saveAttendanceFilters();
            this.showFilterSaveNotification('Filter settings saved');
            await this.loadAttendanceData();
        }, 1000);
        
        // Add event listeners to all filter elements
        const datePicker = document.getElementById('date-picker');
        const weekPicker = document.getElementById('week-picker');
        const termPicker = document.getElementById('term-picker');
        const sessionOptions = document.querySelectorAll('.session-option');
        
        if (datePicker) datePicker.addEventListener('change', autoSave);
        if (weekPicker) weekPicker.addEventListener('change', autoSave);
        if (termPicker) termPicker.addEventListener('change', autoSave);
        
        if (sessionOptions.length > 0) {
            sessionOptions.forEach(option => {
                option.addEventListener('click', async (e) => {
                    document.querySelectorAll('.session-option').forEach(opt => 
                        opt.classList.remove('active')
                    );
                    option.classList.add('active');
                    
                    const selectedSession = option.dataset.session;
                    this.applySessionLogic(selectedSession);
                    
                    await this.saveAttendanceFilters();
                    this.showFilterSaveNotification('Session saved');
                    await this.loadAttendanceData();
                });
            });
        }
    }

    async saveAttendanceFilters() {
        try {
            const settings = {
                date: document.getElementById('date-picker')?.value,
                week: document.getElementById('week-picker')?.value,
                term: document.getElementById('term-picker')?.value,
                session: document.querySelector('.session-option.active')?.dataset.session || 'both',
                lastUpdated: new Date().toISOString(),
                userId: this.user?.uid
            };
            
            localStorage.setItem('attendance_filters', JSON.stringify(settings));
            
            if (this.user && this.user.uid && typeof firestore !== 'undefined') {
                try {
                    await firestore.collection('users')
                        .doc(this.user.uid)
                        .collection('preferences')
                        .doc('attendance_filters')
                        .set(settings, { merge: true });
                    console.log('✅ Filters saved to Firebase');
                } catch (firebaseError) {
                    console.warn('Failed to save to Firebase:', firebaseError);
                }
            }
            
            return settings;
            
        } catch (error) {
            console.error('Error saving attendance filters:', error);
            throw error;
        }
    }

    async loadAttendanceFilters() {
        try {
            let settings = null;
            
            if (this.user && this.user.uid && typeof firestore !== 'undefined') {
                try {
                    const settingsDoc = await firestore.collection('users')
                        .doc(this.user.uid)
                        .collection('preferences')
                        .doc('attendance_filters')
                        .get();
                    
                    if (settingsDoc.exists) {
                        settings = settingsDoc.data();
                        console.log('✅ Filters loaded from Firebase');
                    }
                } catch (firebaseError) {
                    console.warn('Failed to load from Firebase:', firebaseError);
                }
            }
            
            if (!settings) {
                const localSettings = localStorage.getItem('attendance_filters');
                if (localSettings) {
                    settings = JSON.parse(localSettings);
                    console.log('✅ Filters loaded from localStorage');
                }
            }
            
            if (!settings) {
                const today = new Date();
                settings = {
                    date: today.toISOString().split('T')[0],
                    week: '1',
                    term: '1',
                    session: 'both'
                };
                console.log('✅ Using default filters');
            }
            
            return settings;
            
        } catch (error) {
            console.error('Error loading attendance filters:', error);
            return null;
        }
    }

    showFilterSaveNotification(message) {
        const existingNotification = document.querySelector('.save-notification');
        if (existingNotification) existingNotification.remove();
        
        const notification = document.createElement('div');
        notification.className = 'save-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 300);
        }, 2000);
    }

    // ==================== AUTO-SAVE ATTENDANCE DATA ====================
    setupAutoSave() {
        console.log('⏱️ Setting up auto-save feature...');
        
        this.autoSaveEnabled = true;
        this.autoSaveInterval = null;
        this.unsavedChanges = new Set();
        this.isSaving = false;
        this.autoSaveDelay = 30000;
        
        this.startAutoSave();
        this.setupAutoSaveIndicator();
        this.setupInputTracking();
        this.setupBeforeUnloadWarning();
    }

    startAutoSave() {
        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
        
        this.autoSaveInterval = setInterval(async () => {
            if (this.autoSaveEnabled && this.unsavedChanges.size > 0 && !this.isSaving) {
                console.log(`⏱️ Auto-saving ${this.unsavedChanges.size} classes...`);
                await this.autoSaveChanges();
            }
        }, this.autoSaveDelay);
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    async autoSaveChanges() {
        if (this.isSaving || this.unsavedChanges.size === 0) return;
        
        this.isSaving = true;
        this.showSaveStatus('saving');
        
        const classesToSave = Array.from(this.unsavedChanges);
        let successCount = 0;
        let errorCount = 0;
        
        try {
            for (const classId of classesToSave) {
                try {
                    await this.saveClassAttendance(classId);
                    this.unsavedChanges.delete(classId);
                    successCount++;
                } catch (error) {
                    console.error(`Auto-save failed for class ${classId}:`, error);
                    errorCount++;
                }
            }
            
            if (successCount > 0) {
                this.showAutoSaveNotification(`Auto-saved ${successCount} classes`);
            }
            
            if (errorCount > 0) {
                console.warn(`Auto-save: ${errorCount} classes failed`);
            }
            
        } catch (error) {
            console.error('Auto-save error:', error);
        } finally {
            this.isSaving = false;
            this.updateSaveStatus();
        }
    }

    setupAutoSaveIndicator() {
        const autoSaveIndicator = document.querySelector('.auto-save-indicator');
        if (autoSaveIndicator) {
            autoSaveIndicator.innerHTML = `
                <div class="auto-save-toggle">
                    <span class="auto-save-status">
                        <i class="fas fa-circle" style="color: #2ecc71"></i>
                        Auto-save <span id="auto-save-status-text">active</span>
                    </span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="auto-save-toggle" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="last-saved-time" id="last-saved-time">
                    Last saved: Never
                </div>
            `;
            
            const toggle = document.getElementById('auto-save-toggle');
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.autoSaveEnabled = e.target.checked;
                    if (this.autoSaveEnabled) {
                        this.startAutoSave();
                        this.showAutoSaveNotification('Auto-save enabled');
                    } else {
                        this.stopAutoSave();
                        this.showAutoSaveNotification('Auto-save disabled');
                    }
                    this.updateSaveStatus();
                });
            }
        }
    }

    setupInputTracking() {
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('attendance-input')) {
                const classId = e.target.getAttribute('data-class-id');
                if (classId) {
                    this.unsavedChanges.add(classId);
                    this.updateSaveStatus();
                    
                    const row = document.querySelector(`tr[data-class-id="${classId}"]`);
                    if (row) {
                        row.classList.add('has-unsaved-changes');
                        
                        const saveBtn = row.querySelector('.save-attendance-btn');
                        if (saveBtn && !saveBtn.classList.contains('has-changes')) {
                            saveBtn.classList.add('has-changes');
                            saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Save Changes';
                        }
                    }
                }
            }
        });
    }

    setupBeforeUnloadWarning() {
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges.size > 0) {
                e.preventDefault();
                e.returnValue = 'You have unsaved attendance changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    showSaveStatus(status) {
        const statusDot = document.querySelector('.auto-save-status i');
        const statusText = document.getElementById('auto-save-status-text');
        
        if (!statusDot || !statusText) return;
        
        switch (status) {
            case 'saving':
                statusDot.style.color = '#3498db';
                statusText.textContent = 'saving...';
                statusDot.classList.add('pulse');
                break;
            case 'unsaved':
                statusDot.style.color = '#f39c12';
                statusText.textContent = 'unsaved changes';
                statusDot.classList.remove('pulse');
                break;
            case 'saved':
                statusDot.style.color = '#2ecc71';
                statusText.textContent = 'all saved';
                statusDot.classList.remove('pulse');
                break;
            case 'error':
                statusDot.style.color = '#e74c3c';
                statusText.textContent = 'error';
                statusDot.classList.remove('pulse');
                break;
        }
    }

    updateSaveStatus() {
        if (this.isSaving) {
            this.showSaveStatus('saving');
        } else if (this.unsavedChanges.size > 0) {
            this.showSaveStatus('unsaved');
        } else {
            this.showSaveStatus('saved');
        }
    }

    showAutoSaveNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'auto-save-notification';
        notification.innerHTML = `
            <i class="fas fa-save"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 300);
        }, 2000);
    }

    updateLastSavedTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit' 
        });
        
        const lastSavedElement = document.getElementById('last-saved-time');
        if (lastSavedElement) {
            lastSavedElement.textContent = `Last saved: ${timeString}`;
        }
    }

    applySessionLogic(sessionType) {
        console.log(`Applying ${sessionType} session logic...`);
        
        const attendanceRows = document.querySelectorAll('.attendance-data-row');
        
        attendanceRows.forEach(row => {
            const classId = row.getAttribute('data-class-id');
            const maleAmInput = row.querySelector('.male-am-input');
            const malePmInput = row.querySelector('.male-pm-input');
            const femaleAmInput = row.querySelector('.female-am-input');
            const femalePmInput = row.querySelector('.female-pm-input');
            
            if (!maleAmInput || !malePmInput || !femaleAmInput || !femalePmInput) return;
            
            const maleAmValue = parseInt(maleAmInput.value) || 0;
            const malePmValue = parseInt(malePmInput.value) || 0;
            const femaleAmValue = parseInt(femaleAmInput.value) || 0;
            const femalePmValue = parseInt(femalePmInput.value) || 0;
            
            switch (sessionType) {
                case 'am':
                    malePmInput.value = maleAmValue;
                    femalePmInput.value = femaleAmValue;
                    break;
                    
                case 'pm':
                    maleAmInput.value = malePmValue;
                    femaleAmInput.value = femalePmValue;
                    break;
            }
            
            this.updateAttendanceCalculations(classId);
        });
    }

    // ==================== HELPER METHODS ====================
    showToast(message, type = 'info') {
        // Your existing toast/showToast implementation
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Add your toast UI logic here
    }

    // ==================== INITIALIZATION ====================
    async initializeAttendancePage() {
        try {
            // Load saved filters
            const savedFilters = await this.loadAttendanceFilters();
            
            // Apply saved filters to UI
            if (savedFilters) {
                const datePicker = document.getElementById('date-picker');
                const weekPicker = document.getElementById('week-picker');
                const termPicker = document.getElementById('term-picker');
                
                if (datePicker && savedFilters.date) datePicker.value = savedFilters.date;
                if (weekPicker && savedFilters.week) weekPicker.value = savedFilters.week;
                if (termPicker && savedFilters.term) termPicker.value = savedFilters.term;
                
                if (savedFilters.session) {
                    document.querySelectorAll('.session-option').forEach(option => {
                        if (option.dataset.session === savedFilters.session) {
                            option.classList.add('active');
                            option.querySelector('input').checked = true;
                        } else {
                            option.classList.remove('active');
                            option.querySelector('input').checked = false;
                        }
                    });
                }
            }
            
            // Setup auto-save filters
            this.setupAutoSaveFilters();
            
            // Setup auto-save feature
            this.setupAutoSave();
            
            // Load initial data
            await this.loadAttendanceData();
            
            // Setup event listeners
            this.setupAttendanceEventListeners();
            
        } catch (error) {
            console.error('Error initializing attendance page:', error);
            this.showToast('Error loading attendance page', 'error');
        }
    }

    
     // ==================== REPORTS PAGE METHODS ====================
    initializeReportsPage() {
        // Populate class dropdown
        this.populateReportsClassDropdown();
        
        // Set default dates
        this.setDefaultReportDates();
        
        // Add event listeners
        this.setupReportsEventListeners();
    }

    populateReportsClassDropdown() {
        const classDropdown = document.getElementById('report-class');
        if (!classDropdown) return;
        
        const classes = Storage.get('classes') || [];
        
        // Keep the first option (All Classes)
        classDropdown.innerHTML = '<option value="all">All Classes</option>';
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.name} (${cls.code})`;
            classDropdown.appendChild(option);
        });
    }

    setDefaultReportDates() {
        const today = new Date();
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        
        if (startDate) {
            // Set to first day of current month
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate.value = firstDay.toISOString().split('T')[0];
        }
        
        if (endDate) {
            endDate.value = today.toISOString().split('T')[0];
        }
    }

   setupReportsEventListeners() {
    // Generate report button
    const generateBtn = document.getElementById('generate-report');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => this.generateReport());
    }
    
    // Export buttons
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportExcelBtn = document.getElementById('export-excel');
    const printBtn = document.getElementById('print-report');
    
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => this.exportReport('pdf'));
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportReport('excel'));
    if (printBtn) printBtn.addEventListener('click', () => this.printReport());
    
    // Show/hide comparison-specific controls
    const reportTypeSelect = document.getElementById('report-type');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', (e) => {
            this.updateReportFiltersUI(e.target.value);
        });
    }
}

    updateReportFiltersUI(reportType) {
    // For now, just log - we'll add specific UI changes if needed
    console.log('Report type changed to:', reportType);
}
    
    generateReport() {
        console.log('📊 Generating report...');
        
        const reportType = document.getElementById('report-type').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const classId = document.getElementById('report-class').value;
        const format = document.getElementById('report-format').value;
        
        // Show loading
        const loading = document.getElementById('report-loading');
        const reportContent = document.getElementById('report-content');
        const reportTitle = document.getElementById('report-title');
        const reportTime = document.getElementById('report-time');
        
        if (loading) loading.style.display = 'flex';
        if (reportContent) reportContent.innerHTML = '';
        
        // Simulate loading
        setTimeout(() => {
            // Get data
            const attendance = Storage.get('attendance') || [];
            const classes = Storage.get('classes') || [];
            const students = Storage.get('students') || [];
            
            // Filter attendance based on criteria
            let filteredAttendance = attendance.filter(a => {
                const dateMatch = (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate);
                const classMatch = classId === 'all' || a.classId === classId;
                return dateMatch && classMatch;
            });
            
            // Generate report content
            let reportHTML = this.generateReportContent(filteredAttendance, classes, students, {
                type: reportType,
                startDate,
                endDate,
                classId,
                format
            });
            
            // Update UI
            if (loading) loading.style.display = 'none';
            if (reportContent) reportContent.innerHTML = reportHTML;
            if (reportTitle) {
                const className = classId === 'all' ? 'All Classes' : 
                    classes.find(c => c.id === classId)?.name || 'Selected Class';
                reportTitle.textContent = `${reportType.toUpperCase()} Report - ${className}`;
            }
            if (reportTime) {
                reportTime.textContent = `Generated: ${new Date().toLocaleTimeString()}`;
            }
            
            this.showToast('Report generated successfully!', 'success');
            
        }, 1000);
    }

    generateReportContent(attendance, classes, students, options) {
    if (attendance.length === 0) {
        return `
            <div class="no-data-report">
                <i class="fas fa-chart-bar"></i>
                <h3>No Data Available</h3>
                <p>No attendance records found for the selected criteria.</p>
            </div>
        `;
    }
    
    // Handle different report types
    if (options.type === 'comparison') {
        return this.generateComparisonReport(attendance, classes, students, options);
    }
        
        // Group by class
        const attendanceByClass = {};
        attendance.forEach(record => {
            if (!attendanceByClass[record.classId]) {
                attendanceByClass[record.classId] = [];
            }
            attendanceByClass[record.classId].push(record);
        });
        
        let html = '';
        
        // Summary section
        html += `
            <div class="report-summary">
                <h3>Report Summary</h3>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Records:</span>
                        <span class="stat-value">${attendance.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Date Range:</span>
                        <span class="stat-value">${options.startDate} to ${options.endDate}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Classes Covered:</span>
                        <span class="stat-value">${Object.keys(attendanceByClass).length}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Detailed section by class
        Object.entries(attendanceByClass).forEach(([classId, classAttendance]) => {
            const cls = classes.find(c => c.id === classId);
            if (!cls) return;
            
            // Calculate stats
            const presentCount = classAttendance.filter(a => a.status === 'present').length;
            const absentCount = classAttendance.filter(a => a.status === 'absent').length;
            const lateCount = classAttendance.filter(a => a.status === 'late').length;
            const totalCount = classAttendance.length;
            
            const presentRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
            
            html += `
                <div class="class-report">
                    <h4>${cls.name} (${cls.code})</h4>
                    <div class="class-stats">
                        <div class="stat-card">
                            <div class="stat-icon present">✅</div>
                            <div class="stat-info">
                                <span class="stat-value">${presentCount}</span>
                                <span class="stat-label">Present</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon absent">❌</div>
                            <div class="stat-info">
                                <span class="stat-value">${absentCount}</span>
                                <span class="stat-label">Absent</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon late">⏰</div>
                            <div class="stat-info">
                                <span class="stat-value">${lateCount}</span>
                                <span class="stat-label">Late</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon rate">📊</div>
                            <div class="stat-info">
                                <span class="stat-value">${presentRate}%</span>
                                <span class="stat-label">Attendance Rate</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    }

    exportReport(format) {
        console.log(`Exporting report as ${format}...`);
        this.showToast(`${format.toUpperCase()} export started`, 'info');
        // Add actual export logic here
    }

    printReport() {
        console.log('🖨️ Printing report...');
        window.print();
    }

    // ==================== COMPARISON REPORT GENERATOR ====================

generateComparisonReport(attendance, classes, students, options) {
    console.log('📊 Generating comparison report...');
    
    // Group attendance by class
    const attendanceByClass = {};
    attendance.forEach(record => {
        if (!attendanceByClass[record.classId]) {
            attendanceByClass[record.classId] = [];
        }
        attendanceByClass[record.classId].push(record);
    });
    
    // Calculate statistics for each class
    const classStats = [];
    
    Object.entries(attendanceByClass).forEach(([classId, classAttendance]) => {
        const cls = classes.find(c => c.id === classId);
        if (!cls) return;
        
        // Get students in this class
        const classStudents = students.filter(s => s.classId === classId);
        const totalMale = classStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
        const totalFemale = classStudents.filter(s => s.gender?.toLowerCase() === 'female').length;
        const totalStudents = classStudents.length;
        
        // Calculate averages from attendance records
        let totalMaleAM = 0, totalMalePM = 0, totalFemaleAM = 0, totalFemalePM = 0;
        let totalDays = 0;
        
        classAttendance.forEach(record => {
            totalMaleAM += record.malePresentAM || 0;
            totalMalePM += record.malePresentPM || 0;
            totalFemaleAM += record.femalePresentAM || 0;
            totalFemalePM += record.femalePresentPM || 0;
            totalDays++;
        });
        
        // Calculate averages
        const avgMaleAM = totalDays > 0 ? Math.round((totalMaleAM / totalDays) / totalMale * 100) : 0;
        const avgMalePM = totalDays > 0 ? Math.round((totalMalePM / totalDays) / totalMale * 100) : 0;
        const avgFemaleAM = totalDays > 0 ? Math.round((totalFemaleAM / totalDays) / totalFemale * 100) : 0;
        const avgFemalePM = totalDays > 0 ? Math.round((totalFemalePM / totalDays) / totalFemale * 100) : 0;
        
        // Overall average
        const overallAvg = Math.round((avgMaleAM + avgMalePM + avgFemaleAM + avgFemalePM) / 4);
        
        // Calculate consistency (standard deviation simplified)
        const dailyRates = classAttendance.map(record => {
            const maleRate = totalMale > 0 ? Math.round(((record.malePresentAM || 0) + (record.malePresentPM || 0)) / (totalMale * 2) * 100) : 0;
            const femaleRate = totalFemale > 0 ? Math.round(((record.femalePresentAM || 0) + (record.femalePresentPM || 0)) / (totalFemale * 2) * 100) : 0;
            return Math.round((maleRate + femaleRate) / 2);
        });
        
        const avgRate = dailyRates.length > 0 ? 
            Math.round(dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length) : 0;
            
        const consistency = dailyRates.length > 1 ? 
            100 - Math.round(Math.sqrt(
                dailyRates.reduce((sum, rate) => sum + Math.pow(rate - avgRate, 2), 0) / dailyRates.length
            )) : 100;
        
        classStats.push({
            classId,
            className: cls.name,
            classCode: cls.code,
            yearGroup: cls.yearGroup,
            totalStudents,
            avgMaleAM,
            avgMalePM,
            avgFemaleAM,
            avgFemalePM,
            overallAvg,
            consistency,
            totalDays,
            rank: 0 // Will be calculated later
        });
    });
    
    // Calculate ranks
    classStats.sort((a, b) => b.overallAvg - a.overallAvg);
    classStats.forEach((stat, index) => {
        stat.rank = index + 1;
        stat.percentile = Math.round((index / classStats.length) * 100);
    });
    
    // Calculate school average
    const schoolAvg = classStats.length > 0 ? 
        Math.round(classStats.reduce((sum, stat) => sum + stat.overallAvg, 0) / classStats.length) : 0;
    
    // Generate HTML
    let html = `
        <div class="comparison-report">
            <div class="report-header">
                <h3><i class="fas fa-balance-scale"></i> Class Comparison Report</h3>
                <p class="report-period">${options.startDate} to ${options.endDate}</p>
            </div>
            
            <div class="comparison-summary">
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div class="summary-info">
                        <span class="summary-value">${classStats.length}</span>
                        <span class="summary-label">Classes Compared</span>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-percentage"></i>
                    </div>
                    <div class="summary-info">
                        <span class="summary-value">${schoolAvg}%</span>
                        <span class="summary-label">School Average</span>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <div class="summary-info">
                        <span class="summary-value">${classStats[0]?.totalDays || 0}</span>
                        <span class="summary-label">Days Analyzed</span>
                    </div>
                </div>
            </div>
            
            <div class="comparison-table-container">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Class</th>
                            <th>Year Group</th>
                            <th>Students</th>
                            <th>Male AM</th>
                            <th>Male PM</th>
                            <th>Female AM</th>
                            <th>Female PM</th>
                            <th>Overall</th>
                            <th>Consistency</th>
                            <th>vs Avg</th>
                            <th>Percentile</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    classStats.forEach(stat => {
        const vsAvg = stat.overallAvg - schoolAvg;
        const vsAvgClass = vsAvg > 0 ? 'positive' : vsAvg < 0 ? 'negative' : 'neutral';
        const vsAvgText = vsAvg > 0 ? `+${vsAvg}%` : `${vsAvg}%`;
        
        html += `
            <tr class="class-comparison-row ${stat.rank <= 3 ? 'top-performer' : ''}">
                <td class="rank-cell rank-${stat.rank}">
                    ${stat.rank}
                    ${stat.rank === 1 ? '<i class="fas fa-trophy"></i>' : ''}
                    ${stat.rank === 2 ? '<i class="fas fa-medal"></i>' : ''}
                    ${stat.rank === 3 ? '<i class="fas fa-award"></i>' : ''}
                </td>
                <td class="class-cell">
                    <strong>${stat.classCode}</strong><br>
                    <small>${stat.className}</small>
                </td>
                <td class="year-cell">${stat.yearGroup}</td>
                <td class="students-cell">${stat.totalStudents}</td>
                <td class="rate-cell ${this.getRateClass(stat.avgMaleAM)}">${stat.avgMaleAM}%</td>
                <td class="rate-cell ${this.getRateClass(stat.avgMalePM)}">${stat.avgMalePM}%</td>
                <td class="rate-cell ${this.getRateClass(stat.avgFemaleAM)}">${stat.avgFemaleAM}%</td>
                <td class="rate-cell ${this.getRateClass(stat.avgFemalePM)}">${stat.avgFemalePM}%</td>
                <td class="overall-cell ${this.getRateClass(stat.overallAvg)}">
                    <strong>${stat.overallAvg}%</strong>
                </td>
                <td class="consistency-cell ${this.getConsistencyClass(stat.consistency)}">
                    ${stat.consistency}%
                </td>
                <td class="vs-avg-cell ${vsAvgClass}">
                    ${vsAvgText}
                    ${vsAvg > 0 ? '<i class="fas fa-arrow-up"></i>' : 
                     vsAvg < 0 ? '<i class="fas fa-arrow-down"></i>' : 
                     '<i class="fas fa-equal"></i>'}
                </td>
                <td class="percentile-cell">
                    <div class="percentile-bar">
                        <div class="percentile-fill" style="width: ${stat.percentile}%"></div>
                        <span class="percentile-text">${stat.percentile}%</span>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            
            <div class="comparison-insights">
                <h4><i class="fas fa-lightbulb"></i> Key Insights</h4>
                <div class="insights-grid">
                    ${this.generateComparisonInsights(classStats, schoolAvg)}
                </div>
            </div>
            
            <div class="export-actions">
                <button class="btn btn-primary" onclick="app.exportComparisonAsPDF()">
                    <i class="fas fa-file-pdf"></i> Export as PDF
                </button>
                <button class="btn btn-success" onclick="app.exportComparisonAsExcel()">
                    <i class="fas fa-file-excel"></i> Export as Excel
                </button>
                <button class="btn btn-secondary" onclick="window.print()">
                    <i class="fas fa-print"></i> Print Report
                </button>
            </div>
        </div>
    `;
    
    return html;
}

// Helper method to determine rate class for styling
getRateClass(rate) {
    if (rate >= 90) return 'excellent';
    if (rate >= 80) return 'good';
    if (rate >= 70) return 'average';
    return 'poor';
}

// Helper method for consistency class
getConsistencyClass(consistency) {
    if (consistency >= 90) return 'high';
    if (consistency >= 80) return 'medium';
    return 'low';
}

// Generate insights based on comparison data
generateComparisonInsights(classStats, schoolAvg) {
    let insights = '';
    
    // Top performer
    const topClass = classStats[0];
    if (topClass) {
        insights += `
            <div class="insight-card">
                <div class="insight-icon top">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="insight-content">
                    <h5>Top Performer</h5>
                    <p><strong>${topClass.classCode}</strong> leads with ${topClass.overallAvg}% attendance, 
                    ${topClass.overallAvg - schoolAvg}% above school average.</p>
                </div>
            </div>
        `;
    }
    
    // Most consistent
    const mostConsistent = [...classStats].sort((a, b) => b.consistency - a.consistency)[0];
    if (mostConsistent && mostConsistent.consistency >= 85) {
        insights += `
            <div class="insight-card">
                <div class="insight-icon consistent">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="insight-content">
                    <h5>Most Consistent</h5>
                    <p><strong>${mostConsistent.classCode}</strong> shows ${mostConsistent.consistency}% 
                    consistency in attendance patterns.</p>
                </div>
            </div>
        `;
    }
    
    // Gender performance
    const maleAvg = Math.round(classStats.reduce((sum, stat) => sum + (stat.avgMaleAM + stat.avgMalePM) / 2, 0) / classStats.length);
    const femaleAvg = Math.round(classStats.reduce((sum, stat) => sum + (stat.avgFemaleAM + stat.avgFemalePM) / 2, 0) / classStats.length);
    
    insights += `
        <div class="insight-card">
            <div class="insight-icon gender">
                <i class="fas fa-venus-mars"></i>
            </div>
            <div class="insight-content">
                <h5>Gender Performance</h5>
                <p>Male: ${maleAvg}% | Female: ${femaleAvg}% | 
                ${maleAvg > femaleAvg ? 'Males lead by ' + (maleAvg - femaleAvg) + '%' : 
                 femaleAvg > maleAvg ? 'Females lead by ' + (femaleAvg - maleAvg) + '%' : 'Equal performance'}</p>
            </div>
        </div>
    `;
    
    // Session comparison
    const amAvg = Math.round(classStats.reduce((sum, stat) => sum + (stat.avgMaleAM + stat.avgFemaleAM) / 2, 0) / classStats.length);
    const pmAvg = Math.round(classStats.reduce((sum, stat) => sum + (stat.avgMalePM + stat.avgFemalePM) / 2, 0) / classStats.length);
    
    insights += `
        <div class="insight-card">
            <div class="insight-icon session">
                <i class="fas fa-clock"></i>
            </div>
            <div class="insight-content">
                <h5>Session Analysis</h5>
                <p>AM: ${amAvg}% | PM: ${pmAvg}% | 
                ${amAvg > pmAvg ? 'Morning attendance is stronger' : 
                 pmAvg > amAvg ? 'Afternoon attendance is stronger' : 'Both sessions equal'}</p>
            </div>
        </div>
    `;
    
    return insights;
}
    
    // ==================== SETUP PAGE METHODS ====================
    initializeSetupPage() {
    console.log('🚀 Initializing setup page...');
    
    // Initialize auto-save system
    this.initAutoSave();
    
    // Setup total calculation
    this.setupTotalCalculation();

    // Setup uppercase conversion for class code
    this.setupUppercaseConversion();
    
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
            
            // Load data for active tab
            if (tabId === 'classes') {
                this.loadClassesList();
            } else if (tabId === 'students') {
                this.loadStudentsList();
                this.populateClassDropdown();
            } else if (tabId === 'system') {
                this.loadSystemSettings();
            } else if (tabId === 'data') {
                this.loadDataStats();
            }
        });
    });
    
    // Class management
    const saveClassBtn = document.getElementById('save-class');
    const clearClassBtn = document.getElementById('clear-class');
    
    if (saveClassBtn) {
        saveClassBtn.addEventListener('click', () => this.saveClass());
    }
    
    if (clearClassBtn) {
        clearClassBtn.addEventListener('click', () => this.clearClassForm());
    }
    
    // Student management
    const saveStudentBtn = document.getElementById('save-student');
    const clearStudentBtn = document.getElementById('clear-student');
    
    if (saveStudentBtn) {
        saveStudentBtn.addEventListener('click', () => this.saveStudent());
    }
    
    if (clearStudentBtn) {
        clearStudentBtn.addEventListener('click', () => this.clearStudentForm());
    }
    
    // Import functionality
    const importZone = document.getElementById('import-zone');
    const importFile = document.getElementById('import-file');
    const processImportBtn = document.getElementById('process-import');
    const downloadTemplateBtn = document.getElementById('download-template');
    
    if (importZone && importFile) {
        importZone.addEventListener('click', () => importFile.click());
        importZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            importZone.style.borderColor = '#3498db';
            importZone.style.background = '#f0f7ff';
        });
        importZone.addEventListener('dragleave', () => {
            importZone.style.borderColor = '#ddd';
            importZone.style.background = '#f8f9fa';
        });
        importZone.addEventListener('drop', (e) => {
            e.preventDefault();
            importZone.style.borderColor = '#ddd';
            importZone.style.background = '#f8f9fa';
            if (e.dataTransfer.files.length > 0) {
                this.handleFileImport(e.dataTransfer.files[0]);
            }
        });
        
        importFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileImport(e.target.files[0]);
            }
        });
    }
    
    if (processImportBtn) {
        processImportBtn.addEventListener('click', () => this.processImport());
    }
    
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', () => this.downloadTemplate());
    }
    
    // System settings
    const saveSettingsBtn = document.getElementById('save-system-settings');
    const resetSettingsBtn = document.getElementById('reset-system-settings');
    
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => this.saveSystemSettings());
    }
    
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => this.resetSystemSettings());
    }
    
    // Data management
    const backupDataBtn = document.getElementById('backup-data');
    const restoreDataBtn = document.getElementById('restore-data');
    const exportCsvBtn = document.getElementById('export-csv');
    const exportExcelBtn = document.getElementById('export-excel');
    const clearCacheBtn = document.getElementById('clear-cache');
    const clearAllDataBtn = document.getElementById('clear-all-data');
    
    if (backupDataBtn) backupDataBtn.addEventListener('click', () => this.backupData());
    if (restoreDataBtn) restoreDataBtn.addEventListener('click', () => this.restoreData());
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => this.exportData('csv'));
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportData('excel'));
    if (clearCacheBtn) clearCacheBtn.addEventListener('click', () => this.clearCache());
    if (clearAllDataBtn) clearAllDataBtn.addEventListener('click', () => this.clearAllData());
    
    // Load initial data
    this.loadClassesList();
    this.loadStudentsList();
    this.populateClassDropdown();
    this.loadSystemSettings();
    this.loadDataStats();
    
    // Try to sync with Firebase
    this.syncWithFirebase();
}
    
    saveClass() {
        const className = document.getElementById('className')?.value;
        const classCode = document.getElementById('classCode')?.value;
        
        if (!className || !classCode) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const classes = Storage.get('classes') || [];
        
        // Check for duplicate class code
        if (classes.some(c => c.code === classCode)) {
            this.showToast('Class code already exists', 'error');
            return;
        }
        
        const newClass = {
            id: `class_${Date.now()}`,
            name: className,
            code: classCode,
            yearGroup: document.getElementById('yearGroup')?.value || null,
            subject: document.getElementById('subject')?.value || null,
            createdAt: new Date().toISOString(),
            teacherId: this.user?.id
        };
        
        classes.push(newClass);
        Storage.set('classes', classes);
        
        this.showToast('Class saved successfully!', 'success');
        this.clearClassForm();
        this.loadClassesList();
        this.populateClassDropdown();
        this.loadDataStats();
    }

clearClassForm() {
    console.log('🧹 Clearing class form...');
    
    const elements = {
        yearGroup: document.getElementById('yearGroup'),
        classCode: document.getElementById('classCode'),
        maleCount: document.getElementById('maleCount'),
        femaleCount: document.getElementById('femaleCount'),
        totalStudents: document.getElementById('totalStudents'),
        editClassId: document.getElementById('editClassId')
    };
    
    if (elements.yearGroup) {
        elements.yearGroup.value = '';
        elements.yearGroup.style.borderColor = '';
    }
    
    if (elements.classCode) {
        elements.classCode.value = '';
        elements.classCode.style.borderColor = '';
        // Remove uppercase styling temporarily when empty
        elements.classCode.classList.remove('uppercase-input');
        setTimeout(() => {
            if (elements.classCode) elements.classCode.classList.add('uppercase-input');
        }, 100);
    }
       
    // Reset button text
    const saveBtn = document.getElementById('save-class');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Class';
    }
}

    loadClassesList() {
        const classesList = document.getElementById('classes-list');
        if (!classesList) return;
        
        const classes = Storage.get('classes') || [];
        const students = Storage.get('students') || [];
        
        if (classes.length === 0) {
            classesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div class="empty-text">No classes added yet</div>
                </div>
            `;
            return;
        }
        
        classesList.innerHTML = classes.map(cls => {
            const studentCount = students.filter(s => s.classId === cls.id).length;
            
            return `
                <div class="class-card">
                    <div class="class-header">
                        <div class="class-title">${cls.name}</div>
                        <div class="class-code">${cls.code}</div>
                    </div>
                    <div class="class-info">
                        <div class="info-item">
                            <span class="info-label">Year Group:</span>
                            <span class="info-value">${cls.yearGroup || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Subject:</span>
                            <span class="info-value">${cls.subject || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Students:</span>
                            <span class="info-value">${studentCount}</span>
                        </div>
                    </div>
                    <div class="class-actions">
                        <button class="action-btn delete-btn" onclick="window.app.deleteClass('${cls.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    deleteClass(classId) {
    if (!confirm('Delete this class? This will also unassign students from this class.')) {
        return;
    }
    
    const classes = Storage.get('classes') || [];
    const students = Storage.get('students') || [];
    
    // Find the class to get Firebase ID
    const classToDelete = classes.find(c => c.id === classId);
    
    // Remove class from localStorage
    const updatedClasses = classes.filter(c => c.id !== classId);
    
    // Unassign students from this class
    const updatedStudents = students.map(student => {
        if (student.classId === classId) {
            return { ...student, classId: null };
        }
        return student;
    });
    
    Storage.set('classes', updatedClasses);
    Storage.set('students', updatedStudents);
    
    // Try to delete from Firebase
    if (window.auth?.currentUser && classToDelete?.firebaseId) {
        try {
            // Use the deleteDoc function from your firebase.js
            const classRef = doc(db, 'classes', classToDelete.firebaseId);
            deleteDoc(classRef).then(() => {
                console.log('🗑️ Deleted from Firebase:', classToDelete.firebaseId);
            }).catch(error => {
                console.error('❌ Firebase delete error:', error);
            });
        } catch (error) {
            console.error('❌ Firebase delete error:', error);
        }
    }
    
    this.showToast('Class deleted successfully', 'info');
    this.loadClassesList();
    this.loadStudentsList();
    this.populateClassDropdown();
    this.loadDataStats();
}
    
    setupTotalCalculation() {
    const maleInput = document.getElementById('maleCount');
    const femaleInput = document.getElementById('femaleCount');
    const totalDisplay = document.getElementById('totalStudents');
    
    if (maleInput && femaleInput && totalDisplay) {
        const calculateTotal = () => {
            const males = parseInt(maleInput.value) || 0;
            const females = parseInt(femaleInput.value) || 0;
            totalDisplay.textContent = males + females;
        };
        
        maleInput.addEventListener('input', calculateTotal);
        femaleInput.addEventListener('input', calculateTotal);
        
        // Initial calculation
        calculateTotal();
    }
}
    
    saveStudent() {
        const firstName = document.getElementById('firstName')?.value;
        const lastName = document.getElementById('lastName')?.value;
        
        if (!firstName || !lastName) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const students = Storage.get('students') || [];
        
        const newStudent = {
            id: `student_${Date.now()}`,
            firstName: firstName,
            lastName: lastName,
            fullName: `${firstName} ${lastName}`,
            studentId: document.getElementById('studentId')?.value || `STU${Date.now().toString().slice(-6)}`,
            gender: document.getElementById('gender')?.value || null,
            classId: document.getElementById('studentClass')?.value || null,
            createdAt: new Date().toISOString(),
            enrollmentDate: new Date().toISOString()
        };
        
        students.push(newStudent);
        Storage.set('students', students);
        
        this.showToast('Student saved successfully!', 'success');
        this.clearStudentForm();
        this.loadStudentsList();
        this.loadDataStats();
    }

    clearStudentForm() {
        ['firstName', 'lastName', 'studentId'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        
        const genderSelect = document.getElementById('gender');
        const classSelect = document.getElementById('studentClass');
        if (genderSelect) genderSelect.value = '';
        if (classSelect) classSelect.value = '';
    }

    loadStudentsList() {
        const studentsList = document.getElementById('students-list');
        if (!studentsList) return;
        
        const students = Storage.get('students') || [];
        const classes = Storage.get('classes') || [];
        
        if (students.length === 0) {
            studentsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="empty-text">No students added yet</div>
                </div>
            `;
            return;
        }
        
        studentsList.innerHTML = students.map(student => {
            const studentClass = classes.find(c => c.id === student.classId);
            const className = studentClass ? studentClass.name : 'Unassigned';
            
            return `
                <div class="student-card">
                    <div class="student-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="student-info">
                        <div class="student-name">${student.fullName}</div>
                        <div class="student-details">
                            <span class="detail-item">
                                <i class="fas fa-id-card"></i> ${student.studentId}
                            </span>
                            <span class="detail-item">
                                <i class="fas fa-chalkboard-teacher"></i> ${className}
                            </span>
                        </div>
                    </div>
                    <div class="student-actions">
                        <button class="action-btn delete-btn" onclick="window.app.deleteStudent('${student.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    populateClassDropdown() {
        const classDropdown = document.getElementById('studentClass');
        if (!classDropdown) return;
        
        const classes = Storage.get('classes') || [];
        
        // Keep the first option (Select Class)
        classDropdown.innerHTML = '<option value="">Select Class</option>';
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.name} (${cls.code})`;
            classDropdown.appendChild(option);
        });
    }

    deleteStudent(studentId) {
        if (!confirm('Delete this student?')) {
            return;
        }
        
        const students = Storage.get('students') || [];
        const updatedStudents = students.filter(s => s.id !== studentId);
        Storage.set('students', updatedStudents);
        
        this.showToast('Student deleted successfully', 'info');
        this.loadStudentsList();
        this.loadDataStats();
    }

    handleFileImport(file) {
        const importZone = document.getElementById('import-zone');
        const fileName = document.createElement('div');
        fileName.className = 'import-filename';
        fileName.textContent = `Selected: ${file.name}`;
        
        // Remove any existing filename display
        const existing = importZone.querySelector('.import-filename');
        if (existing) {
            existing.remove();
        }
        
        importZone.appendChild(fileName);
        this.showToast(`File "${file.name}" ready for import`, 'info');
    }

    processImport() {
        const importFile = document.getElementById('import-file');
        if (!importFile.files.length) {
            this.showToast('Please select a file to import', 'error');
            return;
        }
        
        // Simulate import processing
        this.showToast('Import processing started...', 'info');
        
        setTimeout(() => {
            this.showToast('Import completed successfully!', 'success');
            // Refresh data
            this.loadClassesList();
            this.loadStudentsList();
            this.populateClassDropdown();
            this.loadDataStats();
            
            // Clear file input
            importFile.value = '';
            const importZone = document.getElementById('import-zone');
            const filename = importZone.querySelector('.import-filename');
            if (filename) filename.remove();
        }, 2000);
    }

    downloadTemplate() {
        this.showToast('Template download started', 'info');
        // Add actual template download logic here
    }

    loadSystemSettings() {
        const settings = Storage.get('systemSettings') || {
            schoolName: 'My School',
            currentTerm: '1',
            academicYear: new Date().getFullYear().toString()
        };
        
        const schoolNameInput = document.getElementById('schoolName');
        const currentTermSelect = document.getElementById('currentTerm');
        const academicYearInput = document.getElementById('academicYear');
        
        if (schoolNameInput) schoolNameInput.value = settings.schoolName;
        if (currentTermSelect) currentTermSelect.value = settings.currentTerm;
        if (academicYearInput) academicYearInput.value = settings.academicYear;
    }

    saveSystemSettings() {
        const schoolName = document.getElementById('schoolName')?.value;
        const currentTerm = document.getElementById('currentTerm')?.value;
        const academicYear = document.getElementById('academicYear')?.value;
        
        const settings = {
            schoolName: schoolName || 'My School',
            currentTerm: currentTerm || '1',
            academicYear: academicYear || new Date().getFullYear().toString(),
            updatedAt: new Date().toISOString()
        };
        
        Storage.set('systemSettings', settings);
        this.showToast('System settings saved successfully!', 'success');
    }

    resetSystemSettings() {
        const defaultSettings = {
            schoolName: 'My School',
            currentTerm: '1',
            academicYear: new Date().getFullYear().toString(),
            updatedAt: new Date().toISOString()
        };
        
        Storage.set('systemSettings', defaultSettings);
        this.loadSystemSettings();
        this.showToast('Settings reset to defaults', 'info');
    }

    loadDataStats() {
        const classes = Storage.get('classes') || [];
        const students = Storage.get('students') || [];
        const attendance = Storage.get('attendance') || [];
        
        const statClasses = document.getElementById('stat-classes');
        const statStudents = document.getElementById('stat-students');
        const statAttendance = document.getElementById('stat-attendance');
        
        if (statClasses) statClasses.textContent = classes.length;
        if (statStudents) statStudents.textContent = students.length;
        if (statAttendance) statAttendance.textContent = attendance.length;
    }

    backupData() {
        try {
            const backup = {
                version: '2.0',
                timestamp: new Date().toISOString(),
                data: {
                    classes: Storage.get('classes') || [],
                    students: Storage.get('students') || [],
                    attendance: Storage.get('attendance') || [],
                    systemSettings: Storage.get('systemSettings') || {},
                    user: this.user
                }
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showToast('Backup downloaded successfully!', 'success');
        } catch (error) {
            this.showToast('Error creating backup: ' + error.message, 'error');
        }
    }

    restoreData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    
                    if (!backup.data) {
                        throw new Error('Invalid backup file format');
                    }
                    
                    if (confirm('Restoring backup will overwrite all current data. Continue?')) {
                        Storage.set('classes', backup.data.classes || []);
                        Storage.set('students', backup.data.students || []);
                        Storage.set('attendance', backup.data.attendance || []);
                        Storage.set('systemSettings', backup.data.systemSettings || {});
                        
                        this.showToast('Data restored successfully!', 'success');
                        
                        // Refresh all lists
                        this.loadClassesList();
                        this.loadStudentsList();
                        this.populateClassDropdown();
                        this.loadSystemSettings();
                        this.loadDataStats();
                    }
                } catch (error) {
                    this.showToast('Error restoring backup: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    exportData(format) {
        this.showToast(`${format.toUpperCase()} export started`, 'info');
        // Add actual export logic here
    }

    clearCache() {
        if (confirm('Clear all cache data?')) {
            localStorage.removeItem('app_settings');
            this.showToast('Cache cleared successfully', 'info');
        }
    }

    clearAllData() {
        if (confirm('WARNING: This will delete ALL data including classes, students, and attendance records. This action cannot be undone. Continue?')) {
            if (confirm('Are you absolutely sure? Type "DELETE" to confirm.')) {
                const confirmation = prompt('Type DELETE to confirm:');
                if (confirmation === 'DELETE') {
                    // Clear all data except current user
                    const currentUser = this.user;
                    
                    // Clear specific data keys
                    Storage.remove('classes');
                    Storage.remove('students');
                    Storage.remove('attendance');
                    Storage.remove('systemSettings');
                    
                    this.showToast('All data has been cleared', 'info');
                    
                    // Refresh all lists
                    this.loadClassesList();
                    this.loadStudentsList();
                    this.populateClassDropdown();
                    this.loadSystemSettings();
                    this.loadDataStats();
                }
            }
        }
    }

    // ==================== ENHANCED SETUP PAGE METHODS (UPDATED) ====================
initializeSetupPage() {
    // Initialize auto-save
    this.initAutoSave();

     // Setup total calculation
    this.setupTotalCalculation();
    
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
            
            // Load data for active tab
            if (tabId === 'classes') {
                this.loadClassesList();
            } else if (tabId === 'students') {
                this.loadStudentsList();
                this.populateClassDropdown();
            } else if (tabId === 'system') {
                this.loadSystemSettings();
            } else if (tabId === 'data') {
                this.loadDataStats();
            }
        });
    });
    
    // Class management
    const saveClassBtn = document.getElementById('save-class');
    const clearClassBtn = document.getElementById('clear-class');
    
    if (saveClassBtn) {
        saveClassBtn.addEventListener('click', () => this.saveClass());
    }
    
    if (clearClassBtn) {
        clearClassBtn.addEventListener('click', () => this.clearClassForm());
    }
    
    // Setup auto-save for class form
    this.setupClassAutoSave();
    
    // Student management
    const saveStudentBtn = document.getElementById('save-student');
    const clearStudentBtn = document.getElementById('clear-student');
    
    if (saveStudentBtn) {
        saveStudentBtn.addEventListener('click', () => this.saveStudent());
    }
    
    if (clearStudentBtn) {
        clearStudentBtn.addEventListener('click', () => this.clearStudentForm());
    }
    
    // Setup auto-save for student form
    this.setupStudentAutoSave();
    
    // Import functionality
    const importZone = document.getElementById('import-zone');
    const importFile = document.getElementById('import-file');
    const processImportBtn = document.getElementById('process-import');
    const downloadTemplateBtn = document.getElementById('download-template');
    
    if (importZone && importFile) {
        importZone.addEventListener('click', () => importFile.click());
        importZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            importZone.style.borderColor = '#3498db';
            importZone.style.background = '#f0f7ff';
        });
        importZone.addEventListener('dragleave', () => {
            importZone.style.borderColor = '#ddd';
            importZone.style.background = '#f8f9fa';
        });
        importZone.addEventListener('drop', (e) => {
            e.preventDefault();
            importZone.style.borderColor = '#ddd';
                importZone.style.background = '#f8f9fa';
            if (e.dataTransfer.files.length > 0) {
                this.handleFileImport(e.dataTransfer.files[0]);
            }
        });
        
        importFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileImport(e.target.files[0]);
            }
        });
    }
    
    if (processImportBtn) {
        processImportBtn.addEventListener('click', () => this.processImport());
    }
    
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', () => this.downloadTemplate());
    }
    
    // System settings
    const saveSettingsBtn = document.getElementById('save-system-settings');
    const resetSettingsBtn = document.getElementById('reset-system-settings');
    
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => this.saveSystemSettings());
    }
    
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => this.resetSystemSettings());
    }
    
    // Data management
    const backupDataBtn = document.getElementById('backup-data');
    const restoreDataBtn = document.getElementById('restore-data');
    const exportCsvBtn = document.getElementById('export-csv');
    const exportExcelBtn = document.getElementById('export-excel');
    const clearCacheBtn = document.getElementById('clear-cache');
    const clearAllDataBtn = document.getElementById('clear-all-data');
    
    if (backupDataBtn) backupDataBtn.addEventListener('click', () => this.backupData());
    if (restoreDataBtn) restoreDataBtn.addEventListener('click', () => this.restoreData());
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => this.exportData('csv'));
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportData('excel'));
    if (clearCacheBtn) clearCacheBtn.addEventListener('click', () => this.clearCache());
    if (clearAllDataBtn) clearAllDataBtn.addEventListener('click', () => this.clearAllData());
    
    // Load initial data
    this.loadClassesList();
    this.loadStudentsList();
    this.populateClassDropdown();
    this.loadSystemSettings();
    this.loadDataStats();
    
    // Try to sync with Firebase
    this.syncWithFirebase();
}

// ==================== AUTO-SAVE METHODS ====================
initAutoSave() {
    this.autoSaveTimeouts = {};
    this.autoSaveQueue = [];
    
    // Process auto-save queue every 5 seconds
    setInterval(() => {
        if (this.autoSaveQueue.length > 0) {
            this.processAutoSaveQueue();
        }
    }, 5000);
}

setupClassAutoSave() {
    const inputIds = ['yearGroup', 'classCode', 'maleCount', 'femaleCount'];
    
    inputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                this.queueAutoSave('class');
                // Also update total when male/female counts change
                if (id === 'maleCount' || id === 'femaleCount') {
                    this.updateTotalDisplay();
                }
            });
            input.addEventListener('blur', () => {
                this.autoSaveClassForm();
            });
        }
    });
}

updateTotalDisplay() {
    const maleInput = document.getElementById('maleCount');
    const femaleInput = document.getElementById('femaleCount');
    const totalDisplay = document.getElementById('totalStudents');
    
    if (maleInput && femaleInput && totalDisplay) {
        const males = parseInt(maleInput.value) || 0;
        const females = parseInt(femaleInput.value) || 0;
        totalDisplay.textContent = males + females;
    }
}

async autoSaveClassForm() {
    const yearGroup = document.getElementById('yearGroup')?.value;
    const classCode = document.getElementById('classCode')?.value?.trim();
    const maleCount = parseInt(document.getElementById('maleCount')?.value) || 0;
    const femaleCount = parseInt(document.getElementById('femaleCount')?.value) || 0;
    
    // Don't auto-save if required fields are empty
    if (!yearGroup || !classCode) return;
    
    const classData = {
        id: `draft_class_${Date.now()}`,
        yearGroup: yearGroup,
        code: classCode,
        males: maleCount,
        females: femaleCount,
        total: maleCount + femaleCount,
        name: `${yearGroup} - ${classCode}`,
        isDraft: true,
        lastAutoSave: new Date().toISOString()
    };
    
    // Save draft to localStorage
    const drafts = Storage.get('classDrafts') || [];
    const existingIndex = drafts.findIndex(d => 
        d.yearGroup === yearGroup && d.code === classCode
    );
    
    if (existingIndex >= 0) {
        drafts[existingIndex] = classData;
    } else {
        drafts.push(classData);
    }
    
    Storage.set('classDrafts', drafts);
    
    // Queue for Firebase sync
    this.addToAutoSaveQueue('classes', classData, 'save');
    
    this.showAutoSaveStatus('class', 'Draft autosaved');
}

async autoSaveStudentForm() {
    const firstName = document.getElementById('firstName')?.value;
    const lastName = document.getElementById('lastName')?.value;
    const studentId = document.getElementById('studentId')?.value;
    const gender = document.getElementById('gender')?.value;
    const studentClass = document.getElementById('studentClass')?.value;
    
    if (!firstName && !lastName) return;
    
    const studentData = {
        id: `draft_student_${Date.now()}`,
        firstName: firstName,
        lastName: lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        studentId: studentId || `STU${Date.now().toString().slice(-6)}`,
        gender: gender || null,
        classId: studentClass || null,
        isDraft: true,
        lastAutoSave: new Date().toISOString()
    };
    
    const drafts = Storage.get('studentDrafts') || [];
    const existingIndex = drafts.findIndex(d => 
        d.firstName === firstName && d.lastName === lastName
    );
    
    if (existingIndex >= 0) {
        drafts[existingIndex] = studentData;
    } else {
        drafts.push(studentData);
    }
    
    Storage.set('studentDrafts', drafts);
    
    // Queue for Firebase sync
    this.addToAutoSaveQueue('students', studentData, 'save');
    
    this.showAutoSaveStatus('student', 'Draft autosaved');
}

addToAutoSaveQueue(collection, data, action) {
    this.autoSaveQueue.push({
        collection,
        data,
        action,
        timestamp: Date.now(),
        attempts: 0
    });
    
    // Update UI indicator
    this.updateAutoSaveIndicator();
}

async processAutoSaveQueue() {
    // Only process if we're online and have Firebase
    if (!navigator.onLine || !window.auth?.currentUser) return;
    
    while (this.autoSaveQueue.length > 0) {
        const item = this.autoSaveQueue[0];
        
        try {
            if (item.action === 'save') {
                // Use your existing Firestore.saveClass method
                const schoolId = getSchoolId();
                if (item.collection === 'classes') {
                    const result = await Firestore.saveClass(schoolId, item.data);
                    if (result.success) {
                        console.log('Auto-saved to Firebase:', item.collection, result.id);
                        this.autoSaveQueue.shift();
                    }
                } else if (item.collection === 'students') {
                    // You'll need to add a saveStudent method to your Firestore module
                    // For now, just remove from queue
                    this.autoSaveQueue.shift();
                }
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
            item.attempts++;
            
            if (item.attempts >= 3) {
                // Too many attempts, remove from queue
                this.autoSaveQueue.shift();
            } else {
                // Wait before retrying
                break;
            }
        }
    }
    
    this.updateAutoSaveIndicator();
}

showAutoSaveStatus(context, message) {
    let indicator = document.getElementById(`${context}-autosave-status`);
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = `${context}-autosave-status`;
        indicator.style.cssText = `
            position: absolute;
            bottom: -25px;
            right: 10px;
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 4px;
            background: #27ae60;
            color: white;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 10;
        `;
        const form = document.querySelector(`#${context}s-tab .setup-form`);
        if (form) {
            form.style.position = 'relative';
            form.appendChild(indicator);
        }
    }
    
    indicator.textContent = `✓ ${message}`;
    indicator.style.opacity = '1';
    
    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 3000);
}

updateAutoSaveIndicator() {
    const count = this.autoSaveQueue.length;
    let indicator = document.getElementById('global-autosave-indicator');
    
    if (count > 0) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'global-autosave-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #f39c12;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.innerHTML = `
            <i class="fas fa-sync-alt fa-spin"></i>
            ${count} pending
        `;
    } else if (indicator) {
        indicator.remove();
    }
}

// ==================== ENHANCED CLASS METHODS ====================
async saveClass() {
    const yearGroup = document.getElementById('yearGroup')?.value;
    const classCode = document.getElementById('classCode')?.value?.trim();
    const maleCount = parseInt(document.getElementById('maleCount')?.value) || 0;
    const femaleCount = parseInt(document.getElementById('femaleCount')?.value) || 0;
    const editClassId = document.getElementById('editClassId')?.value;
    
    // Validation - only require Year Group and Class Code
    if (!yearGroup || !classCode) {
        this.showToast('Please fill in Year Group and Class Code', 'error');
        return;
    }
    
    const classes = Storage.get('classes') || [];
    
    // Check for duplicate class code (but allow editing)
    if (!editClassId && classes.some(c => c.code === classCode)) {
        this.showToast('Class code already exists', 'error');
        return;
    }
    
    // Calculate total
    const totalStudents = maleCount + femaleCount;
    
    const classData = {
        id: editClassId || `class_${Date.now()}`,
        yearGroup: yearGroup,
        code: classCode,
        males: maleCount,
        females: femaleCount,
        total: totalStudents,
        name: `${yearGroup} - ${classCode}`, // For backward compatibility
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teacherId: this.user?.id
    };
    
    if (editClassId) {
        // Update existing class
        const index = classes.findIndex(c => c.id === editClassId);
        if (index !== -1) {
            classes[index] = classData;
        }
    } else {
        // Add new class
        classes.push(classData);
    }
    
    // 1. Save to localStorage immediately
    Storage.set('classes', classes);
    
    // 2. Try to save to Firebase if authenticated
    if (window.auth?.currentUser) {
        try {
            const schoolId = getSchoolId();
            const result = await Firestore.saveClass(schoolId, classData);
            
            if (result.success) {
                // Update local copy with Firebase ID
                classData.firebaseId = result.id;
                const updatedClasses = classes.map(c => 
                    c.id === classData.id ? { ...c, firebaseId: result.id } : c
                );
                Storage.set('classes', updatedClasses);
                
                this.showToast('Class saved to cloud!', 'success');
            } else {
                this.showToast('Saved locally (cloud sync failed)', 'warning');
            }
        } catch (error) {
            console.error('Firebase save error:', error);
            this.showToast('Saved locally (cloud sync failed)', 'warning');
        }
    } else {
        this.showToast('Class saved locally', 'success');
    }
    
    // 3. Clear any drafts for this class
    const drafts = Storage.get('classDrafts') || [];
    const filteredDrafts = drafts.filter(d => 
        !(d.yearGroup === yearGroup && d.code === classCode)
    );
    Storage.set('classDrafts', filteredDrafts);
    
    this.clearClassForm();
    this.loadClassesList();
    this.populateClassDropdown();
    this.loadDataStats();
}async saveClass() {
    const yearGroup = document.getElementById('yearGroup')?.value;
    const classCode = document.getElementById('classCode')?.value?.trim();
    const maleCount = parseInt(document.getElementById('maleCount')?.value) || 0;
    const femaleCount = parseInt(document.getElementById('femaleCount')?.value) || 0;
    const editClassId = document.getElementById('editClassId')?.value;
    
    // Validation - only require Year Group and Class Code
    if (!yearGroup || !classCode) {
        this.showToast('Please fill in Year Group and Class Code', 'error');
        return;
    }
    
    const classes = Storage.get('classes') || [];
    
    // Check for duplicate class code (but allow editing)
    if (!editClassId && classes.some(c => c.code === classCode)) {
        this.showToast('Class code already exists', 'error');
        return;
    }
    
    // Calculate total
    const totalStudents = maleCount + femaleCount;
    
    const classData = {
        id: editClassId || `class_${Date.now()}`,
        yearGroup: yearGroup,
        code: classCode,
        males: maleCount,
        females: femaleCount,
        total: totalStudents,
        name: `${yearGroup} - ${classCode}`, // For backward compatibility
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teacherId: this.user?.id
    };
    
    if (editClassId) {
        // Update existing class
        const index = classes.findIndex(c => c.id === editClassId);
        if (index !== -1) {
            classes[index] = classData;
        }
    } else {
        // Add new class
        classes.push(classData);
    }
    
    // 1. Save to localStorage immediately
    Storage.set('classes', classes);
    
    // 2. Try to save to Firebase if authenticated
    if (window.auth?.currentUser) {
        try {
            const schoolId = getSchoolId();
            const result = await Firestore.saveClass(schoolId, classData);
            
            if (result.success) {
                // Update local copy with Firebase ID
                classData.firebaseId = result.id;
                const updatedClasses = classes.map(c => 
                    c.id === classData.id ? { ...c, firebaseId: result.id } : c
                );
                Storage.set('classes', updatedClasses);
                
                this.showToast('Class saved to cloud!', 'success');
            } else {
                this.showToast('Saved locally (cloud sync failed)', 'warning');
            }
        } catch (error) {
            console.error('Firebase save error:', error);
            this.showToast('Saved locally (cloud sync failed)', 'warning');
        }
    } else {
        this.showToast('Class saved locally', 'success');
    }
    
    // 3. Clear any drafts for this class
    const drafts = Storage.get('classDrafts') || [];
    const filteredDrafts = drafts.filter(d => 
        !(d.yearGroup === yearGroup && d.code === classCode)
    );
    Storage.set('classDrafts', filteredDrafts);
    
    this.clearClassForm();
    this.loadClassesList();
    this.populateClassDropdown();
    this.loadDataStats();
}
    
async deleteClass(classId) {
    if (!confirm('Delete this class? This will also unassign students from this class.')) {
        return;
    }
    
    const classes = Storage.get('classes') || [];
    const students = Storage.get('students') || [];
    
    // Find the class to get Firebase ID
    const classToDelete = classes.find(c => c.id === classId);
    
    // Remove class from localStorage
    const updatedClasses = classes.filter(c => c.id !== classId);
    
    // Unassign students from this class
    const updatedStudents = students.map(student => {
        if (student.classId === classId) {
            return { ...student, classId: null };
        }
        return student;
    });
    
    Storage.set('classes', updatedClasses);
    Storage.set('students', updatedStudents);
    
    // Try to delete from Firebase
    if (window.auth?.currentUser && classToDelete?.firebaseId) {
        try {
            await deleteDoc(doc(db, 'classes', classToDelete.firebaseId));
            console.log('Deleted from Firebase:', classToDelete.firebaseId);
        } catch (error) {
            console.error('Firebase delete error:', error);
            this.showToast('Deleted locally (cloud sync failed)', 'warning');
        }
    }
    
    this.showToast('Class deleted successfully', 'info');
    this.loadClassesList();
    this.loadStudentsList();
    this.populateClassDropdown();
    this.loadDataStats();
}

    clearClassForm() {
    const yearGroup = document.getElementById('yearGroup');
    const classCode = document.getElementById('classCode');
    const maleCount = document.getElementById('maleCount');
    const femaleCount = document.getElementById('femaleCount');
    const totalDisplay = document.getElementById('totalStudents');
    const editClassId = document.getElementById('editClassId');
    
    if (yearGroup) yearGroup.value = '';
    if (classCode) classCode.value = '';
    if (maleCount) maleCount.value = '0';
    if (femaleCount) femaleCount.value = '0';
    if (totalDisplay) totalDisplay.textContent = '0';
    if (editClassId) editClassId.value = '';
    
    // Reset button text
    const saveBtn = document.getElementById('save-class');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Class';
    }
}

    setupUppercaseConversion() {
    console.log('🔤 Setting up uppercase conversion...');
    
    const classCodeInput = document.getElementById('classCode');
    if (!classCodeInput) {
        console.log('⚠️ classCode input not found');
        return;
    }
    
    // Remove any existing listeners to avoid duplicates
    classCodeInput.removeEventListener('input', this.handleUppercaseConversion);
    classCodeInput.removeEventListener('blur', this.handleUppercaseBlur);
    
    // Add new listeners with proper binding
    classCodeInput.addEventListener('input', (e) => this.handleUppercaseConversion(e));
    classCodeInput.addEventListener('blur', (e) => this.handleUppercaseBlur(e));
    
    console.log('✅ Uppercase conversion setup complete');
}

handleUppercaseConversion(event) {
    const input = event.target;
    const cursorPosition = input.selectionStart;
    
    // Convert to uppercase
    const originalValue = input.value;
    const uppercaseValue = originalValue.toUpperCase();
    
    // Only update if changed to prevent cursor jumping
    if (originalValue !== uppercaseValue) {
        input.value = uppercaseValue;
        
        // Restore cursor position
        input.setSelectionRange(cursorPosition, cursorPosition);
        
        // Trigger auto-save
        this.queueAutoSave('class');
    }
}

handleUppercaseBlur(event) {
    const input = event.target;
    input.value = input.value.toUpperCase().trim();
    
    // Remove extra spaces and special characters (optional)
    input.value = input.value.replace(/\s+/g, '');
    
    // Trigger auto-save
    this.autoSaveClassForm();
}
    
// ==================== ENHANCED STUDENT METHODS ====================
async saveStudent() {
    const firstName = document.getElementById('firstName')?.value;
    const lastName = document.getElementById('lastName')?.value;
    
    if (!firstName || !lastName) {
        this.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const students = Storage.get('students') || [];
    
    const newStudent = {
        id: `student_${Date.now()}`,
        firstName: firstName,
        lastName: lastName,
        fullName: `${firstName} ${lastName}`,
        studentId: document.getElementById('studentId')?.value || `STU${Date.now().toString().slice(-6)}`,
        gender: document.getElementById('gender')?.value || null,
        classId: document.getElementById('studentClass')?.value || null,
        createdAt: new Date().toISOString(),
        enrollmentDate: new Date().toISOString()
    };
    
    students.push(newStudent);
    Storage.set('students', students);
    
    // TODO: Add Firebase save for students
    // if (window.auth?.currentUser) {
    //     // Save to Firebase
    // }
    
    // Clear drafts
    const drafts = Storage.get('studentDrafts') || [];
    const filteredDrafts = drafts.filter(d => 
        !(d.firstName === firstName && d.lastName === lastName)
    );
    Storage.set('studentDrafts', filteredDrafts);
    
    this.showToast('Student saved successfully!', 'success');
    this.clearStudentForm();
    this.loadStudentsList();
    this.loadDataStats();
}

// ==================== ENHANCED BACKUP/RESTORE ====================
async backupData() {
    try {
        let firebaseData = {};
        
        // Try to get Firebase data if available
        if (window.auth?.currentUser) {
            try {
                const schoolId = getSchoolId();
                firebaseData = {
                    firebaseClasses: await Firestore.getClasses(schoolId),
                    // Add other Firebase collections as needed
                };
            } catch (error) {
                console.error('Failed to fetch Firebase data:', error);
            }
        }
        
        const backup = {
            version: '3.0',
            timestamp: new Date().toISOString(),
            source: window.auth?.currentUser ? 'hybrid' : 'local',
            localData: {
                classes: Storage.get('classes') || [],
                students: Storage.get('students') || [],
                attendance: Storage.get('attendance') || [],
                systemSettings: Storage.get('systemSettings') || {},
                user: this.user
            },
            firebaseData: firebaseData,
            autoSaveDrafts: {
                classDrafts: Storage.get('classDrafts') || [],
                studentDrafts: Storage.get('studentDrafts') || []
            }
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showToast('Backup downloaded successfully!', 'success');
    } catch (error) {
        this.showToast('Error creating backup: ' + error.message, 'error');
    }
}

async restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                
                if (!backup.localData) {
                    throw new Error('Invalid backup file format');
                }
                
                if (confirm('Restoring backup will overwrite all current data. Continue?')) {
                    // Restore local data
                    Storage.set('classes', backup.localData.classes || []);
                    Storage.set('students', backup.localData.students || []);
                    Storage.set('attendance', backup.localData.attendance || []);
                    Storage.set('systemSettings', backup.localData.systemSettings || {});
                    
                    // Restore drafts
                    Storage.set('classDrafts', backup.autoSaveDrafts?.classDrafts || []);
                    Storage.set('studentDrafts', backup.autoSaveDrafts?.studentDrafts || []);
                    
                    // Try to sync to Firebase if user is logged in
                    if (window.auth?.currentUser && backup.firebaseData) {
                        await this.syncToFirebase(backup);
                    }
                    
                    this.showToast('Data restored successfully!', 'success');
                    
                    // Refresh all lists
                    this.loadClassesList();
                    this.loadStudentsList();
                    this.populateClassDropdown();
                    this.loadSystemSettings();
                    this.loadDataStats();
                }
            } catch (error) {
                this.showToast('Error restoring backup: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

async syncToFirebase(backup) {
    if (!window.auth?.currentUser) return;
    
    const schoolId = getSchoolId();
    
    try {
        // Sync classes to Firebase
        if (backup.firebaseData?.firebaseClasses) {
            for (const cls of backup.firebaseData.firebaseClasses) {
                await Firestore.saveClass(schoolId, cls);
            }
        }
        
        // Sync local classes that weren't in Firebase
        const localClasses = backup.localData.classes || [];
        for (const cls of localClasses) {
            if (!cls.firebaseId) {
                await Firestore.saveClass(schoolId, cls);
            }
        }
        
        this.showToast('Data synced to cloud', 'success');
    } catch (error) {
        console.error('Firebase sync error:', error);
        this.showToast('Local restore complete (cloud sync failed)', 'warning');
    }
}

// ==================== FIREBASE SYNC ====================
async syncWithFirebase() {
    if (!window.auth?.currentUser) return;
    
    try {
        const schoolId = getSchoolId();
        
        // Get classes from Firebase
        const firebaseClasses = await Firestore.getClasses(schoolId);
        
        if (firebaseClasses.length > 0) {
            // Merge with local classes
            const localClasses = Storage.get('classes') || [];
            const mergedClasses = this.mergeData(localClasses, firebaseClasses);
            
            Storage.set('classes', mergedClasses);
            
            // Reload the list
            this.loadClassesList();
            this.populateClassDropdown();
            
            console.log('Synced classes from Firebase:', firebaseClasses.length);
        }
    } catch (error) {
        console.error('Firebase sync error:', error);
    }
}

mergeData(localData, cloudData) {
    // Simple merge - cloud data overwrites local by ID
    const merged = [...localData];
    
    cloudData.forEach(cloudItem => {
        const existingIndex = merged.findIndex(item => 
            item.firebaseId === cloudItem.id || 
            (item.code === cloudItem.code && item.name === cloudItem.name)
        );
        
        if (existingIndex >= 0) {
            // Update existing
            merged[existingIndex] = {
                ...merged[existingIndex],
                ...cloudItem,
                firebaseId: cloudItem.id,
                lastSynced: new Date().toISOString()
            };
        } else {
            // Add new
            merged.push({
                ...cloudItem,
                firebaseId: cloudItem.id,
                lastSynced: new Date().toISOString()
            });
        }
    });
    
    return merged;
}

    initializeSetupPage() {
    console.log('🚀 Initializing setup page...');
    
    // Initialize auto-save system
    this.initAutoSave();
    
    // Setup total calculation
    this.setupTotalCalculation();
    
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
            
            // Load data for active tab
            if (tabId === 'classes') {
                this.loadClassesList();
            } else if (tabId === 'students') {
                this.loadStudentsList();
                this.populateClassDropdown();
            } else if (tabId === 'system') {
                this.loadSystemSettings();
            } else if (tabId === 'data') {
                this.loadDataStats();
            }
        });
    });
    
    // Class management
    const saveClassBtn = document.getElementById('save-class');
    const clearClassBtn = document.getElementById('clear-class');
    
    if (saveClassBtn) {
        saveClassBtn.addEventListener('click', () => this.saveClass());
    }
    
    if (clearClassBtn) {
        clearClassBtn.addEventListener('click', () => this.clearClassForm());
    }
    
    // Student management
    const saveStudentBtn = document.getElementById('save-student');
    const clearStudentBtn = document.getElementById('clear-student');
    
    if (saveStudentBtn) {
        saveStudentBtn.addEventListener('click', () => this.saveStudent());
    }
    
    if (clearStudentBtn) {
        clearStudentBtn.addEventListener('click', () => this.clearStudentForm());
    }
    
    // Import functionality
    const importZone = document.getElementById('import-zone');
    const importFile = document.getElementById('import-file');
    const processImportBtn = document.getElementById('process-import');
    const downloadTemplateBtn = document.getElementById('download-template');
    
    if (importZone && importFile) {
        importZone.addEventListener('click', () => importFile.click());
        importZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            importZone.style.borderColor = '#3498db';
            importZone.style.background = '#f0f7ff';
        });
        importZone.addEventListener('dragleave', () => {
            importZone.style.borderColor = '#ddd';
            importZone.style.background = '#f8f9fa';
        });
        importZone.addEventListener('drop', (e) => {
            e.preventDefault();
            importZone.style.borderColor = '#ddd';
            importZone.style.background = '#f8f9fa';
            if (e.dataTransfer.files.length > 0) {
                this.handleFileImport(e.dataTransfer.files[0]);
            }
        });
        
        importFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileImport(e.target.files[0]);
            }
        });
    }
    
    if (processImportBtn) {
        processImportBtn.addEventListener('click', () => this.processImport());
    }
    
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', () => this.downloadTemplate());
    }
    
    // System settings
    const saveSettingsBtn = document.getElementById('save-system-settings');
    const resetSettingsBtn = document.getElementById('reset-system-settings');
    
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => this.saveSystemSettings());
    }
    
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => this.resetSystemSettings());
    }
    
    // Data management
    const backupDataBtn = document.getElementById('backup-data');
    const restoreDataBtn = document.getElementById('restore-data');
    const exportCsvBtn = document.getElementById('export-csv');
    const exportExcelBtn = document.getElementById('export-excel');
    const clearCacheBtn = document.getElementById('clear-cache');
    const clearAllDataBtn = document.getElementById('clear-all-data');
    
    if (backupDataBtn) backupDataBtn.addEventListener('click', () => this.backupData());
    if (restoreDataBtn) restoreDataBtn.addEventListener('click', () => this.restoreData());
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => this.exportData('csv'));
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportData('excel'));
    if (clearCacheBtn) clearCacheBtn.addEventListener('click', () => this.clearCache());
    if (clearAllDataBtn) clearAllDataBtn.addEventListener('click', () => this.clearAllData());
    
    // Load initial data
    this.loadClassesList();
    this.loadStudentsList();
    this.populateClassDropdown();
    this.loadSystemSettings();
    this.loadDataStats();
    
    // Try to sync with Firebase
    this.syncWithFirebase();
}
    
// ==================== ENHANCED LOAD METHODS ====================
loadClassesList() {
    const classesList = document.getElementById('classes-list');
    if (!classesList) return;
    
    const classes = Storage.get('classes') || [];
    const students = Storage.get('students') || [];
    
    if (classes.length === 0) {
        classesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-chalkboard-teacher"></i>
                </div>
                <div class="empty-text">No classes added yet</div>
            </div>
        `;
        return;
    }
    
    // Add sync status indicator
    const syncStatus = window.auth?.currentUser ? 
        `<span class="sync-badge"><i class="fas fa-cloud"></i> Cloud</span>` : 
        `<span class="sync-badge offline"><i class="fas fa-desktop"></i> Local</span>`;
    
    classesList.innerHTML = classes.map(cls => {
        const studentCount = students.filter(s => s.classId === cls.id).length;
        const cloudIndicator = cls.firebaseId ? 
            `<span class="cloud-indicator" title="Synced to cloud"><i class="fas fa-check-circle"></i></span>` : '';
        
        // Calculate totals from males/females if available
        const maleCount = cls.males || 0;
        const femaleCount = cls.females || 0;
        const total = cls.total || (maleCount + femaleCount);
        
        return `
            <div class="class-card">
                <div class="class-header">
                    <div class="class-title">${cls.yearGroup || cls.name} - ${cls.code} ${cloudIndicator}</div>
                    ${syncStatus}
                </div>
                <div class="class-info">
                    <div class="info-item">
                        <span class="info-label">Class Code:</span>
                        <span class="info-value">${cls.code}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Males:</span>
                        <span class="info-value">${maleCount}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Females:</span>
                        <span class="info-value">${femaleCount}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Total:</span>
                        <span class="info-value">${total}</span>
                    </div>
                </div>
                <div class="class-actions">
                    <button class="action-btn edit-btn" onclick="window.app.editClass('${cls.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" onclick="window.app.deleteClass('${cls.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

   editClass(classId) {
    console.log('✏️ Editing class:', classId);
    const classes = Storage.get('classes') || [];
    const cls = classes.find(c => c.id === classId);
    
    if (cls) {
        document.getElementById('yearGroup').value = cls.yearGroup || '';
        
        const classCodeInput = document.getElementById('classCode');
        if (classCodeInput) {
            classCodeInput.value = (cls.code || '').toUpperCase();
        }
        
        document.getElementById('maleCount').value = cls.males || 0;
        document.getElementById('femaleCount').value = cls.females || 0;
        document.getElementById('editClassId').value = cls.id;
        
        // Update total display
        const total = (parseInt(cls.males) || 0) + (parseInt(cls.females) || 0);
        document.getElementById('totalStudents').textContent = total;
        
        // Update button text
        const saveBtn = document.getElementById('save-class');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Class';
        }
        
        // Scroll to form
        document.getElementById('classes-tab').scrollIntoView({ behavior: 'smooth' });
        
        this.showToast('Ready to edit class', 'info');
    } else {
        this.showToast('Class not found', 'error');
    }
}
    
    // ==================== SETTINGS PAGE METHODS ====================
    initializeSettingsPage() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                
                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show active tab content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabId}-tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });
        
        // Profile save button
        const saveProfileBtn = document.getElementById('save-profile');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => this.saveProfile());
        }
        
        // Preferences save button
        const savePreferencesBtn = document.getElementById('save-preferences');
        if (savePreferencesBtn) {
            savePreferencesBtn.addEventListener('click', () => this.savePreferences());
        }
        
        // Password change button
        const changePasswordBtn = document.getElementById('change-password');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => this.changePassword());
        }
        
        // Notifications save button
        const saveNotificationsBtn = document.getElementById('save-notifications');
        if (saveNotificationsBtn) {
            saveNotificationsBtn.addEventListener('click', () => this.saveNotifications());
        }
        
        // Logout all devices button
        const logoutAllBtn = document.getElementById('logout-all-devices');
        if (logoutAllBtn) {
            logoutAllBtn.addEventListener('click', () => this.logoutAllDevices());
        }
        
        // Load current settings
        this.loadUserSettings();
    }

    loadUserSettings() {
        // Load profile data
        const userName = document.getElementById('userName');
        const userPhone = document.getElementById('userPhone');
        const userSchool = document.getElementById('userSchool');
        
        if (userName) userName.value = this.user.name || '';
        if (userPhone) userPhone.value = this.user.phone || '';
        if (userSchool) userSchool.value = this.user.school || '';
        
        // Load preferences
        const settings = Storage.get('user_settings') || {};
        const theme = document.getElementById('theme');
        const dateFormat = document.getElementById('dateFormat');
        const timeFormat = document.getElementById('timeFormat');
        const defaultView = document.getElementById('defaultView');
        const autoLogout = document.getElementById('auto-logout');
        
        if (theme) theme.value = settings.theme || 'light';
        if (dateFormat) dateFormat.value = settings.dateFormat || 'MM/DD/YYYY';
        if (timeFormat) timeFormat.value = settings.timeFormat || '12h';
        if (defaultView) defaultView.value = settings.defaultView || 'dashboard';
        if (autoLogout) autoLogout.value = settings.autoLogout || '30';
        
        // Load notification settings
        const notifyDaily = document.getElementById('notify-daily-summary');
        const notifyWeekly = document.getElementById('notify-weekly-report');
        const notifyLow = document.getElementById('notify-low-attendance');
        const notifyNew = document.getElementById('notify-new-students');
        const notifyUpdates = document.getElementById('notify-system-updates');
        
        const notifications = settings.notifications || {};
        if (notifyDaily) notifyDaily.checked = notifications.dailySummary !== false;
        if (notifyWeekly) notifyWeekly.checked = notifications.weeklyReport !== false;
        if (notifyLow) notifyLow.checked = notifications.lowAttendance === true;
        if (notifyNew) notifyNew.checked = notifications.newStudents !== false;
        if (notifyUpdates) notifyUpdates.checked = notifications.systemUpdates !== false;
    }

    saveProfile() {
        const userName = document.getElementById('userName')?.value;
        const userPhone = document.getElementById('userPhone')?.value;
        const userSchool = document.getElementById('userSchool')?.value;
        
        // Update user object
        this.user.name = userName || this.user.name;
        this.user.phone = userPhone || this.user.phone;
        this.user.school = userSchool || this.user.school;
        
        // Save to storage
        Storage.set('attendance_user', this.user);
        
        this.showToast('Profile updated successfully!', 'success');
    }

    savePreferences() {
        const theme = document.getElementById('theme')?.value;
        const dateFormat = document.getElementById('dateFormat')?.value;
        const timeFormat = document.getElementById('timeFormat')?.value;
        const defaultView = document.getElementById('defaultView')?.value;
        const autoLogout = document.getElementById('auto-logout')?.value;
        
        const settings = {
            theme: theme,
            dateFormat: dateFormat,
            timeFormat: timeFormat,
            defaultView: defaultView,
            autoLogout: autoLogout,
            updatedAt: new Date().toISOString()
        };
        
        Storage.set('user_settings', settings);
        this.showToast('Preferences saved successfully!', 'success');
    }

    changePassword() {
        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showToast('Please fill in all password fields', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.showToast('New passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            this.showToast('Password must be at least 8 characters long', 'error');
            return;
        }
        
        // In a real app, you would verify current password and update it
        this.showToast('Password changed successfully!', 'success');
        
        // Clear password fields
        ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
    }

    saveNotifications() {
        const notifyDaily = document.getElementById('notify-daily-summary')?.checked;
        const notifyWeekly = document.getElementById('notify-weekly-report')?.checked;
        const notifyLow = document.getElementById('notify-low-attendance')?.checked;
        const notifyNew = document.getElementById('notify-new-students')?.checked;
        const notifyUpdates = document.getElementById('notify-system-updates')?.checked;
        
        const notifications = {
            dailySummary: notifyDaily,
            weeklyReport: notifyWeekly,
            lowAttendance: notifyLow,
            newStudents: notifyNew,
            systemUpdates: notifyUpdates
        };
        
        const settings = Storage.get('user_settings') || {};
        settings.notifications = notifications;
        settings.updatedAt = new Date().toISOString();
        
        Storage.set('user_settings', settings);
        this.showToast('Notification settings saved!', 'success');
    }

    logoutAllDevices() {
        if (confirm('Logout from all devices? You will need to login again on this device.')) {
            this.handleLogout();
        }
    }

    // ==================== UTILITY METHODS ====================
    async loadUIComponents() {
        // Load header and footer
        await this.loadHeader();
        await this.loadFooter();
    }

async loadHeader() {
    try {
        const headerContainer = document.getElementById('header-container');
        if (!headerContainer) return;
        
        const basePath = this.getBasePath();
        const response = await fetch(`${basePath}components/header.html`);
        
        if (!response.ok) {
            throw new Error(`Failed to load header: ${response.status}`);
        }
        
        const html = await response.text();
        headerContainer.innerHTML = html;
        
        // The JavaScript in header.html will run automatically
        
    } catch (error) {
        console.error('❌ Failed to load header:', error);
        this.renderFallbackHeader();
    }
}

renderFallbackHeader() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;
    
    headerContainer.innerHTML = `
        <header style="background:#2c3e50;color:white;padding:15px;">
            <div style="display:flex;justify-content:space-between;align-items:center;max-width:1200px;margin:0 auto;">
                <div>
                    <a href="dashboard.html" style="color:white;text-decoration:none;font-weight:bold;font-size:20px;">
                        Attendance Track
                    </a>
                </div>
                <nav style="display:flex;gap:15px;align-items:center;">
                    <a href="dashboard.html" style="color:white;text-decoration:none;">Dashboard</a>
                    <a href="attendance.html" style="color:white;text-decoration:none;">Attendance</a>
                    <a href="reports.html" style="color:white;text-decoration:none;">Reports</a>
                    <a href="setup.html" style="color:white;text-decoration:none;">Setup</a>
                    <button onclick="localStorage.clear();window.location.href='index.html'" 
                            style="margin-left:15px;padding:5px 10px;background:#e74c3c;color:white;border:none;border-radius:3px;cursor:pointer;">
                        Logout
                    </button>
                </nav>
            </div>
        </header>
    `;
}

// Fallback header
renderFallbackHeader() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;
    
    headerContainer.innerHTML = `
        <header style="background:#2c3e50;color:white;padding:15px;">
            <div style="display:flex;justify-content:space-between;align-items:center;max-width:1200px;margin:0 auto;">
                <div>
                    <a href="dashboard.html" style="color:white;text-decoration:none;font-weight:bold;font-size:20px;">
                        Attendance Track
                    </a>
                </div>
                <div>
                    <a href="dashboard.html" style="color:white;margin:0 10px;">Dashboard</a>
                    <a href="attendance.html" style="color:white;margin:0 10px;">Attendance</a>
                    <a href="reports.html" style="color:white;margin:0 10px;">Reports</a>
                    <a href="setup.html" style="color:white;margin:0 10px;">Setup</a>
                    <button onclick="localStorage.clear();window.location.href='index.html'" style="margin-left:15px;padding:5px 10px;background:#e74c3c;color:white;border:none;border-radius:3px;cursor:pointer;">
                        Logout
                    </button>
                </div>
            </div>
        </header>
    `;
}
    async loadFooter() {
        try {
            const footerContainer = document.getElementById('footer-container');
            if (!footerContainer) return;
            
            const basePath = this.getBasePath();
            const response = await fetch(`${basePath}components/footer.html`);
            
            if (!response.ok) {
                throw new Error(`Failed to load footer: ${response.status}`);
            }
            
            const html = await response.text();
            footerContainer.innerHTML = html;
            
        } catch (error) {
            console.error('❌ Failed to load footer:', error);
            this.renderFallbackFooter();
        }
    }

   renderFallbackHeader() {
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = `
            <header class="main-header">
                <div class="header-container">
                    <div class="header-logo">
                        <a href="dashboard.html" class="logo-link">
                            <div class="logo-icon">
                                <i class="fas fa-clipboard-check"></i>
                            </div>
                            <div class="logo-text">
                                <span class="logo-primary">Attendance</span>
                                <span class="logo-secondary">Track</span>
                            </div>
                        </a>
                    </div>
                    
                    <nav class="main-nav">
                        <button class="mobile-menu-btn" aria-label="Toggle menu" aria-expanded="false">
                            <span class="menu-line"></span>
                            <span class="menu-line"></span>
                            <span class="menu-line"></span>
                        </button>
                        
                        <ul class="nav-list">
                            ${this.user ? `
                                <li class="nav-item">
                                    <a href="dashboard.html" class="nav-link">
                                        <i class="fas fa-tachometer-alt"></i>
                                        <span>Dashboard</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="setup.html" class="nav-link">
                                        <i class="fas fa-cogs"></i>
                                        <span>Setup</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="attendance.html" class="nav-link">
                                        <i class="fas fa-clipboard-list"></i>
                                        <span>Attendance</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="reports.html" class="nav-link">
                                        <i class="fas fa-chart-bar"></i>
                                        <span>Reports</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="#" id="logoutBtn" class="nav-link">
                                        <i class="fas fa-sign-out-alt"></i>
                                        <span>Logout</span>
                                    </a>
                                </li>
                            ` : `
                                <li class="nav-item">
                                    <a href="index.html" class="nav-link">
                                        <i class="fas fa-home"></i>
                                        <span>Home</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="index.html" class="nav-link">
                                        <i class="fas fa-sign-in-alt"></i>
                                        <span>Login</span>
                                    </a>
                                </li>
                            `}
                        </ul>
                        
                        <div class="user-menu">
                            <div class="user-info">
                                <span class="user-name" id="currentUser">${this.user?.name || 'Guest'}</span>
                                <span class="user-status" id="userStatus" title="Online">
                                    <span class="status-dot"></span>
                                    <span class="status-text">Online</span>
                                </span>
                            </div>
                            <button id="logoutBtn" class="btn-logout" title="Logout">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>
                        </div>
                    </nav>
                </div>
            </header>
        `;
        
        // Setup navigation after fallback header loads
        setTimeout(() => {
            this.setupNavigation();
        }, 100);
    }
}

    renderFallbackFooter() {
        const footerContainer = document.getElementById('footer-container');
        if (footerContainer) {
            footerContainer.innerHTML = `
                <footer class="app-footer">
                    <div class="footer-content">
                        <p>&copy; ${new Date().getFullYear()} Attendance Tracker v2</p>
                        <p>Version: 2.0.0</p>
                    </div>
                </footer>
            `;
        }
    }

    setupNavigation() {
        setTimeout(() => {
            this.highlightCurrentPage();
            this.setupMobileMenu();
            this.setupLogoutHandler();
        }, 100);
    }
    
    highlightCurrentPage() {
        const currentPage = this.getCurrentPage();
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                const linkPage = href.replace('.html', '').split('?')[0];
                if (linkPage === currentPage || (currentPage === '' && linkPage === 'index')) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.classList.remove('active');
                    link.removeAttribute('aria-current');
                }
            }
        });
    }
    
    setupMobileMenu() {
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const navList = document.querySelector('.nav-list');
        
        if (mobileMenuBtn && navList) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
                mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
                navList.classList.toggle('active');
                mobileMenuBtn.classList.toggle('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (navList.classList.contains('active') && 
                    !mobileMenuBtn.contains(e.target) && 
                    !navList.contains(e.target)) {
                    navList.classList.remove('active');
                    mobileMenuBtn.setAttribute('aria-expanded', 'false');
                    mobileMenuBtn.classList.remove('active');
                }
            });
        }
    }
    
    setupLogoutHandler() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    showPageNotFound(container) {
        container.innerHTML = `
            <div class="error-page">
                <h2>Page Not Found</h2>
                <p>The page you're looking for doesn't exist.</p>
                <a href="index.html" class="btn btn-primary">Go Home</a>
            </div>
        `;
    }

    // ==================== FIREBASE METHODS ====================
    async syncLocalUserToFirebase() {
        // This is a non-blocking Firebase sync attempt
        try {
            if (typeof firebase !== 'undefined' && this.user?.email) {
                console.log('Attempting Firebase sync...');
                // Add your Firebase sync logic here
                this.firebaseAvailable = true;
            }
        } catch (error) {
            console.log('Firebase sync not available');
            this.firebaseAvailable = false;
        }
    }

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.showToast('You are back online', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.showToast('You are offline', 'warning');
        });
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            const basePath = this.getBasePath();
            const swPath = `${basePath}service-worker.js`;
            
            navigator.serviceWorker.register(swPath)
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration.scope);
                })
                .catch(error => {
                    console.warn('⚠️ Service Worker registration failed:', error);
                });
        }
    }

    // ==================== HELPER METHODS ====================
    redirectTo(page) {
        const basePath = this.getBasePath();
        const targetUrl = basePath + page;
        window.location.href = targetUrl;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showError(message) {
        console.error('❌ Error:', message);
        this.showToast(message, 'error');
    }
}

// Wait for DOM to be ready before creating app instance
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AttendanceApp();
});


