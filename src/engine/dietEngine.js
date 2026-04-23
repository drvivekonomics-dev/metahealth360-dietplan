/**
 * MetaHealth360 - rule-based diet engine.
 *
 * Pipeline:
 *   1. Compute calculators (BMI, IBW, BMR, TDEE, eGFR).
 *   2. Resolve one or more condition rules -> merge into a single "plan spec".
 *   3. Apply calorie factor / deficit -> target kcal.
 *   4. Compute macro grams.
 *   5. Filter Indian food DB by include/exclude tags -> build a 7-day meal plan.
 *   6. Aggregate do/don't lists (deduplicated).
 *
 * Merge logic: most restrictive wins.
 *   - sodium, potassium, phosphorus, fluid cap: MIN of all conditions
 *   - protein g/day (absolute ceiling, e.g. CKD): MIN
 *   - protein g/kg (lean-mass floor, e.g. weight loss / GLP-1): MAX
 *   - protein add-on (pregnancy/lactation stack on top of baseline): SUM
 *   - fluid target (pregnancy wants 2.5 L — a floor, not a cap): MAX
 *   - micronutrient targets (Fe, folate, Ca, B12, iodine, DHA): MAX
 *   - added sugar: MIN
 *   - excludeTags: UNION; preferTags: UNION but preferTags lose if excluded
 *
 * Ported from the web app's server/engine/dietEngine.js to ES modules.
 */

import rules from "../rules/index.js";
import * as calc from "./calculators.js";
import * as mealPlanner from "./mealPlanner.js";
import { build7DayCuisine, hasCuisine } from "./cuisineMeals.js";
import buildInteractions from "./interactions.js";
import { applyOverlayToWeek, overlayNotes } from "./dietaryOverlay.js";
import buildShoppingList from "./shoppingList.js";
import { buildGlpIfProtocol } from "./glpIfProtocol.js";
import { APP_VERSION, RULESET_DATE, planId } from "../utils/version.js";
import { trendSnapshot } from "../storage/trend.js";

export function mergeSpecs(specs, patient) {
  const out = {
    tiers: specs.map(s => s.tier),
    calorieFactor: 1.0,
    kcalDeficit: 0,
    extraKcal: 0,
    macros: { carb: 0.50, pro: 0.20, fat: 0.30 },
    fiberMinGperDay: 25,
    sodiumMaxMgPerDay: Infinity,
    potassiumMaxMgPerDay: Infinity,
    phosphorusMaxMgPerDay: Infinity,
    fluidMaxMlPerDay: Infinity,
    addedSugarMaxGperDay: Infinity,
    saturatedFatMaxPctKcal: Infinity,
    proteinGPerDay: null,       // absolute ceiling (e.g. CKD) — MIN wins
    proteinGPerKg: null,        // lean-mass floor (e.g. weight loss, GLP-1) — MAX wins
    extraProteinGPerDay: 0,     // pregnancy / lactation add-on stacked on baseline — SUM
    fluidTargetMlPerDay: null,  // pregnancy 2.5 L floor — MAX of emitted targets
    ironTargetMgPerDay: 0,
    folateTargetMcgPerDay: 0,
    calciumTargetMgPerDay: 0,
    vitaminB12TargetMcgPerDay: 0,
    iodineTargetMcgPerDay: 0,
    dhaTargetMgPerDay: 0,
    preferTags: new Set(),
    excludeTags: new Set(),
    rules: [],
    doList: [],
    dontList: []
  };

  for (const s of specs) {
    if (s.calorieFactor != null && s.calorieFactor < out.calorieFactor) out.calorieFactor = s.calorieFactor;
    if (s.kcalDeficit)  out.kcalDeficit = Math.max(out.kcalDeficit, s.kcalDeficit);
    if (s.extraKcalPerDay) out.extraKcal += s.extraKcalPerDay;
    if (s.macros) out.macros = s.macros;  // latest condition wins for macros (engine caller-orders)

    if (s.fiberMinGperDay) out.fiberMinGperDay = Math.max(out.fiberMinGperDay, s.fiberMinGperDay);
    if (s.sodiumMaxMgPerDay != null) out.sodiumMaxMgPerDay = Math.min(out.sodiumMaxMgPerDay, s.sodiumMaxMgPerDay);
    if (s.potassiumMaxMgPerDay != null) out.potassiumMaxMgPerDay = Math.min(out.potassiumMaxMgPerDay, s.potassiumMaxMgPerDay);
    if (s.phosphorusMaxMgPerDay != null) out.phosphorusMaxMgPerDay = Math.min(out.phosphorusMaxMgPerDay, s.phosphorusMaxMgPerDay);
    if (s.fluidMaxMlPerDay != null) out.fluidMaxMlPerDay = Math.min(out.fluidMaxMlPerDay, s.fluidMaxMlPerDay);
    if (s.addedSugarMaxGperDay != null) out.addedSugarMaxGperDay = Math.min(out.addedSugarMaxGperDay, s.addedSugarMaxGperDay);
    if (s.saturatedFatMaxPctKcal != null) out.saturatedFatMaxPctKcal = Math.min(out.saturatedFatMaxPctKcal, s.saturatedFatMaxPctKcal);

    // Protein:
    //   proteinGPerDay  = absolute ceiling (CKD) → MIN across specs.
    //   proteinGPerKg   = lean-mass floor (weight loss, GLP-1) → MAX across specs.
    //   extraProteinGPerDay = add-on on top of baseline (pregnancy / lactation) → SUM.
    if (s.proteinGPerDay != null) {
      out.proteinGPerDay = out.proteinGPerDay == null ? s.proteinGPerDay : Math.min(out.proteinGPerDay, s.proteinGPerDay);
    }
    if (s.proteinGPerKg != null) {
      out.proteinGPerKg = out.proteinGPerKg == null ? s.proteinGPerKg : Math.max(out.proteinGPerKg, s.proteinGPerKg);
    }
    if (s.extraProteinGPerDay) out.extraProteinGPerDay += s.extraProteinGPerDay;

    // Fluid target (pregnancy wants a floor, e.g. 2.5 L). MAX across specs.
    // Distinct from fluidMaxMlPerDay (HF/CKD ceiling) which still uses MIN above.
    if (s.waterMlPerDay != null) {
      out.fluidTargetMlPerDay = out.fluidTargetMlPerDay == null ? s.waterMlPerDay : Math.max(out.fluidTargetMlPerDay, s.waterMlPerDay);
    }

    if (s.ironTargetMgPerDay) out.ironTargetMgPerDay = Math.max(out.ironTargetMgPerDay, s.ironTargetMgPerDay);
    if (s.folateTargetMcgPerDay) out.folateTargetMcgPerDay = Math.max(out.folateTargetMcgPerDay, s.folateTargetMcgPerDay);
    if (s.calciumTargetMgPerDay) out.calciumTargetMgPerDay = Math.max(out.calciumTargetMgPerDay, s.calciumTargetMgPerDay);
    if (s.vitaminB12TargetMcgPerDay) out.vitaminB12TargetMcgPerDay = Math.max(out.vitaminB12TargetMcgPerDay, s.vitaminB12TargetMcgPerDay);
    if (s.iodineTargetMcgPerDay) out.iodineTargetMcgPerDay = Math.max(out.iodineTargetMcgPerDay, s.iodineTargetMcgPerDay);
    if (s.dhaTargetMgPerDay) out.dhaTargetMgPerDay = Math.max(out.dhaTargetMgPerDay, s.dhaTargetMgPerDay);

    (s.preferTags || []).forEach(t => out.preferTags.add(t));
    (s.excludeTags || []).forEach(t => out.excludeTags.add(t));
    (s.rules || []).forEach(r => out.rules.push(r));
    (s.doList || []).forEach(r => out.doList.push(r));
    (s.dontList || []).forEach(r => out.dontList.push(r));
  }

  // Prefer-tag that is also in exclude is removed from prefer.
  out.excludeTags.forEach(t => out.preferTags.delete(t));

  // Dedupe human text lists
  out.rules = Array.from(new Set(out.rules));
  out.doList = Array.from(new Set(out.doList));
  out.dontList = Array.from(new Set(out.dontList));
  out.preferTags = Array.from(out.preferTags);
  out.excludeTags = Array.from(out.excludeTags);

  return out;
}

export function generatePlan(patient) {
  // 1. Calculators
  const bmi = calc.bmi(patient);
  const ibw = calc.ibwDevine(patient);
  const bmr = calc.bmrMifflin(patient);
  const tdee = calc.tdee(patient);
  const egfr = calc.egfrCkdEpi(patient);
  const waistHt = calc.waistHtRatio(patient);

  const enriched = { ...patient, bmi, ibw, bmr, tdee, egfr };

  // 2. Resolve rules
  const conditions = (patient.conditions || []).filter(Boolean);
  const specs = conditions.map(c => {
    const ruleFn = rules[c];
    if (!ruleFn) throw new Error(`Unknown condition: ${c}`);
    return ruleFn(enriched);
  });

  if (specs.length === 0) throw new Error("At least one condition is required.");

  const spec = mergeSpecs(specs, enriched);

  // 3. Kcal target
  let targetKcal;
  if (spec.kcalDeficit) {
    targetKcal = (tdee || 2000) - spec.kcalDeficit;
  } else {
    targetKcal = Math.round((tdee || 2000) * spec.calorieFactor);
  }
  targetKcal += spec.extraKcal || 0;
  targetKcal = Math.max(1200, targetKcal); // safety floor

  // 4. Macro grams
  let macroG = calc.macroGramsFromKcal(targetKcal, spec.macros);
  const weightKg = Number(patient.weight) || 0;

  if (spec.proteinGPerDay) {
    // CKD (or any absolute ceiling) wins outright — including over add-ons.
    macroG.proteinG = Math.round(spec.proteinGPerDay);
  } else {
    // Honor a g/kg floor from weight loss / GLP-1 (MAX with macro-% value).
    if (spec.proteinGPerKg && weightKg > 0) {
      const floor = Math.round(spec.proteinGPerKg * weightKg);
      if (floor > macroG.proteinG) macroG.proteinG = floor;
    }
    // Pregnancy / lactation add-on stacks on top (not applied when a CKD
    // ceiling is active — the ceiling clinically trumps).
    if (spec.extraProteinGPerDay) {
      macroG.proteinG += Math.round(spec.extraProteinGPerDay);
    }
  }

  // 5. Meal plan (7-day). Regional cuisine templates override the generic
  //    pan-Indian planner when the doctor picks a specific cuisine.
  const cuisineId = patient.cuisine || "general";
  let mealPlan = hasCuisine(cuisineId)
    ? build7DayCuisine(cuisineId, patient, spec)
    : mealPlanner.build7Day({
        targetKcal,
        macroG,
        preferTags: spec.preferTags,
        excludeTags: spec.excludeTags,
        sodiumMaxMgPerDay: spec.sodiumMaxMgPerDay,
        potassiumMaxMgPerDay: spec.potassiumMaxMgPerDay,
        phosphorusMaxMgPerDay: spec.phosphorusMaxMgPerDay,
        vegetarian: patient.vegetarian !== false,
        lowFluid: spec.fluidMaxMlPerDay < 1800
      });

  // 6. Drug–diet and allergy warnings (cheap, static lookup).
  const interactions = buildInteractions(patient);

  // 7. Religious / cultural overlay — filter meal lines to match observance.
  const overlay = patient.dietaryOverlay || "none";
  if (overlay && overlay !== "none") {
    mealPlan = applyOverlayToWeek(mealPlan, overlay);
  }

  // 8. Weekly shopping list (scanned from meal text, minus allergens).
  const shoppingList = buildShoppingList(mealPlan, interactions.excludeIngredients);

  // 9. Visit-to-visit trend — compare this visit's vitals against the last
  //    archived plan for this same patient (passed in by the caller).
  const trend = buildTrend(patient, enriched);

  // 9b. GLP-1 + IF protocol (optional, for patients on semaglutide /
  //     tirzepatide / dulaglutide / liraglutide / rybelsus with or without
  //     an intermittent-fasting window). Returns { enabled: false } if off.
  //     Enriched patient includes ibw/tdee for macro math.
  const glpIf = buildGlpIfProtocol(enriched);

  // 10. Version stamp — auditable footer on every PDF.
  const stamp = {
    appVersion: APP_VERSION,
    rulesetDate: RULESET_DATE,
    planId: planId()
  };

  return {
    patient: {
      name: patient.name || "(unnamed)",
      age: patient.age, sex: patient.sex,
      weight: patient.weight, height: patient.height,
      waist: patient.waist, conditions,
      cuisine: cuisineId,
      // store vitals/labs for future trend comparisons
      bmi, sbp: patient.sbp, dbp: patient.dbp,
      fbs: patient.fbs, ppbs: patient.ppbs, hba1c: patient.hba1c,
      ldl: patient.ldl, hdl: patient.hdl, tg: patient.tg,
      creatinine: patient.creatinine, egfr,
      hb: patient.hb
    },
    calculators: { bmi, ibw, bmr, tdee, egfr, waistHtRatio: waistHt },
    targets: {
      kcal: targetKcal,
      macros: { ...spec.macros, ...macroG },
      fiberMinGperDay: spec.fiberMinGperDay,
      sodiumMaxMgPerDay: isFinite(spec.sodiumMaxMgPerDay) ? spec.sodiumMaxMgPerDay : null,
      potassiumMaxMgPerDay: isFinite(spec.potassiumMaxMgPerDay) ? spec.potassiumMaxMgPerDay : null,
      phosphorusMaxMgPerDay: isFinite(spec.phosphorusMaxMgPerDay) ? spec.phosphorusMaxMgPerDay : null,
      fluidMaxMlPerDay: isFinite(spec.fluidMaxMlPerDay) ? spec.fluidMaxMlPerDay : null,
      fluidTargetMlPerDay: spec.fluidTargetMlPerDay ?? null,
      addedSugarMaxGperDay: isFinite(spec.addedSugarMaxGperDay) ? spec.addedSugarMaxGperDay : null,
      proteinGPerKg: spec.proteinGPerKg,
      extraProteinGPerDay: spec.extraProteinGPerDay || null,
      ironTargetMgPerDay: spec.ironTargetMgPerDay || null,
      folateTargetMcgPerDay: spec.folateTargetMcgPerDay || null,
      calciumTargetMgPerDay: spec.calciumTargetMgPerDay || null,
      vitaminB12TargetMcgPerDay: spec.vitaminB12TargetMcgPerDay || null,
      iodineTargetMcgPerDay: spec.iodineTargetMcgPerDay || null,
      dhaTargetMgPerDay: spec.dhaTargetMgPerDay || null
    },
    tiers: spec.tiers,
    rules: spec.rules,
    doList: spec.doList,
    dontList: spec.dontList,
    mealPlan,
    interactions,
    overlay: { id: overlay, notes: overlayNotes(overlay) },
    glpIf,
    shoppingList,
    trend,
    followUpDate: patient.followUpDate || null,
    doctorNotes: patient.doctorNotes || "",
    language: patient.language || "en",
    stamp,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Build the trend payload. The caller passes `patient.previousVisit` = the
 * archive entry returned by findByName(), or we fall back to null.
 */
function buildTrend(patient, enriched) {
  const prev = patient.previousVisit;
  if (!prev) return null;
  const prevSnap = trendSnapshot(prev);
  if (!prevSnap) return null;

  const now = {
    weight: enriched.weight ?? null,
    bmi:    enriched.bmi ?? null,
    sbp:    enriched.sbp ?? null,
    dbp:    enriched.dbp ?? null,
    fbs:    enriched.fbs ?? null,
    ppbs:   enriched.ppbs ?? null,
    hba1c:  enriched.hba1c ?? null,
    ldl:    enriched.ldl ?? null,
    hdl:    enriched.hdl ?? null,
    tg:     enriched.tg ?? null,
    creatinine: enriched.creatinine ?? null,
    egfr:   enriched.egfr ?? null,
    hb:     enriched.hb ?? null
  };

  const rows = [];
  const push = (label, unit, key) => {
    const a = Number(prevSnap[key]);
    const b = Number(now[key]);
    if (!isFinite(a) && !isFinite(b)) return;
    const delta = (isFinite(a) && isFinite(b)) ? (b - a) : null;
    rows.push({
      label, unit,
      previous: isFinite(a) ? a : null,
      current:  isFinite(b) ? b : null,
      delta
    });
  };
  push("Weight",     "kg",     "weight");
  push("BMI",        "",       "bmi");
  push("Systolic BP","mmHg",   "sbp");
  push("Diastolic BP","mmHg",  "dbp");
  push("FBS",        "mg/dL",  "fbs");
  push("PPBS",       "mg/dL",  "ppbs");
  push("HbA1c",      "%",      "hba1c");
  push("LDL",        "mg/dL",  "ldl");
  push("HDL",        "mg/dL",  "hdl");
  push("Triglycerides","mg/dL","tg");
  push("Creatinine", "mg/dL",  "creatinine");
  push("eGFR",       "ml/min", "egfr");
  push("Hb",         "g/dL",   "hb");

  return {
    previousSavedAt: prev.savedAt,
    rows: rows.filter(r => r.previous != null || r.current != null)
  };
}

export default { generatePlan, mergeSpecs };
