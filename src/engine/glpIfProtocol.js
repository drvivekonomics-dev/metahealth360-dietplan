/**
 * GLP-1 / GIP-GLP-1 agonist + Intermittent Fasting (IF) protocol builder.
 *
 * Why this is its own module (and not just another overlay):
 *   Religious overlays (Jain / Navratri / Ramadan) transform food *choices*.
 *   GLP-1 + IF transforms *when* a patient eats, *how much*, and carries
 *   safety rules that depend on drug + dose-day phase + comorbidities.
 *   This needs dedicated pharmacology metadata and safety gating.
 *
 * Clinical scope:
 *   - Once-weekly injectables: semaglutide (Ozempic/Wegovy), tirzepatide
 *     (Mounjaro/Zepbound), dulaglutide (Trulicity).
 *   - Oral semaglutide (Rybelsus, daily) for completeness.
 *   - Daily injectable: liraglutide (Victoza/Saxenda) for completeness.
 *   - IF protocols: 14:10 (beginner), 16:8 (standard), 18:6 (advanced),
 *     5:2 (cyclic), none.
 *
 * Output shape (consumed by dietEngine + PDF builder):
 *   {
 *     enabled, drug, drugMeta, dose, doseDay, ifProtocol, window,
 *     safety: { contraindicated, reasons[], warnings[] },
 *     macroTargets: { kcal, protein_g, carb_g, fat_g, fluid_ml },
 *     weeklySchedule: [{ day, doseDay, phase, fastHours, advice }, ...],
 *     counselling: [...],
 *     favor: [...], avoid: [...]
 *   }
 */

// ---- Drug catalog ---------------------------------------------------------

export const GLP_DRUGS = {
  semaglutide: {
    key: "semaglutide",
    label: "Semaglutide (Ozempic / Wegovy)",
    brands: ["Ozempic", "Wegovy"],
    cadence: "weekly-sc",
    doseLadder: [0.25, 0.5, 1.0, 1.7, 2.4],
    doseUnit: "mg",
    titration: "↑ every 4 weeks if tolerated",
    // Offsets from dose day (0 = dose day).
    peakSuppressionDays: [1, 2, 3],   // nausea / appetite trough
    appetiteReturnDays: [5, 6],       // hunger returns before next dose
    halfLifeHours: 168,
    className: "GLP-1 RA",
    typicalWeightLoss: "10–15%",
    giBurden: "high",
    note: "Once weekly SC. Inject same day each week. India: available via Novo Nordisk; ₹"
  },
  rybelsus: {
    key: "rybelsus",
    label: "Oral Semaglutide (Rybelsus)",
    brands: ["Rybelsus"],
    cadence: "daily-po",
    doseLadder: [3, 7, 14],
    doseUnit: "mg",
    titration: "↑ every 30 days",
    peakSuppressionDays: [],     // daily — no weekly phase
    appetiteReturnDays: [],
    halfLifeHours: 168,
    className: "GLP-1 RA (oral)",
    typicalWeightLoss: "3–5%",
    giBurden: "moderate",
    note: "Daily PO. Take fasting with ≤120 mL water, 30 min before any food/drink/meds."
  },
  tirzepatide: {
    key: "tirzepatide",
    label: "Tirzepatide (Mounjaro / Zepbound)",
    brands: ["Mounjaro", "Zepbound"],
    cadence: "weekly-sc",
    doseLadder: [2.5, 5, 7.5, 10, 12.5, 15],
    doseUnit: "mg",
    titration: "↑ every 4 weeks if tolerated",
    peakSuppressionDays: [1, 2, 3],
    appetiteReturnDays: [5, 6],
    halfLifeHours: 120,
    className: "Dual GIP/GLP-1 RA",
    typicalWeightLoss: "15–22%",
    giBurden: "high",
    note: "Once weekly SC. Launched in India March 2025 (Eli Lilly). Higher weight loss potential than GLP-1 alone."
  },
  dulaglutide: {
    key: "dulaglutide",
    label: "Dulaglutide (Trulicity)",
    brands: ["Trulicity"],
    cadence: "weekly-sc",
    doseLadder: [0.75, 1.5, 3.0, 4.5],
    doseUnit: "mg",
    titration: "↑ every 4 weeks if tolerated",
    peakSuppressionDays: [1, 2],     // milder than sema/tirz
    appetiteReturnDays: [4, 5, 6],
    halfLifeHours: 120,
    className: "GLP-1 RA",
    typicalWeightLoss: "4–8%",
    giBurden: "moderate",
    note: "Once weekly SC. Lower GI burden than semaglutide; lower weight-loss magnitude."
  },
  liraglutide: {
    key: "liraglutide",
    label: "Liraglutide (Victoza / Saxenda)",
    brands: ["Victoza", "Saxenda"],
    cadence: "daily-sc",
    doseLadder: [0.6, 1.2, 1.8, 2.4, 3.0],
    doseUnit: "mg",
    titration: "↑ weekly by 0.6",
    peakSuppressionDays: [],
    appetiteReturnDays: [],
    halfLifeHours: 13,
    className: "GLP-1 RA",
    typicalWeightLoss: "5–8%",
    giBurden: "moderate",
    note: "Daily SC. Use when weekly agents unavailable."
  }
};

export const GLP_DRUG_LIST = Object.values(GLP_DRUGS).map(d => ({
  value: d.key, label: d.label
}));

// ---- IF protocols ---------------------------------------------------------

export const IF_PROTOCOLS = {
  "none":  { fast: 0,  eat: 24, startDefault: "07:00", endDefault: "21:00", intensity: "none",
             label: "No fasting window" },
  "14:10": { fast: 14, eat: 10, startDefault: "09:00", endDefault: "19:00", intensity: "beginner",
             label: "14:10 — beginner, gentle with GLP-1 initiation" },
  "16:8":  { fast: 16, eat: 8,  startDefault: "12:00", endDefault: "20:00", intensity: "standard",
             label: "16:8 — standard TRE, most-used combination" },
  "18:6":  { fast: 18, eat: 6,  startDefault: "13:00", endDefault: "19:00", intensity: "advanced",
             label: "18:6 — advanced, only after 4+ weeks of tolerance" },
  "5:2":   { fast: "5 regular + 2 low-calorie days", eat: null, intensity: "cyclic",
             startDefault: null, endDefault: null,
             label: "5:2 — 2 non-consecutive 500-kcal days per week" }
};

export const IF_LIST = Object.entries(IF_PROTOCOLS).map(([k, v]) => ({
  value: k, label: v.label
}));

// ---- Safety / contraindication check --------------------------------------

/**
 * Returns { contraindicated, reasons[], warnings[] }.
 * Reasons block initiation. Warnings require dose-adjustment or monitoring.
 */
export function checkSafety(patient) {
  const reasons = [];
  const warnings = [];
  const meds = (patient.medications || []).map(m => String(m).toLowerCase());
  const flags = patient.glpFlags || {};   // optional boolean flags on patient

  // Absolute contraindications
  if (flags.mtcHistory || flags.men2)
    reasons.push("Personal or family history of medullary thyroid carcinoma / MEN-2 — absolute contraindication.");
  if (flags.pregnancy || patient.pregnancyStatus === "pregnant")
    reasons.push("Pregnancy — GLP-1/GIP agonists are contraindicated.");
  if (flags.lactation || patient.pregnancyStatus === "lactating")
    reasons.push("Lactation — contraindicated (insufficient data, transferred in milk).");
  if (flags.gastroparesis)
    reasons.push("Established severe gastroparesis — contraindicated (further delayed emptying).");
  if (flags.pancreatitisActive)
    reasons.push("Active or recent pancreatitis — hold until fully resolved.");

  // Warnings requiring dose-adjustment or careful monitoring
  if (flags.pancreatitisHx)
    warnings.push("History of pancreatitis — initiate with extreme caution, educate on warning symptoms.");
  if (flags.gallbladderDisease)
    warnings.push("Gallbladder disease or rapid weight-loss risk — monitor for cholelithiasis.");
  if (meds.includes("sulfonylurea"))
    warnings.push("On sulfonylurea — reduce SU dose by 25–50% on initiation to prevent hypoglycemia.");
  if (meds.includes("insulin"))
    warnings.push("On insulin — reduce basal dose 20% (and prandial if used) on initiation. Recheck CBG daily × 2 weeks.");
  const egfr = Number(patient.egfr);
  if (egfr && egfr < 30)
    warnings.push("eGFR <30 — hydration-sensitive; aggressive fluid target essential, watch for pre-renal AKI.");
  if (patient.type === "T1DM" || flags.t1dm)
    warnings.push("T1DM — GLP-1/GIP adjunct is off-label; use only with endocrinology oversight.");
  if (Number(patient.age) >= 70)
    warnings.push("Age ≥70 — start at lowest dose, slower titration, daily protein floor non-negotiable (sarcopenia risk).");
  if (Number(patient.bmi) && Number(patient.bmi) < 23)
    warnings.push("BMI <23 — reconsider indication; weight loss risk in already-lean patient.");
  if (flags.retinopathyProliferative)
    warnings.push("Proliferative diabetic retinopathy — rapid HbA1c drop may worsen retinopathy; retinal review at 3 months.");
  if (flags.eatingDisorderHx)
    warnings.push("History of eating disorder — GLP-1 anorexia may reactivate; joint psychiatric follow-up.");

  return { contraindicated: reasons.length > 0, reasons, warnings };
}

// ---- Macro targets (protein-forward, lean-mass preserving) ----------------

/**
 * GLP-1 + IF creates a calorie-deficit environment. Without a strict protein
 * floor, up to 40% of the weight lost is lean mass. This function computes
 * aggressive protein targets (1.4 g/kg IBW default) and a modest kcal deficit.
 */
export function macroTargets(patient, { drug, ifProtocol }) {
  // Pull calculated fields if present; otherwise estimate gently.
  const ibw = Number(patient.ibw) || estimateIBW(patient) || 60;
  const tdee = Number(patient.tdee) || 2000;
  const proteinGPerKgIBW = 1.4;
  const protein_g = Math.round(ibw * proteinGPerKgIBW);

  // 500 kcal deficit baseline; tighter for 18:6 / 5:2.
  const deficit = ifProtocol === "18:6" || ifProtocol === "5:2" ? 600 : 500;
  let kcal = Math.max(1200, Math.round(tdee - deficit));

  // 30% fat floor (satiety + GI tolerance — very low-fat diets worsen
  // GLP-1 nausea paradoxically via delayed emptying + rebound).
  const fat_g = Math.max(40, Math.round((kcal * 0.30) / 9));
  const protein_kcal = protein_g * 4;
  const fat_kcal = fat_g * 9;
  let carb_g = Math.max(80, Math.round((kcal - protein_kcal - fat_kcal) / 4));
  // If protein+fat already over kcal, rebalance
  if (carb_g < 80) {
    carb_g = 80;
    kcal = protein_kcal + fat_kcal + 80 * 4;
  }

  return {
    kcal,
    protein_g,
    protein_gPerKgIBW: proteinGPerKgIBW,
    carb_g,
    fat_g,
    fluid_ml: 2500,
    electrolytes: "Sodium 2–3 g, potassium 3.5–4 g, magnesium 400 mg/day on peak-suppression days."
  };
}

function estimateIBW(patient) {
  const cm = Number(patient.height);
  if (!cm) return null;
  const base = patient.sex === "M" ? 50 : 45.5;
  return +(base + 0.9 * (cm - 152.4)).toFixed(1);
}

// ---- Weekly dose-phase schedule (once-weekly agents only) -----------------

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABEL = { mon:"Mon", tue:"Tue", wed:"Wed", thu:"Thu", fri:"Fri", sat:"Sat", sun:"Sun" };

const PHASE_ADVICE = {
  "dose-day": "Inject morning (if SC weekly). Light protein-forward meals only. Extra 500 mL water. Ginger or peppermint tea if queasy. No alcohol, no fried food, no large portions.",
  "peak-suppression": "Appetite lowest — but eat anyway. Protein floor non-negotiable (eggs, paneer, dal, curd, fish). 2.5–3 L fluids + electrolytes. Skip-meal tempting but harmful.",
  "steady": "Standard eating-window discipline. Follow the plan. Watch for portion drift.",
  "appetite-return": "Hunger returning sharply — this is when weekend overeating happens. Portion-first plate order: protein → vegetables → grain. Finish eating by window close.",
  "daily-agent": "Daily agent — no weekly phase cycle. Follow the eating-window plan every day.",
  "low-cal-day": "5:2 low-cal day — ≤500 kcal (F) / ≤600 kcal (M). Protein-dense: 2 egg whites + grilled chicken/paneer + leafy salad. Water + black tea only outside window."
};

/**
 * Builds a 7-day dose-phase schedule for weekly agents.
 * Daily agents return steady advice; 5:2 returns the low-cal-day pattern.
 */
export function weeklySchedule({ drug, doseDay, ifProtocol }) {
  const meta = GLP_DRUGS[drug];
  if (!meta) return [];
  const fastHrs = typeof IF_PROTOCOLS[ifProtocol]?.fast === "number"
    ? IF_PROTOCOLS[ifProtocol].fast : 0;

  // 5:2 pattern overrides normal phasing — 2 low-cal days per week on
  // non-consecutive days (default: Tue + Thu, skipping dose day).
  if (ifProtocol === "5:2") {
    const lowCalDays = pick5_2LowCalDays(doseDay);
    return DAYS.map(d => ({
      day: DAY_LABEL[d],
      dayKey: d,
      doseDay: d === (doseDay || "mon").toLowerCase(),
      phase: lowCalDays.includes(d) ? "low-cal-day" : "steady",
      fastHours: lowCalDays.includes(d) ? 20 : 0,
      advice: lowCalDays.includes(d) ? PHASE_ADVICE["low-cal-day"] : PHASE_ADVICE["steady"]
    }));
  }

  // Daily agents: no weekly phase cycle.
  if (meta.cadence !== "weekly-sc") {
    return DAYS.map(d => ({
      day: DAY_LABEL[d],
      dayKey: d,
      doseDay: false,
      phase: "daily-agent",
      fastHours: fastHrs,
      advice: PHASE_ADVICE["daily-agent"]
    }));
  }

  // Weekly SC: walk the 7-day cycle from doseDay.
  const dd = (doseDay || "mon").toLowerCase();
  const ddIdx = DAYS.indexOf(dd);
  return DAYS.map((d, i) => {
    const offset = (i - ddIdx + 7) % 7;
    let phase;
    if (offset === 0) phase = "dose-day";
    else if (meta.peakSuppressionDays.includes(offset)) phase = "peak-suppression";
    else if (meta.appetiteReturnDays.includes(offset)) phase = "appetite-return";
    else phase = "steady";
    return {
      day: DAY_LABEL[d],
      dayKey: d,
      doseDay: offset === 0,
      daysSinceDose: offset,
      phase,
      fastHours: fastHrs,
      advice: PHASE_ADVICE[phase]
    };
  });
}

function pick5_2LowCalDays(doseDay) {
  // Pick Tue + Thu unless doseDay is one of them; then shift to Wed + Sat.
  const dd = (doseDay || "mon").toLowerCase();
  if (dd === "tue" || dd === "thu") return ["wed", "sat"];
  return ["tue", "thu"];
}

// ---- Counselling + food lists --------------------------------------------

export function foodPreferences(drug) {
  return {
    favor: [
      "Protein-dense: eggs, paneer, curd, low-fat milk, dal, fish, chicken breast, tofu, sprouts.",
      "Fibre + volume: leafy greens, cucumber, tomato, bottle gourd, ridge gourd, okra, cabbage.",
      "Slow carbs: jowar/bajra/ragi rotis, steel-cut oats, quinoa, brown rice (small portions).",
      "Hydration: coconut water, buttermilk (low-salt), jeera water, lime water (no sugar).",
      "Nausea support: ginger tea, peppermint tea, plain roasted chana, soda crackers."
    ],
    avoid: [
      "Fried, very fatty, and creamy foods (samosa, puri, biryani, heavy gravies) — exacerbate nausea.",
      "Large portion volumes — delayed emptying means any big meal sits heavy for hours.",
      "Carbonated drinks and high-sugar juices — bloating + glucose spikes.",
      "Alcohol — blunted tolerance, hypoglycemia risk, worse on dose day and low-cal days.",
      "Sweets, mithai, and processed snacks — weight-loss plateau risk.",
      "Eating past the fasting window close — defeats the IF + GLP-1 synergy."
    ]
  };
}

export function counsellingPoints({ drug, ifProtocol, dose }) {
  const meta = GLP_DRUGS[drug] || {};
  const pts = [
    `Drug: ${meta.label || drug} — ${meta.cadence}. ${meta.note || ""}`,
    "Injection technique: rotate sites (abdomen, thigh, upper arm). Same day of week each week.",
    "Eat slowly. Stop at 70% full — GLP-1 delays emptying; over-eating causes prolonged nausea/reflux.",
    "Protein first, vegetables second, grains last — reverses the Indian plate order for satiety.",
    "If missed dose: take within 5 days of the scheduled day; else skip and resume next regular day.",
    "Red-flag symptoms — stop drug and seek review: severe epigastric pain radiating to back (pancreatitis), RUQ pain (gallstones), persistent vomiting, bloody stool, severe dehydration.",
    "Side effects usually peak in weeks 2–6 after each dose escalation and then subside.",
    "Set a weekly weight + waist log. Target: 0.5–1% body weight loss per week; >2%/week is too fast.",
    "Gallstone watch: upper-abdominal pain after fatty meals during weight loss > 1 kg/week — image early.",
    "Muscle-mass protection: resistance training ≥2×/week + protein target non-negotiable."
  ];
  if (ifProtocol && ifProtocol !== "none") {
    pts.push(`Intermittent fasting window: ${IF_PROTOCOLS[ifProtocol]?.label}. Water, black tea/coffee, electrolyte salts permitted during fast.`);
  }
  if (dose) {
    pts.push(`Current dose: ${dose} ${meta.doseUnit || "mg"}. Next titration step: ${nextLadderStep(drug, dose) || "hold at current dose"}.`);
  }
  return pts;
}

function nextLadderStep(drugKey, currentDose) {
  const meta = GLP_DRUGS[drugKey];
  if (!meta || !meta.doseLadder) return null;
  const n = Number(currentDose);
  const idx = meta.doseLadder.findIndex(x => Math.abs(x - n) < 1e-6);
  if (idx < 0 || idx >= meta.doseLadder.length - 1) return null;
  return `${meta.doseLadder[idx + 1]} ${meta.doseUnit} (after ≥4 weeks at current dose, if tolerated)`;
}

// ---- Public builder -------------------------------------------------------

/**
 * Top-level: builds the full GLP-1 + IF protocol object, or returns
 * `{ enabled: false }` if not requested.
 *
 * patient.glpIf shape:
 *   {
 *     enabled: true,
 *     drug: "semaglutide"|"tirzepatide"|"dulaglutide"|"liraglutide"|"rybelsus",
 *     dose: "1.0",
 *     doseDay: "mon"|"tue"|...,   // weekly agents only
 *     ifProtocol: "14:10"|"16:8"|"18:6"|"5:2"|"none",
 *     eatingWindowStart: "12:00", eatingWindowEnd: "20:00"  // optional overrides
 *   }
 */
export function buildGlpIfProtocol(patient) {
  const cfg = patient.glpIf || {};
  if (!cfg.enabled) return { enabled: false };

  const drug = cfg.drug || "semaglutide";
  const ifProtocol = cfg.ifProtocol || "16:8";
  const drugMeta = GLP_DRUGS[drug] || null;
  const ifMeta = IF_PROTOCOLS[ifProtocol] || null;

  const safety = checkSafety(patient);
  const macros = macroTargets(patient, { drug, ifProtocol });
  const schedule = weeklySchedule({
    drug, doseDay: cfg.doseDay || "mon", ifProtocol
  });
  const foods = foodPreferences(drug);
  const counselling = counsellingPoints({
    drug, ifProtocol, dose: cfg.dose
  });

  const window = {
    start: cfg.eatingWindowStart || ifMeta?.startDefault || "12:00",
    end:   cfg.eatingWindowEnd   || ifMeta?.endDefault   || "20:00",
    protocol: ifProtocol
  };

  return {
    enabled: true,
    drug,
    drugMeta,
    dose: cfg.dose || null,
    doseDay: cfg.doseDay || "mon",
    ifProtocol,
    ifMeta,
    window,
    safety,
    macroTargets: macros,
    weeklySchedule: schedule,
    favor: foods.favor,
    avoid: foods.avoid,
    counselling
  };
}

export default {
  GLP_DRUGS, GLP_DRUG_LIST, IF_PROTOCOLS, IF_LIST,
  checkSafety, macroTargets, weeklySchedule,
  foodPreferences, counsellingPoints,
  buildGlpIfProtocol
};
