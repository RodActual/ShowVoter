// src/firebase.js
import { initializeApp } from ‘firebase/app’;
import { getAuth } from ‘firebase/auth’;
import { getFirestore } from ‘firebase/firestore’;

// Replace this with your Firebase config from the Firebase Console
const firebaseConfig = {
apiKey: "AIzaSyCWbNluKAI5L2S3JoLHymzKFmNW01zMdVc",
  authDomain: "watch-together-78712.firebaseapp.com",
  projectId: "watch-together-78712",
  storageBucket: "watch-together-78712.firebasestorage.app",
  messagingSenderId: "645519961462",
  appId: "1:645519961462:web:4b91bb2caffab357205e57",
  measurementId: "G-5HXMP6VBF8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;