// firebaseConfig.js - Place this in your PROJECT ROOT directory
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Import the functions you need from the SDKs you need

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBrBM0KsYK7RqtufgRqomRaXxLEFv81aM8",
  authDomain: "youthecho.firebaseapp.com",
  projectId: "youthecho",
  storageBucket: "youthecho.firebasestorage.app",
  messagingSenderId: "243406818779",
  appId: "1:243406818779:web:afa2f782d6904c91e86bfe"
};


const app = initializeApp(firebaseConfig);

// Initialize Firestore (database)
const db = getFirestore(app);

// Initialize Storage (for temp images - will be deleted)
const storage = getStorage(app);

// Initialize Auth with persistence
const auth = getAuth(app);

export { db, auth, signInAnonymously };