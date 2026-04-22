/**
 * Drug–diet interactions + allergy warnings.
 *
 * We don't pretend to be a pharmacology reference — these are the high-yield,
 * counselling-grade dietary interactions a diabetologist actually repeats in
 * clinic every day. Keep the list short and clinically true.
 *
 * Source anchors:
 *   - Lexicomp / UpToDate drug-food interaction summaries (2024/2025)
 *   - ADA Standards of Care 2025 (metformin + B12; SGLT2i + hydration)
 *   - ACC/AHA 2022 HF (diuretics + K, Na, fluids)
 *   - KDIGO 2024 (ACEi/ARB + K)
 *   - Warfarin + vitamin-K consistency — standard anticoagulation practice
 */

const DRUG_RULES = {
  // Oral hypoglycaemics
  metformin: {
    label: "Metformin",
    warnings: [
      "Take WITH or immediately AFTER meals — reduces GI upset.",
      "Long-term use can lower B12 — recommend B12-rich foods (curd, eggs, fish) or annual B12 level."
    ]
  },
  sulfonylurea: {
    label: "Sulfonylurea (glimepiride / gliclazide)",
    warnings: [
      "Do NOT skip meals — real risk of hypoglycaemia.",
      "Carry 15 g fast carbs (3 glucose tabs / 1 tbsp sugar / 150 ml juice) for hypo rescue."
    ]
  },
  sglt2: {
    label: "SGLT2 inhibitor (empagliflozin / dapagliflozin)",
    warnings: [
      "Drink ~2–2.5 L water/day — risk of dehydration and genitourinary infection.",
      "Hold during vomiting / poor oral intake (euglycaemic DKA risk).",
      "Adequate carbohydrate intake — do not combine with extreme low-carb/keto."
    ]
  },
  glp1: {
    label: "GLP-1 RA (semaglutide / liraglutide)",
    warnings: [
      "Start small, frequent meals to reduce nausea.",
      "Avoid heavy, greasy, fried foods — slowed gastric emptying worsens symptoms."
    ]
  },
  insulin: {
    label: "Insulin",
    warnings: [
      "Match rapid-acting dose to carb content of the meal; maintain meal-time consistency.",
      "Never skip a meal after bolus dose. Keep hypo-rescue carbs on person."
    ]
  },

  // Cardio / renal
  statin: {
    label: "Statin (atorvastatin / rosuvastatin)",
    warnings: [
      "Avoid grapefruit / pomelo juice (CYP3A4) — increases statin levels.",
      "Report unexplained muscle pain or dark urine."
    ]
  },
  acei_arb: {
    label: "ACEi / ARB",
    warnings: [
      "Avoid potassium salt substitutes (LoSalt, Tata Saltlite).",
      "Limit very high-K foods if serum K ≥5.0 (coconut water, banana, orange, tomato puree, dry fruits)."
    ]
  },
  diuretic_loop: {
    label: "Loop diuretic (furosemide / torsemide)",
    warnings: [
      "Daily weight at the same time — report gain >2 kg in 3 days.",
      "Follow prescribed fluid + salt limit; avoid pickles / papads / salted namkeen."
    ]
  },
  diuretic_k_sparing: {
    label: "Potassium-sparing diuretic (spironolactone / eplerenone)",
    warnings: [
      "Do NOT use potassium salt substitutes.",
      "Monitor serum K — caution with high-K fruits and coconut water."
    ]
  },
  warfarin: {
    label: "Warfarin",
    warnings: [
      "KEEP vitamin-K intake CONSISTENT day to day (spinach, kale, broccoli, methi, sarson).",
      "Avoid large changes — don't suddenly start or stop green leafy vegetables.",
      "Avoid cranberry juice and high-dose vitamin E."
    ]
  },
  doac: {
    label: "DOAC (apixaban / rivaroxaban / dabigatran)",
    warnings: [
      "Rivaroxaban 15/20 mg must be taken WITH FOOD for absorption.",
      "Avoid St John's Wort and high-dose grapefruit."
    ]
  },
  thyroxine: {
    label: "Levothyroxine",
    warnings: [
      "Take on empty stomach, 30–60 min BEFORE breakfast.",
      "Separate from calcium, iron, antacids, soy, coffee by ≥4 hours."
    ]
  },
  iron: {
    label: "Oral iron",
    warnings: [
      "Take with vitamin-C (lemon / amla) on empty stomach for best absorption.",
      "Avoid tea, coffee, milk, calcium within 2 h of the dose.",
      "Alternate-day dosing improves absorption and tolerance (WHO)."
    ]
  }
};

const ALLERGY_RULES = {
  peanut:    { label: "Peanut",        avoid: ["peanut", "mungfali", "groundnut", "peanut chutney", "peanut oil (refined is usually OK)"] },
  tree_nut:  { label: "Tree nuts",     avoid: ["almond", "cashew", "walnut", "pistachio", "hazelnut"] },
  milk:      { label: "Cow milk / lactose", avoid: ["cow milk", "paneer", "curd", "buttermilk", "khoa", "milk-based sweets"] },
  egg:       { label: "Egg",           avoid: ["egg", "egg-white", "anda", "mayonnaise", "cakes with egg"] },
  soy:       { label: "Soy",           avoid: ["soy milk", "soy chunks (nutrela)", "tofu", "soya flour"] },
  wheat:     { label: "Wheat / gluten",avoid: ["wheat atta", "maida", "suji/rava", "barley", "dalia", "pasta", "bread", "biscuits"] },
  fish:      { label: "Fish",          avoid: ["rohu", "katla", "hilsa", "pomfret", "bhetki", "bombil", "fish curry"] },
  shellfish: { label: "Shellfish",     avoid: ["prawn", "crab", "lobster", "shrimp"] },
  sesame:    { label: "Sesame",        avoid: ["til", "tahini", "til chikki", "sesame oil"] }
};

/**
 * Build the interactions + allergy section for the diet plan.
 * @param {object} patient  — expects patient.medications (array of keys) and patient.allergies (array of keys)
 */
export default function buildInteractions(patient = {}) {
  const meds = Array.isArray(patient.medications) ? patient.medications : [];
  const allergies = Array.isArray(patient.allergies) ? patient.allergies : [];

  const drugItems = [];
  for (const m of meds) {
    const rule = DRUG_RULES[m];
    if (rule) drugItems.push({ drug: rule.label, warnings: rule.warnings });
  }

  const allergyItems = [];
  for (const a of allergies) {
    const rule = ALLERGY_RULES[a];
    if (rule) allergyItems.push({ allergy: rule.label, avoid: rule.avoid });
  }

  // A compact flat list of ingredient keywords to exclude from meal lines.
  const excludeIngredients = new Set();
  for (const a of allergies) {
    const rule = ALLERGY_RULES[a];
    if (!rule) continue;
    for (const item of rule.avoid) {
      // Pick the first word — used for substring matching against dish strings.
      const first = String(item).split(/[\s\/,]/)[0].toLowerCase();
      if (first.length >= 3) excludeIngredients.add(first);
    }
  }

  return {
    drugItems,
    allergyItems,
    excludeIngredients: Array.from(excludeIngredients)
  };
}

export { DRUG_RULES, ALLERGY_RULES };
