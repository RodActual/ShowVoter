// src/firebase.js
import { initializeApp } from ‘firebase/app’;
import { getAuth } from ‘firebase/auth’;
import { getFirestore } from ‘firebase/firestore’;

// Replace this with your Firebase config from the Firebase Console
const firebaseConfig = {

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;