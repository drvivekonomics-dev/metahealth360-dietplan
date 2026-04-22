# MetaHealth360 Diet Plan — Mobile (Android APK)

[![ci](https://github.com/drvivekonomics-dev/metahealth360-dietplan/actions/workflows/ci.yml/badge.svg)](https://github.com/drvivekonomics-dev/metahealth360-dietplan/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Clinic-only decision-support tool for Indian diabetology / endocrinology practice. On-device rule engine, Firebase email-password auth, PDFs rendered on the device and shared via the system share sheet (WhatsApp / email / print / Drive). No server, no PHI upload, no cloud archive.

Package: `com.raskar.metahealth360.dietplan`

---

## What it does

1. Intake form (Marathi / Hindi / English) captures anthropometry, labs, comorbidities, medications, allergies, activity, pregnancy / lactation, GLP-1 / IF preferences.
2. Calculators: IBW (Devine), adjusted BW, BMI, BSA, BMR (Mifflin–St Jeor), TDEE, eGFR (CKD-EPI 2021), HOMA-IR, CrCl (Cockcroft–Gault), fluid targets.
3. Condition engine layers rules for T2DM / prediabetes, dyslipidemia, HF (NYHA), CKD (by eGFR stage), iron-deficiency anemia, pregnancy / lactation, obesity / weight-loss, metabolic syndrome — most-restrictive-wins merge.
4. Meal planner produces a 7-day Indian-food plan (138-item per-100 g nutrient DB) hitting the merged macro / fluid / micronutrient targets.
5. **GLP-1 / GIP agonist + Intermittent Fasting module** (optional): semaglutide / rybelsus / dulaglutide / liraglutide / tirzepatide dose-phase schedule aligned to a 14:10 / 16:8 / 18:6 / 5:2 fasting window, with absolute-contraindication gating (MTC, MEN-2, pregnancy, lactation, gastroparesis, active pancreatitis) and amber monitoring flags (SU/insulin dose reduction, eGFR < 30, T1DM off-label, age ≥ 70 sarcopenia risk, proliferative retinopathy, ED history, gallbladder disease).
6. PDF rendered from HTML via `expo-print`, 1.4 g/kg IBW protein floor, phase-banded weekly schedule table, full clinical-citation block.
7. Share sheet via `expo-sharing` — WhatsApp / email / print / Drive. File lives on the device only for the moment of sharing.

## Stack

- Expo SDK 55, React Native 0.83, Expo Router 4
- Firebase Auth (email + password) — no Firestore, no Cloud Storage → stays on the Spark free tier
- `expo-print` (on-device PDF) + `expo-sharing` (device share sheet)
- Pure-JS rule engine (`src/engine`, `src/rules`)

## Running locally

```bash
nvm use 20
npm install
npx expo start               # dev server + QR for Expo Go
npx expo run:android         # local Android build against a connected device / emulator
```

Build a distributable APK:

```bash
eas build -p android --profile preview
```

Run the offline smoke test (no Expo, no JSX bundling — engine-only):

```bash
node smoke.mjs
```

## Project layout

```
app/
  _layout.jsx          Router root, auth gate, PlanContext
  login.jsx            Firebase email/password login
  index.jsx            Post-login home
  patient-form.jsx     Patient intake (including GLP-1 / IF section and safety flags)
  plan-preview.jsx     Summary + "Generate & Share PDF" action
assets/                app icon, splash, adaptive icon, notification icon
src/
  engine/
    calculators.js        IBW / BMI / BMR / TDEE / eGFR / HOMA-IR / BSA
    dietEngine.js         Merges condition rules, emits the plan object
    mealPlanner.js        7-day Indian meal planner
    glpIfProtocol.js      GLP-1 + intermittent-fasting protocol builder
  rules/
    diabetes.js · ckd.js · heartFailure.js · dyslipidemia.js ·
    pregnancyLactation.js · anemia.js · obesity.js · metabolicSyndrome.js
  pdf/
    buildHtml.js       HTML template fed to expo-print
    citations.js       Clinical-reference block (per-condition + GLP-1 / IF)
  i18n/translations.js EN / HI / MR strings
  storage/             AsyncStorage helpers for draft patient data
  firebase/config.js   Firebase init (public web-app config — see note below)
  data/indianFoods.json 138 Indian foods, per-100 g nutrients
smoke.mjs              Engine-only smoke test (Node)
```

## Scope & boundaries

- **Clinic-only** — intended for a licensed physician / dietitian. All generated plans must be clinically reviewed before patient handoff.
- **No PHI leaves the device.** There is no server, no analytics, no crash telemetry, no Firestore / Cloud Storage. Patient data lives in device `AsyncStorage` as a working draft and is never synced.
- **No API secrets.** Firebase web-app `apiKey` in `src/firebase/config.js` is a public identifier (not a credential). Security is enforced by Firebase Auth rules + Android SHA-1 / bundle-ID pinning. See [Firebase docs on API keys](https://firebase.google.com/docs/projects/api-keys).
- **Not a medical device.** Decision-support software; pharmacology rules reflect ADA 2025 + RSSDI-ESI 2024 consensus + CDSCO India (March 2025 tirzepatide approval) — confirm against current prescribing information for each patient.

## Clinical disclaimer

This is decision-support software for licensed physicians and dietitians. All generated plans must be clinically reviewed before handoff. Citations in the PDF footer point to the underlying guideline sources (ADA, RSSDI-ESI, STEP / SURPASS / SURMOUNT trials, Longo-Mattson & Varady IF reviews, FDA prescribing information, CDSCO India).

## Contributing

Clinical rule changes must cite a guideline or peer-reviewed source — see the pull-request template. Open a [clinical rule issue](.github/ISSUE_TEMPLATE/clinical-rule-issue.md) if a dose, macro target, or contraindication looks wrong; those are triaged ahead of everything else.

## License

MIT, with a clinical-use notice attached — see [LICENSE](LICENSE). This is **not** a medical device and has **not** been approved by any regulatory authority.

Built by **Dr. Vivek Raskar**, diabetologist.
