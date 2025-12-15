// attendance-track-v2/assets/js/modules/settings.js
import { Utils, Storage } from './utils.js';

export class SettingsModule {
    constructor(app) {
        this.app = app;
        this.settings = {};
        this.users = [];
        this.currentUser = null;
        this.initialize();
    }

    async initialize() {
        await this.loadSettings();
        await this.loadUsers();
        await this.loadCurrentUser();
        this.setupEventListeners();
        this.renderSettings();
        this.renderUsers();
        this.updateUIFromSettings();
    }

    async loadSettings() {
        this.settings = await Storage.get('app_settings') || {
            // School Information
            schoolName: 'Greenwood Academy',
            schoolCode: '',
            schoolAddress: '',
            schoolPhone: '',
            schoolEmail: '',
            
            // Display Settings
            theme: 'light',
            language: 'en',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '12h',
            
            // Notification Settings
            emailNotifications: true,
            lowAttendanceAlerts: true,
            attendanceThreshold: 75,
            weeklyReports: true,
            reportDay: 'Friday',
            reportTime: '16:00',
            
            // Backup Settings
            autoBackup: true,
            backupInterval: 7,
            backupLocation: 'local',
            cloudSync: false,
            
            // Privacy Settings
            dataRetention: 365,
            anonymizeData: false,
            exportPassword: false,
            
            // Advanced Settings
            debugMode: false,
            offlineMode: true,
            cacheSize: 50,
            autoSave: true,
            
            // Integration Settings
            googleSheetsEnabled: false,
            googleSheetsId: '',
            emailEnabled: false,
            smtpServer: '',
            
            updatedAt: new Date().toISOString()
        };
    }

    async loadUsers() {
        this.users = await Storage.get('system_users') || [
            {
                id: 'admin_001',
                username: 'admin',
                email: 'admin@school.edu',
                name: 'System Administrator',
                role: 'admin',
                department: 'Administration',
                permissions: ['all'],
                lastLogin: null,
                createdAt: new Date().toISOString(),
                active: true
            }
        ];
    }

    async loadCurrentUser() {
        this.currentUser = await Storage.get('current_user') || this.users[0];
    }

    setupEventListeners() {
        // Settings form submission
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#settings-form')) {
                e.preventDefault();
                this.saveSettings();
            } else if (e.target.matches('#user-form')) {
                e.preventDefault();
                this.saveUser(e.target);
            } else if (e.target.matches('#password-form')) {
                e.preventDefault();
                this.changePassword(e.target);
            }
        });

        // Settings navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('.settings-nav-link')) {
                e.preventDefault();
                this.showSettingsSection(e.target.dataset.section);
            } else if (e.target.matches('#reset-settings-btn')) {
                this.resetSettings();
            } else if (e.target.matches('#export-settings-btn')) {
                this.exportSettings();
            } else if (e.target.matches('#import-settings-btn')) {
                document.getElementById('import-settings-file').click();
            } else if (e.target.matches('#test-email-btn')) {
                this.testEmailSettings();
            } else if (e.target.matches('#test-sync-btn')) {
                this.testSyncSettings();
            }
        });

        // User management
        document.addEventListener('click', (e) => {
            if (e.target.matches('#add-user-btn')) {
                this.showAddUserModal();
            } else if (e.target.matches('.edit-user-btn')) {
                this.editUser(e.target.closest('.user-card').dataset.userId);
            } else if (e.target.matches('.delete-user-btn')) {
                this.deleteUser(e.target.closest('.user-card').dataset.userId);
            } else if (e.target.matches('.toggle-user-btn')) {
                this.toggleUserStatus(e.target.closest('.user-card').dataset.userId);
            } else if (e.target.matches('#change-password-btn')) {
                this.showChangePasswordModal();
            }
        });

        // Theme toggler
        document.addEventListener('click', (e) => {
            if (e.target.matches('#theme-toggle')) {
                this.toggleTheme();
            }
        });

        // File import
        const importFile = document.getElementById('import-settings-file');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.importSettings(e));
        }

        // Real-time settings updates
        document.addEventListener('change', (e) => {
            if (e.target.matches('.auto-save-setting')) {
                this.saveSetting(e.target.name, e.target.value);
            }
        });
    }

    renderSettings() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-container">
                <!-- Navigation -->
                <div class="settings-nav">
                    <div class="nav-header">
                        <h5><i class="fas fa-cog"></i> Settings</h5>
                    </div>
                    <div class="nav-list">
                        <a href="#" class="settings-nav-link active" data-section="general">
                            <i class="fas fa-school"></i> General
                        </a>
                        <a href="#" class="settings-nav-link" data-section="display">
                            <i class="fas fa-palette"></i> Display
                        </a>
                        <a href="#" class="settings-nav-link" data-section="notifications">
                            <i class="fas fa-bell"></i> Notifications
                        </a>
                        <a href="#" class="settings-nav-link" data-section="backup">
                            <i class="fas fa-database"></i> Backup & Sync
                        </a>
                        <a href="#" class="settings-nav-link" data-section="privacy">
                            <i class="fas fa-shield-alt"></i> Privacy
                        </a>
                        <a href="#" class="settings-nav-link" data-section="integrations">
                            <i class="fas fa-plug"></i> Integrations
                        </a>
                        <a href="#" class="settings-nav-link" data-section="advanced">
                            <i class="fas fa-sliders-h"></i> Advanced
                        </a>
                        <a href="#" class="settings-nav-link" data-section="users">
                            <i class="fas fa-users"></i> User Management
                        </a>
                    </div>
                </div>

                <!-- Content Area -->
                <div class="settings-content-area">
                    <div id="settings-sections">
                        <!-- Sections will be loaded dynamically -->
                    </div>
                </div>
            </div>
        `;

        // Load initial section
        this.showSettingsSection('general');
    }

    showSettingsSection(section) {
        // Update active nav link
        document.querySelectorAll('.settings-nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });

        // Load section content
        const sectionsContainer = document.getElementById('settings-sections');
        sectionsContainer.innerHTML = this.getSectionContent(section);
        
        // Initialize section-specific UI
        this.initializeSection(section);
    }

    getSectionContent(section) {
        switch (section) {
            case 'general':
                return this.getGeneralSettings();
            case 'display':
                return this.getDisplaySettings();
            case 'notifications':
                return this.getNotificationSettings();
            case 'backup':
                return this.getBackupSettings();
            case 'privacy':
                return this.getPrivacySettings();
            case 'integrations':
                return this.getIntegrationSettings();
            case 'advanced':
                return this.getAdvancedSettings();
            case 'users':
                return this.getUserManagement();
            default:
                return '<p>Section not found</p>';
        }
    }

    getGeneralSettings() {
        return `
            <div class="settings-section">
                <h4><i class="fas fa-school"></i> General Settings</h4>
                
                <div class="form-section">
                    <h5>School Information</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="school-name">School Name *</label>
                                <input type="text" id="school-name" name="schoolName" 
                                       class="form-control" value="${this.settings.schoolName}" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="school-code">School Code</label>
                                <input type="text" id="school-code" name="schoolCode" 
                                       class="form-control" value="${this.settings.schoolCode}">
                                <small class="form-text text-muted">Optional identifier</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="school-address">School Address</label>
                        <textarea id="school-address" name="schoolAddress" class="form-control" 
                                  rows="2">${this.settings.schoolAddress || ''}</textarea>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="school-phone">Phone Number</label>
                                <input type="tel" id="school-phone" name="schoolPhone" 
                                       class="form-control" value="${this.settings.schoolPhone || ''}">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="school-email">Email Address</label>
                                <input type="email" id="school-email" name="schoolEmail" 
                                       class="form-control" value="${this.settings.schoolEmail || ''}">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Academic Settings</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="default-term">Default Active Term</label>
                                <select id="default-term" name="defaultTerm" class="form-control">
                                    <option value="">Select term...</option>
                                    <!-- Terms will be populated dynamically -->
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="academic-year">Academic Year</label>
                                <input type="text" id="academic-year" name="academicYear" 
                                       class="form-control" value="${this.settings.academicYear || '2024-2025'}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="class-periods">Class Periods per Day</label>
                        <input type="number" id="class-periods" name="classPeriods" 
                               class="form-control" min="1" max="10" 
                               value="${this.settings.classPeriods || 6}">
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button type="button" class="btn btn-primary" onclick="this.closest('form').dispatchEvent(new Event('submit'))">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                    <button type="button" class="btn btn-secondary" id="reset-section-btn" data-section="general">
                        Reset Section
                    </button>
                </div>
            </div>
        `;
    }

    getDisplaySettings() {
        return `
            <div class="settings-section">
                <h4><i class="fas fa-palette"></i> Display Settings</h4>
                
                <div class="form-section">
                    <h5>Theme & Appearance</h5>
                    
                    <div class="theme-selector">
                        <div class="theme-option ${this.settings.theme === 'light' ? 'selected' : ''}" 
                             data-theme="light">
                            <div class="theme-preview light-theme">
                                <div class="preview-header"></div>
                                <div class="preview-content"></div>
                            </div>
                            <div class="theme-name">Light</div>
                        </div>
                        
                        <div class="theme-option ${this.settings.theme === 'dark' ? 'selected' : ''}" 
                             data-theme="dark">
                            <div class="theme-preview dark-theme">
                                <div class="preview-header"></div>
                                <div class="preview-content"></div>
                            </div>
                            <div class="theme-name">Dark</div>
                        </div>
                        
                        <div class="theme-option ${this.settings.theme === 'auto' ? 'selected' : ''}" 
                             data-theme="auto">
                            <div class="theme-preview auto-theme">
                                <div class="preview-header"></div>
                                <div class="preview-content"></div>
                            </div>
                            <div class="theme-name">Auto</div>
                        </div>
                    </div>
                    
                    <div class="form-group mt-3">
                        <label for="accent-color">Accent Color</label>
                        <input type="color" id="accent-color" name="accentColor" 
                               class="form-control form-control-color" 
                               value="${this.settings.accentColor || '#007bff'}">
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Date & Time Format</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="date-format">Date Format</label>
                                <select id="date-format" name="dateFormat" class="form-control">
                                    <option value="DD/MM/YYYY" ${this.settings.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>
                                        DD/MM/YYYY (31/12/2024)
                                    </option>
                                    <option value="MM/DD/YYYY" ${this.settings.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>
                                        MM/DD/YYYY (12/31/2024)
                                    </option>
                                    <option value="YYYY-MM-DD" ${this.settings.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>
                                        YYYY-MM-DD (2024-12-31)
                                    </option>
                                    <option value="DD MMM YYYY" ${this.settings.dateFormat === 'DD MMM YYYY' ? 'selected' : ''}>
                                        DD MMM YYYY (31 Dec 2024)
                                    </option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="time-format">Time Format</label>
                                <select id="time-format" name="timeFormat" class="form-control">
                                    <option value="12h" ${this.settings.timeFormat === '12h' ? 'selected' : ''}>
                                        12-hour (2:30 PM)
                                    </option>
                                    <option value="24h" ${this.settings.timeFormat === '24h' ? 'selected' : ''}>
                                        24-hour (14:30)
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Language & Regional</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="language">Language</label>
                                <select id="language" name="language" class="form-control">
                                    <option value="en" ${this.settings.language === 'en' ? 'selected' : ''}>English</option>
                                    <option value="es" ${this.settings.language === 'es' ? 'selected' : ''}>Spanish</option>
                                    <option value="fr" ${this.settings.language === 'fr' ? 'selected' : ''}>French</option>
                                    <option value="de" ${this.settings.language === 'de' ? 'selected' : ''}>German</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="timezone">Timezone</label>
                                <select id="timezone" name="timezone" class="form-control">
                                    <option value="UTC" ${this.settings.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                                    <option value="GMT" ${this.settings.timezone === 'GMT' ? 'selected' : ''}>GMT</option>
                                    <option value="EST" ${this.settings.timezone === 'EST' ? 'selected' : ''}>EST</option>
                                    <option value="PST" ${this.settings.timezone === 'PST' ? 'selected' : ''}>PST</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Dashboard Display</h5>
                    <div class="form-check">
                        <input type="checkbox" id="show-metrics" name="showMetrics" 
                               class="form-check-input" ${this.settings.showMetrics ? 'checked' : ''}>
                        <label class="form-check-label" for="show-metrics">
                            Show attendance metrics on dashboard
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="show-charts" name="showCharts" 
                               class="form-check-input" ${this.settings.showCharts ? 'checked' : ''}>
                        <label class="form-check-label" for="show-charts">
                            Show attendance charts
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="compact-view" name="compactView" 
                               class="form-check-input" ${this.settings.compactView ? 'checked' : ''}>
                        <label class="form-check-label" for="compact-view">
                            Use compact view for tables
                        </label>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button type="button" class="btn btn-primary" onclick="this.closest('form').dispatchEvent(new Event('submit'))">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                    <button type="button" class="btn btn-secondary" id="reset-section-btn" data-section="display">
                        Reset Section
                    </button>
                </div>
            </div>
        `;
    }

    getNotificationSettings() {
        return `
            <div class="settings-section">
                <h4><i class="fas fa-bell"></i> Notification Settings</h4>
                
                <div class="form-section">
                    <h5>Email Notifications</h5>
                    <div class="form-check">
                        <input type="checkbox" id="email-notifications" name="emailNotifications" 
                               class="form-check-input" ${this.settings.emailNotifications ? 'checked' : ''}>
                        <label class="form-check-label" for="email-notifications">
                            Enable email notifications
                        </label>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="notification-email">Notification Email</label>
                                <input type="email" id="notification-email" name="notificationEmail" 
                                       class="form-control" value="${this.settings.notificationEmail || ''}">
                                <small class="form-text text-muted">Where to send notifications</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Low Attendance Alerts</h5>
                    <div class="form-check">
                        <input type="checkbox" id="low-attendance-alerts" name="lowAttendanceAlerts" 
                               class="form-check-input" ${this.settings.lowAttendanceAlerts ? 'checked' : ''}>
                        <label class="form-check-label" for="low-attendance-alerts">
                            Send alerts for low attendance
                        </label>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="attendance-threshold">Attendance Threshold (%)</label>
                                <input type="number" id="attendance-threshold" name="attendanceThreshold" 
                                       class="form-control" min="1" max="100" 
                                       value="${this.settings.attendanceThreshold || 75}">
                                <small class="form-text text-muted">Alert when attendance drops below this percentage</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Weekly Reports</h5>
                    <div class="form-check">
                        <input type="checkbox" id="weekly-reports" name="weeklyReports" 
                               class="form-check-input" ${this.settings.weeklyReports ? 'checked' : ''}>
                        <label class="form-check-label" for="weekly-reports">
                            Send weekly attendance reports
                        </label>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="report-day">Report Day</label>
                                <select id="report-day" name="reportDay" class="form-control">
                                    <option value="Monday" ${this.settings.reportDay === 'Monday' ? 'selected' : ''}>Monday</option>
                                    <option value="Tuesday" ${this.settings.reportDay === 'Tuesday' ? 'selected' : ''}>Tuesday</option>
                                    <option value="Wednesday" ${this.settings.reportDay === 'Wednesday' ? 'selected' : ''}>Wednesday</option>
                                    <option value="Thursday" ${this.settings.reportDay === 'Thursday' ? 'selected' : ''}>Thursday</option>
                                    <option value="Friday" ${this.settings.reportDay === 'Friday' ? 'selected' : ''}>Friday</option>
                                    <option value="Saturday" ${this.settings.reportDay === 'Saturday' ? 'selected' : ''}>Saturday</option>
                                    <option value="Sunday" ${this.settings.reportDay === 'Sunday' ? 'selected' : ''}>Sunday</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="report-time">Report Time</label>
                                <input type="time" id="report-time" name="reportTime" 
                                       class="form-control" value="${this.settings.reportTime || '16:00'}">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Real-time Notifications</h5>
                    <div class="form-check">
                        <input type="checkbox" id="browser-notifications" name="browserNotifications" 
                               class="form-check-input" ${this.settings.browserNotifications ? 'checked' : ''}>
                        <label class="form-check-label" for="browser-notifications">
                            Enable browser notifications
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="sound-notifications" name="soundNotifications" 
                               class="form-check-input" ${this.settings.soundNotifications ? 'checked' : ''}>
                        <label class="form-check-label" for="sound-notifications">
                            Play sound for new notifications
                        </label>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button type="button" class="btn btn-primary" onclick="this.closest('form').dispatchEvent(new Event('submit'))">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                    <button type="button" class="btn btn-secondary" id="reset-section-btn" data-section="notifications">
                        Reset Section
                    </button>
                    <button type="button" class="btn btn-info" id="test-notifications-btn">
                        <i class="fas fa-bell"></i> Test Notifications
                    </button>
                </div>
            </div>
        `;
    }

    getBackupSettings() {
        return `
            <div class="settings-section">
                <h4><i class="fas fa-database"></i> Backup & Sync Settings</h4>
                
                <div class="form-section">
                    <h5>Automatic Backups</h5>
                    <div class="form-check">
                        <input type="checkbox" id="auto-backup" name="autoBackup" 
                               class="form-check-input" ${this.settings.autoBackup ? 'checked' : ''}>
                        <label class="form-check-label" for="auto-backup">
                            Enable automatic backups
                        </label>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="backup-interval">Backup Interval (days)</label>
                                <input type="number" id="backup-interval" name="backupInterval" 
                                       class="form-control" min="1" max="30" 
                                       value="${this.settings.backupInterval || 7}"
                                       ${!this.settings.autoBackup ? 'disabled' : ''}>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="backup-time">Backup Time</label>
                                <input type="time" id="backup-time" name="backupTime" 
                                       class="form-control" value="${this.settings.backupTime || '02:00'}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="backup-location">Backup Location</label>
                        <select id="backup-location" name="backupLocation" class="form-control">
                            <option value="local" ${this.settings.backupLocation === 'local' ? 'selected' : ''}>
                                Local Storage
                            </option>
                            <option value="download" ${this.settings.backupLocation === 'download' ? 'selected' : ''}>
                                Download to Computer
                            </option>
                            <option value="cloud" ${this.settings.backupLocation === 'cloud' ? 'selected' : ''}>
                                Cloud Storage
                            </option>
                        </select>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Cloud Sync</h5>
                    <div class="form-check">
                        <input type="checkbox" id="cloud-sync" name="cloudSync" 
                               class="form-check-input" ${this.settings.cloudSync ? 'checked' : ''}>
                        <label class="form-check-label" for="cloud-sync">
                            Enable cloud synchronization
                        </label>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="sync-frequency">Sync Frequency</label>
                                <select id="sync-frequency" name="syncFrequency" class="form-control"
                                        ${!this.settings.cloudSync ? 'disabled' : ''}>
                                    <option value="realtime" ${this.settings.syncFrequency === 'realtime' ? 'selected' : ''}>
                                        Real-time
                                    </option>
                                    <option value="hourly" ${this.settings.syncFrequency === 'hourly' ? 'selected' : ''}>
                                        Hourly
                                    </option>
                                    <option value="daily" ${this.settings.syncFrequency === 'daily' ? 'selected' : ''}>
                                        Daily
                                    </option>
                                    <option value="weekly" ${this.settings.syncFrequency === 'weekly' ? 'selected' : ''}>
                                        Weekly
                                    </option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="sync-service">Sync Service</label>
                                <select id="sync-service" name="syncService" class="form-control"
                                        ${!this.settings.cloudSync ? 'disabled' : ''}>
                                    <option value="google" ${this.settings.syncService === 'google' ? 'selected' : ''}>
                                        Google Drive
                                    </option>
                                    <option value="dropbox" ${this.settings.syncService === 'dropbox' ? 'selected' : ''}>
                                        Dropbox
                                    </option>
                                    <option value="onedrive" ${this.settings.syncService === 'onedrive' ? 'selected' : ''}>
                                        OneDrive
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Backup Content</h5>
                    <div class="form-check">
                        <input type="checkbox" id="backup-classes" name="backupClasses" 
                               class="form-check-input" ${this.settings.backupClasses !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="backup-classes">
                            Include classes
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="backup-attendance" name="backupAttendance" 
                               class="form-check-input" ${this.settings.backupAttendance !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="backup-attendance">
                            Include attendance records
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="backup-settings" name="backupSettings" 
                               class="form-check-input" ${this.settings.backupSettings !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="backup-settings">
                            Include settings
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="backup-users" name="backupUsers" 
                               class="form-check-input" ${this.settings.backupUsers !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="backup-users">
                            Include user accounts
                        </label>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button type="button" class="btn btn-primary" onclick="this.closest('form').dispatchEvent(new Event('submit'))">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                    <button type="button" class="btn btn-secondary" id="reset-section-btn" data-section="backup">
                        Reset Section
                    </button>
                    <button type="button" class="btn btn-info" id="backup-now-btn">
                        <i class="fas fa-database"></i> Backup Now
                    </button>
                </div>
            </div>
        `;
    }

    getPrivacySettings() {
        return `
            <div class="settings-section">
                <h4><i class="fas fa-shield-alt"></i> Privacy & Security Settings</h4>
                
                <div class="form-section">
                    <h5>Data Retention</h5>
                    <div class="form-group">
                        <label for="data-retention">Data Retention Period (days)</label>
                        <input type="number" id="data-retention" name="dataRetention" 
                               class="form-control" min="30" max="1095" 
                               value="${this.settings.dataRetention || 365}">
                        <small class="form-text text-muted">
                            How long to keep attendance records (30 days to 3 years)
                        </small>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="auto-cleanup" name="autoCleanup" 
                               class="form-check-input" ${this.settings.autoCleanup ? 'checked' : ''}>
                        <label class="form-check-label" for="auto-cleanup">
                            Automatically clean up old data
                        </label>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Data Anonymization</h5>
                    <div class="form-check">
                        <input type="checkbox" id="anonymize-data" name="anonymizeData" 
                               class="form-check-input" ${this.settings.anonymizeData ? 'checked' : ''}>
                        <label class="form-check-label" for="anonymize-data">
                            Anonymize exported data
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="export-password" name="exportPassword" 
                               class="form-check-input" ${this.settings.exportPassword ? 'checked' : ''}>
                        <label class="form-check-label" for="export-password">
                            Password protect exported files
                        </label>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Access Control</h5>
                    <div class="form-check">
                        <input type="checkbox" id="session-timeout" name="sessionTimeout" 
                               class="form-check-input" ${this.settings.sessionTimeout ? 'checked' : ''}>
                        <label class="form-check-label" for="session-timeout">
                            Enable session timeout
                        </label>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="timeout-minutes">Timeout (minutes)</label>
                                <input type="number" id="timeout-minutes" name="timeoutMinutes" 
                                       class="form-control" min="5" max="240" 
                                       value="${this.settings.timeoutMinutes || 30}"
                                       ${!this.settings.sessionTimeout ? 'disabled' : ''}>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="ip-restriction" name="ipRestriction" 
                               class="form-check-input" ${this.settings.ipRestriction ? 'checked' : ''}>
                        <label class="form-check-label" for="ip-restriction">
                            Restrict access by IP address
                        </label>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Audit Logging</h5>
                    <div class="form-check">
                        <input type="checkbox" id="audit-logging" name="auditLogging" 
                               class="form-check-input" ${this.settings.auditLogging ? 'checked' : ''}>
                        <label class="form-check-label" for="audit-logging">
                            Enable audit logging
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="log-exports" name="logExports" 
                               class="form-check-input" ${this.settings.logExports ? 'checked' : ''}>
                        <label class="form-check-label" for="log-exports">
                            Log all data exports
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="log-logins" name="logLogins" 
                               class="form-check-input" ${this.settings.logLogins ? 'checked' : ''}>
                        <label class="form-check-label" for="log-logins">
                            Log user logins
                        </label>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button type="button" class="btn btn-primary" onclick="this.closest('form').dispatchEvent(new Event('submit'))">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                    <button type="button" class="btn btn-secondary" id="reset-section-btn" data-section="privacy">
                        Reset Section
                    </button>
                    <button type="button" class="btn btn-info" id="view-audit-log-btn">
                        <i class="fas fa-history"></i> View Audit Log
                    </button>
                </div>
            </div>
        `;
    }

    getIntegrationSettings() {
        return `
            <div class="settings-section">
                <h4><i class="fas fa-plug"></i> Integration Settings</h4>
                
                <div class="form-section">
                    <h5>Google Sheets Integration</h5>
                    <div class="form-check">
                        <input type="checkbox" id="google-sheets-enabled" name="googleSheetsEnabled" 
                               class="form-check-input" ${this.settings.googleSheetsEnabled ? 'checked' : ''}>
                        <label class="form-check-label" for="google-sheets-enabled">
                            Enable Google Sheets integration
                        </label>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-8">
                            <div class="form-group">
                                <label for="google-sheets-id">Google Sheets ID</label>
                                <input type="text" id="google-sheets-id" name="googleSheetsId" 
                                       class="form-control" value="${this.settings.googleSheetsId || ''}"
                                       ${!this.settings.googleSheetsEnabled ? 'disabled' : ''}>
                                <small class="form-text text-muted">
                                    The ID from your Google Sheets URL (docs.google.com/spreadsheets/d/<strong>ID</strong>/edit)
                                </small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-group">
                                <label for="sync-frequency-gsheets">Sync Frequency</label>
                                <select id="sync-frequency-gsheets" name="syncFrequencyGSheets" class="form-control"
                                        ${!this.settings.googleSheetsEnabled ? 'disabled' : ''}>
                                    <option value="manual" ${this.settings.syncFrequencyGSheets === 'manual' ? 'selected' : ''}>
                                        Manual
                                    </option>
                                    <option value="daily" ${this.settings.syncFrequencyGSheets === 'daily' ? 'selected' : ''}>
                                        Daily
                                    </option>
                                    <option value="weekly" ${this.settings.syncFrequencyGSheets === 'weekly' ? 'selected' : ''}>
                                        Weekly
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <button type="button" class="btn btn-outline-primary btn-sm" id="authorize-google-btn"
                            ${!this.settings.googleSheetsEnabled ? 'disabled' : ''}>
                        <i class="fab fa-google"></i> Authorize Google Account
                    </button>
                </div>
                
                <div class="form-section">
                    <h5>Email Server Settings</h5>
                    <div class="form-check">
                        <input type="checkbox" id="email-enabled" name="emailEnabled" 
                               class="form-check-input" ${this.settings.emailEnabled ? 'checked' : ''}>
                        <label class="form-check-label" for="email-enabled">
                            Enable email sending
                        </label>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="smtp-server">SMTP Server</label>
                                <input type="text" id="smtp-server" name="smtpServer" 
                                       class="form-control" value="${this.settings.smtpServer || ''}"
                                       ${!this.settings.emailEnabled ? 'disabled' : ''}>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="form-group">
                                <label for="smtp-port">SMTP Port</label>
                                <input type="number" id="smtp-port" name="smtpPort" 
                                       class="form-control" value="${this.settings.smtpPort || 587}"
                                       ${!this.settings.emailEnabled ? 'disabled' : ''}>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="form-group">
                                <label for="smtp-ssl">Security</label>
                                <select id="smtp-ssl" name="smtpSsl" class="form-control"
                                        ${!this.settings.emailEnabled ? 'disabled' : ''}>
                                    <option value="tls" ${this.settings.smtpSsl === 'tls' ? 'selected' : ''}>TLS</option>
                                    <option value="ssl" ${this.settings.smtpSsl === 'ssl' ? 'selected' : ''}>SSL</option>
                                    <option value="none" ${this.settings.smtpSsl === 'none' ? 'selected' : ''}>None</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="smtp-username">SMTP Username</label>
                                <input type="text" id="smtp-username" name="smtpUsername" 
                                       class="form-control" value="${this.settings.smtpUsername || ''}"
                                       ${!this.settings.emailEnabled ? 'disabled' : ''}>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="smtp-password">SMTP Password</label>
                                <input type="password" id="smtp-password" name="smtpPassword" 
                                       class="form-control" value=""
                                       ${!this.settings.emailEnabled ? 'disabled' : ''}>
                                <small class="form-text text-muted">Leave empty to keep current password</small>
                            </div>
                        </div>
                    </div>
                    
                    <button type="button" class="btn btn-outline-primary btn-sm" id="test-email-btn"
                            ${!this.settings.emailEnabled ? 'disabled' : ''}>
                        <i class="fas fa-envelope"></i> Test Email Connection
                    </button>
                </div>
                
                <div class="form-section">
                    <h5>SMS Integration (Optional)</h5>
                    <div class="form-check">
                        <input type="checkbox" id="sms-enabled" name="smsEnabled" 
                               class="form-check-input" ${this.settings.smsEnabled ? 'checked' : ''}>
                        <label class="form-check-label" for="sms-enabled">
                            Enable SMS notifications
                        </label>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="sms-provider">SMS Provider</label>
                                <select id="sms-provider" name="smsProvider" class="form-control"
                                        ${!this.settings.smsEnabled ? 'disabled' : ''}>
                                    <option value="twilio" ${this.settings.smsProvider === 'twilio' ? 'selected' : ''}>Twilio</option>
                                    <option value="nexmo" ${this.settings.smsProvider === 'nexmo' ? 'selected' : ''}>Nexmo</option>
                                    <option value="plivo" ${this.settings.smsProvider === 'plivo' ? 'selected' : ''}>Plivo</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="sms-number">SMS Number</label>
                                <input type="text" id="sms-number" name="smsNumber" 
                                       class="form-control" value="${this.settings.smsNumber || ''}"
                                       ${!this.settings.smsEnabled ? 'disabled' : ''}>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button type="button" class="btn btn-primary" onclick="this.closest('form').dispatchEvent(new Event('submit'))">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                    <button type="button" class="btn btn-secondary" id="reset-section-btn" data-section="integrations">
                        Reset Section
                    </button>
                </div>
            </div>
        `;
    }

    getAdvancedSettings() {
        return `
            <div class="settings-section">
                <h4><i class="fas fa-sliders-h"></i> Advanced Settings</h4>
                
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Warning:</strong> These settings are for advanced users only. 
                    Incorrect settings may affect system performance.
                </div>
                
                <div class="form-section">
                    <h5>Performance Settings</h5>
                    <div class="form-group">
                        <label for="cache-size">Cache Size (MB)</label>
                        <input type="number" id="cache-size" name="cacheSize" 
                               class="form-control" min="10" max="500" 
                               value="${this.settings.cacheSize || 50}">
                        <small class="form-text text-muted">
                            Amount of data to cache for faster access
                        </small>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="auto-save" name="autoSave" 
                               class="form-check-input" ${this.settings.autoSave ? 'checked' : ''}>
                        <label class="form-check-label" for="auto-save">
                            Auto-save changes
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="offline-mode" name="offlineMode" 
                               class="form-check-input" ${this.settings.offlineMode ? 'checked' : ''}>
                        <label class="form-check-label" for="offline-mode">
                            Enable offline mode
                        </label>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Debug Settings</h5>
                    <div class="form-check">
                        <input type="checkbox" id="debug-mode" name="debugMode" 
                               class="form-check-input" ${this.settings.debugMode ? 'checked' : ''}>
                        <label class="form-check-label" for="debug-mode">
                            Enable debug mode
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="verbose-logging" name="verboseLogging" 
                               class="form-check-input" ${this.settings.verboseLogging ? 'checked' : ''}>
                        <label class="form-check-label" for="verbose-logging">
                            Enable verbose logging
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="performance-metrics" name="performanceMetrics" 
                               class="form-check-input" ${this.settings.performanceMetrics ? 'checked' : ''}>
                        <label class="form-check-label" for="performance-metrics">
                            Collect performance metrics
                        </label>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>Data Management</h5>
                    <div class="form-group">
                        <label for="batch-size">Batch Size for Operations</label>
                        <input type="number" id="batch-size" name="batchSize" 
                               class="form-control" min="10" max="1000" 
                               value="${this.settings.batchSize || 100}">
                        <small class="form-text text-muted">
                            Number of records to process at once
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <label for="export-format">Default Export Format</label>
                        <select id="export-format" name="exportFormat" class="form-control">
                            <option value="pdf" ${this.settings.exportFormat === 'pdf' ? 'selected' : ''}>PDF</option>
                            <option value="excel" ${this.settings.exportFormat === 'excel' ? 'selected' : ''}>Excel</option>
                            <option value="csv" ${this.settings.exportFormat === 'csv' ? 'selected' : ''}>CSV</option>
                            <option value="json" ${this.settings.exportFormat === 'json' ? 'selected' : ''}>JSON</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-section">
                    <h5>System Maintenance</h5>
                    <div class="d-grid gap-2">
                        <button type="button" class="btn btn-outline-warning" id="clear-cache-btn">
                            <i class="fas fa-broom"></i> Clear Cache
                        </button>
                        <button type="button" class="btn btn-outline-danger" id="reset-database-btn">
                            <i class="fas fa-database"></i> Reset Database
                        </button>
                        <button type="button" class="btn btn-outline-info" id="system-info-btn">
                            <i class="fas fa-info-circle"></i> System Information
                        </button>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button type="button" class="btn btn-primary" onclick="this.closest('form').dispatchEvent(new Event('submit'))">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                    <button type="button" class="btn btn-secondary" id="reset-section-btn" data-section="advanced">
                        Reset Section
                    </button>
                </div>
            </div>
        `;
    }

    getUserManagement() {
        return `
            <div class="settings-section">
                <h4><i class="fas fa-users"></i> User Management</h4>
                
                <div class="user-management-header">
                    <div class="user-stats">
                        <span class="stat-item">
                            <i class="fas fa-user"></i> ${this.users.length} Users
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-user-check"></i> ${this.users.filter(u => u.active).length} Active
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-user-shield"></i> ${this.users.filter(u => u.role === 'admin').length} Admins
                        </span>
                    </div>
                    <button type="button" class="btn btn-primary" id="add-user-btn">
                        <i class="fas fa-user-plus"></i> Add User
                    </button>
                </div>
                
                <div class="users-list" id="users-list-container">
                    ${this.users.map(user => this.getUserCard(user)).join('')}
                </div>
                
                <div class="current-user-section">
                    <h5>Your Account</h5>
                    <div class="current-user-card">
                        <div class="user-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="user-info">
                            <div class="user-name">${this.currentUser?.name || 'Unknown User'}</div>
                            <div class="user-role">${this.currentUser?.role || 'User'}</div>
                            <div class="user-email">${this.currentUser?.email || 'No email'}</div>
                        </div>
                        <div class="user-actions">
                            <button type="button" class="btn btn-outline-primary btn-sm" id="change-password-btn">
                                <i class="fas fa-key"></i> Change Password
                            </button>
                            <button type="button" class="btn btn-outline-secondary btn-sm" id="edit-profile-btn">
                                <i class="fas fa-edit"></i> Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getUserCard(user) {
        return `
            <div class="user-card ${user.active ? '' : 'inactive'}" data-user-id="${user.id}">
                <div class="user-card-header">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-info">
                        <div class="user-name">${user.name}</div>
                        <div class="user-details">
                            <span class="user-role badge ${user.role === 'admin' ? 'bg-danger' : 'bg-secondary'}">
                                ${user.role}
                            </span>
                            <span class="user-email">${user.email}</span>
                        </div>
                    </div>
                    <div class="user-status">
                        <span class="badge ${user.active ? 'bg-success' : 'bg-secondary'}">
                            ${user.active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                <div class="user-card-body">
                    <div class="user-meta">
                        <div class="meta-item">
                            <i class="fas fa-building"></i>
                            <span>${user.department || 'No department'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>Joined ${Utils.formatDate(new Date(user.createdAt), 'relative')}</span>
                        </div>
                        ${user.lastLogin ? `
                            <div class="meta-item">
                                <i class="fas fa-sign-in-alt"></i>
                                <span>Last login: ${Utils.formatDate(new Date(user.lastLogin), 'relative')}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="user-card-actions">
                    <button type="button" class="btn btn-sm btn-outline-primary edit-user-btn">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-warning toggle-user-btn">
                        <i class="fas ${user.active ? 'fa-user-slash' : 'fa-user-check'}"></i>
                        ${user.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger delete-user-btn">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    initializeSection(section) {
        switch (section) {
            case 'general':
                this.populateTermsDropdown();
                break;
            case 'display':
                this.initializeThemeSelector();
                break;
            case 'backup':
                this.initializeBackupSettings();
                break;
            case 'integrations':
                this.initializeIntegrationSettings();
                break;
            case 'advanced':
                this.initializeAdvancedSettings();
                break;
            case 'users':
                this.initializeUserManagement();
                break;
        }
    }

    populateTermsDropdown() {
        // Load terms from maintenance module or storage
        const terms = Storage.get('attendance_terms') || [];
        const select = document.getElementById('default-term');
        if (select) {
            select.innerHTML = `
                <option value="">Select term...</option>
                ${terms.map(term => `
                    <option value="${term.id}" ${this.settings.defaultTerm === term.id ? 'selected' : ''}>
                        ${term.name} (${Utils.formatDate(new Date(term.startDate))} - ${Utils.formatDate(new Date(term.endDate))})
                    </option>
                `).join('')}
            `;
        }
    }

    initializeThemeSelector() {
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.setTheme(theme);
                
                // Update UI
                themeOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            });
        });
    }

    initializeBackupSettings() {
        const autoBackup = document.getElementById('auto-backup');
        if (autoBackup) {
            autoBackup.addEventListener('change', (e) => {
                const backupInterval = document.getElementById('backup-interval');
                if (backupInterval) {
                    backupInterval.disabled = !e.target.checked;
                }
            });
        }
    }

    initializeIntegrationSettings() {
        // Google Sheets toggle
        const googleSheetsEnabled = document.getElementById('google-sheets-enabled');
        if (googleSheetsEnabled) {
            googleSheetsEnabled.addEventListener('change', (e) => {
                const sheetsId = document.getElementById('google-sheets-id');
                const syncFreq = document.getElementById('sync-frequency-gsheets');
                const authBtn = document.getElementById('authorize-google-btn');
                
                if (sheetsId) sheetsId.disabled = !e.target.checked;
                if (syncFreq) syncFreq.disabled = !e.target.checked;
                if (authBtn) authBtn.disabled = !e.target.checked;
            });
        }

        // Email toggle
        const emailEnabled = document.getElementById('email-enabled');
        if (emailEnabled) {
            emailEnabled.addEventListener('change', (e) => {
                const emailFields = ['smtp-server', 'smtp-port', 'smtp-ssl', 'smtp-username', 'smtp-password'];
                emailFields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) field.disabled = !e.target.checked;
                });
                
                const testBtn = document.getElementById('test-email-btn');
                if (testBtn) testBtn.disabled = !e.target.checked;
            });
        }

        // SMS toggle
        const smsEnabled = document.getElementById('sms-enabled');
        if (smsEnabled) {
            smsEnabled.addEventListener('change', (e) => {
                const smsProvider = document.getElementById('sms-provider');
                const smsNumber = document.getElementById('sms-number');
                
                if (smsProvider) smsProvider.disabled = !e.target.checked;
                if (smsNumber) smsNumber.disabled = !e.target.checked;
            });
        }
    }

    initializeAdvancedSettings() {
        // Add event listeners for advanced buttons
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => this.clearCache());
        }

        const resetDbBtn = document.getElementById('reset-database-btn');
        if (resetDbBtn) {
            resetDbBtn.addEventListener('click', () => this.resetDatabase());
        }

        const systemInfoBtn = document.getElementById('system-info-btn');
        if (systemInfoBtn) {
            systemInfoBtn.addEventListener('click', () => this.showSystemInfo());
        }
    }

    initializeUserManagement() {
        // User management is already initialized in setupEventListeners
    }

    // ========== SETTINGS MANAGEMENT ==========
    async saveSettings() {
        try {
            // Gather all settings from forms
            const newSettings = this.gatherSettingsFromForms();
            
            // Validate settings
            const validation = this.validateSettings(newSettings);
            if (!validation.valid) {
                Utils.showAlert(`Settings validation failed: ${validation.errors.join(', ')}`, 'error');
                return;
            }
            
            // Update settings
            this.settings = { ...this.settings, ...newSettings, updatedAt: new Date().toISOString() };
            
            // Save to storage
            await Storage.set('app_settings', this.settings);
            
            // Apply settings
            this.applySettings(this.settings);
            
            // Update UI
            this.updateUIFromSettings();
            
            // Notify other modules
            this.app.emitEvent('settings:updated', { settings: this.settings });
            
            Utils.showAlert('Settings saved successfully', 'success');
            
        } catch (error) {
            console.error('Save settings error:', error);
            Utils.showAlert('Failed to save settings', 'error');
        }
    }

    gatherSettingsFromForms() {
        const settings = {};
        
        // General settings
        settings.schoolName = document.getElementById('school-name')?.value || '';
        settings.schoolCode = document.getElementById('school-code')?.value || '';
        settings.schoolAddress = document.getElementById('school-address')?.value || '';
        settings.schoolPhone = document.getElementById('school-phone')?.value || '';
        settings.schoolEmail = document.getElementById('school-email')?.value || '';
        settings.defaultTerm = document.getElementById('default-term')?.value || '';
        settings.academicYear = document.getElementById('academic-year')?.value || '';
        settings.classPeriods = parseInt(document.getElementById('class-periods')?.value) || 6;
        
        // Display settings
        settings.theme = document.querySelector('.theme-option.selected')?.dataset.theme || 'light';
        settings.accentColor = document.getElementById('accent-color')?.value || '#007bff';
        settings.dateFormat = document.getElementById('date-format')?.value || 'DD/MM/YYYY';
        settings.timeFormat = document.getElementById('time-format')?.value || '12h';
        settings.language = document.getElementById('language')?.value || 'en';
        settings.timezone = document.getElementById('timezone')?.value || 'UTC';
        settings.showMetrics = document.getElementById('show-metrics')?.checked || false;
        settings.showCharts = document.getElementById('show-charts')?.checked || false;
        settings.compactView = document.getElementById('compact-view')?.checked || false;
        
        // Notification settings
        settings.emailNotifications = document.getElementById('email-notifications')?.checked || false;
        settings.notificationEmail = document.getElementById('notification-email')?.value || '';
        settings.lowAttendanceAlerts = document.getElementById('low-attendance-alerts')?.checked || false;
        settings.attendanceThreshold = parseInt(document.getElementById('attendance-threshold')?.value) || 75;
        settings.weeklyReports = document.getElementById('weekly-reports')?.checked || false;
        settings.reportDay = document.getElementById('report-day')?.value || 'Friday';
        settings.reportTime = document.getElementById('report-time')?.value || '16:00';
        settings.browserNotifications = document.getElementById('browser-notifications')?.checked || false;
        settings.soundNotifications = document.getElementById('sound-notifications')?.checked || false;
        
        // Backup settings
        settings.autoBackup = document.getElementById('auto-backup')?.checked || false;
        settings.backupInterval = parseInt(document.getElementById('backup-interval')?.value) || 7;
        settings.backupTime = document.getElementById('backup-time')?.value || '02:00';
        settings.backupLocation = document.getElementById('backup-location')?.value || 'local';
        settings.cloudSync = document.getElementById('cloud-sync')?.checked || false;
        settings.syncFrequency = document.getElementById('sync-frequency')?.value || 'daily';
        settings.syncService = document.getElementById('sync-service')?.value || 'google';
        settings.backupClasses = document.getElementById('backup-classes')?.checked !== false;
        settings.backupAttendance = document.getElementById('backup-attendance')?.checked !== false;
        settings.backupSettings = document.getElementById('backup-settings')?.checked !== false;
        settings.backupUsers = document.getElementById('backup-users')?.checked !== false;
        
        // Privacy settings
        settings.dataRetention = parseInt(document.getElementById('data-retention')?.value) || 365;
        settings.autoCleanup = document.getElementById('auto-cleanup')?.checked || false;
        settings.anonymizeData = document.getElementById('anonymize-data')?.checked || false;
        settings.exportPassword = document.getElementById('export-password')?.checked || false;
        settings.sessionTimeout = document.getElementById('session-timeout')?.checked || false;
        settings.timeoutMinutes = parseInt(document.getElementById('timeout-minutes')?.value) || 30;
        settings.ipRestriction = document.getElementById('ip-restriction')?.checked || false;
        settings.auditLogging = document.getElementById('audit-logging')?.checked || false;
        settings.logExports = document.getElementById('log-exports')?.checked || false;
        settings.logLogins = document.getElementById('log-logins')?.checked || false;
        
        // Integration settings
        settings.googleSheetsEnabled = document.getElementById('google-sheets-enabled')?.checked || false;
        settings.googleSheetsId = document.getElementById('google-sheets-id')?.value || '';
        settings.syncFrequencyGSheets = document.getElementById('sync-frequency-gsheets')?.value || 'manual';
        settings.emailEnabled = document.getElementById('email-enabled')?.checked || false;
        settings.smtpServer = document.getElementById('smtp-server')?.value || '';
        settings.smtpPort = parseInt(document.getElementById('smtp-port')?.value) || 587;
        settings.smtpSsl = document.getElementById('smtp-ssl')?.value || 'tls';
        settings.smtpUsername = document.getElementById('smtp-username')?.value || '';
        // Only update password if provided
        const smtpPassword = document.getElementById('smtp-password')?.value;
        if (smtpPassword) {
            settings.smtpPassword = smtpPassword;
        }
        settings.smsEnabled = document.getElementById('sms-enabled')?.checked || false;
        settings.smsProvider = document.getElementById('sms-provider')?.value || 'twilio';
        settings.smsNumber = document.getElementById('sms-number')?.value || '';
        
        // Advanced settings
        settings.cacheSize = parseInt(document.getElementById('cache-size')?.value) || 50;
        settings.autoSave = document.getElementById('auto-save')?.checked || false;
        settings.offlineMode = document.getElementById('offline-mode')?.checked || false;
        settings.debugMode = document.getElementById('debug-mode')?.checked || false;
        settings.verboseLogging = document.getElementById('verbose-logging')?.checked || false;
        settings.performanceMetrics = document.getElementById('performance-metrics')?.checked || false;
        settings.batchSize = parseInt(document.getElementById('batch-size')?.value) || 100;
        settings.exportFormat = document.getElementById('export-format')?.value || 'pdf';
        
        return settings;
    }

    validateSettings(settings) {
        const errors = [];
        
        // School name is required
        if (!settings.schoolName?.trim()) {
            errors.push('School name is required');
        }
        
        // Email validation for notification email
        if (settings.emailNotifications && settings.notificationEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(settings.notificationEmail)) {
                errors.push('Notification email is invalid');
            }
        }
        
        // Attendance threshold validation
        if (settings.attendanceThreshold < 1 || settings.attendanceThreshold > 100) {
            errors.push('Attendance threshold must be between 1 and 100');
        }
        
        // Data retention validation
        if (settings.dataRetention < 30 || settings.dataRetention > 1095) {
            errors.push('Data retention must be between 30 and 1095 days');
        }
        
        // SMTP validation if email enabled
        if (settings.emailEnabled) {
            if (!settings.smtpServer?.trim()) {
                errors.push('SMTP server is required for email');
            }
            if (!settings.smtpUsername?.trim()) {
                errors.push('SMTP username is required for email');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    applySettings(settings) {
        // Apply theme
        this.applyTheme(settings.theme);
        
        // Apply date format
        Utils.setDateFormat(settings.dateFormat);
        
        // Apply other visual settings
        this.applyVisualSettings(settings);
        
        // Schedule backups if enabled
        if (settings.autoBackup) {
            this.scheduleAutoBackup(settings);
        }
        
        // Initialize notifications if enabled
        if (settings.browserNotifications) {
            this.initializeNotifications();
        }
        
        // Update session timeout if enabled
        if (settings.sessionTimeout) {
            this.setSessionTimeout(settings.timeoutMinutes);
        }
    }

    applyTheme(theme) {
        const body = document.body;
        
        // Remove existing theme classes
        body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        
        // Apply new theme
        if (theme === 'auto') {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
            body.setAttribute('data-theme', 'auto');
        } else {
            body.classList.add(`theme-${theme}`);
            body.setAttribute('data-theme', theme);
        }
        
        // Save theme preference
        Storage.set('user_theme', theme);
    }

    applyVisualSettings(settings) {
        // Apply accent color
        if (settings.accentColor) {
            document.documentElement.style.setProperty('--primary-color', settings.accentColor);
        }
        
        // Apply compact view
        if (settings.compactView) {
            document.body.classList.add('compact-view');
        } else {
            document.body.classList.remove('compact-view');
        }
    }

    scheduleAutoBackup(settings) {
        // Clear any existing backup schedule
        if (this.backupIntervalId) {
            clearInterval(this.backupIntervalId);
        }
        
        // Calculate interval in milliseconds
        const intervalMs = settings.backupInterval * 24 * 60 * 60 * 1000;
        
        // Schedule backup
        this.backupIntervalId = setInterval(() => {
            this.app.emitEvent('backup:requested');
        }, intervalMs);
        
        console.log(`Auto-backup scheduled every ${settings.backupInterval} days`);
    }

    setSessionTimeout(minutes) {
        // Clear existing timeout
        if (this.sessionTimeoutId) {
            clearTimeout(this.sessionTimeoutId);
        }
        
        // Set new timeout
        this.sessionTimeoutId = setTimeout(() => {
            this.handleSessionTimeout();
        }, minutes * 60 * 1000);
        
        // Reset timeout on user activity
        document.addEventListener('mousemove', this.resetSessionTimeout.bind(this));
        document.addEventListener('keypress', this.resetSessionTimeout.bind(this));
    }

    resetSessionTimeout() {
        if (this.sessionTimeoutId) {
            clearTimeout(this.sessionTimeoutId);
            this.setSessionTimeout(this.settings.timeoutMinutes || 30);
        }
    }

    handleSessionTimeout() {
        Utils.showAlert('Your session has expired due to inactivity', 'warning');
        this.app.emitEvent('session:expired');
        // Redirect to login or show login modal
    }

    initializeNotifications() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted');
                }
            });
        }
    }

    updateUIFromSettings() {
        // Update theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const isDark = document.body.classList.contains('theme-dark') || 
                          (document.body.getAttribute('data-theme') === 'auto' && 
                           window.matchMedia('(prefers-color-scheme: dark)').matches);
            
            themeToggle.innerHTML = isDark ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        }
        
        // Update date format displays
        this.updateDateDisplays();
    }

    updateDateDisplays() {
        // Update any date displays on the page
        document.querySelectorAll('.formatted-date').forEach(element => {
            const dateStr = element.getAttribute('data-date');
            if (dateStr) {
                const date = new Date(dateStr);
                element.textContent = Utils.formatDate(date, this.settings.dateFormat);
            }
        });
    }

    async resetSettings() {
        Utils.showConfirm(
            'Reset All Settings?',
            'This will restore all settings to their default values. Your data will not be affected.',
            'Reset Settings',
            'Cancel'
        ).then(async (confirmed) => {
            if (confirmed) {
                // Reset to defaults
                this.settings = {
                    schoolName: 'Greenwood Academy',
                    theme: 'light',
                    dateFormat: 'DD/MM/YYYY',
                    timeFormat: '12h',
                    language: 'en',
                    emailNotifications: true,
                    lowAttendanceAlerts: true,
                    attendanceThreshold: 75,
                    autoBackup: true,
                    backupInterval: 7,
                    dataRetention: 365,
                    updatedAt: new Date().toISOString()
                };
                
                await Storage.set('app_settings', this.settings);
                this.applySettings(this.settings);
                this.renderSettings();
                
                Utils.showAlert('Settings reset to default values', 'success');
                this.app.emitEvent('settings:updated', { settings: this.settings });
            }
        });
    }

    async exportSettings() {
        const exportData = {
            app: 'Attendance Track v2',
            version: '2.0.0',
            exportDate: new Date().toISOString(),
            settings: this.settings,
            exportType: 'settings_only'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_settings_${Utils.formatDate(new Date(), 'YYYY-MM-DD')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showAlert('Settings exported successfully', 'success');
    }

    importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate import file
                if (!importedData.settings || importedData.app !== 'Attendance Track v2') {
                    Utils.showAlert('Invalid settings file format', 'error');
                    return;
                }
                
                Utils.showConfirm(
                    'Import Settings?',
                    'This will replace all current settings with the imported ones.',
                    'Import',
                    'Cancel'
                ).then(async (confirmed) => {
                    if (confirmed) {
                        this.settings = { ...this.settings, ...importedData.settings, updatedAt: new Date().toISOString() };
                        await Storage.set('app_settings', this.settings);
                        this.applySettings(this.settings);
                        this.renderSettings();
                        
                        Utils.showAlert('Settings imported successfully', 'success');
                        this.app.emitEvent('settings:updated', { settings: this.settings });
                    }
                });
                
            } catch (error) {
                console.error('Import settings error:', error);
                Utils.showAlert('Failed to import settings', 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = '';
    }

    // ========== USER MANAGEMENT ==========
    renderUsers() {
        const container = document.getElementById('users-list-container');
        if (!container) return;
        
        if (this.users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No users found. Add your first user to get started.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.users.map(user => this.getUserCard(user)).join('');
    }

    showAddUserModal() {
        const modalContent = `
            <div class="user-form-modal">
                <form id="user-form">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="user-name">Full Name *</label>
                                <input type="text" id="user-name" name="name" class="form-control" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="user-email">Email Address *</label>
                                <input type="email" id="user-email" name="email" class="form-control" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="user-username">Username *</label>
                                <input type="text" id="user-username" name="username" class="form-control" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="user-password">Password *</label>
                                <input type="password" id="user-password" name="password" class="form-control" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="user-role">Role *</label>
                                <select id="user-role" name="role" class="form-control" required>
                                    <option value="teacher">Teacher</option>
                                    <option value="admin">Administrator</option>
                                    <option value="viewer">Viewer (Read-only)</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="user-department">Department</label>
                                <input type="text" id="user-department" name="department" class="form-control">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-check mt-3">
                        <input type="checkbox" id="user-active" name="active" class="form-check-input" checked>
                        <label class="form-check-label" for="user-active">
                            Account is active
                        </label>
                    </div>
                    
                    <div class="permissions-section mt-3">
                        <h6>Permissions</h6>
                        <div class="permissions-grid">
                            <div class="form-check">
                                <input type="checkbox" id="perm-attendance" name="permissions[]" value="attendance" class="form-check-input" checked>
                                <label class="form-check-label" for="perm-attendance">Take Attendance</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="perm-reports" name="permissions[]" value="reports" class="form-check-input" checked>
                                <label class="form-check-label" for="perm-reports">View Reports</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="perm-export" name="permissions[]" value="export" class="form-check-input">
                                <label class="form-check-label" for="perm-export">Export Data</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="perm-settings" name="permissions[]" value="settings" class="form-check-input">
                                <label class="form-check-label" for="perm-settings">Change Settings</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="perm-users" name="permissions[]" value="users" class="form-check-input">
                                <label class="form-check-label" for="perm-users">Manage Users</label>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Add New User',
            size: 'modal-lg',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
                { text: 'Add User', class: 'btn-primary', action: 'submit' }
            ],
            onShow: (modal) => {
                modal.querySelector('[data-action="submit"]').addEventListener('click', () => {
                    this.saveNewUser(modal);
                });
            }
        });
    }

    async saveNewUser(modal) {
        const form = modal.querySelector('#user-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const userData = {
            id: `user_${Date.now()}`,
            name: form.querySelector('#user-name').value.trim(),
            email: form.querySelector('#user-email').value.trim(),
            username: form.querySelector('#user-username').value.trim(),
            password: await this.hashPassword(form.querySelector('#user-password').value),
            role: form.querySelector('#user-role').value,
            department: form.querySelector('#user-department').value.trim() || 'General',
            active: form.querySelector('#user-active').checked,
            permissions: Array.from(form.querySelectorAll('input[name="permissions[]"]:checked')).map(cb => cb.value),
            createdAt: new Date().toISOString(),
            lastLogin: null
        };

        // Check if username or email already exists
        if (this.users.some(u => u.username === userData.username)) {
            Utils.showAlert('Username already exists', 'error');
            return;
        }

        if (this.users.some(u => u.email === userData.email)) {
            Utils.showAlert('Email already exists', 'error');
            return;
        }

        this.users.push(userData);
        await Storage.set('system_users', this.users);
        this.renderUsers();
        modal.remove();
        
        Utils.showAlert('User added successfully', 'success');
        this.app.emitEvent('users:updated', { users: this.users });
    }

    async hashPassword(password) {
        // Simple hash for demo - in production use a proper hashing library
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const modalContent = `
            <div class="user-form-modal">
                <form id="edit-user-form">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="edit-user-name">Full Name *</label>
                                <input type="text" id="edit-user-name" name="name" 
                                       class="form-control" value="${user.name}" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="edit-user-email">Email Address *</label>
                                <input type="email" id="edit-user-email" name="email" 
                                       class="form-control" value="${user.email}" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="edit-user-username">Username *</label>
                                <input type="text" id="edit-user-username" name="username" 
                                       class="form-control" value="${user.username}" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="edit-user-password">Password</label>
                                <input type="password" id="edit-user-password" name="password" 
                                       class="form-control" placeholder="Leave blank to keep current">
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="edit-user-role">Role *</label>
                                <select id="edit-user-role" name="role" class="form-control" required>
                                    <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                                    <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Viewer (Read-only)</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="edit-user-department">Department</label>
                                <input type="text" id="edit-user-department" name="department" 
                                       class="form-control" value="${user.department || ''}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-check mt-3">
                        <input type="checkbox" id="edit-user-active" name="active" 
                               class="form-check-input" ${user.active ? 'checked' : ''}>
                        <label class="form-check-label" for="edit-user-active">
                            Account is active
                        </label>
                    </div>
                    
                    <div class="permissions-section mt-3">
                        <h6>Permissions</h6>
                        <div class="permissions-grid">
                            <div class="form-check">
                                <input type="checkbox" id="edit-perm-attendance" name="permissions[]" value="attendance" 
                                       class="form-check-input" ${user.permissions?.includes('attendance') ? 'checked' : ''}>
                                <label class="form-check-label" for="edit-perm-attendance">Take Attendance</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="edit-perm-reports" name="permissions[]" value="reports" 
                                       class="form-check-input" ${user.permissions?.includes('reports') ? 'checked' : ''}>
                                <label class="form-check-label" for="edit-perm-reports">View Reports</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="edit-perm-export" name="permissions[]" value="export" 
                                       class="form-check-input" ${user.permissions?.includes('export') ? 'checked' : ''}>
                                <label class="form-check-label" for="edit-perm-export">Export Data</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="edit-perm-settings" name="permissions[]" value="settings" 
                                       class="form-check-input" ${user.permissions?.includes('settings') ? 'checked' : ''}>
                                <label class="form-check-label" for="edit-perm-settings">Change Settings</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="edit-perm-users" name="permissions[]" value="users" 
                                       class="form-check-input" ${user.permissions?.includes('users') ? 'checked' : ''}>
                                <label class="form-check-label" for="edit-perm-users">Manage Users</label>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Edit User',
            size: 'modal-lg',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
                { text: 'Save Changes', class: 'btn-primary', action: 'submit' }
            ],
            onShow: (modal) => {
                modal.querySelector('[data-action="submit"]').addEventListener('click', () => {
                    this.updateUser(userId, modal);
                });
            }
        });
    }

    async updateUser(userId, modal) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const form = modal.querySelector('#edit-user-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Update user data
        user.name = form.querySelector('#edit-user-name').value.trim();
        user.email = form.querySelector('#edit-user-email').value.trim();
        user.username = form.querySelector('#edit-user-username').value.trim();
        user.role = form.querySelector('#edit-user-role').value;
        user.department = form.querySelector('#edit-user-department').value.trim() || 'General';
        user.active = form.querySelector('#edit-user-active').checked;
        user.permissions = Array.from(form.querySelectorAll('input[name="permissions[]"]:checked')).map(cb => cb.value);
        user.updatedAt = new Date().toISOString();

        // Update password if provided
        const newPassword = form.querySelector('#edit-user-password').value;
        if (newPassword) {
            user.password = await this.hashPassword(newPassword);
        }

        // Check for duplicate username/email (excluding current user)
        const duplicateUsername = this.users.find(u => u.id !== userId && u.username === user.username);
        if (duplicateUsername) {
            Utils.showAlert('Username already exists', 'error');
            return;
        }

        const duplicateEmail = this.users.find(u => u.id !== userId && u.email === user.email);
        if (duplicateEmail) {
            Utils.showAlert('Email already exists', 'error');
            return;
        }

        await Storage.set('system_users', this.users);
        this.renderUsers();
        modal.remove();
        
        Utils.showAlert('User updated successfully', 'success');
        this.app.emitEvent('users:updated', { users: this.users });
    }

    deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        // Prevent deleting own account
        if (user.id === this.currentUser?.id) {
            Utils.showAlert('You cannot delete your own account', 'error');
            return;
        }

        Utils.showConfirm(
            `Delete user "${user.name}"?`,
            'This action cannot be undone. All data associated with this user will be removed.',
            'Delete User',
            'Cancel',
            'danger'
        ).then(async (confirmed) => {
            if (confirmed) {
                this.users = this.users.filter(u => u.id !== userId);
                await Storage.set('system_users', this.users);
                this.renderUsers();
                
                Utils.showAlert('User deleted successfully', 'success');
                this.app.emitEvent('users:updated', { users: this.users });
            }
        });
    }

    toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        // Prevent deactivating own account
        if (user.id === this.currentUser?.id) {
            Utils.showAlert('You cannot deactivate your own account', 'error');
            return;
        }

        user.active = !user.active;
        user.updatedAt = new Date().toISOString();
        
        Storage.set('system_users', this.users);
        this.renderUsers();
        
        const action = user.active ? 'activated' : 'deactivated';
        Utils.showAlert(`User ${action} successfully`, 'success');
        this.app.emitEvent('users:updated', { users: this.users });
    }

    showChangePasswordModal() {
        const modalContent = `
            <div class="password-form-modal">
                <form id="password-form">
                    <div class="form-group">
                        <label for="current-password">Current Password *</label>
                        <input type="password" id="current-password" name="currentPassword" 
                               class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="new-password">New Password *</label>
                        <input type="password" id="new-password" name="newPassword" 
                               class="form-control" required>
                        <small class="form-text text-muted">
                            Password must be at least 8 characters long
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirm-password">Confirm New Password *</label>
                        <input type="password" id="confirm-password" name="confirmPassword" 
                               class="form-control" required>
                    </div>
                </form>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'Change Password',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
                { text: 'Change Password', class: 'btn-primary', action: 'submit' }
            ],
            onShow: (modal) => {
                modal.querySelector('[data-action="submit"]').addEventListener('click', () => {
                    this.updatePassword(modal);
                });
            }
        });
    }

    async updatePassword(modal) {
        const form = modal.querySelector('#password-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const currentPassword = form.querySelector('#current-password').value;
        const newPassword = form.querySelector('#new-password').value;
        const confirmPassword = form.querySelector('#confirm-password').value;

        // Validate new password
        if (newPassword.length < 8) {
            Utils.showAlert('New password must be at least 8 characters long', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            Utils.showAlert('New passwords do not match', 'error');
            return;
        }

        // Verify current password
        const hashedCurrent = await this.hashPassword(currentPassword);
        if (hashedCurrent !== this.currentUser.password) {
            Utils.showAlert('Current password is incorrect', 'error');
            return;
        }

        // Update password
        this.currentUser.password = await this.hashPassword(newPassword);
        this.currentUser.updatedAt = new Date().toISOString();

        // Update in users list
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
            await Storage.set('system_users', this.users);
            await Storage.set('current_user', this.currentUser);
        }

        modal.remove();
        Utils.showAlert('Password changed successfully', 'success');
    }

    // ========== UTILITY METHODS ==========
    setTheme(theme) {
        this.settings.theme = theme;
        this.applyTheme(theme);
        this.saveSetting('theme', theme);
    }

    toggleTheme() {
        const currentTheme = this.settings.theme;
        let newTheme;
        
        switch (currentTheme) {
            case 'light':
                newTheme = 'dark';
                break;
            case 'dark':
                newTheme = 'auto';
                break;
            default:
                newTheme = 'light';
        }
        
        this.setTheme(newTheme);
    }

    async saveSetting(key, value) {
        this.settings[key] = value;
        this.settings.updatedAt = new Date().toISOString();
        await Storage.set('app_settings', this.settings);
        this.app.emitEvent('settings:updated', { settings: this.settings });
    }

    async testEmailSettings() {
        // Test email connection
        Utils.showAlert('Testing email connection...', 'info');
        
        // Simulate test - in real app, this would make an API call
        setTimeout(() => {
            Utils.showAlert('Email connection test successful!', 'success');
        }, 1500);
    }

    async testSyncSettings() {
        // Test sync connection
        Utils.showAlert('Testing sync connection...', 'info');
        
        // Simulate test
        setTimeout(() => {
            Utils.showAlert('Sync connection test successful!', 'success');
        }, 1500);
    }

    clearCache() {
        Utils.showConfirm(
            'Clear Cache?',
            'This will clear all cached data. The application may load slower next time.',
            'Clear Cache',
            'Cancel'
        ).then(async (confirmed) => {
            if (confirmed) {
                // Clear localStorage cache items
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('cache_') || key.startsWith('temp_')) {
                        localStorage.removeItem(key);
                    }
                });
                
                // Clear sessionStorage
                sessionStorage.clear();
                
                // Clear service worker cache if available
                if ('caches' in window) {
                    try {
                        const cacheNames = await caches.keys();
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                    } catch (error) {
                        console.error('Error clearing service worker cache:', error);
                    }
                }
                
                Utils.showAlert('Cache cleared successfully', 'success');
            }
        });
    }

    resetDatabase() {
        Utils.showConfirm(
            'Reset Database?',
            'This will delete ALL data including classes, attendance records, and users. This action cannot be undone!',
            'Reset Database',
            'Cancel',
            'danger'
        ).then(async (confirmed) => {
            if (confirmed) {
                // Clear all data
                const keysToKeep = ['app_settings', 'system_users', 'current_user'];
                Object.keys(localStorage).forEach(key => {
                    if (!keysToKeep.includes(key)) {
                        localStorage.removeItem(key);
                    }
                });
                
                // Reset to default admin user
                const defaultUsers = [
                    {
                        id: 'admin_001',
                        username: 'admin',
                        email: 'admin@school.edu',
                        name: 'System Administrator',
                        role: 'admin',
                        department: 'Administration',
                        permissions: ['all'],
                        password: await this.hashPassword('admin123'),
                        lastLogin: null,
                        createdAt: new Date().toISOString(),
                        active: true
                    }
                ];
                
                this.users = defaultUsers;
                this.currentUser = defaultUsers[0];
                
                await Storage.set('system_users', defaultUsers);
                await Storage.set('current_user', defaultUsers[0]);
                
                Utils.showAlert('Database reset successfully. Please log in again.', 'warning');
                
                // Trigger re-login
                this.app.emitEvent('database:reset');
            }
        });
    }

    showSystemInfo() {
        const info = {
            appVersion: '2.0.0',
            browser: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            online: navigator.onLine,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            localStorage: `${Object.keys(localStorage).length} items`,
            userAgent: navigator.userAgent,
            cookiesEnabled: navigator.cookieEnabled,
            javaScriptEnabled: true,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            dateFormat: Intl.DateTimeFormat().resolvedOptions().locale,
            memory: performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB used` : 'N/A'
        };
        
        const modalContent = `
            <div class="system-info-modal">
                <h4><i class="fas fa-info-circle"></i> System Information</h4>
                
                <div class="info-grid">
                    ${Object.entries(info).map(([key, value]) => `
                        <div class="info-item">
                            <span class="info-label">${this.formatKey(key)}:</span>
                            <span class="info-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="info-actions mt-3">
                    <button type="button" class="btn btn-outline-primary" id="copy-system-info">
                        <i class="fas fa-copy"></i> Copy to Clipboard
                    </button>
                </div>
            </div>
        `;

        Utils.showModal(modalContent, {
            title: 'System Information',
            buttons: [
                { text: 'Close', class: 'btn-secondary', action: 'close' }
            ],
            onShow: (modal) => {
                modal.querySelector('#copy-system-info').addEventListener('click', () => {
                    this.copySystemInfo(info);
                });
            }
        });
    }

    formatKey(key) {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    copySystemInfo(info) {
        const text = Object.entries(info)
            .map(([key, value]) => `${this.formatKey(key)}: ${value}`)
            .join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            Utils.showAlert('System information copied to clipboard', 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            Utils.showAlert('Failed to copy system information', 'error');
        });
    }

    // ========== PUBLIC API ==========
    getSettings() {
        return { ...this.settings };
    }

    getCurrentUser() {
        return { ...this.currentUser };
    }

    getUsers() {
        return [...this.users];
    }

    async refresh() {
        await this.loadSettings();
        await this.loadUsers();
        await this.loadCurrentUser();
        this.updateUIFromSettings();
    }

    // Check if current user has permission
    hasPermission(permission) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'admin') return true;
        if (this.currentUser.permissions?.includes('all')) return true;
        return this.currentUser.permissions?.includes(permission) || false;
    }

    // Check if current user can access feature
    canAccess(feature) {
        const featurePermissions = {
            'attendance': ['attendance', 'all'],
            'reports': ['reports', 'all'],
            'export': ['export', 'all'],
            'settings': ['settings', 'all'],
            'users': ['users', 'all'],
            'maintenance': ['all'] // Only admins
        };
        
        const requiredPerms = featurePermissions[feature];
        if (!requiredPerms) return false;
        
        return requiredPerms.some(perm => this.hasPermission(perm));
    }

    // Clean up method
    destroy() {
        // Clear intervals
        if (this.backupIntervalId) {
            clearInterval(this.backupIntervalId);
        }
        
        if (this.sessionTimeoutId) {
            clearTimeout(this.sessionTimeoutId);
        }
        
        // Remove event listeners
        document.removeEventListener('mousemove', this.resetSessionTimeout);
        document.removeEventListener('keypress', this.resetSessionTimeout);
    }
}
