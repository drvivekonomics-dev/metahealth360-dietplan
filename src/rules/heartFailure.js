/**
 * Heart Failure rules.
 *
 * Primary sources:
 *   - 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
 *     (Circulation 2022;145:e895-e1032) + 2023 Focused Update (Circulation 2023)
 *   - 2021 ESC Guidelines for the diagnosis and treatment of acute and chronic HF
 *     (Eur Heart J 2021;42:3599-3726) + 2023 ESC Focused Update (Eur Heart J 2023)
 *   - Cardiological Society of India (CSI) Heart Failure Position Statement 2024
 *
 * Input: patient.nyhaClass (I-IV), optional ef (ejection fraction), edema flag.
 */

export default function heartFailureRule(patient) {
  const nyha = (patient.nyhaClass || "II").toString().toUpperCase().replace("CLASS", "").trim();

  // Sodium & fluid restriction scale with NYHA class / symptoms.
  const sodiumMg = { "I": 2300, "II": 2000, "III": 1500, "IV": 1500 }[nyha] || 2000;
  const fluidMl  = { "I": 2000, "II": 1800, "III": 1500, "IV": 1200 }[nyha] || 1800;

  // Energy: avoid cardiac cachexia (NYHA III/IV often undernourished).
  const calorieFactor = ["III","IV"].includes(nyha) ? 1.10 : 1.00;

  return {
    tier: "NYHA-" + nyha,
    calorieFactor,
    macros: { carb: 0.55, pro: 0.20, fat: 0.25 },
    sodiumMaxMgPerDay: sodiumMg,
    fluidMaxMlPerDay: fluidMl,
    potassiumTargetMg: [3500, 4700],       // maintain unless on K-sparing diuretics
    saturatedFatMaxPctKcal: 7,
    fiberMinGperDay: 25,
    preferTags: ["heart-friendly", "low-na", "omega-3", "high-fiber"],
    excludeTags: ["high-na", "avoid-heart-failure", "saturated"],
    rules: [
      `Sodium <= ${sodiumMg} mg/day (~${(sodiumMg/1000*2.5).toFixed(1)} g salt).`,
      `Total fluid <= ${fluidMl} ml/day (includes water, tea, milk, dal, soup, curd).`,
      "Weigh daily - rise of >=2 kg in 3 days signals fluid retention -> contact physician.",
      "Daily potassium 3500-4700 mg unless serum K+ >5.0 or on spironolactone/ACEi with high K+.",
      "Small frequent meals to reduce postprandial cardiac workload."
    ],
    doList: [
      "Fresh home-cooked food; cook WITHOUT adding salt during cooking, add measured salt on plate.",
      "Use herbs, lemon, garlic, pepper, cumin, coriander instead of salt.",
      "Fruits: apple, papaya, orange, berries; vegetables: lauki, tori, pumpkin, carrot.",
      "2 servings oily fish / week (salmon, mackerel, rohu) for omega-3.",
      "Skim milk / low-fat curd (200 ml counted as fluid).",
      "Keep a fluid diary - measure every cup/glass."
    ],
    dontList: [
      "STRICTLY NO: papad, pickle, chutney, ketchup, soy sauce, processed cheese, packaged namkeen, salted nuts.",
      "No canned / tinned / frozen ready-meals, instant noodles, soups, sausages, bacon.",
      "No pizza, burgers, Chinese takeout (very high hidden Na).",
      "No coconut water, tender coconut, tetra-pack fruit juices (K/Na/fluid load).",
      "No alcohol. Caffeine <= 200 mg/day."
    ]
  };
}
