// assets/js/attendance.js - Global namespace version
console.log('📝 attendance.js loaded');

window.attendance = window.attendance || {
    init: function() {
        console.log('Initializing attendance module...');
        if (!this.isAuthenticated()) {
            window.location.href = window.getBasePath() + 'login.html';
            return;
        }
        
        this.loadClasses();
        this.setupEventListeners();
    },

    isAuthenticated: function() {
        return !!utils.loadData('attendance_user');
    },

    loadClasses: function() {
        console.log('Loading classes...');
        // Load classes from localStorage or generate demo data
        const classes = [
            { id: 'class-001', name: 'Mathematics 101', time: '9:00 AM', students: 24 },
            { id: 'class-002', name: 'Science 201', time: '11:00 AM', students: 18 },
            { id: 'class-003', name: 'English 101', time: '1:00 PM', students: 22 },
            { id: 'class-004', name: 'History 301', time: '3:00 PM', students: 20 }
        ];
        
        this.classes = classes;
        
        if (typeof this.renderClasses === 'function') {
            this.renderClasses(classes);
        }
    },

    setupEventListeners: function() {
        console.log('Setting up attendance event listeners...');
        
        // Class selection
        document.addEventListener('click', function(e) {
            if (e.target.closest('.class-card')) {
                const classId = e.target.closest('.class-card').dataset.classId;
                window.attendance.selectClass(classId);
            }
        });
        
        // Attendance buttons
        document.addEventListener('click', function(e) {
            if (e.target.closest('.attendance-btn')) {
                const studentId = e.target.closest('.attendance-btn').dataset.studentId;
                const status = e.target.closest('.attendance-btn').dataset.status;
                window.attendance.markStudent(studentId, status);
            }
        });
    },

    selectClass: function(classId) {
        console.log('Selected class:', classId);
        const selectedClass = this.classes.find(c => c.id === classId);
        
        if (selectedClass) {
            this.loadStudentsForClass(classId);
            window.showNotification(`Selected: ${selectedClass.name}`, 'info');
        }
    },

    loadStudentsForClass: function(classId) {
        console.log('Loading students for class:', classId);
        // Generate demo students
        const students = [];
        const firstNames = ['Alex', 'Jamie', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jordan', 'Avery'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
        
        for (let i = 1; i <= 12; i++) {
            students.push({
                id: `student-${classId}-${i}`,
                name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
                studentId: `S${1000 + i}`,
                status: Math.random() > 0.7 ? 'absent' : Math.random() > 0.5 ? 'late' : 'present'
            });
        }
        
        this.currentClassStudents = students;
        
        if (typeof this.renderStudents === 'function') {
            this.renderStudents(students);
        }
    },

    markStudent: function(studentId, status) {
        console.log(`Marking student ${studentId} as ${status}`);
        
        const student = this.currentClassStudents?.find(s => s.id === studentId);
        if (student) {
            student.status = status;
            window.showNotification(`Marked ${student.name} as ${status}`, 'success');
        }
    },

    saveAttendance: function() {
        console.log('Saving attendance...');
        const today = utils.formatDate();
        const attendanceData = {
            date: today,
            classId: this.currentClassId,
            students: this.currentClassStudents,
            teacher: utils.loadData('attendance_user')?.name || 'Unknown',
            timestamp: new Date().toISOString()
        };
        
        // Save to localStorage
        const allAttendance = utils.loadData('attendance_records') || [];
        allAttendance.push(attendanceData);
        utils.saveData('attendance_records', allAttendance);
        
        window.showNotification('Attendance saved successfully!', 'success');
        return true;
    }
};

// Auto-initialize if on attendance page
if (window.location.pathname.includes('attendance.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        window.attendance.init();
    });
}
