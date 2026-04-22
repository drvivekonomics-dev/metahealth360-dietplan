/**
 * Iron Deficiency Anemia rules.
 *
 * Primary sources (refreshed from WHO 2018):
 *   - WHO Guideline on Use of Ferritin Concentrations to Assess Iron Status 2020
 *   - WHO Haemoglobin Concentrations for the Diagnosis of Anaemia — 2024 update
 *     (supersedes 2011/2018 thresholds)
 *   - ICMR-NIN Nutrient Requirements for Indians 2020 (RDA)
 *   - National Iron Plus Initiative (NIPI), MoHFW India 2023 operational guidelines
 *   - AIIMS-ICMR India State-Level Anaemia Mukt Bharat Strategy 2024
 */

export function severityFromHb(hb, sex = "F", pregnant = false) {
  const h = Number(hb);
  if (!isFinite(h) || h <= 0) return "unknown";
  if (pregnant) {
    if (h < 7) return "severe";
    if (h < 9.9) return "moderate";
    if (h < 11) return "mild";
    return "normal";
  }
  if (sex === "M") {
    if (h < 8) return "severe";
    if (h < 10.9) return "moderate";
    if (h < 13) return "mild";
    return "normal";
  }
  if (h < 8) return "severe";
  if (h < 10.9) return "moderate";
  if (h < 12) return "mild";
  return "normal";
}

export default function ironDeficiencyAnemiaRule(patient) {
  const pregnant = !!patient.pregnant;
  const severity = severityFromHb(patient.hb || patient.hemoglobin, patient.sex, pregnant);

  // Iron RDA - ICMR-NIN 2020
  //   Adult male: 19 mg/d, Adult female: 29 mg/d (menstruating), Pregnant: 27 mg/d + supplement
  const ironTargetMg = pregnant ? 35 : (patient.sex === "M" ? 25 : 32);

  return {
    tier: `IDA-${severity}`,
    calorieFactor: 1.00,
    macros: { carb: 0.55, pro: 0.20, fat: 0.25 },
    ironTargetMgPerDay: ironTargetMg,
    folateTargetMcgPerDay: pregnant ? 600 : 400,
    vitaminB12TargetMcgPerDay: 2.4,
    vitaminCTargetMgPerDay: 80,
    preferTags: ["iron-rich", "folate-rich", "vitamin-c"],
    excludeTags: ["avoid-with-iron-meal"],
    rules: [
      `Target ${ironTargetMg} mg iron/day via diet; severe anemia (Hb <8) requires oral/IV iron + physician-prescribed supplement.`,
      "Pair every iron source with vitamin-C source (lemon/amla/orange/guava) to boost absorption 3-4x.",
      "Separate tea/coffee/milk from iron-rich meal by >=1 hour (tannins & calcium inhibit absorption).",
      "Co-supplement folate 400-600 mcg/d and B12 if macrocytic / pregnant."
    ],
    doList: [
      "Iron-rich foods daily: ragi, bajra, amaranth leaves, palak (non-CKD), methi, mustard greens, jaggery + roasted chana, til laddoo, beetroot.",
      "Non-veg options: lean mutton, liver (1x/week unless contraindicated), egg yolk, rohu, prawn, mackerel.",
      "Soak & sprout pulses - reduces phytate, improves iron absorption.",
      "Cook in cast-iron kadhai - measurable iron leach into food.",
      "Add amla / lemon / tomato to every dal & sabzi.",
      "Jaggery-chana-peanut chikki as mid-morning snack."
    ],
    dontList: [
      "No tea / coffee within 1 hour before or after meals.",
      "Avoid excessive milk / calcium at iron-rich meals (max 200 ml/day, separate time).",
      "No antacids around iron supplement.",
      "Minimize polished rice & maida as main cereal (poor iron, high phytate binding)."
    ]
  };
}
