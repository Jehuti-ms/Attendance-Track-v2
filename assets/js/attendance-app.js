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
    
    // Apply visual styles
    Object.assign(logoutBtn.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(26, 35, 126, 0.15)',
        border: '1px solid rgba(26, 35, 126, 0.3)',
        color: '#1a237e',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        margin: '0',
        padding: '0',
        flexShrink: '0',
        position: 'relative',
        zIndex: '10'
    });
    
    // Style icon
    const icon = logoutBtn.querySelector('i');
    if (icon) {
        Object.assign(icon.style, {
            color: '#1a237e',
            fontSize: '18px',
            transition: 'transform 0.3s ease',
            display: 'inline-block'
        });
    }
    
    // Add rotation animation
    const rotateOnHover = () => {
        logoutBtn.style.transform = 'rotate(90deg)';
        if (icon) icon.style.transform = 'rotate(-90deg)';
    };
    
    const resetRotation = () => {
        logoutBtn.style.transform = 'rotate(0deg)';
        if (icon) icon.style.transform = 'rotate(0deg)';
    };
    
    logoutBtn.addEventListener('mouseenter', rotateOnHover);
    logoutBtn.addEventListener('mouseleave', resetRotation);
    
    // Add click handler
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🚪 Logout button clicked!');
        this.handleLogout();
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
toggleNavigationLinks() {
    console.log('🔄 Toggling navigation links visibility...');
    
    // Get stored references
    const navLinks = this.state.navLinksElement; // Looking for navLinks, not navbar
    const hamburger = this.state.hamburgerElement || 
                     document.querySelector('.hamburger-menu, .navbar-toggle');
    
    console.log('Toggle elements check:', {
        navLinks: !!navLinks,
        hamburger: !!hamburger
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
    
    if (isCurrentlyVisible) {
        // Hide navigation links
        console.log('👁️‍🗨️ Hiding navigation links...');
        navLinks.style.cssText = `
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        `;
        navLinks.classList.remove('links-visible');
        navLinks.classList.add('links-hidden');
        hamburger.innerHTML = '☰';
        hamburger.setAttribute('aria-expanded', 'false');
        console.log('✅ Navigation links hidden');
    } else {
        // Show navigation links as mobile menu
        console.log('👁️‍🗨️ Showing navigation links as mobile menu...');
        navLinks.style.cssText = `
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: all !important;
            flex-direction: column !important;
            position: fixed !important;
            top: 70px !important;
            right: 20px !important;
            background: rgba(0, 0, 0, 0.95) !important;
            border-radius: 10px !important;
            padding: 15px !important;
            z-index: 9999 !important;
            box-shadow: 0 5px 20px rgba(0,0,0,0.4) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            min-width: 200px !important;
            max-width: 300px !important;
            gap: 10px !important;
        `;
        navLinks.classList.add('links-visible');
        navLinks.classList.remove('links-hidden');
        hamburger.innerHTML = '✕';
        hamburger.setAttribute('aria-expanded', 'true');
        console.log('✅ Navigation links shown as mobile menu');
    }
}

// Also update the responsive check to use the same naming:
checkResponsiveView() {
    const hamburger = this.state.hamburgerElement || 
                     document.querySelector('.hamburger-menu, .navbar-toggle');
    const navLinks = this.state.navLinksElement; // Changed from toggleableNavbar
    
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
        navLinks.classList.remove('links-hidden', 'links-visible');
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
            // If they were already toggled open, keep them visible
            navLinks.style.cssText = `
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: all !important;
                flex-direction: column !important;
                position: fixed !important;
                top: 70px !important;
                right: 20px !important;
                background: rgba(0, 0, 0, 0.95) !important;
                border-radius: 10px !important;
                padding: 15px !important;
                z-index: 9999 !important;
                box-shadow: 0 5px 20px rgba(0,0,0,0.4) !important;
                border: 1px solid rgba(255,255,255,0.1) !important;
                min-width: 200px !important;
                max-width: 300px !important;
                gap: 10px !important;
            `;
            hamburger.innerHTML = '✕';
            hamburger.setAttribute('aria-expanded', 'true');
        }
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

toggleNavbarVisibility() {
    console.log('🔄 Toggling navigation links visibility...');
    
    // Get stored references
    const navLinks = this.state.navLinksElement;
    const hamburger = this.state.hamburgerElement || 
                     document.querySelector('.hamburger-menu, .navbar-toggle');
    
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
    
    if (isCurrentlyVisible) {
        // Hide navigation links (mobile menu)
        console.log('👁️‍🗨️ Hiding navigation links...');
        navLinks.style.cssText = `
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        `;
        navLinks.classList.remove('links-visible');
        navLinks.classList.add('links-hidden');
        hamburger.innerHTML = '☰';
        hamburger.setAttribute('aria-expanded', 'false');
        console.log('✅ Navigation links hidden');
    } else {
        // Show navigation links as mobile menu
        console.log('👁️‍🗨️ Showing navigation links as mobile menu...');
        navLinks.style.cssText = `
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: all !important;
            flex-direction: column !important;
            position: fixed !important;
            top: 70px !important;
            right: 20px !important;
            background: rgba(0, 0, 0, 0.95) !important;
            border-radius: 10px !important;
            padding: 15px !important;
            z-index: 9999 !important;
            box-shadow: 0 5px 20px rgba(0,0,0,0.4) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            min-width: 200px !important;
            max-width: 300px !important;
            gap: 10px !important;
        `;
        navLinks.classList.add('links-visible');
        navLinks.classList.remove('links-hidden');
        hamburger.innerHTML = '✕';
        hamburger.setAttribute('aria-expanded', 'true');
        console.log('✅ Navigation links shown as mobile menu');
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
            // If they were already toggled open, keep them visible
            navLinks.style.cssText = `
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: all !important;
                flex-direction: column !important;
                position: fixed !important;
                top: 70px !important;
                right: 20px !important;
                background: rgba(0, 0, 0, 0.95) !important;
                border-radius: 10px !important;
                padding: 15px !important;
                z-index: 9999 !important;
                box-shadow: 0 5px 20px rgba(0,0,0,0.4) !important;
                border: 1px solid rgba(255,255,255,0.1) !important;
                min-width: 200px !important;
                max-width: 300px !important;
                gap: 10px !important;
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
        this.toggleNavbarVisibility();
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

toggleNavbarVisibility() {
    const navbar = this.state.toggleableNavbar;
    const hamburger = document.querySelector('.hamburger-menu, .navbar-toggle');
    
    if (!navbar || !hamburger) {
        console.log('❌ No navbar or hamburger found for toggling');
        return;
    }
    
    const isCurrentlyVisible = navbar.style.display !== 'none' && 
                              navbar.offsetWidth > 0 && 
                              navbar.offsetHeight > 0;
    
    console.log(`🔄 Toggling navbar. Currently visible: ${isCurrentlyVisible}`);
    
    if (isCurrentlyVisible) {
        // Hide navbar
        navbar.style.display = 'none';
        navbar.classList.remove('navbar-visible');
        navbar.classList.add('navbar-hidden');
        hamburger.innerHTML = '☰'; // Hamburger icon
        console.log('✅ Navbar hidden');
    } else {
        // Show navbar
        navbar.style.display = 'flex'; // Adjust based on your navbar's display
        navbar.style.flexDirection = 'column'; // Stack vertically on mobile
        navbar.style.position = 'absolute';
        navbar.style.top = '60px'; // Below header
        navbar.style.right = '20px';
        navbar.style.background = 'rgba(0, 0, 0, 0.9)';
        navbar.style.borderRadius = '10px';
        navbar.style.padding = '15px';
        navbar.style.zIndex = '99';
        navbar.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        navbar.classList.add('navbar-visible');
        navbar.classList.remove('navbar-hidden');
        hamburger.innerHTML = '✕'; // Close icon
        console.log('✅ Navbar shown (mobile menu)');
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
            
            // Try Firebase sync (non-blocking)
            this.syncLocalUserToFirebase().catch(err => {
                console.log('Firebase sync optional:', err.message);
            });
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
        this.showError(error.message);
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
                
                <div class="auto-save-indicator">
                    <i class="fas fa-save"></i> Auto-save enabled
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
                            <th rowspan="2">Cumulative</th>
                            <th rowspan="2">vs Avg</th>
                        </tr>
                        <tr>
                            <th>AM</th>
                            <th>PM</th>
                            <th>AM</th>
                            <th>PM</th>
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
                                        <label class="form-label">Class Name</label>
                                        <input type="text" id="className" class="form-input" placeholder="e.g., Grade 10 Mathematics">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Class Code</label>
                                        <input type="text" id="classCode" class="form-input" placeholder="e.g., 10MATHS">
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Year Group</label>
                                        <input type="text" id="yearGroup" class="form-input" placeholder="e.g., 10">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Subject</label>
                                        <input type="text" id="subject" class="form-input" placeholder="e.g., Mathematics">
                                    </div>
                                </div>
                                
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
                        
                        <!-- Students Tab -->
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
                        
                        <!-- Import Tab -->
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
                        
                        <!-- System Settings Tab -->
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
                        
                        <!-- Data Management Tab -->
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

    // ==================== ATTENDANCE METHODS ====================
   async loadAttendanceData() {
    console.log('📋 Loading attendance data...');
    
    try {
        // Get selected date, week, term, session
        const selectedDate = document.getElementById('date-picker')?.value;
        const selectedWeek = document.getElementById('week-picker')?.value;
        const selectedTerm = document.getElementById('term-picker')?.value;
        const selectedSession = document.querySelector('.session-option.active')?.dataset.session || 'both';
        
        console.log('🔍 Debug: Looking for elements...');
        console.log('date-picker:', document.getElementById('date-picker'));
        console.log('week-picker:', document.getElementById('week-picker'));
        console.log('term-picker:', document.getElementById('term-picker'));
        console.log('session-option.active:', document.querySelector('.session-option.active'));
        
        const summaryTable = document.getElementById('attendance-table-body');
        const studentDetailsContainer = document.getElementById('student-details-container');
        
        console.log('🔍 Element check:');
        console.log('- summary-table-body:', summaryTable);
        console.log('- student-details-container:', studentDetailsContainer);
        console.log('- Document body HTML length:', document.body.innerHTML.length);
        
        // Try to find elements in different ways
        const allTableBodies = document.querySelectorAll('tbody');
        console.log('All tbody elements:', allTableBodies.length);
        allTableBodies.forEach((tbody, i) => {
            console.log(`tbody[${i}]:`, tbody.id || 'no id', 'class:', tbody.className);
        });
        
        if (!summaryTable || !studentDetailsContainer) {
            console.error('❌ Required elements not found');
            console.error('Full DOM search for summary-table-body:');
            console.error(document.querySelector('#summary-table-body'));
            console.error(document.querySelector('[id*="summary"]'));
            console.error(document.querySelector('[id*="table"]'));
            
            // Show error in UI
            const container = document.querySelector('.attendance-report') || document.querySelector('#app-container');
            if (container) {
                container.innerHTML += `
                    <div class="error-message" style="padding: 20px; background: #fee; border-radius: 8px; margin: 20px;">
                        <h3>Debug Information:</h3>
                        <p>summary-table-body found: ${!!summaryTable}</p>
                        <p>student-details-container found: ${!!studentDetailsContainer}</p>
                        <p>Check browser console for details</p>
                    </div>
                `;
            }
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
            
            // Calculate cumulative (simplified)
            const totalAttendanceDays = [...new Set(classAttendance.map(a => a.date))].length;
            const cumulative = `${totalAttendanceDays}/30`;
            
            // Calculate vs Avg (simplified - placeholder)
            const vsAvg = classAttendance.length > 0 ? '0.0%' : '-100.0%';
            
            // Summary row
            const summaryRow = document.createElement('tr');
            summaryRow.innerHTML = `
                <td>${classItem.yearGroup || 'All Years'}</td>
                <td><strong>${classItem.code || classItem.name}</strong></td>
                <td>${totalStudents}</td>
                <td>${malePresentAM}</td>
                <td>${malePresentPM}</td>
                <td>${femalePresentAM}</td>
                <td>${femalePresentPM}</td>
                <td>${amRate}%</td>
                <td>${pmRate}%</td>
                <td>${dailyRate}%</td>
                <td>${cumulative}</td>
                <td>${vsAvg}</td>
            `;
            summaryTable.appendChild(summaryRow);
            
            // Student details section
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
    
// ==================== AUTO-SAVE FEATURE ====================
// Add to your existing initializeAttendancePage or similar method
setupAutoSaveFilters() {
    console.log('🔧 Setting up auto-save filters...');
    
    // Debounce function to prevent too many saves
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };
    
    // Auto-save function
    const autoSave = debounce(async () => {
        console.log('💾 Auto-saving attendance filters...');
        await this.saveAttendanceFilters();
        this.showAutoSaveNotification('Settings saved automatically');
        
        // Reload data with new filters
        await this.loadAttendanceData();
    }, 1000); // 1 second delay
    
    // Add event listeners to all filter elements
    const datePicker = document.getElementById('date-picker');
    const weekPicker = document.getElementById('week-picker');
    const termPicker = document.getElementById('term-picker');
    const sessionOptions = document.querySelectorAll('.session-option');
    
    if (datePicker) {
        datePicker.addEventListener('change', autoSave);
    }
    
    if (weekPicker) {
        weekPicker.addEventListener('change', autoSave);
    }
    
    if (termPicker) {
        termPicker.addEventListener('change', autoSave);
    }
    
    if (sessionOptions.length > 0) {
        sessionOptions.forEach(option => {
            option.addEventListener('click', async (e) => {
                // Update UI immediately
                document.querySelectorAll('.session-option').forEach(opt => 
                    opt.classList.remove('active')
                );
                option.classList.add('active');
                
                // Save settings
                await this.saveAttendanceFilters();
                this.showAutoSaveNotification('Session saved');
                
                // Reload data
                await this.loadAttendanceData();
            });
        });
    }
}

// Save attendance filters
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
        
        // Save to localStorage
        localStorage.setItem('attendance_filters', JSON.stringify(settings));
        
        // Save to Firebase if available
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

// Load saved attendance filters
async loadAttendanceFilters() {
    try {
        let settings = null;
        
        // Try Firebase first
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
        
        // Fallback to localStorage
        if (!settings) {
            const localSettings = localStorage.getItem('attendance_filters');
            if (localSettings) {
                settings = JSON.parse(localSettings);
                console.log('✅ Filters loaded from localStorage');
            }
        }
        
        // Apply defaults if no saved settings
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

// Show auto-save notification
showAutoSaveNotification(message) {
    // Remove existing notification
    const existingNotification = document.querySelector('.save-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 2000);
}

// ==================== INITIALIZATION ====================

// Update your attendance page initialization
async initializeAttendancePage() {
    try {
        // Load saved filters
        const savedFilters = await this.loadAttendanceFilters();
        
        // Apply saved filters to UI
        if (savedFilters) {
            const datePicker = document.getElementById('date-picker');
            const weekPicker = document.getElementById('week-picker');
            const termPicker = document.getElementById('term-picker');
            
            if (datePicker && savedFilters.date) {
                datePicker.value = savedFilters.date;
            }
            
            if (weekPicker && savedFilters.week) {
                weekPicker.value = savedFilters.week;
            }
            
            if (termPicker && savedFilters.term) {
                termPicker.value = savedFilters.term;
            }
            
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
        
        // Setup auto-save
        this.setupAutoSaveFilters();
        
        // Load initial data
        await this.loadAttendanceData();
        
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

    // ==================== SETUP PAGE METHODS ====================
    initializeSetupPage() {
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
        ['className', 'classCode', 'yearGroup', 'subject'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
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
        
        // Remove class
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
        
        this.showToast('Class deleted successfully', 'info');
        this.loadClassesList();
        this.loadStudentsList();
        this.populateClassDropdown();
        this.loadDataStats();
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
