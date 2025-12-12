import { AuthModule } from './modules/auth.js';
import { DashboardModule } from './modules/dashboard.js';
import { SetupModule } from './modules/setup.js';
import { AttendanceModule } from './modules/attendance.js';
import { ReportsModule } from './modules/reports.js';
import { ExportModule } from './modules/export.js';
import { MaintenanceModule } from './modules/maintenance.js';
import { SettingsModule } from './modules/settings.js';
import { ImportModule } from './modules/import.js';
import { Utils, Storage } from './modules/utils.js';

class AttendanceApp {
    constructor() {
        this.state = {
            currentUser: null,
            currentPage: 'login',
            settings: Storage.get('gams_settings', {}),
            classes: Storage.get('gams_classes', []),
            attendanceRecords: Storage.get('gams_attendance', []),
            terms: Storage.get('gams_terms', [
                { id: 'term1', name: 'Term 1', startDate: '2024-09-08', endDate: '2024-12-15', weeks: 14, isActive: true },
                { id: 'term2', name: 'Term 2', startDate: '2025-01-08', endDate: '2025-04-15', weeks: 14, isActive: true },
                { id: 'term3', name: 'Term 3', startDate: '2025-04-22', endDate: '2025-07-15', weeks: 12, isActive: true }
            ]),
            cumulativeData: Storage.get('gams_cumulative', {}),
            historicalAverages: Storage.get('gams_averages', {}),
            isOnline: false
        };

        this.modules = {
            auth: new AuthModule(this),
            dashboard: new DashboardModule(this),
            setup: new SetupModule(this),
            attendance: new AttendanceModule(this),
            reports: new ReportsModule(this),
            export: new ExportModule(this),
            maintenance: new MaintenanceModule(this),
            settings: new SettingsModule(this),
            import: new ImportModule(this)
        };

        this.init();
    }

    async init() {
        // Load initial components
        await this.loadInitialComponents();
        
        // Initialize theme
        this.initTheme();
        
        // Initialize auth module
        await this.modules.auth.init();
        
        // Setup global event listeners
        this.setupGlobalListeners();
    }

    async loadInitialComponents() {
        try {
            // Load header
            await Utils.loadComponent('components/header.html', 'header-container');
            
            // Set active page
            this.navigateTo(this.state.currentUser ? 'dashboard' : 'login');
        } catch (error) {
            console.error('Error loading initial components:', error);
        }
    }

    initTheme() {
        const savedTheme = Storage.get('gams_theme', 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    setupGlobalListeners() {
        document.addEventListener('click', (e) => {
            // Theme toggle
            if (e.target.matches('.theme-toggle')) {
                this.toggleTheme();
            }
            
            // Navigation
            if (e.target.matches('[data-page]')) {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                this.navigateTo(page);
            }
            
            // Logout
            if (e.target.m
