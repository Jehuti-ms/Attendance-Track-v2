// assets/js/firebase.js - COMPLETE VERSION WITH GOOGLE AUTH
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
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

// ✅ YOUR FIREBASE CONFIG
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
const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// Add more scopes if needed (optional)
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Firestore Functions
export const Firestore = {
    // User Profiles
    async saveUserProfile(userId, userData) {
        try {
            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, {
                ...userData,
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });
            return { success: true };
        } catch (error) {
            console.error('Save user profile error:', error);
            return { success: false, error: error.message };
        }
    },

    async getUserProfile(userId) {
        try {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            return userSnap.exists() ? userSnap.data() : null;
        } catch (error) {
            console.error('Get user profile error:', error);
            return null;
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

    // Schools/Organizations
    async createSchool(schoolData) {
        try {
            const schoolRef = doc(collection(db, 'schools'));
            await setDoc(schoolRef, {
                ...schoolData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return { success: true, id: schoolRef.id };
        } catch (error) {
            console.error('Create school error:', error);
            return { success: false, error: error.message };
        }
    },

    async getSchool(schoolId) {
        try {
            const schoolRef = doc(db, 'schools', schoolId);
            const schoolSnap = await getDoc(schoolRef);
            return schoolSnap.exists() ? schoolSnap.data() : null;
        } catch (error) {
            console.error('Get school error:', error);
            return null;
        }
    }
};

// Authentication Functions
export const Auth = {
    // Email/Password
    async signUp(email, password, userData) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Save user profile to Firestore
            if (userData) {
                await Firestore.saveUserProfile(userCredential.user.uid, {
                    ...userData,
                    email: email,
                    createdAt: new Date().toISOString(),
                    authProvider: 'email'
                });
            }
            
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message, code: error.code };
        }
    },

    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // Update last login
            await Firestore.saveUserProfile(userCredential.user.uid, {
                lastLogin: new Date().toISOString()
            });
            
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message, code: error.code };
        }
    },

    // Google Sign-In
    async signInWithGoogle() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            
            // Check if this is a new user
            const isNewUser = result._tokenResponse?.isNewUser || false;
            
            // Save/update user profile
            await Firestore.saveUserProfile(user.uid, {
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                authProvider: 'google',
                googleAccessToken: token,
                lastLogin: new Date().toISOString(),
                ...(isNewUser && { createdAt: new Date().toISOString() })
            });
            
            return { 
                success: true, 
                user: user, 
                isNewUser: isNewUser,
                token: token 
            };
        } catch (error) {
            console.error('Google sign-in error:', error);
            return { success: false, error: error.message, code: error.code };
        }
    },

    async signInWithGoogleRedirect() {
        try {
            await signInWithRedirect(auth, googleProvider);
            return { success: true };
        } catch (error) {
            console.error('Google redirect error:', error);
            return { success: false, error: error.message };
        }
    },

    async handleRedirectResult() {
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                const user = result.user;
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential.accessToken;
                
                // Save user profile
                await Firestore.saveUserProfile(user.uid, {
                    name: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    authProvider: 'google',
                    googleAccessToken: token,
                    lastLogin: new Date().toISOString()
                });
                
                return { success: true, user: user };
            }
            return { success: false, error: 'No redirect result' };
        } catch (error) {
            console.error('Redirect result error:', error);
            return { success: false, error: error.message };
        }
    },

    // Sign out
    async signOutUser() {
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

    // Auth state observer
    onAuthStateChanged(callback) {
        return onAuthStateChanged(auth, callback);
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!auth.currentUser;
    }
};

// Helper function to get school ID from user
export const getSchoolId = () => {
    const user = auth.currentUser;
    if (!user) return null;
    
    // Check if user has a school in their profile
    const userProfile = JSON.parse(localStorage.getItem('attendance_user') || '{}');
    if (userProfile.schoolId) {
        return userProfile.schoolId;
    }
    
    // Default: create school ID from user UID
    return `school_${user.uid.substring(0, 8)}`;
};

// Export initialized instances and main functions
export { 
    app,
    auth, 
    db, 
    googleProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    getRedirectResult,
    signOut,
    onAuthStateChanged 
};

// Export individual Firestore functions for convenience
export { 
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
};
