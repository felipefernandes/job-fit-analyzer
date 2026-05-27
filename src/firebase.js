import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
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
