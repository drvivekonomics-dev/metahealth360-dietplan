/**
 * Metabolic Syndrome rules.
 *
 * Primary sources:
 *   - IDF 2009 Consensus Worldwide Definition of MetS (Asian cut-offs) — still the
 *     reference definition; no formal replacement as of 2025
 *   - AHA/NHLBI 2005 Scientific Statement (harmonised criteria with IDF in 2009)
 *   - 2023 AHA Presidential Advisory on cardiovascular-kidney-metabolic (CKM) syndrome
 *     (Circulation 2023;148:1606-1635) — modernised framework overlapping MetS
 *   - DASH Diet (NHLBI) + PREDIMED Mediterranean evidence base
 *   - ICMR Dietary Guidelines for Indians 2024
 *
 * Diagnosis: central obesity (waist M>=90, F>=80 cm) + any 2 of:
 *   - TG >=150
 *   - HDL <40 (M) / <50 (F)
 *   - BP >=130/85 or on therapy
 *   - FBS >=100 or on therapy
 */

export function diagnose(p) {
  const sex = p.sex || "M";
  const waist = Number(p.waist) || 0;
  const tg = Number(p.tg) || 0;
  const hdl = Number(p.hdl) || 0;
  const sbp = Number(p.sbp) || 0;
  const dbp = Number(p.dbp) || 0;
  const fbs = Number(p.fbs) || 0;

  const centralObesity = (sex === "M" && waist >= 90) || (sex === "F" && waist >= 80);
  const criteria = [
    tg >= 150,
    (sex === "M" ? hdl < 40 : hdl < 50),
    sbp >= 130 || dbp >= 85,
    fbs >= 100
  ].filter(Boolean).length;

  return { centralObesity, criteriaCount: criteria, isMetS: centralObesity && criteria >= 2 };
}

export default function metabolicSyndromeRule(patient) {
  const dx = diagnose(patient);
  return {
    tier: dx.isMetS ? "metabolic-syndrome" : "at-risk",
    calorieFactor: 0.85,
    macros: { carb: 0.45, pro: 0.25, fat: 0.30 },
    saturatedFatMaxPctKcal: 7,
    sodiumMaxMgPerDay: 2300,
    addedSugarMaxGperDay: 5,
    fiberMinGperDay: 30,
    preferTags: ["low-gi", "high-fiber", "heart-friendly", "MUFA", "omega-3"],
    excludeTags: ["avoid-diabetes", "avoid-dyslipidemia", "saturated", "high-na"],
    rules: [
      "Combined therapeutic diet: DASH + low-GI + Mediterranean pattern.",
      "Waist reduction of 5-10% produces the biggest cardiometabolic benefit.",
      "150 min/week moderate aerobic + 2x/week resistance training."
    ],
    doList: [
      "Whole grains: oats, barley, jowar, bajra, ragi, quinoa - 4 servings/day.",
      "Pulses daily; 30 g unsalted nuts (almond/walnut/pistachio); 2 tsp flax/chia.",
      "Fish 2x/week; eggs up to 5/week (whole) or unlimited whites.",
      "Fruits + non-starchy veg >=5 servings/day; green leafy daily.",
      "Cook in mustard / olive / rice-bran oil; 500 ml low-fat milk or curd/day."
    ],
    dontList: [
      "No refined sugar, maida, sweetened beverages, fruit juice.",
      "No deep-fried, bakery, ultra-processed food, namkeen, chips, instant noodles.",
      "Red/processed meat <=1x/week; no trans fat (vanaspati, margarine).",
      "No alcohol - especially if TG elevated."
    ]
  };
}
