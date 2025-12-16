// assets/js/firebase.js - CORRECT VERSION WITH YOUR CONFIG
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ✅ YOUR FIREBASE CONFIG (remove measurementId for now)
const firebaseConfig = {
    apiKey: "AIzaSyBPhe4eHZk__J27luIXzOPz6OGiubXkttE",
    authDomain: "attendance-track-v2.firebaseapp.com",
    projectId: "attendance-track-v2",
    storageBucket: "attendance-track-v2.firebasestorage.app",
    messagingSenderId: "598438033902",
    appId: "1:598438033902:web:3ba1e0e2be0a16ea7e36ff"
    // measurementId: "G-5QLW6M8VMM" // Remove this line for now
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Firestore Functions
export const Firestore = {
    // Classes
    async getClasses(schoolId) {
        try {
            const q = query(
                collection(db, 'classes'),
                where('schoolId', '==', schoolId),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Get classes error:', error);
            return [];
        }
    },

    async saveClass(schoolId, classData) {
        try {
            const classRef = doc(collection(db, 'classes'));
            await setDoc(classRef, {
                ...classData,
                schoolId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return { success: true, id: classRef.id };
        } catch (error) {
            console.error('Save class error:', error);
            return { success: false, error: error.message };
        }
    },

    // Attendance Records
    async saveAttendance(schoolId, attendanceData) {
        try {
            const attendanceRef = doc(collection(db, 'attendance'));
            await setDoc(attendanceRef, {
                ...attendanceData,
                schoolId,
                recordedBy: auth.currentUser?.uid,
                recordedByName: auth.currentUser?.email,
                timestamp: serverTimestamp(),
                date: new Date().toISOString().split('T')[0]
            });
            return { success: true, id: attendanceRef.id };
        } catch (error) {
            console.error('Save attendance error:', error);
            return { success: false, error: error.message };
        }
    },

    async getAttendance(schoolId, startDate, endDate) {
        try {
            const q = query(
                collection(db, 'attendance'),
                where('schoolId', '==', schoolId),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date', 'desc'),
                orderBy('timestamp', 'desc')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Get attendance error:', error);
            return [];
        }
    },

    async getTodayAttendance(schoolId) {
        const today = new Date().toISOString().split('T')[0];
        return this.getAttendance(schoolId, today, today);
    }
};

// Helper function to get school ID from user
export const getSchoolId = () => {
    const user = auth.currentUser;
    return user ? `school_${user.uid.substring(0, 8)}` : null;
};

// Export initialized instances
export { auth, db };
