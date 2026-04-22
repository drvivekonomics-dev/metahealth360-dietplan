/**
 * Single source-of-truth for clinical citations shown on every generated PDF.
 * Grouped by condition and layered with general / calculator / food-data refs.
 * The PDF renderer picks only the groups relevant to the patient's selected
 * conditions, plus the ALWAYS blocks.
 *
 * Keep references as published — do not paraphrase the journal title or year
 * without checking the authoritative source.
 */

export const CITATIONS = {
  ALWAYS: [
    "ICMR-NIN Nutrient Requirements for Indians (RDA) — 2020.",
    "ICMR-NIN Dietary Guidelines for Indians — 2024.",
    "Longvah T, et al. Indian Food Composition Tables (IFCT) — NIN, 2017.",
    "Mifflin MD, St Jeor ST et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr 1990;51(2):241-7.",
    "Devine BJ. Gentamicin therapy. Drug Intell Clin Pharm 1974;8:650-5 (Ideal Body Weight formula).",
    "Inker LA, Eneanya ND, et al. New creatinine- and cystatin C-based equations to estimate GFR without race (CKD-EPI 2021). N Engl J Med 2021;385:1737-1749."
  ],

  diabetes: [
    "American Diabetes Association. Standards of Care in Diabetes — 2025. Diabetes Care 2025;48(Suppl. 1).",
    "RSSDI Clinical Practice Recommendations for the Management of Type 2 Diabetes Mellitus — 2024.",
    "Evert AB, et al. Nutrition Therapy for Adults With Diabetes or Prediabetes: A Consensus Report. Diabetes Care 2019;42(5):731-754."
  ],
  prediabetes: [
    "ADA Standards of Care in Diabetes — 2025. Diabetes Care 2025;48(Suppl. 1).",
    "IDPP-1 (Indian Diabetes Prevention Programme) — lifestyle intervention evidence base."
  ],

  dyslipidemia: [
    "Grundy SM, Stone NJ, et al. 2018 AHA/ACC Guideline on the Management of Blood Cholesterol. Circulation 2019;139:e1082-e1143.",
    "Lloyd-Jones DM, et al. 2022 ACC Expert Consensus Decision Pathway on the Role of Nonstatin Therapies. JACC 2022;80:1366-1418.",
    "Mach F, et al. 2019 ESC/EAS Guidelines for the management of dyslipidaemias. Eur Heart J 2020;41:111-188.",
    "Iyengar SS, et al. Lipid Association of India Expert Consensus Statement on Management of Dyslipidaemia in Indians 2020."
  ],

  "heart-failure": [
    "Heidenreich PA, et al. 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure. Circulation 2022;145:e895-e1032.",
    "2023 ACC/AHA/HFSA Focused Update on Heart Failure. Circulation 2023.",
    "McDonagh TA, et al. 2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure. Eur Heart J 2021;42:3599-3726.",
    "2023 ESC Focused Update of the 2021 HF Guidelines. Eur Heart J 2023;44:3627-3639."
  ],

  ckd: [
    "KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease. Kidney Int 2024;105(4S):S117-S314.",
    "Ikizler TA, et al. KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update. Am J Kidney Dis 2020;76(3) Suppl 1:S1-S107.",
    "ISPD Nutrition Recommendations for Peritoneal Dialysis — 2020 update.",
    "Indian Society of Nephrology (ISN) — Position Statement on CKD Nutrition 2023."
  ],

  "iron-deficiency-anemia": [
    "WHO Guideline on Haemoglobin Cut-offs to Define Anaemia in Individuals and Populations — 2024 update (supersedes 2011/2018 thresholds).",
    "WHO Guideline on Use of Ferritin Concentrations to Assess Iron Status — 2020.",
    "ICMR-NIN Nutrient Requirements for Indians 2020 — iron, folate, B12, vitamin C.",
    "Anaemia Mukt Bharat (AMB) Operational Guidelines, MoHFW India — 2023."
  ],
  anemia: [
    "WHO Haemoglobin Cut-offs for Anaemia — 2024 update.",
    "ICMR-NIN RDA 2020."
  ],

  pregnancy: [
    "ICMR-NIN Nutrient Requirements for Indians 2020 (trimester-specific energy + protein add-ons).",
    "ACOG Practice Bulletins — current (Committee Opinion series, updated through 2024).",
    "FIGO Initiative on Gestational Diabetes Mellitus 2015 (2023 addenda).",
    "WHO Recommendations on Antenatal Care for a Positive Pregnancy Experience — 2016.",
    "Anaemia Mukt Bharat IFA + Calcium Supplementation Protocol — MoHFW India 2023."
  ],

  "weight-loss": [
    "WHO Expert Consultation. Appropriate body-mass index for Asian populations. Lancet 2004;363:157-163.",
    "Garvey WT, et al. AACE/ACE Comprehensive Clinical Practice Guidelines for Medical Care of Patients with Obesity. Endocr Pract 2016;22(Suppl 3):1-203 (2022 update; 2024 pharmacotherapy focused update).",
    "ICMR Dietary Guidelines for Indians — 2024.",
    "Obesity and Metabolic Surgery Society of India (OSSI) 2023 Position Statement.",
    "The Obesity Society / AHA Joint Scientific Statement 2023."
  ],
  obesity: [
    "WHO Asian-Indian BMI action points, Lancet 2004;363:157-163.",
    "AACE/ACE Obesity Guidelines 2022 (with 2024 pharmacotherapy update).",
    "OSSI 2023 Position Statement."
  ],

  "metabolic-syndrome": [
    "Alberti KG, et al. Harmonizing the Metabolic Syndrome — A Joint Interim Statement of the IDF, NHLBI, AHA, WHF, IAS, and IASO. Circulation 2009;120:1640-1645.",
    "Ndumele CE, et al. Cardiovascular-Kidney-Metabolic Health: A Presidential Advisory From the AHA. Circulation 2023;148:1606-1635.",
    "Appel LJ, et al. DASH diet (NHLBI) — multiple controlled trials; Sacks FM, N Engl J Med 2001;344:3-10.",
    "Estruch R, et al. PREDIMED trial — Primary Prevention of CVD with a Mediterranean Diet. N Engl J Med 2018;378:e34.",
    "ICMR Dietary Guidelines for Indians 2024."
  ],

  "glp-if": [
    "ADA Standards of Care in Diabetes — 2025: Pharmacologic Approaches to Glycemic Treatment (Sec. 9) and Obesity and Weight Management (Sec. 8). Diabetes Care 2025;48(Suppl. 1).",
    "Wilding JPH, et al. Once-Weekly Semaglutide in Adults with Overweight or Obesity (STEP-1). N Engl J Med 2021;384:989-1002.",
    "Garvey WT, et al. Two-Year Effects of Semaglutide in Adults with Overweight or Obesity: STEP-5. Nat Med 2022;28:2083-2091.",
    "Rubino D, et al. Semaglutide 2.4 mg + Intensive Behavioral Therapy (STEP-8). JAMA 2021;327(2):138-150.",
    "Rosenstock J, et al. Efficacy and Safety of Tirzepatide Monotherapy in Type 2 Diabetes (SURPASS-1). Lancet 2021;398:143-155.",
    "Frias JP, et al. Tirzepatide vs Semaglutide Once Weekly in Type 2 Diabetes (SURPASS-2). N Engl J Med 2021;385:503-515.",
    "Jastreboff AM, et al. Tirzepatide Once Weekly for the Treatment of Obesity (SURMOUNT-1). N Engl J Med 2022;387:205-216.",
    "Marso SP, et al. Liraglutide and Cardiovascular Outcomes in Type 2 Diabetes (LEADER). N Engl J Med 2016;375:311-322.",
    "Davies M, et al. Semaglutide 2.4 mg Once Weekly in Adults with Overweight/Obesity and T2D (STEP-2). Lancet 2021;397:971-984.",
    "Longo VD, Mattson MP. Fasting: Molecular Mechanisms and Clinical Applications. Cell Metab 2014;19(2):181-192.",
    "de Cabo R, Mattson MP. Effects of Intermittent Fasting on Health, Aging, and Disease. N Engl J Med 2019;381:2541-2551.",
    "Varady KA, et al. Cardiometabolic Benefits of Intermittent Fasting. Annu Rev Nutr 2021;41:333-361.",
    "RSSDI-ESI Consensus on the Use of GLP-1 RAs and Dual GIP/GLP-1 Agonists in Indian Adults — 2024 addendum.",
    "US FDA Prescribing Information: Ozempic® (semaglutide), Wegovy® (semaglutide 2.4 mg), Mounjaro® (tirzepatide), Zepbound® (tirzepatide), Rybelsus® (oral semaglutide), Trulicity® (dulaglutide), Saxenda®/Victoza® (liraglutide) — latest revisions.",
    "CDSCO India — approval notifications for tirzepatide (Mounjaro®, March 2025) and semaglutide formulations."
  ]
};

/**
 * Return the ordered, de-duplicated citation list for the conditions in this plan.
 * ALWAYS block first, then condition-specific blocks in the order conditions appear,
 * then GLP-1 + IF references if the plan enables the GLP-1 / IF protocol.
 */
export function buildCitations(conditions = [], opts = {}) {
  const seen = new Set();
  const out = [];
  const push = (list) => {
    for (const ref of list || []) {
      if (!seen.has(ref)) {
        seen.add(ref);
        out.push(ref);
      }
    }
  };
  push(CITATIONS.ALWAYS);
  for (const c of conditions) push(CITATIONS[c] || []);
  if (opts && opts.glpIfEnabled) push(CITATIONS["glp-if"]);
  return out;
}

export default { CITATIONS, buildCitations };
