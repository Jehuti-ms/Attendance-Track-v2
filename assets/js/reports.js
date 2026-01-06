// reports.js - UPDATED VERSION
import { Utils, Storage } from './utils.js';

export class ReportsModule {
    constructor(app) {
        this.app = app;
        this.container = null;
    }

    async init() {
        console.log('📈 ReportsModule initialized');
        
        // Find the container
        this.container = document.getElementById('app-container');
        if (!this.container) {
            console.error('Reports container not found');
            return false;
        }
        
        await this.loadReportData();
        this.setupEventListeners();
        return true;
    }

    async loadReportData() {
        // Load attendance records
        const records = Storage.get('attendance_records', []);
        const classes = Storage.get('attendance_classes', []);
        
        // Update UI
        this.updateReportUI(records, classes);
    }

    updateReportUI(records, classes) {
        if (!this.container) return;
        
        if (records.length === 0) {
            this.container.innerHTML = `
                <div class="reports-container">
                    <div class="no-data" style="text-align: center; padding: 60px 20px;">
                        <div style="font-size: 48px; color: #95a5a6; margin-bottom: 20px;">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <h3 style="color: #7f8c8d;">No Attendance Records Found</h3>
                        <p style="color: #95a5a6;">Start by taking attendance to generate reports.</p>
                        <a href="./attendance.html" style="
                            display: inline-block;
                            margin-top: 20px;
                            padding: 12px 24px;
                            background: #3498db;
                            color: white;
                            text-decoration: none;
                            border-radius: 6px;
                        ">
                            <i class="fas fa-calendar-check"></i> Take Attendance
                        </a>
                    </div>
                </div>
            `;
            return;
        }
        
        // Generate report summary
        this.container.innerHTML = this.generateReportHTML(records, classes);
    }

    generateReportHTML(records, classes) {
        return `
            <div class="reports-container">
                <div class="reports-header">
                    <h1><i class="fas fa-chart-bar"></i> Attendance Reports</h1>
                    <p class="subtitle">Generate and analyze attendance reports</p>
                </div>
                
                <div class="report-summary">
                    <h3><i class="fas fa-chart-pie"></i> Summary</h3>
                    <div class="summary-stats">
                        <div class="stat-card">
                            <div class="stat-icon" style="background: #e3f2fd; color: #1976d2;">
                                <i class="fas fa-database"></i>
                            </div>
                            <div class="stat-content">
                                <h3>${records.length}</h3>
                                <p>Total Records</p>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon" style="background: #e8f5e9; color: #388e3c;">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-content">
                                <h3>${classes.length}</h3>
                                <p>Classes</p>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon" style="background: #fff3e0; color: #f57c00;">
                                <i class="fas fa-calendar-alt"></i>
                            </div>
                            <div class="stat-content">
                                <h3>${this.getDateRange(records)}</h3>
                                <p>Date Range</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="report-types">
                    <h3><i class="fas fa-file-alt"></i> Report Types</h3>
                    <div class="report-cards">
                        <div class="report-card">
                            <div class="report-icon">
                                <i class="fas fa-file-pdf" style="color: #e74c3c;"></i>
                            </div>
                            <h4>PDF Report</h4>
                            <p>Generate a printable PDF report</p>
                            <button class="btn btn-danger" id="export-pdf-btn">
                                <i class="fas fa-download"></i> Export PDF
                            </button>
                        </div>
                        
                        <div class="report-card">
                            <div class="report-icon">
                                <i class="fas fa-file-excel" style="color: #27ae60;"></i>
                            </div>
                            <h4>Excel Report</h4>
                            <p>Export data to Excel spreadsheet</p>
                            <button class="btn btn-success" id="export-excel-btn">
                                <i class="fas fa-download"></i> Export Excel
                            </button>
                        </div>
                        
                        <div class="report-card">
                            <div class="report-icon">
                                <i class="fas fa-file-csv" style="color: #3498db;"></i>
                            </div>
                            <h4>CSV Report</h4>
                            <p>Export data as CSV file</p>
                            <button class="btn btn-primary" id="export-csv-btn">
                                <i class="fas fa-download"></i> Export CSV
                            </button>
                        </div>
                        
                        <div class="report-card">
                            <div class="report-icon">
                                <i class="fas fa-chart-line" style="color: #9b59b6;"></i>
                            </div>
                            <h4>Summary Report</h4>
                            <p>Generate attendance summary</p>
                            <button class="btn btn-purple" id="generate-summary-btn">
                                <i class="fas fa-chart-bar"></i> Generate Summary
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="recent-reports">
                    <h3><i class="fas fa-history"></i> Recent Reports</h3>
                    <div class="reports-list">
                        <p class="no-reports" style="color: #95a5a6; text-align: center; padding: 20px;">
                            No recent reports generated yet.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    getDateRange(records) {
        if (records.length === 0) return 'No dates';
        const dates = records.map(r => new Date(r.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        // Format as "Jan 1 - Dec 31, 2024"
        const formatOptions = { month: 'short', day: 'numeric' };
        const start = minDate.toLocaleDateString('en-US', formatOptions);
        const end = maxDate.toLocaleDateString('en-US', formatOptions);
        const year = maxDate.getFullYear();
        
        return `${start} - ${end}, ${year}`;
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'export-pdf-btn' || e.target.closest('#export-pdf-btn')) {
                this.exportToPDF();
            }
            if (e.target.id === 'export-csv-btn' || e.target.closest('#export-csv-btn')) {
                this.exportToCSV();
            }
            if (e.target.id === 'export-excel-btn' || e.target.closest('#export-excel-btn')) {
                this.exportToExcel();
            }
            if (e.target.id === 'generate-summary-btn' || e.target.closest('#generate-summary-btn')) {
                this.generateSummary();
            }
        });
    }

    exportToPDF() {
        alert('PDF export functionality coming soon!');
    }

    exportToExcel() {
        alert('Excel export functionality coming soon!');
    }

    exportToCSV() {
        alert('CSV export functionality coming soon!');
    }

    generateSummary() {
        alert('Summary generation coming soon!');
    }
}
