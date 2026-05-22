import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBrBM0KsYK7RqtufgRqomRaXxLEFv81aM8",
  authDomain: "youthecho.firebaseapp.com",
  projectId: "youthecho",
  storageBucket: "youthecho.firebasestorage.app",
  messagingSenderId: "243406818779",
  appId: "1:243406818779:web:afa2f782d6904c91e86bfe"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth, signInAnonymously };