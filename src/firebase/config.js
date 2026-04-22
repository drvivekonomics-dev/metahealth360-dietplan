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
 * SECURITY NOTE:
 *   The values below are the PUBLIC web-app Firebase config. They are not
 *   secrets — Firebase uses them only to identify the project. Actual security
 *   is enforced by Firebase Auth rules + OAuth configuration (SHA-1 fingerprint
 *   for Android, bundle ID for iOS, authorised domains for Web).
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// -----------------------------------------------------------------------------
// Config from Firebase console → metahealth360 → Project settings → General →
// Web apps → "MetaHealth360 Doctor Portal" → SDK setup and configuration → Config.
// These are public identifiers (shipped in every web bundle) — not secrets.
// -----------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDsWQ2JAqJXs_GcSINJRl9FVw1PDGN4oZs",
  authDomain: "metahealth360.firebaseapp.com",
  projectId: "metahealth360",
  storageBucket: "metahealth360.firebasestorage.app",
  messagingSenderId: "451170253706",
  appId: "1:451170253706:web:3253cbe2d588d69cd32673",
  measurementId: "G-FSDM97CPG3"
};
// -----------------------------------------------------------------------------

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
