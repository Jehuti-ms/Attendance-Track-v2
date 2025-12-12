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
                    </td>
                </tr>
            `;

            // Update totals
            totalStats.students += cls.classSize;
            totalStats.amMale += amMale;
            totalStats.pmMale += pmMale;
            totalStats.amFemale += amFemale;
            totalStats.pmFemale += pmFemale;
            totalStats.amPresent += amTotal;
            totalStats.pmPresent += pmTotal;
            totalStats.amPossible += cls.classSize;
            totalStats.pmPossible += cls.classSize;
        });

        tbody.innerHTML = html;

        // Update footer totals
        this.updateFooterTotals(totalStats);

        // Add input event listeners
        this.setupAttendanceInputListeners();

        // Update analysis summary
        this.updateAnalysisSummary(totalStats);

        // Update session comparison
        this.updateSessionComparison(totalStats);
    }

    setupAttendanceInputListeners() {
        document.querySelectorAll('.attendance-input').forEach(input => {
            input.addEventListener('input', (e) => this.handleAttendanceInput(e.target));
        });
    }

    handleAttendanceInput(input) {
        const classId = input.getAttribute('data-class');
        const type = input.getAttribute('data-type');
        const session = input.getAttribute('data-session');
        const value = parseInt(input.value) || 0;
        const original = parseInt(input.getAttribute('data-original')) || 0;

        // Update the appropriate attendance object
        if (session === 'am') {
            if (!this.attendanceAM[classId]) this.attendanceAM[classId] = {};
            this.attendanceAM[classId][type === 'male' ? 'males' : 'females'] = value;
        } else {
            if (!this.attendancePM[classId]) this.attendancePM[classId] = {};
            this.attendancePM[classId][type === 'male' ? 'males' : 'females'] = value;
        }

        // Mark as changed
        if (value !== original) {
            input.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
            input.style.borderColor = '#ff9800';
        }

        // Update the row calculations
        const row = input.closest('tr');
        this.updateRowCalculations(row, classId);

        // Update footer totals
        this.updateFooterTotalsFromTable();
    }

    updateRowCalculations(row, classId) {
        const cls = this.app.state.classes.find(c => c.id === classId);
        if (!cls) return;

        // Get all inputs for this row
        const amMaleInput = row.querySelector('input[data-type="male"][data-session="am"]');
        const pmMaleInput = row.querySelector('input[data-type="male"][data-session="pm"]');
        const amFemaleInput = row.querySelector('input[data-type="female"][data-session="am"]');
        const pmFemaleInput = row.querySelector('input[data-type="female"][data-session="pm"]');

        const amMale = parseInt(amMaleInput.value) || 0;
        const pmMale = parseInt(pmMaleInput.value) || 0;
        const amFemale = parseInt(amFemaleInput.value) || 0;
        const pmFemale = parseInt(pmFemaleInput.value) || 0;

        const amTotal = amMale + amFemale;
        const pmTotal = pmMale + pmFemale;
        const dailyTotal = amTotal + pmTotal;

        // Calculate rates
        const amRate = cls.classSize > 0 ? Math.round((amTotal / cls.classSize) * 100) : 0;
        const pmRate = cls.classSize > 0 ? Math.round((pmTotal / cls.classSize) * 100) : 0;
        const dailyRate = cls.classSize > 0 ? Math.round((dailyTotal / (cls.classSize * 2)) * 100) : 0;

        // Update rate cells
        const amRateCell = row.querySelector('td:nth-child(8)');
        const pmRateCell = row.querySelector('td:nth-child(9)');
        const dailyRateCell = row.querySelector('td:nth-child(10)');

        amRateCell.textContent = `${amRate}%`;
        amRateCell.className = `attendance-rate ${this.getRateClass(amRate)}`;

        pmRateCell.textContent = `${pmRate}%`;
        pmRateCell.className = `attendance-rate ${this.getRateClass(pmRate)}`;

        dailyRateCell.textContent = `${dailyRate}%`;
        dailyRateCell.className = `attendance-rate ${this.getRateClass(dailyRate)}`;
    }

    updateFooterTotals(stats) {
        const amRate = stats.amPossible > 0 ? Math.round((stats.amPresent / stats.amPossible) * 100) : 0;
        const pmRate = stats.pmPossible > 0 ? Math.round((stats.pmPresent / stats.pmPossible) * 100) : 0;
        const dailyRate = (stats.amPossible + stats.pmPossible) > 0 ? 
            Math.round(((stats.amPresent + stats.pmPresent) / (stats.amPossible + stats.pmPossible)) * 100) : 0;

        this.updateElement('total-students-cell', stats.students);
        this.updateElement('total-am-male', stats.amMale);
        this.updateElement('total-pm-male', stats.pmMale);
        this.updateElement('total-am-female', stats.amFemale);
        this.updateElement('total-pm-female', stats.pmFemale);
        this.updateElement('avg-am-rate', `${amRate}%`);
        this.updateElement('avg-pm-rate', `${pmRate}%`);
        this.updateElement('avg-daily-rate', `${dailyRate}%`);
    }

    updateFooterTotalsFromTable() {
        const stats = {
            students: 0,
            amMale: 0, pmMale: 0,
            amFemale: 0, pmFemale: 0,
            amPresent: 0, pmPresent: 0,
            amPossible: 0, pmPossible: 0
        };

        this.app.state.classes.forEach(cls => {
            const amRecord = this.attendanceAM[cls.id] || { males: 0, females: 0 };
            const pmRecord = this.attendancePM[cls.id] || { males: 0, females: 0 };

            stats.students += cls.classSize;
            stats.amMale += parseInt(amRecord.males) || 0;
            stats.pmMale += parseInt(pmRecord.males) || 0;
            stats.amFemale += parseInt(amRecord.females) || 0;
            stats.pmFemale += parseInt(pmRecord.females) || 0;
            stats.amPresent += (parseInt(amRecord.males) || 0) + (parseInt(amRecord.females) || 0);
            stats.pmPresent += (parseInt(pmRecord.males) || 0) + (parseInt(pmRecord.females) || 0);
            stats.amPossible += cls.classSize;
            stats.pmPossible += cls.classSize;
        });

        this.updateFooterTotals(stats);
        this.updateAnalysisSummary(stats);
        this.updateSessionComparison(stats);
    }

    updateAnalysisSummary(stats) {
        const totalPresent = stats.amPresent + stats.pmPresent;
        const totalPossible = stats.amPossible + stats.pmPossible;
        const overallRate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

        this.updateElement('summary-total-present', totalPresent);
        this.updateElement('summary-am-attendance', `${Math.round((stats.amPresent / stats.amPossible) * 100)}%`);
        this.updateElement('summary-pm-attendance', `${Math.round((stats.pmPresent / stats.pmPossible) * 100)}%`);
        this.updateElement('summary-daily-average', `${overallRate}%`);
    }

    updateSessionComparison(stats) {
        const amMaleRate = stats.amPossible > 0 ? Math.round((stats.amMale / stats.amPossible) * 100) : 0;
        const amFemaleRate = stats.amPossible > 0 ? Math.round((stats.amFemale / stats.amPossible) * 100) : 0;
        const pmMaleRate = stats.pmPossible > 0 ? Math.round((stats.pmMale / stats.pmPossible) * 100) : 0;
        const pmFemaleRate = stats.pmPossible > 0 ? Math.round((stats.pmFemale / stats.pmPossible) * 100) : 0;

        this.updateElement('am-male-percentage', `${amMaleRate}%`);
        this.updateElement('am-female-percentage', `${amFemaleRate}%`);
        this.updateElement('pm-male-percentage', `${pmMaleRate}%`);
        this.updateElement('pm-female-percentage', `${pmFemaleRate}%`);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    getRateClass(rate) {
        if (rate >= 90) return 'good';
        if (rate >= 75) return 'average';
        return 'poor';
    }

    getCumulativeClass(cumulative) {
        const rate = cumulative.sessions > 0 ? (cumulative.present / cumulative.sessions) * 100 : 0;
        if (rate >= 85) return 'positive';
        if (rate >= 70) return 'neutral';
        return 'negative';
    }

    switchSession(session) {
        this.currentSession = session;
        
        // Update tab UI
        document.querySelectorAll('.session-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Filter view
        this.filterSessionView(session);
    }

    filterSessionView(session) {
        document.querySelectorAll('.attendance-table tbody tr').forEach(row => {
            const amInputs = row.querySelectorAll('input[data-session="am"]');
            const pmInputs = row.querySelectorAll('input[data-session="pm"]');
            
            if (session === 'both') {
                amInputs.forEach(input => input.style.opacity = '1');
                pmInputs.forEach(input => input.style.opacity = '1');
            } else if (session === 'am') {
                amInputs.forEach(input => input.style.opacity = '1');
                pmInputs.forEach(input => input.style.opacity = '0.3');
            } else if (session === 'pm') {
                amInputs.forEach(input => input.style.opacity = '0.3');
                pmInputs.forEach(input => input.style.opacity = '1');
            }
        });
    }

    async saveCurrentSession() {
        const date = document.getElementById('attendance-date').value;
        const term = document.getElementById('attendance-term').value;
        const week = document.getElementById('attendance-week').value;
        
        if (!date) {
            this.app.showToast('Please select a date', 'error');
            return;
        }

        const sessionData = this.currentSession === 'am' ? this.attendanceAM : this.attendancePM;
        const sessionKey = `gams_att_${this.currentSession}_${date}`;
        
        // Save to localStorage
        Storage.set(sessionKey, sessionData);
        
        // Create attendance records
        const records = [];
        Object.keys(sessionData).forEach(classId => {
            const cls = this.app.state.classes.find(c => c.id === classId);
            if (cls) {
                records.push({
                    date: date,
                    session: this.currentSession,
                    term: term,
                    week: parseInt(week) || 1,
                    classId: classId,
                    classCode: cls.classCode,
                    yearGroup: cls.yearGroup,
                    malesPresent: sessionData[classId].males || 0,
                    femalesPresent: sessionData[classId].females || 0,
                    totalPresent: (sessionData[classId].males || 0) + (sessionData[classId].females || 0),
                    classSize: cls.classSize,
                    savedAt: new Date().toISOString()
                });
            }
        });
        
        // Add to app state
        records.forEach(record => {
            this.app.state.attendanceRecords.push(record);
        });
        
        Storage.set('gams_attendance', this.app.state.attendanceRecords);
        
        // Try to save to Google Sheets
        if (this.app.state.isOnline) {
            try {
                await this.saveToGoogleSheets(records);
                this.app.showToast(`${this.currentSession.toUpperCase()} session saved to Google Sheets!`, 'success');
            } catch (error) {
                this.app.showToast(`${this.currentSession.toUpperCase()} session saved locally`, 'warning');
            }
        } else {
            this.app.showToast(`${this.currentSession.toUpperCase()} session saved successfully!`, 'success');
        }
        
        // Update cumulative data
        this.calculateCumulativeData();
    }

    async saveAllSessions() {
        const date = document.getElementById('attendance-date').value;
        const term = document.getElementById('attendance-term').value;
        const week = document.getElementById('attendance-week').value;
        
        if (!date) {
            this.app.showToast('Please select a date', 'error');
            return;
        }

        // Save both sessions to localStorage
        Storage.set(`gams_att_am_${date}`, this.attendanceAM);
        Storage.set(`gams_att_pm_${date}`, this.attendancePM);
        
        // Create attendance records for both sessions
        const records = [];
        
        // AM session records
        Object.keys(this.attendanceAM).forEach(classId => {
            const cls = this.app.state.classes.find(c => c.id === classId);
            if (cls) {
                records.push({
                    date: date,
                    session: 'am',
                    term: term,
                    week: parseInt(week) || 1,
                    classId: classId,
                    classCode: cls.classCode,
                    yearGroup: cls.yearGroup,
                    malesPresent: this.attendanceAM[classId].males || 0,
                    femalesPresent: this.attendanceAM[classId].females || 0,
                    totalPresent: (this.attendanceAM[classId].males || 0) + (this.attendanceAM[classId].females || 0),
                    classSize: cls.classSize,
                    savedAt: new Date().toISOString()
                });
            }
        });
        
        // PM session records
        Object.keys(this.attendancePM).forEach(classId => {
            const cls = this.app.state.classes.find(c => c.id === classId);
            if (cls) {
                records.push({
                    date: date,
                    session: 'pm',
                    term: term,
                    week: parseInt(week) || 1,
                    classId: classId,
                    classCode: cls.classCode,
                    yearGroup: cls.yearGroup,
                    malesPresent: this.attendancePM[classId].males || 0,
                    femalesPresent: this.attendancePM[classId].females || 0,
                    totalPresent: (this.attendancePM[classId].males || 0) + (this.attendancePM[classId].females || 0),
                    classSize: cls.classSize,
                    savedAt: new Date().toISOString()
                });
            }
        });
        
        // Add to app state
        records.forEach(record => {
            this.app.state.attendanceRecords.push(record);
        });
        
        Storage.set('gams_attendance', this.app.state.attendanceRecords);
        
        // Try to save to Google Sheets
        if (this.app.state.isOnline) {
            try {
                await this.saveToGoogleSheets(records);
                this.app.showToast('Both sessions saved to Google Sheets!', 'success');
            } catch (error) {
                this.app.showToast('Both sessions saved locally', 'warning');
            }
        } else {
            this.app.showToast('Both sessions saved successfully!', 'success');
        }
        
        // Update cumulative data
        this.calculateCumulativeData();
    }

    async saveToGoogleSheets(records) {
        if (!this.app.state.isOnline || !this.app.state.settings.webAppUrl) {
            return false;
        }
        
        try {
            const url = new URL(this.app.state.settings.webAppUrl);
            url.searchParams.append('action', 'saveAttendance');
            url.searchParams.append('attendance', JSON.stringify(records));
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                redirect: 'follow',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to save attendance');
            }
            
            return data;
        } catch (error) {
            console.error('Google Sheets save error:', error);
            throw error;
        }
    }

    clearAttendance() {
        if (confirm('Clear all attendance entries for today?')) {
            this.attendanceAM = {};
            this.attendancePM = {};
            
            const date = document.getElementById('attendance-date').value;
            Storage.remove(`gams_att_am_${date}`);
            Storage.remove(`gams_att_pm_${date}`);
            
            this.renderAttendanceTable();
            this.app.showToast('Attendance cleared', 'warning');
        }
    }

    calculateCumulativeData() {
        // Reset cumulative data
        this.app.state.cumulativeData = {};
        
        // Group records by class
        const classRecords = {};
        this.app.state.attendanceRecords.forEach(record => {
            if (!classRecords[record.classId]) {
                classRecords[record.classId] = [];
            }
            classRecords[record.classId].push(record);
        });
        
        // Calculate cumulative for each class
        Object.keys(classRecords).forEach(classId => {
            const records = classRecords[classId];
            const totalPresent = records.reduce((sum, r) => sum + r.totalPresent, 0);
            const totalSessions = records.length;
            
            this.app.state.cumulativeData[classId] = {
                present: totalPresent,
                sessions: totalSessions
            };
        });
        
        // Calculate historical averages
        this.calculateHistoricalAverages();
        
        // Save to localStorage
        Storage.set('gams_cumulative', this.app.state.cumulativeData);
        Storage.set('gams_averages', this.app.state.historicalAverages);
    }

    calculateHistoricalAverages() {
        const classAverages = {};
        const classRecords = {};
        
        this.app.state.attendanceRecords.forEach(record => {
            if (!classRecords[record.classId]) {
                classRecords[record.classId] = [];
            }
            classRecords[record.classId].push(record);
        });
        
        Object.keys(classRecords).forEach(classId => {
            const records = classRecords[classId];
            const totalRate = records.reduce((sum, r) => {
                const rate = r.classSize > 0 ? (r.totalPresent / r.classSize) * 100 : 0;
                return sum + rate;
            }, 0);
            
            const avgRate = records.length > 0 ? totalRate / records.length : 0;
            classAverages[classId] = Math.round(avgRate);
        });
        
        this.app.state.historicalAverages = classAverages;
    }

    saveSessionAttendance() {
        const date = document.getElementById('attendance-date').value;
        if (date) {
            Storage.set(`gams_att_am_${date}`, this.attendanceAM);
            Storage.set(`gams_att_pm_${date}`, this.attendancePM);
        }
    }
}

export default AttendanceModule;
