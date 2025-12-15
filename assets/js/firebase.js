// assets/js/firebase.js - CORRECTED VERSION
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

// ⚠️ REPLACE WITH YOUR ACTUAL FIREBASE CONFIG ⚠️
cconst firebaseConfig = {
  apiKey: "AIzaSyBPhe4eHZk__J27luIXzOPz6OGiubXkttE",
  authDomain: "attendance-track-v2.firebaseapp.com",
  projectId: "attendance-track-v2",
  storageBucket: "attendance-track-v2.firebasestorage.app",
  messagingSenderId: "598438033902",
  appId: "1:598438033902:web:3ba1e0e2be0a16ea7e36ff",
  
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
    }
};

// Helper function to get school ID from user
export const getSchoolId = () => {
    const user = auth.currentUser;
    return user ? `school_${user.uid.substring(0, 8)}` : null;
};

// Export initialized instances
export { auth, db };// assets/js/firebase.js - ES6 Firebase Module
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
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

// Your Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBPhe4eHZk__J27luIXzOPz6OGiubXkttE",
  authDomain: "attendance-track-v2.firebaseapp.com",
  projectId: "attendance-track-v2",
  storageBucket: "attendance-track-v2.firebasestorage.app",
  messagingSenderId: "598438033902",
  appId: "1:598438033902:web:3ba1e0e2be0a16ea7e36ff",
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Authentication Functions
export const Auth = {
    // Sign up new user
    async signUp(email, password, userData) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Store additional user data in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                ...userData,
                email: user.email,
                createdAt: serverTimestamp(),
                role: 'teacher',
                school: userData.school || 'Not specified'
            });
            
            return { success: true, user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    },

    // Sign in existing user
    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    },

    // Sign out
    async signOut() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get current user
    getCurrentUser() {
        return auth.currentUser;
    },

    // Listen for auth state changes
    onAuthStateChanged(callback) {
        return onAuthStateChanged(auth, callback);
    }
};

// Firestore Functions
export const Firestore = {
    // School data
    async getSchoolData(schoolId) {
        try {
            const docRef = doc(db, 'schools', schoolId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data() : null;
        } catch (error) {
            console.error('Get school error:', error);
            return null;
        }
    },

    async saveSchoolData(schoolId, data) {
        try {
            await setDoc(doc(db, 'schools', schoolId), {
                ...data,
                updatedAt: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Save school error:', error);
            return { success: false, error: error.message };
        }
    },

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

    async updateClass(classId, updates) {
        try {
            await updateDoc(doc(db, 'classes', classId), {
                ...updates,
                updatedAt: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Update class error:', error);
            return { success: false, error: error.message };
        }
    },

    async deleteClass(classId) {
        try {
            await deleteDoc(doc(db, 'classes', classId));
            return { success: true };
        } catch (error) {
            console.error('Delete class error:', error);
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
    },

    // Students (for future enhancement)
    async getStudents(classId) {
        try {
            const q = query(
                collection(db, 'students'),
                where('classId', '==', classId),
                orderBy('lastName')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Get students error:', error);
            return [];
        }
    }
};

// Helper function to get school ID from user
export const getSchoolId = () => {
    const user = auth.currentUser;
    return user ? `school_${user.uid.substring(0, 8)}` : null;
};

// Export initialized instances
export { auth, db };
