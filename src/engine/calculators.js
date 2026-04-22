/**
 * Clinical calculators used by the diet engine.
 *   - BMI, Ideal body weight (Devine)
 *   - BMR (Mifflin-St Jeor)
 *   - TDEE via activity factor
 *   - eGFR (CKD-EPI 2021, race-free)
 *   - Target HR, Waist-to-height
 *
 * Ported verbatim from the web app's server/engine/calculators.js,
 * converted to ES modules.
 */

export function bmi({ weight, height }) {
  const h = Number(height) / 100; // cm → m
  if (!h || !weight) return null;
  return +(Number(weight) / (h * h)).toFixed(1);
}

export function ibwDevine({ sex, height }) {
  // height in cm; Devine: M = 50 + 0.9(cm-152.4); F = 45.5 + 0.9(cm-152.4)
  const cm = Number(height);
  if (!cm) return null;
  const base = sex === "M" ? 50 : 45.5;
  return +(base + 0.9 * (cm - 152.4)).toFixed(1);
}

export function bmrMifflin({ sex, weight, height, age }) {
  const w = Number(weight), h = Number(height), a = Number(age);
  if (!w || !h || !a) return null;
  const s = sex === "M" ? 5 : -161;
  return Math.round(10 * w + 6.25 * h - 5 * a + s);
}

export const ACTIVITY = {
  sedentary: 1.2,        // desk, no exercise
  light: 1.375,          // 1-3 days/wk light
  moderate: 1.55,        // 3-5 days/wk moderate
  active: 1.725,         // 6-7 days/wk hard
  very_active: 1.9       // athlete / physical labor
};

export function tdee({ sex, weight, height, age, activityLevel = "light" }) {
  const b = bmrMifflin({ sex, weight, height, age });
  if (!b) return null;
  return Math.round(b * (ACTIVITY[activityLevel] || 1.375));
}

/**
 * CKD-EPI 2021 race-free equation. Returns mL/min/1.73 m^2.
 * Input: serumCreatinine (mg/dL), age (y), sex ('M'|'F').
 */
export function egfrCkdEpi({ serumCreatinine, age, sex }) {
  const Scr = Number(serumCreatinine), a = Number(age);
  if (!Scr || !a) return null;
  const female = sex === "F";
  const k = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const minTerm = Math.min(Scr / k, 1) ** alpha;
  const maxTerm = Math.max(Scr / k, 1) ** -1.200;
  const sexFactor = female ? 1.012 : 1.0;
  const egfr = 142 * minTerm * maxTerm * (0.9938 ** a) * sexFactor;
  return Math.round(egfr);
}

export function waistHtRatio({ waist, height }) {
  const w = Number(waist), h = Number(height);
  if (!w || !h) return null;
  return +(w / h).toFixed(2);
}

export function macroGramsFromKcal(totalKcal, macros) {
  // macros: { carb, pro, fat } as fractions
  return {
    carbG: Math.round((totalKcal * macros.carb) / 4),
    proteinG: Math.round((totalKcal * macros.pro) / 4),
    fatG: Math.round((totalKcal * macros.fat) / 9)
  };
}

// Default aggregate export for convenience (mirrors the web app's module shape)
export default {
  bmi, ibwDevine, bmrMifflin, tdee, egfrCkdEpi, waistHtRatio, macroGramsFromKcal, ACTIVITY
};
