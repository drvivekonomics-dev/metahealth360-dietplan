/**
 * Lab-report paste-text parser.
 *
 * Handles copy-paste from common Indian lab-report formats (Metropolis, SRL,
 * Thyrocare, Dr Lal, local biochemistry printouts). We intentionally avoid
 * native OCR to keep the APK lean — the doctor pastes the report text and we
 * pull the numbers with permissive regexes.
 *
 * Supported analytes:
 *   HbA1c (%), FBS / PPBS (mg/dL), TC / LDL / HDL / TG (mg/dL),
 *   Creatinine (mg/dL), eGFR (ml/min/1.73 m^2), Hb (g/dL), Ferritin (ng/mL),
 *   TSH (uIU/mL), Na+ / K+ (mEq/L), Urea / BUN (mg/dL), Albumin (g/dL).
 */

// Helper: run a regex and return first captured number (or null).
function grab(text, re) {
  const m = text.match(re);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return isFinite(n) ? n : null;
}

// Each pattern tolerates:  "HbA1c   :   7.4  %", "HbA1c - 7.4", "HbA1c 7.4%"
const PATTERNS = {
  hba1c:      /HbA1c[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)\s*%?/i,
  fbs:        /(?:FBS|Fasting(?:\s+Blood)?(?:\s+Sugar|\s+Glucose))[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  ppbs:       /(?:PPBS|Post[\-\s]*Prandial(?:\s+Sugar|\s+Glucose)?)[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  tc:         /(?:Total\s+Cholesterol|\bTC\b)[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  ldl:        /\bLDL[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  hdl:        /\bHDL[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  tg:         /(?:Triglyceride[s]?|\bTG\b)[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  creatinine: /(?:S\.?\s*Creatinine|Serum\s+Creatinine|\bCreat(?:inine)?\b)[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  egfr:       /eGFR[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  hb:         /(?:Haemoglobin|Hemoglobin|\bHb\b)[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  ferritin:   /Ferritin[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  tsh:        /\bTSH\b[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  sodium:     /(?:Sodium|\bNa\b)[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  potassium:  /(?:Potassium|\bK\b)[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  urea:       /(?:Blood\s+Urea|\bUrea\b|\bBUN\b)[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i,
  albumin:    /(?:S\.?\s*Albumin|Albumin)[^0-9]{0,15}([0-9]+(?:\.[0-9]+)?)/i
};

/**
 * Parse a blob of pasted report text. Returns { field: value|null, ... }
 * plus a `found` array of the keys that actually matched — useful to show
 * the doctor which fields we auto-filled.
 */
export function parseLabText(text = "") {
  const src = String(text || "");
  const out = {};
  const found = [];
  for (const [key, re] of Object.entries(PATTERNS)) {
    const v = grab(src, re);
    out[key] = v;
    if (v != null) found.push(key);
  }
  return { values: out, found };
}

/**
 * Merge parsed lab values into a patient-form state object. Only fills
 * fields that the doctor hasn't already typed (non-destructive).
 */
export function mergeLabsIntoForm(form, parsed) {
  const v = parsed?.values || {};
  const next = { ...form };
  const take = (k, labKey) => {
    if ((next[k] == null || next[k] === "") && v[labKey] != null) {
      next[k] = String(v[labKey]);
    }
  };
  take("hba1c", "hba1c");
  take("fbs", "fbs");
  take("ppbs", "ppbs");
  take("tc", "tc");
  take("ldl", "ldl");
  take("hdl", "hdl");
  take("tg", "tg");
  take("creatinine", "creatinine");
  take("egfr", "egfr");
  take("hb", "hb");
  take("ferritin", "ferritin");
  take("tsh", "tsh");
  take("sodium", "sodium");
  take("potassium", "potassium");
  take("urea", "urea");
  take("albumin", "albumin");
  return next;
}

export default { parseLabText, mergeLabsIntoForm };
