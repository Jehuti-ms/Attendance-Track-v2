export class ReportsModule {
    constructor(app) {
        this.app = app;
    }

    async init() {
        await this.loadReportsPage();
        this.setupEventListeners();
        this.populateFilters();
    }

    async loadReportsPage() {
        // Set default dates
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        document.getElementById('start-date').value = Utils.formatDate(firstDay);
        document.getElementById('end-date').value = Utils.formatDate(lastDay);
        document.getElementById('report-year').value = today.getFullYear();
        document.getElementById('report-month').value = today.getMonth() + 1;
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('#generate-report')) {
                this.generateReport();
            } else if (e.target.matches('#refresh-data')) {
                this.refreshReportData();
            }
        });

        // Report type change
        const reportTypeSelect = document.getElementById('report-type');
        if (reportTypeSelect) {
            reportTypeSelect.addEventListener('change', () => this.updateReportOptions());
        }

        // Term change for week options
        const termSelect = document.getElementById('report-term');
        if (termSelect) {
            termSelect.addEventListener('change', () => this.updateWeekOptions());
        }
    }

    populateFilters() {
        this.populateTermFilter();
        this.populateClassFilter();
        this.populateYearGroupFilter();
        this.updateWeekOptions();
    }

    populateTermFilter() {
        const termSelect = document.getElementById('report-term');
        if (!termSelect) return;

        termSelect.innerHTML = '<option value="all">All Terms</option>';
        this.app.state.terms.forEach(term => {
            const option = document.createElement('option');
            option.value = term.id;
            option.textContent = term.name;
            termSelect.appendChild(option);
        });
    }

    populateClassFilter() {
        const classSelect = document.getElementById('filter-class');
        if (!classSelect) return;

        classSelect.innerHTML = '<option value="all">All Classes</option>';
        this.app.state.classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.classCode} (${cls.yearGroup})`;
            classSelect.appendChild(option);
        });
    }

    populateYearGroupFilter() {
        const yearGroupSelect = document.getElementById('filter-year-group');
        if (!yearGroupSelect) return;

        const yearGroups = [...new Set(this.app.state.classes.map(c => c.yearGroup))];
        yearGroupSelect.innerHTML = '<option value="all">All Year Groups</option>';
        yearGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            yearGroupSelect.appendChild(option);
        });
    }

    updateWeekOptions() {
        const termSelect = document.getElementById('report-term');
        const weekSelect = document.getElementById('report-week');
        
        if (!termSelect || !weekSelect) return;

        const selectedTerm = termSelect.value;
        weekSelect.innerHTML = '<option value="all">All Weeks</option>';
        
        if (selectedTerm !== 'all') {
            const term = this.app.state.terms.find(t => t.id === selectedTerm);
            if (term) {
                for (let i = 1; i <= term.weeks; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `Week ${i}`;
                    weekSelect.appendChild(option);
                }
            }
        } else {
            // Show all weeks from all terms
            let maxWeeks = 0;
            this.app.state.terms.forEach(term => {
                if (term.weeks > maxWeeks) maxWeeks = term.weeks;
            });
            
            for (let i = 1; i <= maxWeeks; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Week ${i}`;
                weekSelect.appendChild(option);
            }
        }
    }

    updateReportOptions() {
        const reportType = document.getElementById('report-type').value;
        
        // Hide all option containers
        document.getElementById('weekly-options').style.display = 'none';
        document.getElementById('monthly-options').style.display = 'none';
        document.getElementById('custom-dates').style.display = 'none';
        document.getElementById('class-filter').style.display = 'none';
        document.getElementById('year-group-filter').style.display = 'none';
        document.getElementById('chart-options').style.display = 'none';
        
        // Show relevant options based on report type
        switch(reportType) {
            case 'weekly':
                document.getElementById('weekly-options').style.display = 'flex';
                break;
            case 'monthly':
                document.getElementById('monthly-options').style.display = 'flex';
                break;
            case 'custom':
                document.getElementById('custom-dates').style.display = 'flex';
                break;
            case 'class':
                document.getElementById('class-filter').style.display = 'block';
                break;
            case 'year-group':
                document.getElementById('year-group-filter').style.display = 'block';
                break;
            case 'trend':
                document.getElementById('chart-options').style.display = 'block';
                break;
        }
        
        // Show class and year group filters for detailed reports
        const reportLevel = document.getElementById('report-level').value;
        if (reportLevel === 'detailed' || reportLevel === 'comparative') {
            document.getElementById('class-filter').style.display = 'block';
            document.getElementById('year-group-filter').style.display = 'block';
        }
    }

    async generateReport() {
        try {
            const reportType = document.getElementById('report-type').value;
            const reportLevel = document.getElementById('report-level').value;
            const sessionFilter = document.getElementById('session-filter').value;
            const classFilter = document.getElementById('filter-class').value;
            const yearGroupFilter = document.getElementById('filter-year-group').value;
            
            // Filter records based on criteria
            let filteredRecords = this.filterRecords();
            
            // Apply additional filters
            if (classFilter !== 'all') {
                filteredRecords = filteredRecords.filter(r => r.classId === classFilter);
            }
            
            if (yearGroupFilter !== 'all') {
                filteredRecords = filteredRecords.filter(r => r.yearGroup === yearGroupFilter);
            }
            
            if (sessionFilter !== 'both') {
                filteredRecords = filteredRecords.filter(r => r.session === sessionFilter);
            }
            
            if (filteredRecords.length === 0) {
                this.showNoDataMessage();
                return;
            }
            
            // Update report stats
            this.updateReportStats(filteredRecords);
            
            // Generate report content based on type
            let reportContent = '';
            
            switch(reportType) {
                case 'weekly':
                    reportContent = this.generateWeeklyReport(filteredRecords, reportLevel);
                    break;
                case 'monthly':
                    reportContent = this.generateMonthlyReport(filteredRecords, reportLevel);
                    break;
                case 'term':
                    reportContent = this.generateTermReport(filteredRecords, reportLevel);
                    break;
                case 'custom':
                    reportContent = this.generateCustomReport(filteredRecords, reportLevel);
                    break;
                case 'yearly':
                    reportContent = this.generateYearlyReport(filteredRecords, reportLevel);
                    break;
                case 'class':
                    reportContent = this.generateClassReport(filteredRecords, reportLevel);
                    break;
                case 'year-group':
                    reportContent = this.generateYearGroupReport(filteredRecords, reportLevel);
                    break;
                case 'trend':
                    reportContent = this.generateTrendReport(filteredRecords, reportLevel);
                    break;
                default:
                    reportContent = this.generateSummaryReport(filteredRecords, reportLevel);
            }
            
            // Add report header and footer
            const reportHeader = this.generateReportHeader(reportType, filteredRecords);
            const reportFooter = this.generateReportFooter();
            
            // Display the report
            const reportOutput = document.getElementById('report-content');
            reportOutput.innerHTML = `
                ${reportHeader}
                ${reportContent}
                ${reportFooter}
            `;
            
            this.app.showToast('Report generated successfully!', 'success');
            
        } catch (error) {
            console.error('Report generation error:', error);
            this.app.showToast(`Error generating report: ${error.message}`, 'error');
        }
    }

    filterRecords() {
        const reportType = document.getElementById('report-type').value;
        const termFilter = document.getElementById('report-term').value;
        const weekFilter = document.getElementById('report-week').value;
        
        let filteredRecords = [...this.app.state.attendanceRecords];
        
        // Apply term filter
        if (termFilter !== 'all') {
            filteredRecords = filteredRecords.filter(r => r.term === termFilter);
        }
        
        // Apply week filter
        if (weekFilter !== 'all') {
            filteredRecords = filteredRecords.filter(r => r.week === parseInt(weekFilter));
        }
        
        // Apply date range filter for custom reports
        if (reportType === 'custom') {
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            
            if (startDate && endDate) {
                filteredRecords = filteredRecords.filter(r => {
                    const recordDate = new Date(r.date);
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    return recordDate >= start && recordDate <= end;
                });
            }
        }
        
        // Apply monthly filter
        if (reportType === 'monthly') {
            const month = parseInt(document.getElementById('report-month').value);
            const year = parseInt(document.getElementById('report-year').value);
            
            filteredRecords = filteredRecords.filter(r => {
                const date = new Date(r.date);
                return date.getMonth() + 1 === month && date.getFullYear() === year;
            });
        }
        
        return filteredRecords;
    }

    updateReportStats(records) {
        const statsDiv = document.getElementById('report-stats');
        if (!statsDiv) return;
        
        const totalPresent = records.reduce((sum, r) => sum + r.totalPresent, 0);
        const totalPossible = records.reduce((sum, r) => sum + r.classSize, 0);
        const averageAttendance = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
        const uniqueDays = new Set(records.map(r => r.date)).size;
        
        statsDiv.innerHTML = `
            <span><strong>${records.length}</strong> records</span>
            <span><strong>${totalPresent}</strong> present</span>
            <span><strong>${averageAttendance}%</strong> average</span>
            <span><strong>${uniqueDays}</strong> days</span>
        `;
    }

    generateReportHeader(reportType, records) {
        const reportTitles = {
            'weekly': 'Weekly Attendance Report',
            'monthly': 'Monthly Attendance Report',
            'term': 'Term Attendance Report',
            'custom': 'Custom Period Attendance Report',
            'yearly': 'Yearly Attendance Summary',
            'class': 'Class Performance Report',
            'year-group': 'Year Group Analysis Report',
            'trend': 'Attendance Trend Analysis'
        };
        
        const title = reportTitles[reportType] || 'Attendance Report';
        
        // Get filter information
        const filters = [];
        const termFilter = document.getElementById('report-term').value;
        const weekFilter = document.getElementById('report-week').value;
        
        if (termFilter !== 'all') {
            const term = this.app.state.terms.find(t => t.id === termFilter);
            if (term) filters.push(`Term: ${term.name}`);
        }
        
        if (weekFilter !== 'all') {
            filters.push(`Week: ${weekFilter}`);
        }
        
        // Get date range
        const dateRange = this.getDateRange(records);
        if (dateRange) filters.push(`Period: ${dateRange}`);
        
        // Calculate overall stats
        const totalPresent = records.reduce((sum, r) => sum + r.totalPresent, 0);
        const totalPossible = records.reduce((sum, r) => sum + r.classSize, 0);
        const averageAttendance = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
        
        return `
            <div class="report-header">
                <h3>${title}</h3>
                <div class="report-meta">
                    <div class="filters">
                        <strong>Filters:</strong> ${filters.join(' • ')}
                    </div>
                    <div class="generated-on">
                        Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                    </div>
                </div>
                <div class="overview-stats">
                    <div class="overview-stat">
                        <div class="stat-value">${averageAttendance}%</div>
                        <div class="stat-label">Overall Attendance</div>
                    </div>
                    <div class="overview-stat">
                        <div class="stat-value">${records.length}</div>
                        <div class="stat-label">Records</div>
                    </div>
                    <div class="overview-stat">
                        <div class="stat-value">${new Set(records.map(r => r.date)).size}</div>
                        <div class="stat-label">Days</div>
                    </div>
                    <div class="overview-stat">
                        <div class="stat-value">${totalPresent}</div>
                        <div class="stat-label">Total Present</div>
                    </div>
                </div>
            </div>
        `;
    }

    getDateRange(records) {
        if (records.length === 0) return '';
        
        const dates = records.map(r => new Date(r.date)).sort((a, b) => a - b);
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        
        if (startDate.toDateString() === endDate.toDateString()) {
            return startDate.toLocaleDateString();
        }
        
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }

    generateWeeklyReport(records, level) {
        const summary = this.calculateSummary(records);
        const dailyBreakdown = this.getDailyBreakdown(records);
        
        return `
            <div class="report-summary">
                ${this.generateSummaryCards(summary)}
            </div>
            
            <div class="report-section">
                <h4><i class="fas fa-calendar-alt"></i> Daily Attendance Breakdown</h4>
                ${this.generateDailyTable(dailyBreakdown)}
            </div>
            
            ${level === 'detailed' ? this.generateDetailedBreakdown(records) : ''}
            ${level === 'comparative' ? this.generateComparativeAnalysis(records) : ''}
        `;
    }

    generateMonthlyReport(records, level) {
        const summary = this.calculateSummary(records);
        const weeklyBreakdown = this.getWeeklyBreakdown(records);
        
        return `
            <div class="report-summary">
                ${this.generateSummaryCards(summary)}
            </div>
            
            <div class="report-section">
                <h4><i class="fas fa-chart-line"></i> Weekly Trends</h4>
                ${this.generateWeeklyTrends(weeklyBreakdown)}
            </div>
            
            <div class="report-section">
                <h4><i class="fas fa-school"></i> Class Performance</h4>
                ${this.generateClassPerformanceTable(records)}
            </div>
        `;
    }

    generateTermReport(records, level) {
        const summary = this.calculateSummary(records);
        
        return `
            <div class="highlight-box">
                <div class="big-number">${summary.averageAttendance}%</div>
                <div class="description">Term Attendance Average</div>
                <p style="margin-top: 10px; opacity: 0.9;">
                    Based on ${summary.totalDays} days and ${summary.totalRecords} attendance records
                </p>
            </div>
            
            <div class="report-summary">
                ${this.generateSummaryCards(summary)}
            </div>
            
            <div class="report-section">
                <h4><i class="fas fa-chart-bar"></i> Term Overview</h4>
                <div class="chart-placeholder">
                    <p><i class="fas fa-chart-pie"></i> Term Performance Chart</p>
                    <small>Chart visualization would appear here with real charting library</small>
                </div>
            </div>
        `;
    }

    generateCustomReport(records, level) {
        const summary = this.calculateSummary(records);
        
        return `
            <div class="report-summary">
                ${this.generateSummaryCards(summary)}
            </div>
            
            <div class="report-section">
                <h4><i class="fas fa-calendar-day"></i> Custom Period Analysis</h4>
                <div class="analysis-grid">
                    <div class="analysis-item">
                        <h5>Daily Averages</h5>
                        <div class="analysis-value">${summary.averageAttendance}%</div>
                    </div>
                    <div class="analysis-item">
                        <h5>Best Day</h5>
                        <div class="analysis-value">${this.getBestDay(records)}</div>
                    </div>
                    <div class="analysis-item">
                        <h5>Consistency</h5>
                        <div class="analysis-value">${this.getConsistencyScore(records)}%</div>
                    </div>
                </div>
            </div>
        `;
    }

    generateClassReport(records, level) {
        const classId = document.getElementById('filter-class').value;
        const cls = this.app.state.classes.find(c => c.id === classId);
        
        if (!cls) {
            return '<div class="no-data">No class selected or class not found</div>';
        }
        
        const classRecords = records.filter(r => r.classId === classId);
        const summary = this.calculateSummary(classRecords);
        
        return `
            <div class="report-section">
                <h4><i class="fas fa-chalkboard-teacher"></i> ${cls.classCode} - ${cls.yearGroup}</h4>
                
                <div class="class-details">
                    <div class="detail-item">
                        <span class="detail-label">Class Size:</span>
                        <span class="detail-value">${cls.classSize} students</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Gender Split:</span>
                        <span class="detail-value">${cls.totalMales}♂ ${cls.totalFemales}♀</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Overall Attendance:</span>
                        <span class="detail-value ${this.getAttendanceClass(summary.averageAttendance)}">
                            ${summary.averageAttendance}%
                        </span>
                    </div>
                </div>
                
                <div class="report-summary" style="margin-top: 20px;">
                    ${this.generateSummaryCards(summary)}
                </div>
                
                ${this.generateAttendancePatternTable(classRecords)}
            </div>
        `;
    }

    generateTrendReport(records, level) {
        const trends = this.calculateTrends(records);
        
        return `
            <div class="report-section">
                <h4><i class="fas fa-chart-line"></i> Attendance Trends</h4>
                
                <div class="trend-analysis">
                    <div class="trend-item ${trends.overallTrend.direction}">
                        <span class="trend-label">Overall Trend</span>
                        <span class="trend-value">${trends.overallTrend.value}%</span>
                        <span class="trend-arrow">${trends.overallTrend.arrow}</span>
                    </div>
                    
                    <div class="trend-item ${trends.weeklyTrend.direction}">
                        <span class="trend-label">Weekly Trend</span>
                        <span class="trend-value">${trends.weeklyTrend.value}%</span>
                        <span class="trend-arrow">${trends.weeklyTrend.arrow}</span>
                    </div>
                    
                    <div class="trend-item ${trends.dailyTrend.direction}">
                        <span class="trend-label">Daily Trend</span>
                        <span class="trend-value">${trends.dailyTrend.value}%</span>
                        <span class="trend-arrow">${trends.dailyTrend.arrow}</span>
                    </div>
                </div>
                
                <div class="chart-placeholder" style="margin-top: 20px;">
                    <p><i class="fas fa-chart-line"></i> Trend Analysis Chart</p>
                    <small>Trend visualization would appear here with real charting library</small>
                </div>
            </div>
        `;
    }

    calculateSummary(records) {
        if (records.length === 0) {
            return {
                totalRecords: 0,
                totalDays: 0,
                totalPresent: 0,
                totalPossible: 0,
                averageAttendance: 0,
                maleAttendance: 0,
                femaleAttendance: 0,
                malePresent: 0,
                femalePresent: 0
            };
        }
        
        const totalPresent = records.reduce((sum, r) => sum + r.totalPresent, 0);
        const totalPossible = records.reduce((sum, r) => sum + r.classSize, 0);
        
        const malePresent = records.reduce((sum, r) => sum + r.malesPresent, 0);
        const femalePresent = records.reduce((sum, r) => sum + r.femalesPresent, 0);
        
        const malePossible = records.reduce((sum, r) => sum + (r.totalMales || 0), 0);
        const femalePossible = records.reduce((sum, r) => sum + (r.totalFemales || 0), 0);
        
        return {
            totalRecords: records.length,
            totalDays: new Set(records.map(r => r.date)).size,
            totalPresent: totalPresent,
            totalPossible: totalPossible,
            averageAttendance: totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0,
            maleAttendance: malePossible > 0 ? Math.round((malePresent / malePossible) * 100) : 0,
            femaleAttendance: femalePossible > 0 ? Math.round((femalePresent / femalePossible) * 100) : 0,
            malePresent: malePresent,
            femalePresent: femalePresent
        };
    }

    generateSummaryCards(summary) {
        const cards = [
            {
                title: 'Overall Attendance',
                value: `${summary.averageAttendance}%`,
                description: `${summary.totalPresent} / ${summary.totalPossible} students`,
                icon: 'fas fa-chart-pie',
                color: this.getAttendanceColor(summary.averageAttendance)
            },
            {
                title: 'Total Records',
                value: summary.totalRecords,
                description: `Across ${summary.totalDays} days`,
                icon: 'fas fa-database',
                color: '#2196f3'
            },
            {
                title: 'Male Attendance',
                value: `${summary.maleAttendance}%`,
                description: `${summary.malePresent} present`,
                icon: 'fas fa-male',
                color: '#2196f3'
            },
            {
                title: 'Female Attendance',
                value: `${summary.femaleAttendance}%`,
                description: `${summary.femalePresent} present`,
                icon: 'fas fa-female',
                color: '#e91e63'
            }
        ];
        
        return cards.map(card => `
            <div class="summary-card" style="border-top-color: ${card.color};">
                <div class="summary-icon">
                    <i class="${card.icon}"></i>
                </div>
                <div class="summary-content">
                    <div class="summary-value">${card.value}</div>
                    <div class="summary-label">${card.title}</div>
                    <div class="summary-description">${card.description}</div>
                </div>
            </div>
        `).join('');
    }

    getDailyBreakdown(records) {
        const dailyData = {};
        
        records.forEach(record => {
            const date = new Date(record.date).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            
            if (!dailyData[date]) {
                dailyData[date] = {
                    present: 0,
                    possible: 0,
                    sessions: new Set()
                };
            }
            
            dailyData[date].present += record.totalPresent;
            dailyData[date].possible += record.classSize;
            dailyData[date].sessions.add(record.session);
        });
        
        return Object.entries(dailyData).map(([date, data]) => ({
            date,
            present: data.present,
            possible: data.possible,
            rate: data.possible > 0 ? Math.round((data.present / data.possible) * 100) : 0,
            sessions: data.sessions.size
        }));
    }

    generateDailyTable(dailyBreakdown) {
        if (dailyBreakdown.length === 0) {
            return '<p class="no-data">No daily data available</p>';
        }
        
        const rows = dailyBreakdown.map(day => `
            <tr>
                <td>${day.date}</td>
                <td>${day.present}</td>
                <td>${day.possible}</td>
                <td class="${this.getAttendanceClass(day.rate)}">${day.rate}%</td>
                <td>${day.sessions}</td>
            </tr>
        `).join('');
        
        return `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Present</th>
                        <th>Possible</th>
                        <th>Rate</th>
                        <th>Sessions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    getAttendanceClass(rate) {
        if (rate >= 90) return 'good';
        if (rate >= 75) return 'average';
        return 'poor';
    }

    getAttendanceColor(rate) {
        if (rate >= 90) return '#4caf50';
        if (rate >= 75) return '#ff9800';
        return '#f44336';
    }

    calculateTrends(records) {
        // Simple trend calculation based on recent data
        const recentRecords = records.slice(-10);
        const olderRecords = records.slice(-20, -10);
        
        const recentAvg = this.calculateSummary(recentRecords).averageAttendance;
        const olderAvg = this.calculateSummary(olderRecords).averageAttendance;
        
        const trendValue = recentAvg - olderAvg;
        const direction = trendValue > 0 ? 'positive' : trendValue < 0 ? 'negative' : 'neutral';
        const arrow = trendValue > 0 ? '↗' : trendValue < 0 ? '↘' : '→';
        
        return {
            overallTrend: {
                value: Math.abs(trendValue),
                direction: direction,
                arrow: arrow
            },
            weeklyTrend: {
                value: Math.abs(trendValue + 2), // Mock data
                direction: trendValue > 0 ? 'positive' : 'negative',
                arrow: trendValue > 0 ? '↗' : '↘'
            },
            dailyTrend: {
                value: Math.abs(trendValue - 1), // Mock data
                direction: 'neutral',
                arrow: '→'
            }
        };
    }

    showNoDataMessage() {
        const reportOutput = document.getElementById('report-content');
        reportOutput.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-chart-bar fa-3x"></i>
                <h3>No Data Available</h3>
                <p>No attendance records found for the selected filters.</p>
                <button onclick="app.navigateTo('attendance')" class="btn btn-primary">
                    <i class="fas fa-calendar-plus"></i> Take Attendance
                </button>
            </div>
        `;
        
        // Clear stats
        const statsDiv = document.getElementById('report-stats');
        if (statsDiv) {
            statsDiv.innerHTML = '<span>No data available</span>';
        }
    }

    refreshReportData() {
        this.app.showToast('Refreshing report data...', 'info');
        
        // In a real app, this would fetch fresh data
        // For now, just regenerate the report
        setTimeout(() => {
            this.generateReport();
            this.app.showToast('Report data refreshed', 'success');
        }, 500);
    }

    generateReportFooter() {
        return `
            <div class="report-footer">
                <p>Report generated by Attendance Track System • ${new Date().toLocaleDateString()}</p>
                <p class="footer-note">
                    <i class="fas fa-lock"></i> This report is confidential and intended for authorized personnel only.
                </p>
            </div>
        `;
    }

    // Helper methods for mock data
    getBestDay(records) {
        if (records.length === 0) return 'N/A';
        
        const dailyData = this.getDailyBreakdown(records);
        const bestDay = dailyData.reduce((best, current) => 
            current.rate > best.rate ? current : best
        );
        
        return `${bestDay.date} (${bestDay.rate}%)`;
    }

    getConsistencyScore(records) {
        if (records.length === 0) return 0;
        
        const dailyData = this.getDailyBreakdown(records);
        const rates = dailyData.map(day => day.rate);
        const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
        
        // Calculate consistency as inverse of standard deviation
        const squaredDiffs = rates.map(rate => Math.pow(rate - average, 2));
        const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / rates.length;
        const stdDev = Math.sqrt(variance);
        
        // Convert to percentage (higher is better)
        const consistency = Math.max(0, 100 - stdDev);
        return Math.round(consistency);
    }

    generateWeeklyTrends(weeklyBreakdown) {
        // Mock implementation
        return `
            <div class="chart-placeholder">
                <p><i class="fas fa-chart-line"></i> Weekly Trends Chart</p>
                <small>Weekly trend visualization would appear here</small>
            </div>
        `;
    }

    generateClassPerformanceTable(records) {
        // Group records by class
        const classPerformance = {};
        
        records.forEach(record => {
            if (!classPerformance[record.classId]) {
                const cls = this.app.state.classes.find(c => c.id === record.classId);
                classPerformance[record.classId] = {
                    classCode: cls?.classCode || 'Unknown',
                    yearGroup: cls?.yearGroup || 'Unknown',
                    present: 0,
                    possible: 0,
                    count: 0
                };
            }
            
            classPerformance[record.classId].present += record.totalPresent;
            classPerformance[record.classId].possible += record.classSize;
            classPerformance[record.classId].count++;
        });
        
        // Convert to array and calculate rates
        const performanceArray = Object.values(classPerformance).map(data => ({
            ...data,
            rate: data.possible > 0 ? Math.round((data.present / data.possible) * 100) : 0
        })).sort((a, b) => b.rate - a.rate);
        
        const rows = performanceArray.map(data => `
            <tr>
                <td>${data.classCode}</td>
                <td>${data.yearGroup}</td>
                <td>${data.present}</td>
                <td>${data.possible}</td>
                <td class="${this.getAttendanceClass(data.rate)}">${data.rate}%</td>
                <td>${data.count}</td>
            </tr>
        `).join('');
        
        return `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Class</th>
                        <th>Year Group</th>
                        <th>Present</th>
                        <th>Possible</th>
                        <th>Rate</th>
                        <th>Records</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    generateAttendancePatternTable(records) {
        if (records.length === 0) {
            return '<p class="no-data">No attendance pattern data available</p>';
        }
        
        // Group by session
        const amRecords = records.filter(r => r.session === 'am');
        const pmRecords = records.filter(r => r.session === 'pm');
        
        const amSummary = this.calculateSummary(amRecords);
        const pmSummary = this.calculateSummary(pmRecords);
        
        return `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Session</th>
                        <th>Records</th>
                        <th>Present</th>
                        <th>Rate</th>
                        <th>Male Rate</th>
                        <th>Female Rate</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>AM Session</td>
                        <td>${amSummary.totalRecords}</td>
                        <td>${amSummary.totalPresent}</td>
                        <td class="${this.getAttendanceClass(amSummary.averageAttendance)}">
                            ${amSummary.averageAttendance}%
                        </td>
                        <td>${amSummary.maleAttendance}%</td>
                        <td>${amSummary.femaleAttendance}%</td>
                    </tr>
                    <tr>
                        <td>PM Session</td>
                        <td>${pmSummary.totalRecords}</td>
                        <td>${pmSummary.totalPresent}</td>
                        <td class="${this.getAttendanceClass(pmSummary.averageAttendance)}">
                            ${pmSummary.averageAttendance}%
                        </td>
                        <td>${pmSummary.maleAttendance}%</td>
                        <td>${pmSummary.femaleAttendance}%</td>
                    </tr>
                </tbody>
            </table>
        `;
    }
}

export default ReportsModule;
