# MetaHealth360 — Mobile (Android APK)

Clinical diet-plan generator for Indian patients. Doctor-only. On-device rule engine (no server needed for core logic), Google Sign-In via Firebase Auth. Generated PDFs are shared directly via the device share sheet (WhatsApp / email / print / Drive) — **no cloud archive**, so the project stays on Firebase's free Spark plan (no billing card required). If you need a fresh plan later, re-enter the labs.

## Stack
- Expo SDK 55 (React Native, managed workflow)
- Firebase Auth only (Google Sign-In) — no Cloud Storage, no Firestore
- expo-print (on-device PDF generation from HTML)
- expo-sharing (device share sheet for the generated PDF)
- Pure-JS rule engine, ported from the web app

## Covered conditions
Type 2 Diabetes / Prediabetes · Dyslipidemia · Heart Failure (NYHA) · CKD (by eGFR stage) · Iron-Deficiency Anemia · Pregnancy / Lactation · Weight Loss / Obesity · Metabolic Syndrome — with most-restrictive-wins merging across comorbidities.

---

## Setup

### 1. Install Node 20 LTS (not 25)
React Native is not tested on Node odd-numbered releases. Use `nvm install 20 && nvm use 20`.

### 2. Install Expo + EAS CLIs globally
```bash
npm install -g expo eas-cli
```

### 3. Install project deps
```bash
cd /Volumes/VIVEK1/MetaHealth360-Mobile
npm install
```

### 4. Paste your Firebase config
Open `src/firebase/config.js` and replace every `REPLACE_ME_*` with the values from the Firebase console → Project settings → Your apps → Web app.

### 5. Paste your Google OAuth Client IDs
Copy `.env.example` to `.env` and fill in:
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — created automatically when you enable the Google provider in Firebase Auth. Copy from Google Cloud Console → Credentials.
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` — created after your first EAS build (see below).

### 6. (No cloud storage step)
Earlier versions of this app archived the generated PDFs to Firebase Cloud Storage. That required upgrading Firebase to the Blaze (pay-as-you-go) plan, which we deliberately avoid. PDFs are now generated on-device and handed straight to the system share sheet (WhatsApp / email / Drive / print). The file lives on the phone only for the moment of sharing and is not kept by the app.

---

## Develop

```bash
npm start           # starts Expo dev server + QR
# Scan with Expo Go on your Android phone (both on same Wi-Fi).
```

Google Sign-In in Expo Go uses the Expo auth proxy — for production sign-in you must build a standalone APK (next).

## Build the APK

### First-time EAS setup
```bash
eas login                    # use your Expo account
eas build:configure          # choose Android, EAS picks up eas.json
```

### Build preview APK (installable on any Android device)
```bash
npm run build:apk            # eas build --profile preview --platform android
```
EAS builds in the cloud and emails you a download link (~15 min).

### Get the SHA-1 for Android OAuth
After the first build, fetch the signing fingerprint:
```bash
eas credentials --platform android
# Select: "setup the fingerprint", or inspect existing keystore
```
Copy the SHA-1 fingerprint → Google Cloud Console → Credentials → Create OAuth Client ID (Android) → paste package name `com.metahealth360.app` + SHA-1 → grab the new Android Client ID → paste into `.env` as `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` → rebuild.

---

## Project layout
```
app/
  _layout.jsx          Router root. Auth gate + PlanContext.
  login.jsx            Google Sign-In screen.
  index.jsx            Post-login home.
  patient-form.jsx     Patient intake (all fields from web app).
  plan-preview.jsx     Summary + "Generate & Share PDF" action (expo-print + expo-sharing).
src/
  engine/              Rule engine (calculators, dietEngine, mealPlanner).
  rules/               Per-condition modules (diabetes, ckd, HF, ...).
  data/indianFoods.json  138 Indian foods per-100g nutrients.
  pdf/buildHtml.js     HTML template fed to expo-print.
  firebase/config.js   Firebase initialisation.
```

## Clinical disclaimer
Decision-support software for licensed physicians and dietitians. All generated plans must be clinically reviewed before patient handoff. See the web app's `docs/CLINICAL_REFERENCES.md` for source guidelines.
