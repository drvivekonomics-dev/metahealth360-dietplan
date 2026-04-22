/**
 * Firebase initialisation for MetaHealth360 Diet Plan (mobile).
 *
 * We use Firebase Auth ONLY (Google Sign-In). Cloud Storage is NOT used —
 * generated PDFs are shared via the device share sheet (WhatsApp / email /
 * print) and are not archived to any backend. Keeps the project on the
 * free Spark plan (no billing card required).
 *
 * Shares the existing "metahealth360" Firebase project with the live Doctor
 * Portal web app + the live native Android/iOS apps (com.raskar.metahealth360).
 * One project = one Auth user pool across every client. This diet-plan APK
 * is registered separately as com.raskar.metahealth360.dietplan so its
 * install does NOT collide with the live mobile app.
 *
 * Firebase config values are loaded from environment variables (EXPO_PUBLIC_*).
 * Copy .env.example → .env and fill in the values from:
 * Firebase console → metahealth360 → Project settings → General →
 * Web apps → "MetaHealth360 Doctor Portal" → SDK setup and configuration → Config.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialise the Firebase app once (hot-reload safe)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth with AsyncStorage persistence (RN).
// On second load of the module `initializeAuth` would throw, so fall back to getAuth.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}

export { app, auth };
