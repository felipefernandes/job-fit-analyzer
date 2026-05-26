import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8ZzY6htd-BaUd6Rm_3ys-urQt6xExSq4",
  authDomain: "job-fit-analyzer-4f7af.firebaseapp.com",
  projectId: "job-fit-analyzer-4f7af",
  storageBucket: "job-fit-analyzer-4f7af.firebasestorage.app",
  messagingSenderId: "446735320017",
  appId: "1:446735320017:web:272559cd197348313d16f0",
  measurementId: "G-FNQ0S86PQZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth & Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Safe initialization of Analytics (handles SSR / adblockers / unsupported environments and LGPD consent)
let analytics = null;

export const initializeAnalyticsSafe = async () => {
  const consent = localStorage.getItem("lgpd_consent");
  if (consent !== "accepted") {
    return null;
  }
  try {
    const supported = await isSupported();
    if (supported && !analytics) {
      analytics = getAnalytics(app);
    }
  } catch (err) {
    console.warn("Firebase Analytics is not supported in this environment:", err);
  }
  return analytics;
};

// Try to initialize automatically on startup if consent was previously granted
initializeAnalyticsSafe();

export { app, analytics, auth, db };
