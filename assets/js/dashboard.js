import { Utils } from './utils.js';

export class DashboardModule {
    constructor(app) {
        this.app = app;
    }

    async init() {
        await this.loadDashboardComponents();
        this.updateDashboard();
        this.setupEventListeners();
    }

    async loadDashboardComponents() {
        try {
            // Load metrics grid
            await Utils.loadComponent('components/metrics-grid.html', 'dashboard-metrics');
            
            // Load recent activity
            await Utils.loadComponent('components/recent-activity.html', 'recent-activity');
            
            // Load year groups summary
            await Utils.loadComponent('components/year-groups-summary.html', 'year-groups-container');
        } catch (error) {
            console.error('Error loading dashboard components:', error);
        }
    }

    updateDashboard() {
        this.updateMetrics();
        this.updateRecentActivity();
        this.updateYearGroups();
        this.updateWeekOptions();
    }

    updateMetrics() {
        const totalStudents = this.app.state.classes.reduce((sum, cls) => sum + cls.classSize, 0);
        const totalClasses = this.app.state.classes.length;
        
        // Calculate today's attendance
        const today = Utils.formatDate(new Date());
        const todayRecords = this.app.state.attendanceRecords.filter(record => record.date === today);
        const totalPresentToday = todayRecords.reduce((sum, record) => sum + record.totalPresent, 0);
        const dailyAttendance = totalStudents > 0 ? Math.round((totalPresentToday / totalStudents) * 100) : 0;
        
        // Calculate weekly average
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekRecords = this.app.state.attendanceRecords.filter(record => 
            new Date(record.date) >= weekAgo
        );
        const totalPresentWeek = weekRecords.reduce((sum, record) => sum + record.totalPresent, 0);
        const totalPossibleWeek = weekRecords.reduce((sum, record) => sum + record.classSize, 0);
        const weeklyAverage = totalPossibleWeek > 0 ? Math.round((totalPresentWeek / totalPossibleWeek) * 100) : 85;

        // Update metric cards
        this.updateMetricElement('total-students', totalStudents);
        this.updateMetricElement('daily-attendance', `${dailyAttendance}%`);
        this.updateMetricElement('weekly-attendance', `${weeklyAverage}%`);
        this.updateMetricElement('total-classes', totalClasses);
    }

    updateMetricElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateRecentActivity() {
        const container = document.getElementById('recent-activity-list');
        if (!container) return;

        const recentRecords = [...this.app.state.attendanceRecords]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        if (recentRecords.length === 0) {
            container.innerHTML = '<div class="no-activity">No recent attendance records</div>';
            return;
        }

        let html = '';
        recentRecords.forEach(record => {
            const formattedDate = Utils.formatDate(record.date, 'MMM DD, YYYY');
            const session = record.session === 'am' ? 'AM' : 'PM';
            
            html += `
                <div class="activity-item">
                    <div class="activity-info">
                        <span class="activity-date">${formattedDate}</span>
                        <span class="activity-session">${session} Session</span>
                    </div>
                    <div class="activity-details">
                        <span class="activity-class">${record.classCode}</span>
                        <span class="activity-attendance">${record.totalPresent}/${record.classSize}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    updateYearGroups() {
        const container = document.getElementById('year-groups-container');
        if (!container) return;

        const yearGroups = {};
        
        this.app.state.classes.forEach(cls => {
            if (!yearGroups[cls.yearGroup]) {
                yearGroups[cls.yearGroup] = {
                    classes: 0,
                    students: 0,
                    males: 0,
                    females: 0,
                    attendance: 0
                };
            }
            
            yearGroups[cls.yearGroup].classes++;
            yearGroups[cls.yearGroup].students += cls.classSize;
            yearGroups[cls.yearGroup].males += cls.totalMales;
            yearGroups[cls.yearGroup].females += cls.totalFemales;
        });

        // Calculate attendance rates
        Object.keys(yearGroups).forEach(yearGroup => {
            const records = this.app.state.attendanceRecords.filter(
                record => record.yearGroup === yearGroup
            );
            
            if (records.length > 0) {
                const totalPresent = records.reduce((sum, r) => sum + r.totalPresent, 0);
                const totalPossible = records.reduce((sum, r) => sum + r.classSize, 0);
                yearGroups[yearGroup].attendance = totalPossible > 0 ? 
                    Math.round((totalPresent / totalPossible) * 100) : 0;
            }
        });

        let html = '';
        Object.entries(yearGroups).forEach(([yearGroup, stats]) => {
            html += `
                <div class="year-group-card">
                    <div class="year-group-header">
                        <span class="year-group-name">${yearGroup}</span>
                        <span class="year-group-attendance ${this.getAttendanceClass(stats.attendance)}">
                            ${stats.attendance}%
                        </span>
                    </div>
                    <div class="year-group-stats">
                        <div class="stat-item">
                            <span class="stat-label">Classes:</span>
                            <span class="stat-value">${stats.classes}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Students:</span>
                            <span class="stat-value">${stats.students}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Males:</span>
                            <span class="stat-value">${stats.males}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Females:</span>
                            <span class="stat-value">${stats.females}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    getAttendanceClass(rate) {
        if (rate >= 90) return 'good';
        if (rate >= 75) return 'average';
        return 'poor';
    }

    updateWeekOptions() {
        const termSelect = document.getElementById('term-select');
        const weekSelect = document.getElementById('week-select');
        
        if (!termSelect || !weekSelect) return;

        // Populate term select
        termSelect.innerHTML = '';
        this.app.state.terms.forEach(term => {
            const option = document.createElement('option');
            option.value = term.id;
            option.textContent = term.name;
            termSelect.appendChild(option);
        });

        // Update week options based on selected term
        this.updateWeekSelect(termSelect.value, weekSelect);

        // Add change listener
        termSelect.addEventListener('change', () => {
            this.updateWeekSelect(termSelect.value, weekSelect);
            this.updateDashboard();
        });

        weekSelect.addEventListener('change', () => {
            this.updateDashboard();
        });
    }

    updateWeekSelect(termId, weekSelect) {
        const term = this.app.state.terms.find(t => t.id === termId);
        const weekCount = term ? term.weeks : 14;

        weekSelect.innerHTML = '';
        for (let i = 1; i <= weekCount; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Week ${i}`;
            weekSelect.appendChild(option);
        }
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('#refresh-dashboard')) {
                this.refreshDashboard();
            }
        });
    }

    refreshDashboard() {
        this.updateDashboard();
        this.app.showToast('Dashboard refreshed', 'success');
    }

    // Quick stats methods
    getQuickStats() {
        const totalStudents = this.app.state.classes.reduce((sum, cls) => sum + cls.classSize, 0);
        const today = Utils.formatDate(new Date());
        const todayRecords = this.app.state.attendanceRecords.filter(record => record.date === today);
        const todayPresent = todayRecords.reduce((sum, record) => sum + record.totalPresent, 0);
        
        return {
            totalStudents,
            totalClasses: this.app.state.classes.length,
            todayPresent,
            todayAbsent: totalStudents - todayPresent,
            overallAttendance: totalStudents > 0 ? Math.round((todayPresent / totalStudents) * 100) : 0
        };
    }

    // Chart data generation (placeholder for real charts)
    getChartData(timeframe = 'week') {
        // This would generate data for charts
        // For now, return mock data
        return {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            datasets: [
                {
                    label: 'Attendance Rate',
                    data: [92, 88, 95, 90, 87],
                    backgroundColor: 'rgba(30, 60, 114, 0.2)',
                    borderColor: 'rgba(30, 60, 114, 1)',
                    borderWidth: 2
                }
            ]
        };
    }
}

export default DashboardModule;
