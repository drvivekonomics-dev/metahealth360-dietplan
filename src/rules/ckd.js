/**
 * Chronic Kidney Disease rules.
 *
 * Primary sources:
 *   - KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management
 *     of CKD (Kidney Int 2024;105(4S):S117-S314)
 *   - KDOQI 2020 Clinical Practice Guideline for Nutrition in CKD
 *     (AJKD 2020;76(3) Suppl 1:S1-S107)
 *   - ISPD (International Society for Peritoneal Dialysis) Nutrition Recommendations 2020
 *   - ISN (Indian Society of Nephrology) position statement on CKD nutrition 2023
 *
 * Stage derived from eGFR (CKD-EPI 2021, race-free) — or pass patient.ckdStage directly.
 * Dialysis status matters: HD / PD patients have higher protein + different K/P.
 */

export function stageFromGFR(gfr) {
  const g = Number(gfr);
  if (!isFinite(g) || g <= 0) return "unknown";
  if (g >= 90) return 1;
  if (g >= 60) return 2;
  if (g >= 45) return "3a";
  if (g >= 30) return "3b";
  if (g >= 15) return 4;
  return 5;
}

export default function ckdRule(patient) {
  const stage = patient.ckdStage || stageFromGFR(patient.egfr || patient.gfr);
  const onDialysis = !!patient.onDialysis;
  const weight = Number(patient.weight) || 60;

  // Protein (g/kg IBW/day) - stage-dependent
  //   Stage 1-2: 0.8
  //   Stage 3a/3b (non-dialysis): 0.6-0.8 (Low-Protein Diet + keto-analogues often)
  //   Stage 4: 0.55-0.6
  //   Stage 5 non-dialysis: 0.6
  //   Stage 5 on HD: 1.0-1.2
  //   Stage 5 on PD: 1.2-1.3
  let proteinGPerKg;
  if (onDialysis) proteinGPerKg = 1.2;
  else if (stage === 1 || stage === 2) proteinGPerKg = 0.8;
  else if (stage === "3a" || stage === "3b") proteinGPerKg = 0.7;
  else if (stage === 4) proteinGPerKg = 0.6;
  else if (stage === 5) proteinGPerKg = 0.6;
  else proteinGPerKg = 0.8;

  const proteinG = +(proteinGPerKg * weight).toFixed(1);

  // Energy: 30-35 kcal/kg IBW - factor against TDEE
  const calorieFactor = 1.0;

  // Electrolyte caps
  // Na: 2000 mg/day; K: stage-dependent; P: 800-1000 mg/day
  const sodiumMg = 2000;
  let potassiumMaxMg;
  if (onDialysis) potassiumMaxMg = 2500;
  else if (stage === 4 || stage === 5) potassiumMaxMg = 2000;
  else if (stage === "3a" || stage === "3b") potassiumMaxMg = 3000;
  else potassiumMaxMg = 4000;

  const phosphorusMaxMg = onDialysis ? 1000 : 800;

  // Fluid
  const fluidMl = (stage === 5 || onDialysis) ? 1000 : 2000;

  return {
    tier: `CKD-stage-${stage}${onDialysis ? "-dialysis" : ""}`,
    calorieFactor,
    macros: { carb: 0.55, pro: proteinGPerKg * weight > 0 ? (proteinG * 4) / 2000 : 0.12, fat: 0.30 },
    proteinGPerKg,
    proteinGPerDay: proteinG,
    sodiumMaxMgPerDay: sodiumMg,
    potassiumMaxMgPerDay: potassiumMaxMg,
    phosphorusMaxMgPerDay: phosphorusMaxMg,
    fluidMaxMlPerDay: fluidMl,
    preferTags: ["ckd-safe", "low-k", "low-na"],
    excludeTags: ["high-k", "avoid-ckd", "high-p", "high-na"],
    rules: [
      `Protein: ${proteinGPerKg} g/kg IBW/day ~ ${proteinG} g/day. Emphasise high-biological-value protein (egg white, low-fat milk, paneer in measured portions).`,
      `Sodium <= ${sodiumMg} mg/day, Potassium <= ${potassiumMaxMg} mg/day, Phosphorus <= ${phosphorusMaxMg} mg/day.`,
      `Fluid <= ${fluidMl} ml/day (includes all beverages, dal water, curd).`,
      "Leach high-K vegetables: cut, soak in warm water >=2h, discard water, then cook.",
      "Avoid salt substitutes - they are KCl and will cause hyperkalemia.",
      onDialysis ? "On dialysis: higher protein (1.2 g/kg), supplement folic acid 1 mg, vitamin B-complex." : "Pre-dialysis: keto-analogues may be indicated if LPD (discuss with nephrologist)."
    ],
    doList: [
      "Preferred vegetables: lauki, tori, tinda, petha, cucumber, cabbage, onion (soaked).",
      "Preferred fruits: apple, pear, papaya (in moderation), pineapple (small).",
      "Grains: refined rice, suji, maida-based roti (LOW-K - counter-intuitive but correct for CKD).",
      "Egg white, paneer cubes (measured), chicken (skinless, boiled).",
      "Cook in rice-bran/mustard oil. Use fresh herbs - coriander, mint, lemon.",
      "Phosphorus binders with meals if prescribed."
    ],
    dontList: [
      "AVOID high-K: banana, orange, coconut water, tomato, tomato chutney/ketchup, potato (unsoaked), sweet potato, yam, spinach, amaranth, drumstick, tender coconut, dry fruits, jaggery.",
      "AVOID high-P: whole pulses (rajma, soya, chana), milk in excess (>200 ml), cheese, nuts, cola drinks, colas, processed foods with phosphate additives (E338-E452).",
      "AVOID high-Na: pickle, papad, chutney, namkeen, pre-packaged, canned/tinned food, Chinese sauces.",
      "AVOID salt substitutes (LoNa, LoSalt) - they contain potassium chloride.",
      "Strictly no herbal supplements without nephrologist clearance."
    ]
  };
}
