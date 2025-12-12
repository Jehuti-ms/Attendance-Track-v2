import { Utils, Storage, DateUtils } from './utils.js';

export class AttendanceModule {
    constructor(app) {
        this.app = app;
        this.attendanceAM = {};
        this.attendancePM = {};
        this.currentSession = 'both';
    }

    async init() {
        await this.loadAttendancePage();
        this.setupEventListeners();
        this.loadTodayAttendance();
        this.calculateCumulativeData();
    }

    async loadAttendancePage() {
        // Set default date to today
        const dateInput = document.getElementById('attendance-date');
        if (dateInput) {
            dateInput.value = Utils.formatDate(new Date());
        }
        
        // Setup week options
        this.updateWeekOptions();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('#save-attendance')) {
                this.saveCurrentSession();
            } else if (e.target.matches('#save-all-attendance')) {
                this.saveAllSessions();
            } else if (e.target.matches('#clear-attendance')) {
                this.clearAttendance();
            } else if (e.target.matches('.session-tab')) {
                this.switchSession(e.target.getAttribute('data-session'));
            }
        });

        // Date change listener
        const dateInput = document.getElementById('attendance-date');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                this.loadAttendanceForDate(dateInput.value);
            });
        }

        // Term change listener
        const termSelect = document.getElementById('attendance-term');
        if (termSelect) {
            termSelect.addEventListener('change', () => {
                this.updateWeekOptions();
            });
        }
    }

    updateWeekOptions() {
        const termSelect = document.getElementById('attendance-term');
        const weekSelect = document.getElementById('attendance-week');
        
        if (!termSelect || !weekSelect) return;

        const termId = termSelect.value;
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

    loadTodayAttendance() {
        const today = document.getElementById('attendance-date').value;
        this.loadAttendanceForDate(today);
    }

    loadAttendanceForDate(date) {
        const sessionKey = date;
        
        // Load from localStorage
        const savedAM = Storage.get(`gams_att_am_${sessionKey}`, {});
        const savedPM = Storage.get(`gams_att_pm_${sessionKey}`, {});
        
        this.attendanceAM = savedAM;
        this.attendancePM = savedPM;
        
        // Render the attendance table
        this.renderAttendanceTable();
    }

    renderAttendanceTable() {
        const tbody = document.getElementById('attendance-body');
        if (!tbody) return;

        const date = document.getElementById('attendance-date').value;
        const term = document.getElementById('attendance-term').value;
        const week = document.getElementById('attendance-week').value;

        let html = '';
        let totalStats = {
            students: 0,
            amMale: 0, pmMale: 0,
            amFemale: 0, pmFemale: 0,
            amPresent: 0, pmPresent: 0,
            amPossible: 0, pmPossible: 0
        };

        this.app.state.classes.forEach(cls => {
            const amRecord = this.attendanceAM[cls.id] || { males: '', females: '' };
            const pmRecord = this.attendancePM[cls.id] || { males: '', females: '' };

            const amMale = parseInt(amRecord.males) || 0;
            const amFemale = parseInt(amRecord.females) || 0;
            const pmMale = parseInt(pmRecord.males) || 0;
            const pmFemale = parseInt(pmRecord.females) || 0;

            const amTotal = amMale + amFemale;
            const pmTotal = pmMale + pmFemale;
            const dailyTotal = amTotal + pmTotal;

            // Calculate rates
            const amRate = cls.classSize > 0 ? Math.round((amTotal / cls.classSize) * 100) : 0;
            const pmRate = cls.classSize > 0 ? Math.round((pmTotal / cls.classSize) * 100) : 0;
            const dailyRate = cls.classSize > 0 ? Math.round((dailyTotal / (cls.classSize * 2)) * 100) : 0;

            // Get cumulative data
            const cumulative = this.app.state.cumulativeData[cls.id] || { present: 0, sessions: 0 };
            const historicalAvg = this.app.state.historicalAverages[cls.id] || dailyRate;

            // Determine rate classes
            const amRateClass = this.getRateClass(amRate);
            const pmRateClass = this.getRateClass(pmRate);
            const dailyRateClass = this.getRateClass(dailyRate);

            // Determine trend
            let vsAvgTrend = 'neutral';
            let vsAvgValue = 0;
            if (historicalAvg > 0) {
                vsAvgValue = ((dailyRate - historicalAvg) / historicalAvg) * 100;
                vsAvgTrend = vsAvgValue > 5 ? 'positive' : vsAvgValue < -5 ? 'negative' : 'neutral';
            }

            // Build row HTML
            html += `
                <tr>
                    <td>${cls.yearGroup}</td>
                    <td><strong>${cls.classCode}</strong></td>
                    <td>${cls.classSize}</td>
                    <td>
                        <input type="number" class="attendance-input" 
                               data-class="${cls.id}" data-type="male" data-session="am"
                               min="0" max="${cls.totalMales}" 
                               value="${amMale}" 
                               data-original="${amMale}">
                    </td>
                    <td>
                        <input type="number" class="attendance-input" 
                               data-class="${cls.id}" data-type="male" data-session="pm"
                               min="0" max="${cls.totalMales}" 
                               value="${pmMale}" 
                               data-original="${pmMale}">
                    </td>
                    <td>
                        <input type="number" class="attendance-input" 
                               data-class="${cls.id}" data-type="female" data-session="am"
                               min="0" max="${cls.totalFemales}" 
                               value="${amFemale}" 
                               data-original="${amFemale}">
                    </td>
                    <td>
                        <input type="number" class="attendance-input" 
                               data-class="${cls.id}" data-type="female" data-session="pm"
                               min="0" max="${cls.totalFemales}" 
                               value="${pmFemale}" 
                               data-original="${pmFemale}">
                    </td>
                    <td class="attendance-rate ${amRateClass}">
                        ${amRate}%
                    </td>
                    <td class="attendance-rate ${pmRateClass}">
                        ${pmRate}%
                    </td>
                    <td class="attendance-rate ${dailyRateClass}">
                        ${dailyRate}%
                    </td>
                    <td class="analysis-cell ${this.getCumulativeClass(cumulative)}">
                        ${cumulative.present || 0} / ${cumulative.sessions || 0}
                    </td>
                    <td class="analysis-cell ${vsAvgTrend}">
                        ${vsAvgValue > 0 ? '+' : ''}${vsAvgValue.toFixed(1)}%
                    </
