/**
 * Meal planner — assembles a 7-day Indian meal plan from the food DB
 * subject to condition tags (include / exclude). This is a deterministic
 * template-based planner: it picks from condition-appropriate options
 * for each slot, then rotates across the week.
 *
 * Ported from the web app's server/engine/mealPlanner.js, converted to
 * ES modules. Imports the food DB as a JSON module.
 */

import foods from "../data/indianFoods.json";

const byId = Object.fromEntries(foods.foods.map(f => [f.id, f]));

function has(food, tag) { return (food.tags || []).includes(tag); }
function anyTag(food, tags) { return tags.some(t => has(food, t)); }
function notExcluded(food, excludeTags) {
  return !anyTag(food, excludeTags);
}

/** Pick first eligible id from a candidate list, or fallback. */
export function pick(candidates, excludeTags, fallback) {
  for (const id of candidates) {
    const f = byId[id];
    if (f && notExcluded(f, excludeTags)) return id;
  }
  return fallback;
}

/* -------- Slot candidate libraries (ordered: best-first) -------- */

const BREAKFAST = {
  cereal: ["oats-rolled", "foxtail-millet", "ragi", "bajra", "jowar", "wheat-flour-whole", "barley", "rice-parboiled"],
  protein: ["dal-cooked-moong", "egg-white", "sprouts-moong", "paneer-low-fat", "curd-skim"],
  veg: ["tomato", "onion", "spinach", "coriander", "capsicum"]
};

const LUNCH = {
  cereal: ["chapati", "rice-cooked-brown", "rice-cooked-white", "bajra", "jowar"],
  dal: ["dal-cooked-moong", "moong-dal", "masoor-dal", "chana-dal", "toor-dal"],
  sabzi: ["bhindi", "okra", "bottle-gourd", "ridge-gourd", "cabbage", "cauliflower", "spinach", "fenugreek-leaves", "brinjal", "bitter-gourd"],
  curd: ["curd-skim", "buttermilk"],
  salad: ["cucumber", "tomato", "onion", "carrot", "radish"]
};

const DINNER = {
  cereal: ["chapati", "rice-cooked-brown", "khichdi-moong"],
  protein: ["chicken-breast", "fish-rohu", "fish-pomfret", "paneer-low-fat", "dal-cooked-moong", "tofu", "egg-white"],
  sabzi: LUNCH.sabzi,
  soup: ["bottle-gourd", "cabbage", "tomato", "spinach"]
};

const SNACK = ["sprouts-moong", "sprouts-chana", "apple", "guava", "pear", "almond", "walnut", "cucumber", "carrot", "buttermilk", "roasted-peanuts", "peanut", "flaxseed"];

const FRUIT = ["apple", "guava", "pear", "orange", "pomegranate", "strawberry", "papaya"];

/* ---------- Build a single day ---------- */

export function buildDay(dayIdx, ctx) {
  const { excludeTags, preferTags, vegetarian } = ctx;
  // Re-rank candidates: move preferred tags up, drop excluded.
  const tighten = (list) => list
    .map(id => byId[id])
    .filter(Boolean)
    .filter(f => notExcluded(f, excludeTags))
    .sort((a, b) => {
      const ap = anyTag(a, preferTags) ? -1 : 0;
      const bp = anyTag(b, preferTags) ? -1 : 0;
      return ap - bp;
    })
    .map(f => f.id);

  const bfCereal = tighten(BREAKFAST.cereal);
  const bfProtein = tighten(BREAKFAST.protein);
  const lDal = tighten(LUNCH.dal);
  const lSabzi = tighten(LUNCH.sabzi);
  const lCereal = tighten(LUNCH.cereal);
  const dProtein = tighten(vegetarian
    ? DINNER.protein.filter(id => byId[id] && !(byId[id].tags || []).includes("nonveg"))
    : DINNER.protein);

  const rot = (arr, n) => arr[(n) % arr.length];

  return {
    day: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][dayIdx],
    meals: {
      earlyMorning: [
        { food: "Warm water with lemon (unsweetened)", qty: "1 glass (240 ml)", note: "Add 4-5 soaked almonds / 2 walnuts." }
      ],
      breakfast: [
        { food: nameOf(rot(bfCereal, dayIdx)), qty: "1 katori (~150 g cooked)", note: `Use ${nameOf(rot(bfCereal, dayIdx))} as base.` },
        { food: nameOf(rot(bfProtein, dayIdx)), qty: "1 serving (~100 g)", note: "Protein component." },
        { food: "Seasonal vegetables (onion, tomato, coriander)", qty: "50 g", note: "Pre-sauteed / mixed in." }
      ],
      midMorning: [
        { food: nameOf(rot(FRUIT.filter(id => byId[id] && notExcluded(byId[id], excludeTags)), dayIdx)), qty: "1 medium (~150 g)", note: "Whole fruit, not juice." }
      ],
      lunch: [
        { food: nameOf(rot(lCereal, dayIdx)), qty: "2 chapati OR 1 katori rice", note: "Whole grain preferred." },
        { food: nameOf(rot(lDal, dayIdx)), qty: "1 katori (150 ml)", note: "Thin dal if on fluid restriction." },
        { food: nameOf(rot(lSabzi, dayIdx)), qty: "1 katori (100 g)", note: "Leached for CKD if applicable." },
        { food: "Curd (skim) / buttermilk", qty: "1 katori (100 g) or 200 ml", note: "Avoid if on strict Na/fluid restriction." },
        { food: "Salad (cucumber + carrot + radish + lemon)", qty: "1 plate", note: "Start meal with salad." }
      ],
      evening: [
        { food: rot(SNACK.filter(id => byId[id] && notExcluded(byId[id], excludeTags)), dayIdx), qty: "1 small katori / fistful", note: "No fried/salted." },
        { food: "Green tea / black tea (no sugar)", qty: "1 cup (150 ml)", note: "Avoid within 1h of iron-rich meal." }
      ],
      dinner: [
        { food: nameOf(rot(["chapati","rice-cooked-brown","khichdi-moong"].filter(id => byId[id] && notExcluded(byId[id], excludeTags)), dayIdx)), qty: "2 chapati / 1 katori", note: "Lighter than lunch." },
        { food: nameOf(rot(dProtein, dayIdx)), qty: "100 g", note: "Grilled / steamed / curry without cream." },
        { food: nameOf(rot(lSabzi, dayIdx + 3)), qty: "1 katori", note: "" }
      ],
      bedtime: [
        { food: "Warm toned / skim milk (no sugar)", qty: "150 ml", note: "Skip if fluid-restricted (HF/CKD)." }
      ]
    }
  };
}

function nameOf(id) {
  const f = byId[id];
  if (!f) return id;
  return f.hindi ? `${f.name} (${f.hindi})` : f.name;
}

export function build7Day(ctx) {
  const days = [];
  for (let i = 0; i < 7; i++) days.push(buildDay(i, ctx));
  return days;
}

export default { build7Day, buildDay, pick };
