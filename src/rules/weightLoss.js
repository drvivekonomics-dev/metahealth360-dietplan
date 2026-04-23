/**
 * Weight Loss / Obesity rules.
 *
 * Primary sources:
 *   - WHO 2004 Expert Consultation — Asian-Indian BMI action points
 *   - ICMR-NIN Nutrient Requirements for Indians 2020 + Dietary Guidelines 2024
 *   - AACE/ACE Clinical Practice Guidelines for Medical Care of Obesity 2022
 *     (with 2024 focused update on pharmacotherapy — GLP-1 RAs)
 *   - The Obesity Society / AHA Joint Position 2023
 *   - IDF Asian waist circumference thresholds (M ≥90, F ≥80 cm)
 *   - Obesity & Metabolic Surgery Society of India (OSSI) 2023 position statement
 *
 * Indian BMI cut-offs differ from WHO global:
 *   Normal: 18.5-22.9, Overweight: 23-24.9, Obesity I: 25-29.9, Obesity II: >=30
 * Waist: M >=90, F >=80 = central obesity (IDF Asian).
 */

export function bmiCategoryAsianIndian(bmi) {
  const b = Number(bmi);
  if (!isFinite(b)) return "unknown";
  if (b < 18.5) return "underweight";
  if (b < 23) return "normal";
  if (b < 25) return "overweight";
  if (b < 30) return "obesity-1";
  return "obesity-2";
}

export default function weightLossRule(patient) {
  const bmi = Number(patient.bmi) || 0;
  const cat = bmiCategoryAsianIndian(bmi);

  // Caloric deficit - 500 kcal/day -> ~0.5 kg/week
  //   Overweight: deficit 300
  //   Obesity I: 500
  //   Obesity II: 600 (supervised VLCD only if BMI >=32.5 + metabolic disease)
  const deficitMap = { "underweight": -300, "normal": 0, "overweight": 300, "obesity-1": 500, "obesity-2": 600 };
  const kcalDeficit = deficitMap[cat] ?? 0;

  return {
    tier: cat,
    calorieFactor: null,     // engine should apply absolute deficit instead
    kcalDeficit,
    macros: { carb: 0.40, pro: 0.30, fat: 0.30 },  // higher protein preserves lean mass
    proteinGPerKg: 1.2,
    fiberMinGperDay: 30,
    preferTags: ["low-gi", "high-fiber", "high-protein", "low-cal"],
    excludeTags: ["avoid-diabetes", "saturated"],
    rules: [
      "500 kcal daily deficit for ~0.5 kg/week loss. Avoid VLCD (<1200 kcal) without supervision.",
      "Protein 1.2 g/kg body weight/day to preserve lean mass during deficit.",
      "Minimum 30 g fiber - promotes satiety & glycemic control.",
      "4-hourly meal spacing: 3 main meals + 2 small snacks.",
      "30-45 min brisk walk / moderate exercise 5x/week + 2x/week resistance training."
    ],
    doList: [
      "Plate rule: 1/2 vegetables (non-starchy), 1/4 protein, 1/4 whole grain.",
      "Start every meal with salad / clear vegetable soup.",
      "Sprouts, moong dal cheela, besan chilla, oats upma, ragi dosa for breakfast.",
      "Grilled paneer / chicken / fish; boiled egg white; dal + vegetables for lunch/dinner.",
      "Snacks: roasted chana, makhana, buttermilk, cucumber, fruit (apple / guava).",
      "3 L water/day; black coffee / green tea (no sugar) up to 2 cups.",
      "Weigh weekly (not daily) - same time, same clothes."
    ],
    dontList: [
      "No sugar, sweets, mithai, chocolate, cake, pastry, ice cream.",
      "No deep-fried - samosa, kachori, puri, pakora, vada, bhujia.",
      "No maida products - bread, pasta, noodles, biscuits, naan.",
      "No sugar-sweetened / packaged beverages - soft drinks, juices, sports drinks.",
      "No alcohol (7 kcal/g, zero nutrition, appetite-stimulant).",
      "Avoid late-night eating; last meal 3 h before sleep."
    ]
  };
}
