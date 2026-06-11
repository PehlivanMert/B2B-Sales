import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBiqlZh2L8QF8eJ30KPJaRFlG5OiNmVFLs",
  authDomain: "b2b-sales-crm-77251.firebaseapp.com",
  projectId: "b2b-sales-crm-77251",
  storageBucket: "b2b-sales-crm-77251.firebasestorage.app",
  messagingSenderId: "666649968422",
  appId: "1:666649968422:web:46bd7b917cd7abc438cbe7",
  measurementId: "G-L84BGG8G6V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
