<!-- In dashboard.html, replace the entire script section -->
<script>
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('📱 Dashboard page loading...');
        
        try {
            // Check if user is logged in
            const userData = localStorage.getItem('attendance_user');
            if (!userData) {
                console.log('⚠️ No user found, redirecting to login');
                window.location.href = 'login.html';
                return;
            }
            
            // Initialize app if not already
            if (!window.app) {
                console.log('🔄 Waiting for app...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            if (window.app) {
                // Load components
                const headerContainer = document.getElementById('header-container');
                const footerContainer = document.getElementById('footer-container');
                const appContainer = document.getElementById('app-container');
                
                if (headerContainer) await window.app.loadHeader(headerContainer);
                if (appContainer) await window.app.loadDashboardContent(appContainer);
                if (footerContainer) await window.app.loadFooter(footerContainer);
                
                console.log('✅ Dashboard fully loaded');
            } else {
                throw new Error('App not available');
            }
            
        } catch (error) {
            console.error('❌ Dashboard loading error:', error);
            
            // Show simple error
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.innerHTML = `
                    <div style="text-align: center; padding: 50px;">
                        <h3>Error Loading Dashboard</h3>
                        <p>${error.message}</p>
                        <div style="margin-top: 20px;">
                            <button onclick="location.reload()" style="
                                padding: 10px 20px;
                                background: #405dde;
                                color: white;
                                border: none;
                                border-radius: 5px;
                                cursor: pointer;
                                margin-right: 10px;
                            ">
                                Reload
                            </button>
                            <button onclick="location.href='login.html'" style="
                                padding: 10px 20px;
                                background: #6c757d;
                                color: white;
                                border: none;
                                border-radius: 5px;
                                cursor: pointer;
                            ">
                                Go to Login
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    });
</script>
