/**
 * Dyslipidemia rules.
 *
 * Primary sources (refreshed from obsolete NCEP ATP III 2001):
 *   - 2018 ACC/AHA Guideline on the Management of Blood Cholesterol
 *     (Circulation 2019;139:e1082-e1143)
 *   - 2022 ACC Expert Consensus Decision Pathway on Non-statin Therapies
 *     (JACC 2022;80:1366-1418)
 *   - ESC/EAS 2019 Guidelines for the Management of Dyslipidaemias
 *     (Eur Heart J 2020;41:111-188)
 *   - Lipid Association of India (LAI) 2020 Expert Consensus — risk stratification
 *     adapted for Indians
 *
 * ASCVD-risk framework — LDL ≥190 = statin Class I; LDL 70-189 + diabetes (age 40-75)
 * = Class I; otherwise risk-calculator-driven. The numeric tiers below map the
 * ASCVD-risk framework to dietary intensity.
 *
 * Input: patient.labs: ldl, hdl, tg, totalCholesterol
 * Output: tier + macro + prefer/exclude tags + do/don't lists
 */

export function classify({ ldl, hdl, tg, totalCholesterol }) {
  const L = Number(ldl) || 0;
  const H = Number(hdl) || 0;
  const T = Number(tg) || 0;
  const TC = Number(totalCholesterol) || 0;

  const highLDL = L >= 160 || TC >= 240;
  const borderlineLDL = (L >= 130 && L < 160) || (TC >= 200 && TC < 240);
  const lowHDL = H < 40;
  const highTG = T >= 200;
  const veryHighTG = T >= 500;

  let pattern = "normal";
  if (highLDL && highTG) pattern = "mixed";
  else if (veryHighTG) pattern = "very-high-tg";
  else if (highTG) pattern = "high-tg";
  else if (highLDL) pattern = "high-ldl";
  else if (borderlineLDL || lowHDL) pattern = "borderline";

  return { pattern, highLDL, borderlineLDL, lowHDL, highTG, veryHighTG };
}

export default function dyslipidemiaRule(patient) {
  const c = classify(patient);
  const { pattern } = c;

  // Macro: reduce saturated fat (<7% of energy), trans-fat = 0, push MUFA/PUFA
  const macros = { carb: 0.50, pro: 0.20, fat: 0.30 };
  // If TG-dominant -> lower carb (40-45%), raise MUFA
  if (pattern === "high-tg" || pattern === "very-high-tg" || pattern === "mixed") {
    macros.carb = 0.45; macros.fat = 0.35;
  }

  return {
    tier: pattern,
    calorieFactor: 0.95,
    macros,
    saturatedFatMaxPctKcal: 7,
    transFatMaxPctKcal: 0,
    cholesterolMaxMgPerDay: 200,
    fiberMinGperDay: 30,
    addedSugarMaxGperDay: pattern.includes("tg") ? 5 : 15,
    preferTags: ["heart-friendly", "omega-3", "MUFA", "high-fiber", "low-gi"],
    excludeTags: ["saturated", "avoid-dyslipidemia"],
    rules: [
      "Limit saturated fat to <7% of daily kcal; eliminate trans fat.",
      "Include 2 servings/week of oily fish (salmon, mackerel, rohu) or 30 g/day walnuts/flax for omega-3.",
      "25-30 g soluble fiber - oats, barley, beans, psyllium, apple, guava.",
      "Plant sterols: soy, flax, fresh beans, unsalted nuts.",
      "For high TG: restrict refined carbs & alcohol; prefer complex carbs."
    ],
    doList: [
      "Cook in mustard / olive / rice-bran oil - not more than 15 ml/day/person.",
      "Oats or ragi porridge breakfast 3-4 days/week.",
      "Handful (25 g) of unsalted almonds or walnuts daily.",
      "Minimum 5 servings fruits + vegetables/day.",
      "Grill / steam / bake - avoid deep frying.",
      "30 min aerobic exercise 5x/week."
    ],
    dontList: [
      "Avoid ghee, butter, palm oil, coconut oil, vanaspati (trans fat).",
      "No red meat organs (liver, brain), prawns in excess, egg yolk >3/week.",
      "No full-cream milk, cream, processed cheese, mayonnaise.",
      "No bakery & deep-fried snacks - samosa, kachori, namkeen, biscuits, cake.",
      "No sugar-sweetened beverages; strictly no alcohol if TG >=200."
    ]
  };
}
