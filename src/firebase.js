import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof globalThis !== 'undefined' && globalThis.process ? globalThis.process.env : {});

const apiKey = env.VITE_FIREBASE_API_KEY;

if (!apiKey) {
  console.warn(
    "[Job Fit Analyzer Warning] VITE_FIREBASE_API_KEY não foi encontrada nas variáveis de ambiente durante o build.\n" +
    "Se este é um ambiente de produção, certifique-se de configurar as Secrets (VITE_FIREBASE_API_KEY, etc.) no seu serviço de CI/CD ou Hosting."
  );
}

const firebaseConfig = {
  apiKey: apiKey || "dummy-api-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-project.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "dummy-project",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-project.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
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
