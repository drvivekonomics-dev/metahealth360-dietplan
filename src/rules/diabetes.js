/**
 * Diabetes / Prediabetes / Glycemic control rules.
 * Tiers based on HbA1c + FBS + PPBS.
 *
 * Primary sources:
 *   - ADA "Standards of Care in Diabetes" 2025 (Diabetes Care, Vol. 48, Suppl. 1)
 *   - RSSDI Clinical Practice Recommendations 2024 (India)
 *   - ICMR Dietary Guidelines for Indians 2024 (glycemic load guidance)
 *
 * Input: patient = { age, sex, weight, height, hba1c, fbs, ppbs, ... }
 * Output: { tier, calorieFactor, macros{carb,pro,fat}, rules[], doList[], dontList[], excludeTags[], preferTags[] }
 */

export function classify({ hba1c, fbs, ppbs }) {
  const h = Number(hba1c) || 0;
  const f = Number(fbs) || 0;
  const p = Number(ppbs) || 0;
  if (h >= 9 || f >= 200 || p >= 300) return "uncontrolled";
  if (h >= 7 || f >= 126 || p >= 200) return "controlled-diabetic";
  if (h >= 5.7 || f >= 100 || p >= 140) return "prediabetic";
  return "normal";
}

export default function diabetesRule(patient) {
  const tier = classify(patient);

  // Macro distribution - ADA/RSSDI: carb 45-55%, protein 15-20%, fat 25-30%
  // Uncontrolled / hyperglycaemic -> lower carb share (40%)
  const macroMap = {
    "normal":               { carb: 0.50, pro: 0.20, fat: 0.30 },
    "prediabetic":          { carb: 0.48, pro: 0.20, fat: 0.32 },
    "controlled-diabetic":  { carb: 0.45, pro: 0.20, fat: 0.35 },
    "uncontrolled":         { carb: 0.40, pro: 0.20, fat: 0.40 }
  };

  // Calorie factor on TDEE (1.0 = maintenance; lower if weight-loss needed)
  const calorieFactorMap = {
    "normal": 1.00, "prediabetic": 0.90, "controlled-diabetic": 0.90, "uncontrolled": 0.85
  };

  const base = {
    tier,
    calorieFactor: calorieFactorMap[tier],
    macros: macroMap[tier],
    fiberMinGperDay: 30,
    sugarMaxGperDay: tier === "uncontrolled" ? 0 : 10,
    preferTags: ["low-gi", "high-fiber", "diabetes-safe"],
    excludeTags: ["avoid-diabetes"],
    avoidHighGi: tier !== "normal",
    splitMeals: 5,   // small frequent meals
    rules: [
      "Prefer low-GI carbs (whole wheat, oats, barley, quinoa, bajra, jowar).",
      "Distribute carbs evenly across 5 small meals; avoid long fasting gaps.",
      "Pair carbs with protein/fat/fiber to blunt postprandial spike.",
      "Keep added sugar <=10 g/day; zero sugar if HbA1c >=9."
    ],
    doList: [
      "Start meal with salad / clear soup (pre-load fiber).",
      "Include methi, karela, jamun, cinnamon, fenugreek seeds.",
      "Use whole grains - atta chapati over rice; brown/parboiled rice if rice is preferred.",
      "Protein at every meal: dal + curd + 1 egg / 30 g paneer / 30 g chicken.",
      "Walk 10-15 min after every major meal.",
      "Drink 2.5-3 L water/day."
    ],
    dontList: [
      "No white sugar, jaggery, honey, sweet fruit juices, soft drinks.",
      "Avoid maida products - samosa, bhatura, naan, biscuits, white bread.",
      "Limit potato, sweet potato, yam, banana, mango, watermelon.",
      "No deep-fried foods - pakora, puri, bhujia, namkeen.",
      "No refined cereals (cornflakes, sugary muesli)."
    ]
  };

  if (tier === "uncontrolled") {
    base.rules.push("URGENT: Coordinate with physician - pharmacotherapy review required.");
    base.dontList.push("Avoid ALL fruit juices, dried fruit, and tropical high-GI fruits.");
  }

  return base;
}
