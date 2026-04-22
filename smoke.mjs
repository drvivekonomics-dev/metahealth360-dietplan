/**
 * Smoke test for the v1.0 utility modules.
 *
 * We avoid importing dietEngine.js / mealPlanner.js here — mealPlanner
 * statically imports indianFoods.json which Node 22 rejects without a
 * `with { type: "json" }` attribute. Metro bundler handles JSON natively,
 * so this is a Node-only restriction. Parse-level validation for those
 * files is covered by `node --check`.
 */
import { parseLabText, mergeLabsIntoForm } from "./src/utils/labParser.js";
import { encode, decode } from "./src/storage/obfuscate.js";
import { applyOverlayToDay } from "./src/engine/dietaryOverlay.js";
import { t as tr, LANGUAGES } from "./src/i18n/translations.js";
import buildInteractions from "./src/engine/interactions.js";
import buildShoppingList from "./src/engine/shoppingList.js";
import { APP_VERSION, RULESET_DATE, planId } from "./src/utils/version.js";
import { trendSnapshot } from "./src/storage/trend.js";
import { buildCitations } from "./src/pdf/citations.js";

let failures = 0;
const check = (name, fn) => {
  try { fn(); console.log("OK   " + name); }
  catch (e) { failures++; console.error("FAIL " + name + " :: " + e.message); }
};

// ---- Lab parser ----
check("labParser: HbA1c + LDL + Creatinine", () => {
  const p = parseLabText("HbA1c: 7.4 %\nLDL 120 mg/dL\nCreat 1.1");
  if (p.values.hba1c !== 7.4) throw new Error("hba1c " + p.values.hba1c);
  if (p.values.ldl !== 120) throw new Error("ldl " + p.values.ldl);
  if (p.values.creatinine !== 1.1) throw new Error("cr " + p.values.creatinine);
});
check("labParser: mergeLabsIntoForm non-destructive", () => {
  const form = { hba1c: "6.5", ldl: "" };
  const p = parseLabText("HbA1c 7.4 LDL 120");
  const merged = mergeLabsIntoForm(form, p);
  if (merged.hba1c !== "6.5") throw new Error("overwrote hba1c");
  if (merged.ldl !== "120") throw new Error("didn't fill ldl");
});
check("labParser: Metropolis-style multi-line", () => {
  const txt = `
    HbA1c ............. 8.2 %
    Fasting Blood Sugar : 156 mg/dL
    Post Prandial Glucose: 244
    Total Cholesterol - 220
    LDL - 140   HDL - 38   Triglycerides - 220
    S.Creatinine : 0.9
    eGFR : 92
    Hemoglobin : 11.4
  `;
  const p = parseLabText(txt);
  const must = ["hba1c","fbs","ppbs","tc","ldl","hdl","tg","creatinine","egfr","hb"];
  for (const k of must) if (p.values[k] == null) throw new Error("missed " + k);
});

// ---- Obfuscate ----
check("obfuscate: round-trip unicode", () => {
  const obj = { a: 1, b: "पाणी", c: [true, null, 3.14], d: "ಠ_ಠ" };
  const out = decode(encode(obj));
  if (JSON.stringify(out) !== JSON.stringify(obj)) throw new Error("mismatch");
});
check("obfuscate: legacy JSON compat", () => {
  const raw = '[{"x":1}]';
  const out = decode(raw);
  if (!Array.isArray(out) || out[0].x !== 1) throw new Error("legacy compat broken");
});
check("obfuscate: corrupt input returns null", () => {
  if (decode("not-a-real-blob") !== null) throw new Error("should be null");
});

// ---- i18n ----
check("i18n: Hindi + Marathi keys", () => {
  if (LANGUAGES.length !== 3) throw new Error("expected 3 langs");
  if (tr("hi", "dailyTargets") !== "दैनिक लक्ष्य") throw new Error("hi broken");
  if (tr("mr", "dailyTargets") !== "दैनिक लक्ष्य") throw new Error("mr broken");
  if (tr("en", "dailyTargets") !== "Daily Targets") throw new Error("en broken");
  if (tr("xx", "dailyTargets") !== "Daily Targets") throw new Error("fallback broken");
  if (!tr("mr", "disclaimer").includes("मेटाहेल्थ360")) throw new Error("mr disclaimer missing");
});

// ---- Overlay ----
check("overlay: jain strips potato", () => {
  const day = { day: "Mon", meals: {
    lunch: [{ food: "Aloo gobi with jeera rice", qty: "1 bowl", note: "" }]
  }};
  const out = applyOverlayToDay(day, "jain");
  if (out.meals.lunch[0].food.toLowerCase().includes("aloo")) throw new Error("aloo not stripped");
});
check("overlay: navratri strips wheat", () => {
  const day = { day: "Mon", meals: {
    breakfast: [{ food: "Wheat chapati + sabzi", qty: "2", note: "" }]
  }};
  const out = applyOverlayToDay(day, "navratri");
  if (out.meals.breakfast[0].food.toLowerCase().includes("wheat")) throw new Error("wheat not stripped");
});
check("overlay: ramadan re-slots", () => {
  const day = { day: "Mon", meals: {
    breakfast: [{ food: "Oats with milk", qty: "", note: "" }],
    lunch:     [{ food: "Dal chawal", qty: "", note: "" }],
    dinner:    [{ food: "Roti sabzi", qty: "", note: "" }]
  }};
  const out = applyOverlayToDay(day, "ramadan");
  if (!out.meals.earlyMorning[0].food.startsWith("Suhoor")) throw new Error("no suhoor");
  if (out.meals.lunch.length !== 0) throw new Error("lunch should be empty");
  if (!out.meals.evening[0].food.startsWith("Iftar")) throw new Error("no iftar");
});

// ---- Interactions ----
check("interactions: metformin + sulfonylurea + peanut", () => {
  const ix = buildInteractions({
    medications: ["metformin", "sulfonylurea", "warfarin"],
    allergies: ["peanut", "shellfish"]
  });
  if (ix.drugItems.length !== 3) throw new Error("drugs " + ix.drugItems.length);
  if (ix.allergyItems.length !== 2) throw new Error("allergies " + ix.allergyItems.length);
  if (!ix.excludeIngredients.includes("peanut")) throw new Error("peanut not excluded");
});
check("interactions: empty inputs", () => {
  const ix = buildInteractions({});
  if (ix.drugItems.length || ix.allergyItems.length) throw new Error("should be empty");
});

// ---- Shopping list ----
check("shopping: scans legacy meal structure", () => {
  const week = [{
    day: "Mon",
    meals: {
      breakfast: [{ food: "Oats porridge with almonds", qty: "", note: "" }],
      lunch:     [{ food: "Dal chawal with salad", qty: "", note: "" }],
      dinner:    [{ food: "Paneer sabzi with bajra roti", qty: "", note: "" }]
    }
  }];
  const list = buildShoppingList(week, []);
  const aisles = list.map(b => b.aisle);
  for (const a of ["Grains & Flours", "Pulses & Legumes", "Nuts & Seeds"]) {
    if (!aisles.includes(a)) throw new Error("missing aisle " + a);
  }
});
check("shopping: respects allergens", () => {
  const week = [{
    day: "Mon",
    meals: { breakfast: [{ food: "Almond + walnut trail mix", qty: "", note: "" }] }
  }];
  const list = buildShoppingList(week, ["almond"]);
  const nuts = list.find(b => b.aisle === "Nuts & Seeds");
  if (nuts && nuts.items.some(i => i.toLowerCase().includes("almond"))) throw new Error("almond not filtered");
});

// ---- Version stamp ----
check("version: planId format", () => {
  const id = planId();
  if (!/^[0-9A-Z]{1,6}-[0-9A-Z]{4}$/.test(id)) throw new Error("bad id " + id);
  if (!APP_VERSION || !RULESET_DATE) throw new Error("constants missing");
});

// ---- Trend ----
check("trend: snapshot extraction", () => {
  const entry = { savedAt: 1, plan: { patient: { weight: 80, hba1c: 7.5 } } };
  const s = trendSnapshot(entry);
  if (s.weight !== 80 || s.hba1c !== 7.5) throw new Error("snapshot broken");
});

// ---- Citations ----
check("citations: builds relevant blocks only", () => {
  const refs = buildCitations(["diabetes", "dyslipidemia"]);
  if (refs.length < 5) throw new Error("too few refs");
  const joined = refs.join(" ");
  if (!joined.includes("Standards of Care in Diabetes")) throw new Error("missing ADA Standards");
  if (!joined.includes("AHA/ACC Guideline on the Management of Blood Cholesterol")) throw new Error("missing lipid");
});

console.log("");
console.log(failures ? ("FAILURES: " + failures) : "All smoke checks passed.");
process.exit(failures ? 1 : 0);
