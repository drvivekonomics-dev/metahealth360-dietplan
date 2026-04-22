/**
 * Religious / cultural dietary overlays.
 *
 * These overlays do NOT replace the clinical rule engine. They sit ON TOP of
 * the generated meal plan and filter / swap items so the plan is acceptable
 * to the patient's observance. If a meal line is completely unusable, we
 * replace it with a safe generic substitute.
 *
 * Scope:
 *   - none       : no overlay
 *   - jain       : no root veg (potato, onion, garlic, ginger, carrot, radish,
 *                  beetroot, turmeric-root), no eggs/meat/fish; no fermented
 *                  after sunset (soft rule — note only).
 *   - ramadan    : two eating windows — Suhoor (pre-dawn) and Iftar (post-sunset).
 *                  Rearranges meal slots, hydration emphasised.
 *   - navratri   : no grains (rice, wheat, jowar, bajra, ragi, oats), no
 *                  regular salt (use sendha namak), no onion/garlic. Allowed:
 *                  kuttu, singhara, sama (barnyard millet), rajgira, potato,
 *                  sabudana, fruits, dairy, makhana.
 *   - satvik     : no onion, garlic, meat, fish, eggs; no over-stimulating
 *                  foods (heavy fermented, deep-fried). Emphasises fresh,
 *                  warm, lightly-spiced vegetarian meals.
 */

const JAIN_EXCLUDE = [
  "potato", "aloo", "onion", "pyaaz", "garlic", "lehsun", "ginger", "adrak",
  "carrot", "gajar", "radish", "muli", "beetroot", "chukandar", "turnip",
  "egg", "anda", "chicken", "fish", "mutton", "prawn"
];

const NAVRATRI_EXCLUDE = [
  "wheat", "atta", "roti", "chapati", "rice", "chawal", "poha",
  "jowar", "bajra", "ragi", "oats", "maida", "bread", "pasta", "dalia",
  "onion", "pyaaz", "garlic", "lehsun",
  "egg", "anda", "chicken", "fish", "mutton", "prawn", "paneer tikka (regular salt)"
];

const SATVIK_EXCLUDE = [
  "onion", "pyaaz", "garlic", "lehsun",
  "egg", "anda", "chicken", "fish", "mutton", "prawn",
  "deep fried", "samosa", "pakora", "kachori"
];

const SUBSTITUTES = {
  // Generic "can't eat this" fallbacks per overlay
  jain:     "1 bowl dal (no onion-garlic) + 2 phulka + seasonal sabzi (no root veg) + salad",
  navratri: "Kuttu roti (2) + aloo-sabudana sabzi (sendha namak) + dahi + fruit bowl",
  satvik:   "Phulka (2) + moong dal + lauki sabzi (no onion-garlic) + curd + salad",
  ramadan:  "Suhoor: 1 bowl oats + dates (2) + milk + banana  |  Iftar: dates (3) + water + haleem/khichdi + fruit"
};

function containsAny(s, list) {
  const L = String(s || "").toLowerCase();
  for (const w of list) {
    if (!w) continue;
    if (L.includes(w.toLowerCase())) return true;
  }
  return false;
}

/**
 * Returns a new day object with the overlay applied.
 *
 * We operate on the nested `day.meals[slot]` array-of-{food,qty,note} shape
 * emitted by BOTH the legacy planner and the regional cuisine templates.
 * If a food line contains an excluded ingredient we rewrite the entry to the
 * overlay's safe substitute.
 *
 * For Ramadan we additionally move the day into Suhoor/Iftar windows.
 */
export function applyOverlayToDay(day, overlay) {
  if (!overlay || overlay === "none" || !day) return day;

  // Deep-clone meals structure
  const meals = day.meals ? { ...day.meals } : {};
  const slots = ["earlyMorning", "breakfast", "midMorning", "lunch", "evening", "dinner", "bedtime"];
  for (const s of slots) meals[s] = Array.isArray(meals[s]) ? meals[s].map((i) => ({ ...i })) : [];

  const next = { ...day, meals };

  if (overlay === "jain" || overlay === "navratri" || overlay === "satvik") {
    let exclude = [];
    let sub = "";
    if (overlay === "jain")     { exclude = JAIN_EXCLUDE; sub = SUBSTITUTES.jain; }
    if (overlay === "navratri") { exclude = NAVRATRI_EXCLUDE; sub = SUBSTITUTES.navratri; }
    if (overlay === "satvik")   { exclude = SATVIK_EXCLUDE; sub = SUBSTITUTES.satvik; }

    for (const slot of slots) {
      const arr = meals[slot];
      if (!arr || !arr.length) continue;
      const replaced = arr.map((item) => {
        const line = (item && item.food) || "";
        if (containsAny(line, exclude)) {
          return { food: sub, qty: "", note: overlay + "-compliant substitute" };
        }
        return item;
      });
      // Dedup identical substitutes within the same slot
      const seen = new Set();
      meals[slot] = replaced.filter((i) => {
        const k = (i && i.food) || "";
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
  }

  if (overlay === "ramadan") {
    const suhoorFood = (meals.breakfast && meals.breakfast[0]?.food) || "1 bowl oats + dates (2) + milk + 1 banana";
    const iftarFood  = (meals.dinner    && meals.dinner[0]?.food)    || "Dates (3) + water + khichdi + fruit + buttermilk";
    meals.earlyMorning = [{ food: "Suhoor (pre-dawn): " + suhoorFood, qty: "", note: "Eat before fajr" }];
    meals.breakfast    = [];
    meals.midMorning   = [];
    meals.lunch        = [];
    meals.evening      = [{ food: "Iftar (post-sunset): dates (3), water, fruit", qty: "", note: "Break the fast" }];
    meals.dinner       = [{ food: iftarFood, qty: "", note: "Main evening meal" }];
    meals.bedtime      = [{ food: "1 cup warm milk + 4–6 almonds (before sleep)", qty: "", note: "" }];
  }

  return next;
}

export function applyOverlayToWeek(week, overlay) {
  if (!overlay || overlay === "none") return week;
  return week.map(d => applyOverlayToDay(d, overlay));
}

export function overlayNotes(overlay) {
  if (overlay === "jain") {
    return [
      "Jain-compliant: no root vegetables (potato, onion, garlic, ginger, carrot, radish, beetroot).",
      "No eggs, fish or meat; limited night eating — aim to finish dinner before sunset."
    ];
  }
  if (overlay === "navratri") {
    return [
      "Navratri fasting: sendha namak (rock salt) only; no grains, onion, garlic.",
      "Allowed: kuttu, singhara, sama (barnyard millet), rajgira, potato, sabudana, fruits, dairy, makhana."
    ];
  }
  if (overlay === "satvik") {
    return [
      "Satvik: vegetarian, no onion-garlic, no heavy fermented / deep-fried.",
      "Emphasise fresh, warm, lightly-spiced meals; dairy is allowed."
    ];
  }
  if (overlay === "ramadan") {
    return [
      "Ramadan: eating windows are Suhoor (pre-dawn) and Iftar (post-sunset).",
      "Hydrate aggressively between Iftar and Suhoor — 8–10 glasses total.",
      "If diabetic / on sulfonylurea or insulin: consult treating physician BEFORE fasting — dose adjustment required."
    ];
  }
  return [];
}

export const OVERLAYS = [
  { id: "none",     label: "No overlay" },
  { id: "jain",     label: "Jain" },
  { id: "satvik",   label: "Satvik" },
  { id: "navratri", label: "Navratri" },
  { id: "ramadan",  label: "Ramadan" }
];

export default { applyOverlayToDay, applyOverlayToWeek, overlayNotes, OVERLAYS };
