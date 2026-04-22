/**
 * Weekly shopping-list annex.
 *
 * Works by:
 *   1. Walking the 7-day meal plan (every slot text)
 *   2. Matching against a keyword -> aisle dictionary
 *   3. Emitting a de-duped, aisle-bucketed list
 *
 * We don't try to quantify grams — the doctor just wants a pragmatic "what
 * to pick up from the kirana / mandi this week" list the patient can take
 * to the store.
 */

const CATALOG = [
  // Grains & flours
  { key: "oats",         aisle: "Grains & Flours",  label: "Oats (rolled / steel-cut)" },
  { key: "atta",         aisle: "Grains & Flours",  label: "Whole-wheat atta" },
  { key: "bajra",        aisle: "Grains & Flours",  label: "Bajra atta" },
  { key: "jowar",        aisle: "Grains & Flours",  label: "Jowar atta" },
  { key: "ragi",         aisle: "Grains & Flours",  label: "Ragi flour" },
  { key: "quinoa",       aisle: "Grains & Flours",  label: "Quinoa" },
  { key: "rice",         aisle: "Grains & Flours",  label: "Rice (brown / hand-pounded preferred)" },
  { key: "poha",         aisle: "Grains & Flours",  label: "Poha" },
  { key: "upma",         aisle: "Grains & Flours",  label: "Suji / rava (for upma)" },
  { key: "dalia",        aisle: "Grains & Flours",  label: "Dalia (broken wheat)" },
  { key: "kuttu",        aisle: "Grains & Flours",  label: "Kuttu atta (buckwheat)" },
  { key: "singhara",     aisle: "Grains & Flours",  label: "Singhara atta (water chestnut)" },
  { key: "sama",         aisle: "Grains & Flours",  label: "Sama / barnyard millet" },

  // Pulses & legumes
  { key: "dal",          aisle: "Pulses & Legumes", label: "Assorted dals (moong / toor / masoor / chana)" },
  { key: "rajma",        aisle: "Pulses & Legumes", label: "Rajma" },
  { key: "chana",        aisle: "Pulses & Legumes", label: "Kabuli / kala chana" },
  { key: "sprouts",      aisle: "Pulses & Legumes", label: "Moong / matki for sprouts" },
  { key: "besan",        aisle: "Pulses & Legumes", label: "Besan (gram flour)" },

  // Dairy & eggs
  { key: "milk",         aisle: "Dairy & Eggs",     label: "Low-fat milk / toned milk" },
  { key: "curd",         aisle: "Dairy & Eggs",     label: "Curd / dahi (plain, unsweetened)" },
  { key: "buttermilk",   aisle: "Dairy & Eggs",     label: "Buttermilk (unsalted)" },
  { key: "paneer",       aisle: "Dairy & Eggs",     label: "Paneer (low-fat preferred)" },
  { key: "egg",          aisle: "Dairy & Eggs",     label: "Eggs" },

  // Proteins
  { key: "chicken",      aisle: "Proteins",         label: "Chicken breast (skinless)" },
  { key: "fish",         aisle: "Proteins",         label: "Fish (rohu / bhetki / pomfret — fresh)" },
  { key: "tofu",         aisle: "Proteins",         label: "Tofu" },
  { key: "soya chunks",  aisle: "Proteins",         label: "Soya chunks (nutrela)" },

  // Vegetables
  { key: "lauki",        aisle: "Vegetables",       label: "Lauki / bottle gourd" },
  { key: "tinda",        aisle: "Vegetables",       label: "Tinda" },
  { key: "methi",        aisle: "Vegetables",       label: "Methi (fenugreek leaves)" },
  { key: "palak",        aisle: "Vegetables",       label: "Palak (spinach)" },
  { key: "bhindi",       aisle: "Vegetables",       label: "Bhindi (lady finger)" },
  { key: "karela",       aisle: "Vegetables",       label: "Karela (bitter gourd)" },
  { key: "cabbage",      aisle: "Vegetables",       label: "Cabbage" },
  { key: "cauliflower",  aisle: "Vegetables",       label: "Cauliflower" },
  { key: "beans",        aisle: "Vegetables",       label: "French beans" },
  { key: "carrot",       aisle: "Vegetables",       label: "Carrot" },
  { key: "cucumber",     aisle: "Vegetables",       label: "Cucumber" },
  { key: "tomato",       aisle: "Vegetables",       label: "Tomato" },
  { key: "capsicum",     aisle: "Vegetables",       label: "Capsicum" },
  { key: "sabzi",        aisle: "Vegetables",       label: "Mixed seasonal vegetables" },
  { key: "salad",        aisle: "Vegetables",       label: "Salad greens (lettuce / cucumber / tomato)" },

  // Fruits
  { key: "apple",        aisle: "Fruits",           label: "Apple" },
  { key: "guava",        aisle: "Fruits",           label: "Guava" },
  { key: "papaya",       aisle: "Fruits",           label: "Papaya" },
  { key: "pear",         aisle: "Fruits",           label: "Pear" },
  { key: "orange",       aisle: "Fruits",           label: "Orange / mosambi" },
  { key: "pomegranate",  aisle: "Fruits",           label: "Pomegranate" },
  { key: "banana",       aisle: "Fruits",           label: "Banana" },

  // Nuts & oilseeds
  { key: "almond",       aisle: "Nuts & Seeds",     label: "Almonds (raw)" },
  { key: "walnut",       aisle: "Nuts & Seeds",     label: "Walnuts" },
  { key: "pistachio",    aisle: "Nuts & Seeds",     label: "Pistachios (unsalted)" },
  { key: "flax",         aisle: "Nuts & Seeds",     label: "Flax seeds (roasted, ground)" },
  { key: "chia",         aisle: "Nuts & Seeds",     label: "Chia seeds" },
  { key: "makhana",      aisle: "Nuts & Seeds",     label: "Makhana (fox-nuts)" },
  { key: "sabudana",     aisle: "Nuts & Seeds",     label: "Sabudana" },

  // Fats & oils
  { key: "mustard oil",  aisle: "Fats & Oils",      label: "Mustard oil (kachi ghani)" },
  { key: "olive oil",    aisle: "Fats & Oils",      label: "Olive oil (for cold use)" },
  { key: "rice bran",    aisle: "Fats & Oils",      label: "Rice bran oil" },

  // Beverages
  { key: "green tea",    aisle: "Beverages",        label: "Green tea bags" },
  { key: "coconut water",aisle: "Beverages",        label: "Tender coconut water (limit if on K-sparing drugs)" }
];

/**
 * Scan the plan's meal text and emit an aisle-bucketed shopping list.
 * @param {object[]} week  7-day array
 * @param {string[]} excludeIngredients  ingredient keywords to skip (from allergy rules)
 */
export default function buildShoppingList(week = [], excludeIngredients = []) {
  const excl = new Set((excludeIngredients || []).map(s => String(s).toLowerCase()));
  const buckets = {};
  const seen = new Set();

  const flat = [];
  for (const day of week) {
    if (!day) continue;
    for (const slot of ["earlyMorning","breakfast","midMorning","lunch","evening","dinner","bedtime"]) {
      // Legacy / cuisine planner: array of {food, qty, note}
      const legacy = day.meals && day.meals[slot];
      if (Array.isArray(legacy)) {
        for (const item of legacy) {
          if (item && item.food) flat.push(String(item.food).toLowerCase());
        }
      }
      // Fallback: flat string (if an older day shape sneaks through)
      const t = day[slot];
      if (typeof t === "string" && t) flat.push(t.toLowerCase());
    }
  }
  const hay = flat.join(" \n ");

  for (const item of CATALOG) {
    if (!hay.includes(item.key)) continue;
    // Skip items the doctor flagged as allergens.
    let skip = false;
    for (const ex of excl) {
      if (item.key.includes(ex) || item.label.toLowerCase().includes(ex)) { skip = true; break; }
    }
    if (skip) continue;
    if (seen.has(item.label)) continue;
    seen.add(item.label);
    if (!buckets[item.aisle]) buckets[item.aisle] = [];
    buckets[item.aisle].push(item.label);
  }

  // Deterministic aisle order
  const aisleOrder = [
    "Grains & Flours",
    "Pulses & Legumes",
    "Dairy & Eggs",
    "Proteins",
    "Vegetables",
    "Fruits",
    "Nuts & Seeds",
    "Fats & Oils",
    "Beverages"
  ];
  const out = [];
  for (const a of aisleOrder) {
    if (buckets[a] && buckets[a].length) {
      out.push({ aisle: a, items: buckets[a].sort() });
    }
  }
  return out;
}
