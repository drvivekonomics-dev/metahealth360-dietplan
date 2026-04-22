/**
 * Regional Indian cuisine meal templates.
 *
 * Each cuisine supplies 7-day rotations for every meal slot. The meal-planner
 * picks the right rotation based on the cuisine passed on the patient form.
 * If no cuisine is chosen ("general"), the engine falls back to its original
 * pan-Indian plan in mealPlanner.js.
 *
 * Dishes are free-text — they're NOT looked up from indianFoods.json. Clinical
 * rules (exclude tags, sodium/K/P caps, calorie targets) still apply via the
 * do/don't list and the Daily Targets box in the PDF; the doctor is expected
 * to use clinical judgement when a specific dish conflicts with a condition.
 *
 * Quantities use katori (~150 ml) / chapati count, standard Indian portions.
 */

const rot = (arr, i) => arr[(i % arr.length + arr.length) % arr.length];

// -------- NORTH INDIAN (Punjabi / Delhi / UP / Haryana) --------
const NORTH = {
  earlyMorning: ["Warm water + lemon; 4-5 soaked almonds, 2 walnuts"],
  breakfast: [
    ["Vegetable paratha (multigrain, 1 tsp ghee)", "Curd (skim) — 1 katori"],
    ["Besan cheela with onion & coriander (2 pcs)", "Green chutney", "Tea without sugar"],
    ["Stuffed paneer paratha (low-fat paneer)", "Curd — 1 katori"],
    ["Moong dal chilla (2 pcs)", "Mint chutney"],
    ["Aloo-methi paratha (1 tsp oil)", "Curd", "Tea"],
    ["Sprouts chaat (moong + chana) — 1 katori", "1 multigrain toast"],
    ["Paneer bhurji (low-fat) — 1 katori", "1 multigrain roti"]
  ],
  midMorning: [
    "Apple — 1 medium", "Guava — 1 medium", "Orange — 1 medium",
    "Pear — 1 medium", "Papaya — 1 katori", "Pomegranate — 1 katori", "Seasonal fruit — 1 serving"
  ],
  lunch: [
    ["2 phulka (whole wheat)", "Dal tadka (low oil) — 1 katori", "Bhindi masala — 1 katori", "Cucumber-onion salad", "Buttermilk (skim) — 1 glass"],
    ["2 phulka", "Rajma — 1 katori", "Lauki sabzi — 1 katori", "Salad", "Buttermilk"],
    ["2 phulka", "Chana masala — 1 katori", "Palak sabzi — 1 katori", "Salad", "Curd (skim)"],
    ["2 phulka", "Moong dal — 1 katori", "Baingan bharta — 1 katori", "Salad", "Buttermilk"],
    ["2 phulka", "Kadhi (low-fat) — 1 katori", "Cabbage-matar sabzi — 1 katori", "Salad"],
    ["1 katori brown rice", "Dal fry — 1 katori", "Gobi-matar sabzi — 1 katori", "Salad", "Buttermilk"],
    ["2 phulka", "Masoor dal — 1 katori", "Mix veg curry (no cream) — 1 katori", "Salad", "Buttermilk"]
  ],
  evening: [
    ["Roasted chana — 1 fistful", "Green tea (no sugar)"],
    ["Sprouts chaat — 1 katori", "Masala chai (toned milk, no sugar)"],
    ["Bhuna channa + walnut — 1 fistful", "Green tea"],
    ["Vegetable soup (lauki/tomato) — 1 bowl"],
    ["Cucumber + carrot sticks with hummus — 1 plate", "Green tea"],
    ["Puffed rice (murmura) bhel (low salt) — 1 katori"],
    ["Fruit + 5 almonds"]
  ],
  dinner: [
    ["2 phulka", "Paneer bhurji (low-fat) — 1 katori", "Lauki sabzi — 1 katori"],
    ["1 katori khichdi (moong-dal + brown rice)", "Curd — 1 katori", "Salad"],
    ["2 phulka", "Chicken curry (skinless, no cream) — 1 katori — OR — Soya chunks curry", "Spinach sabzi", "Salad"],
    ["1 katori dalia (broken wheat) veg pulao", "Raita (skim)"],
    ["2 phulka", "Fish (rohu/pomfret, grilled) — 100 g — OR — Tofu bhurji", "Mix veg sabzi"],
    ["1 katori brown rice", "Rajma — 1 katori", "Cabbage sabzi"],
    ["2 phulka", "Egg white bhurji (2 whites) — OR — Paneer — 1 katori", "Palak sabzi"]
  ],
  bedtime: ["Warm toned / skim milk (no sugar) — 150 ml (skip if fluid-restricted)"]
};

// -------- MAHARASHTRIAN --------
const MAHARASHTRIAN = {
  earlyMorning: ["Warm water + lemon; 4-5 soaked almonds"],
  breakfast: [
    ["Poha with peanut, onion, coriander — 1 katori"],
    ["Moong-dal dhirde (pancake) — 2 pcs", "Green chutney"],
    ["Thalipeeth (multigrain, 1 tsp oil) — 1 pc", "Curd (skim)"],
    ["Upma with veg (rava or oats) — 1 katori"],
    ["Sabudana khichdi (controlled portion — 1 small katori only if no diabetes)", "OR moong cheela if diabetic"],
    ["Misal (low-oil) with 1 whole-wheat pav"],
    ["Koshimbir + 1 multigrain roti + peanut chutney"]
  ],
  midMorning: [
    "Guava — 1 medium", "Apple — 1 medium", "Banana (small, only if not diabetic)", "Chikoo — 1 small (skip if diabetic)",
    "Orange — 1 medium", "Pomegranate — 1 katori", "Seasonal fruit"
  ],
  lunch: [
    ["2 jowar bhakri", "Toor dal amti — 1 katori", "Bhindi chi bhaji — 1 katori", "Koshimbir (cucumber+peanut, 1 tsp)", "Tak (buttermilk)"],
    ["2 bajra bhakri", "Masoor amti — 1 katori", "Vangi bhaji (brinjal) — 1 katori", "Salad", "Tak"],
    ["2 phulka", "Kanda-batata (small portion) + tomato saar — 1 katori", "Palak bhaji", "Salad"],
    ["2 jowar bhakri", "Chawli usal — 1 katori", "Dudhi chi bhaji — 1 katori", "Salad", "Tak"],
    ["1 katori brown rice + Varan (plain dal) — 1 katori", "Matki usal — 1 katori", "Salad", "Tak"],
    ["2 bhakri", "Chana amti — 1 katori", "Gavar bhaji — 1 katori", "Salad"],
    ["2 phulka", "Sambar-style dal — 1 katori", "Mixed veg bhaji", "Curd (skim)"]
  ],
  evening: [
    ["Roasted chana + shengdana (peanut) — 1 fistful", "Green tea"],
    ["Kothimbir vadi (steamed, not fried) — 2 pcs", "Tea without sugar"],
    ["Bhel (low salt, no sev) — 1 katori"],
    ["Fruit + 5 almonds"],
    ["Sprouts usal — 1 katori"],
    ["Roasted makhana — 1 fistful", "Green tea"],
    ["Cucumber-carrot salad + lemon"]
  ],
  dinner: [
    ["2 jowar bhakri", "Pithla (besan, low oil) — 1 katori", "Methi bhaji — 1 katori"],
    ["1 katori moong khichdi", "Tak", "Salad"],
    ["2 phulka", "Fish curry (pomfret/surmai, no coconut cream) — 1 katori — OR — Paneer bhurji", "Bhendi bhaji"],
    ["2 bhakri", "Chicken rassa (skinless, no coconut) — 1 katori — OR — Soya chunks", "Cabbage bhaji"],
    ["1 katori dal-khichdi", "Tak", "Salad"],
    ["2 phulka", "Matki usal — 1 katori", "Dudhi bhaji"],
    ["1 katori thalipeeth (small) + 1 katori dal + salad"]
  ],
  bedtime: ["Warm toned / skim milk with a pinch of haldi (no sugar) — 150 ml"]
};

// -------- GUJARATI --------
const GUJARATI = {
  earlyMorning: ["Warm water + lemon; 4-5 soaked almonds"],
  breakfast: [
    ["Khaman dhokla (steamed) — 3 pcs", "Green chutney"],
    ["Methi thepla (multigrain) — 2 pcs", "Curd (skim)"],
    ["Moong dal chilla — 2 pcs", "Mint chutney"],
    ["Handvo (steamed, not fried) — 1 slice", "Curd"],
    ["Oats upma with vegetables — 1 katori"],
    ["Khichu / Dhokli (steamed, low oil) — 1 katori"],
    ["Sprouts chaat + 1 multigrain toast"]
  ],
  midMorning: [
    "Guava — 1 medium", "Apple — 1 medium", "Pear — 1 medium",
    "Orange — 1 medium", "Pomegranate — 1 katori", "Papaya — 1 katori", "Seasonal fruit"
  ],
  lunch: [
    ["2 phulka (whole wheat)", "Gujarati dal (low sugar, low oil) — 1 katori", "Bhindi sambhariya — 1 katori", "Kachumber salad", "Chhaas"],
    ["2 phulka", "Tuvar dal — 1 katori", "Ringan-bateta nu shaak — 1 katori", "Salad", "Chhaas"],
    ["2 phulka", "Kadhi (low-fat, no sugar) — 1 katori", "Sev-tameta (low oil) — 1 katori", "Salad"],
    ["1 katori brown rice", "Dal — 1 katori", "Dudhi-chana dal — 1 katori", "Salad", "Chhaas"],
    ["2 phulka", "Moong dal — 1 katori", "Kobi nu shaak — 1 katori", "Salad", "Chhaas"],
    ["2 phulka", "Chana shaak — 1 katori", "Tindora shaak — 1 katori", "Salad"],
    ["2 phulka", "Vaal nu shaak — 1 katori", "Palak shaak", "Salad", "Chhaas"]
  ],
  evening: [
    ["Khakhra (multigrain) — 2 pcs", "Green tea"],
    ["Sprouts chaat — 1 katori"],
    ["Roasted chana + peanuts — 1 fistful"],
    ["Steamed dhokla — 2 pcs", "Green tea"],
    ["Fruit + 5 almonds"],
    ["Roasted makhana — 1 fistful"],
    ["Cucumber-carrot salad + lemon"]
  ],
  dinner: [
    ["2 phulka", "Moong dal — 1 katori", "Dudhi shaak — 1 katori"],
    ["1 katori khichdi + kadhi (low-fat)"],
    ["2 phulka", "Paneer bhurji (low-fat) — 1 katori", "Kobi-vatana shaak"],
    ["2 phulka", "Vaal-papdi shaak — 1 katori", "Salad"],
    ["1 katori handvo (steamed) + 1 katori dal + salad"],
    ["2 phulka", "Chana dal — 1 katori", "Bhindi shaak"],
    ["Undhiyu (low-oil, festive only — otherwise 2 phulka + dal + shaak)"]
  ],
  bedtime: ["Warm toned / skim milk (no sugar) — 150 ml"]
};

// -------- SOUTH INDIAN (Tamil / Andhra / Karnataka / Kerala) --------
const SOUTH = {
  earlyMorning: ["Warm water + lemon; 4-5 soaked almonds"],
  breakfast: [
    ["Idli (steamed) — 3 pcs", "Sambar — 1 katori", "Coconut-coriander chutney (1 tbsp only)"],
    ["Ragi dosa (2 pcs, 1 tsp oil)", "Tomato chutney"],
    ["Pesarattu (moong dosa) — 2 pcs", "Ginger chutney"],
    ["Upma (rava or oats) with vegetables — 1 katori"],
    ["Oats dosa — 2 pcs", "Sambar"],
    ["Adai (mixed dal dosa) — 2 pcs", "Chutney"],
    ["Set dosa (2 pcs, 1 tsp oil)", "Sambar"]
  ],
  midMorning: [
    "Guava — 1 medium", "Apple — 1 medium", "Papaya — 1 katori",
    "Orange — 1 medium", "Pomegranate — 1 katori", "Pear — 1 medium", "Seasonal fruit"
  ],
  lunch: [
    ["1 katori brown rice + rasam — 1 katori", "Sambar (low oil) — 1 katori", "Cabbage poriyal — 1 katori", "Curd (skim)", "Papad (roasted, 1 only)"],
    ["1 katori brown rice", "Kootu (lentil + veg) — 1 katori", "Beans poriyal — 1 katori", "Rasam", "Curd"],
    ["2 ragi rotti", "Sambar — 1 katori", "Chow-chow kootu — 1 katori", "Curd"],
    ["1 katori brown rice", "Dal + spinach (keerai) — 1 katori", "Snake gourd poriyal", "Curd", "Rasam"],
    ["1 katori brown rice", "Avial (low-coconut) — 1 katori", "Cabbage poriyal", "Curd"],
    ["1 katori brown rice", "Mor kuzhambu (buttermilk curry, low-fat) — 1 katori", "Beetroot poriyal", "Curd"],
    ["1 katori curd rice (skim)", "Sambar — 1 katori", "Ladies finger (bhindi) poriyal", "Salad"]
  ],
  evening: [
    ["Sundal (boiled chana + coconut, 1 tsp only) — 1 katori", "Filter coffee (no sugar, toned milk)"],
    ["Ragi malt (unsweetened) — 1 glass", "Roasted peanuts"],
    ["Steamed corn — 1 katori"],
    ["Fruit + 5 almonds"],
    ["Roasted makhana — 1 fistful", "Green tea"],
    ["Sprouts chaat — 1 katori"],
    ["Cucumber-carrot salad + lemon"]
  ],
  dinner: [
    ["2 ragi dosa", "Sambar — 1 katori", "Chutney"],
    ["1 katori idli (2 pcs) + sambar + chutney"],
    ["1 katori brown rice + dal + keerai masiyal (spinach) + curd"],
    ["2 adai + sambar"],
    ["1 katori brown rice", "Fish curry (no coconut cream) — 1 katori — OR — Paneer — 100 g", "Cabbage poriyal"],
    ["1 katori pongal (low ghee — ½ tsp only) + sambar + salad"],
    ["2 oats dosa + sambar + chutney"]
  ],
  bedtime: ["Warm toned / skim milk (no sugar) — 150 ml"]
};

// -------- BENGALI --------
const BENGALI = {
  earlyMorning: ["Warm water + lemon; 4-5 soaked almonds"],
  breakfast: [
    ["2 atta luchi (baked, not fried) — substitute: 2 multigrain roti", "Cholar dal — 1 katori"],
    ["Moong dal chilla — 2 pcs", "Mint chutney"],
    ["Oats porridge (with toned milk, no sugar) — 1 katori", "Fruit"],
    ["Vegetable upma — 1 katori", "Curd (skim)"],
    ["Sprouts chaat + 1 multigrain toast"],
    ["Besan cheela — 2 pcs", "Chutney"],
    ["Paratha (multigrain, 1 tsp oil) — 1 pc", "Curd"]
  ],
  midMorning: [
    "Guava — 1 medium", "Apple — 1 medium", "Papaya — 1 katori",
    "Pomegranate — 1 katori", "Orange — 1 medium", "Pear — 1 medium", "Seasonal fruit"
  ],
  lunch: [
    ["1 katori brown rice", "Moong dal (bhaja moog) — 1 katori", "Shukto (bitter veg medley, low oil) — 1 katori", "Salad", "Tok doi (sour curd, skim)"],
    ["1 katori brown rice", "Masoor dal — 1 katori", "Aloo-potol torkari (low oil) — 1 katori", "Salad", "Curd"],
    ["1 katori brown rice", "Cholar dal — 1 katori", "Lau ghonto (bottle gourd) — 1 katori", "Salad"],
    ["1 katori brown rice", "Mushur dal — 1 katori", "Begun bhaja (oven-roasted, 1 tsp oil) — 2 pcs", "Salad", "Curd"],
    ["2 phulka", "Dalna (mixed-veg curry, low oil) — 1 katori", "Palong shaak (spinach) — 1 katori", "Salad", "Curd"],
    ["1 katori brown rice", "Rui/katla fish curry (no mustard-oil excess) — 1 katori — OR — Paneer curry", "Jhinge-posto (low-fat) — 1 katori", "Salad"],
    ["1 katori khichuri (moong-dal + brown rice)", "Labra (mixed veg, low oil)", "Tok doi"]
  ],
  evening: [
    ["Jhaalmuri (low salt, low oil, no sev) — 1 katori", "Green tea"],
    ["Roasted chana + peanut — 1 fistful"],
    ["Steamed corn — 1 katori"],
    ["Fruit + 5 almonds"],
    ["Sprouts chaat — 1 katori"],
    ["Roasted makhana — 1 fistful", "Green tea"],
    ["Cucumber-carrot salad + lemon"]
  ],
  dinner: [
    ["2 phulka", "Moong dal — 1 katori", "Lau ghonto — 1 katori"],
    ["1 katori khichuri + labra + salad"],
    ["2 phulka", "Fish (rohu, steamed/grilled) — 100 g — OR — Paneer bhurji", "Begun (brinjal) sabzi"],
    ["2 phulka", "Egg white curry (2 whites) — 1 katori — OR — Soya chunks curry", "Spinach sabzi"],
    ["1 katori brown rice", "Chicken stew (skinless, no coconut) — 1 katori — OR — Tofu curry", "Cabbage sabzi"],
    ["2 phulka", "Dalna — 1 katori", "Shukto (mini portion)"],
    ["1 katori khichuri + tok doi + salad"]
  ],
  bedtime: ["Warm toned / skim milk with a pinch of haldi (no sugar) — 150 ml"]
};

const TEMPLATES = {
  "north-indian":     NORTH,
  "maharashtrian":    MAHARASHTRIAN,
  "gujarati":         GUJARATI,
  "south-indian":     SOUTH,
  "bengali":          BENGALI
};

export const CUISINES = [
  { id: "general",       label: "General Indian" },
  { id: "north-indian",  label: "North Indian" },
  { id: "maharashtrian", label: "Maharashtrian" },
  { id: "gujarati",      label: "Gujarati" },
  { id: "south-indian",  label: "South Indian" },
  { id: "bengali",       label: "Bengali" }
];

export function hasCuisine(id) {
  return !!TEMPLATES[id];
}

/**
 * Build a single day for the chosen cuisine. Day-of-week index 0 = Monday.
 * Each slot returns an array of { food, qty, note } items consumable by
 * buildHtml.js (which only reads food/qty/note).
 */
export function buildCuisineDay(dayIdx, cuisineId, patient, spec) {
  const tpl = TEMPLATES[cuisineId];
  if (!tpl) return null;

  const vegetarian = patient?.vegetarian !== false;
  const lowSodium  = (spec?.sodiumMaxMgPerDay || Infinity) < 2000;
  const lowFluid   = (spec?.fluidMaxMlPerDay || Infinity) < 1800;
  const diabetic   = (patient?.conditions || []).some((c) => c === "diabetes" || c === "prediabetes" || c === "metabolic-syndrome");

  const pickMeal = (slot) => {
    const entry = rot(tpl[slot], dayIdx);
    const items = Array.isArray(entry) ? entry : [entry];
    return items
      .map((line) => {
        // Drop non-veg lines for vegetarians; keep the vegetarian alternative if written as "OR — <veg>".
        if (vegetarian && /chicken|fish|mutton|prawn|egg(?!\splant)/i.test(line)) {
          const m = line.match(/OR —\s*([^—]+?)(?:\s*—|$)/i);
          if (m) {
            return `${m[1].trim()} (vegetarian option) — adjust portion to target protein`;
          }
          return null;
        }
        return line;
      })
      .filter(Boolean)
      .map((line) => ({
        food: line,
        qty: "",
        note: buildNote(line, { lowSodium, lowFluid, diabetic })
      }));
  };

  return {
    day: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][dayIdx],
    meals: {
      earlyMorning: pickMeal("earlyMorning"),
      breakfast:    pickMeal("breakfast"),
      midMorning:   pickMeal("midMorning"),
      lunch:        pickMeal("lunch"),
      evening:      pickMeal("evening"),
      dinner:       pickMeal("dinner"),
      bedtime:      pickMeal("bedtime")
    }
  };
}

function buildNote(line, { lowSodium, lowFluid, diabetic }) {
  const notes = [];
  if (diabetic && /rice|poha|sabudana|luchi|pav|idli|dosa/i.test(line)) {
    notes.push("Prefer brown/parboiled rice, millet-based, or smaller portion for glycemic control");
  }
  if (lowSodium && /papad|chaas|buttermilk|chutney|sambar|khakhra|bhel|jhaalmuri|misal/i.test(line)) {
    notes.push("Use minimal salt / skip added salt");
  }
  if (lowFluid && /(chhaas|buttermilk|milk|tak|rasam|sambar|kadhi|stew|soup)/i.test(line)) {
    notes.push("Count toward daily fluid limit");
  }
  return notes.join("; ");
}

export function build7DayCuisine(cuisineId, patient, spec) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(buildCuisineDay(i, cuisineId, patient, spec));
  }
  return days;
}

export default { CUISINES, hasCuisine, buildCuisineDay, build7DayCuisine };
