/**
 * Pregnancy / Lactation rules.
 *
 * Primary sources:
 *   - ICMR-NIN Nutrient Requirements for Indians 2020 (trimester add-ons)
 *   - ICMR Dietary Guidelines for Indians 2024
 *   - ACOG Committee Opinion / Practice Bulletins (current, updated through 2024)
 *   - FIGO 2015 (with 2023 addenda) GDM Initiative
 *   - WHO Antenatal Care for a Positive Pregnancy Experience 2016 (still current)
 *   - India MoHFW Anaemia Mukt Bharat IFA/Calcium supplementation protocol 2023
 *
 * Input: patient.trimester (1|2|3|lactation), patient.prePregnancyWeight, patient.gdm (flag).
 */

export default function pregnancyRule(patient) {
  const tri = Number(patient.trimester) || 2;
  const lactating = patient.trimester === "lactation" || patient.lactating;
  const gdm = !!patient.gdm;

  // Additional calories above pre-pregnancy TEE
  //   T1: +0, T2: +350, T3: +450, Lactation 0-6m: +600
  const extraKcal = lactating ? 600 : (tri === 1 ? 0 : tri === 2 ? 350 : 450);

  // Protein add-on (g/day) on top of baseline 0.8 g/kg
  //   T1: +1, T2: +10, T3: +30, Lactation: +25
  const extraProteinG = lactating ? 25 : (tri === 1 ? 1 : tri === 2 ? 10 : 30);

  // Macro split - slightly higher protein, lower simple carb if GDM
  const macros = gdm ? { carb: 0.45, pro: 0.22, fat: 0.33 } : { carb: 0.55, pro: 0.20, fat: 0.25 };

  return {
    tier: `pregnancy-T${tri}${gdm ? "-GDM" : ""}${lactating ? "-lactation" : ""}`,
    calorieFactor: 1.00,
    extraKcalPerDay: extraKcal,
    extraProteinGPerDay: extraProteinG,
    macros,
    ironTargetMgPerDay: 35,
    folateTargetMcgPerDay: 600,
    calciumTargetMgPerDay: 1000,
    vitaminB12TargetMcgPerDay: 2.6,
    iodineTargetMcgPerDay: 220,
    dhaTargetMgPerDay: 200,
    fiberMinGperDay: 30,
    waterMlPerDay: 2500,
    preferTags: ["pregnancy-safe", "iron-rich", "folate-rich", "calcium-rich", "omega-3"],
    excludeTags: ["avoid-pregnancy-1st-trimester", "raw", "high-mercury"],
    rules: [
      `Add ${extraKcal} kcal & ${extraProteinG} g protein to the pre-pregnancy requirement.`,
      "Iron-folate tablet (IFA) daily from 14 weeks (60 mg elemental iron + 500 mcg folate as per ICMR).",
      "Calcium 500 mg tablet BD from week 14.",
      "Folic acid 400 mcg/d pre-conception & T1 to prevent NTD.",
      "6 small meals to manage nausea, reflux, satiety.",
      gdm ? "GDM: carb counting; <=45% kcal from carb; small frequent meals; postprandial walk." : "Normal glycemia: pair carb with protein/fat."
    ],
    doList: [
      "Dal + sabzi + curd + 2 chapati at each main meal.",
      "Milk 500 ml/day split as milk + curd + paneer.",
      "1-2 eggs/day + lean chicken / fish 2x/week (low-mercury varieties: rohu, pomfret, mackerel).",
      "Iron: ragi, bajra, dates, raisins, green leafy veg, jaggery-chana, pumpkin seed.",
      "Folate: spinach, methi, broccoli, chickpea, lentil, orange.",
      "Calcium: curd, paneer, ragi, til, amaranth, drumstick.",
      "omega-3: walnut, flaxseed, mustard oil, fatty fish.",
      "Hydrate 2.5-3 L/day; coconut water in moderation (avoid if edema)."
    ],
    dontList: [
      "AVOID: raw papaya, pineapple excess, unpasteurised milk/cheese, raw egg, raw meat/fish/sushi, alcohol, tobacco.",
      "Limit caffeine <=200 mg/day (~1 cup coffee or 2 cups tea).",
      "Avoid deli meats, pate, soft cheeses (listeriosis risk).",
      "Avoid high-mercury fish: king mackerel, swordfish, tile fish, shark.",
      "No herbal 'garbh-sanskar' supplements without obstetric clearance.",
      gdm ? "GDM: no sugar, jaggery, honey, fruit juice, sweetened lassi, mango, sapota, banana in excess." : "Limit sweets & deep-fried snacks to occasional."
    ]
  };
}
