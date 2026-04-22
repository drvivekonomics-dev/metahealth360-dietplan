/**
 * Rule registry. The diet engine resolves condition names -> rule modules through this file.
 * Multiple conditions can be passed; rules are *merged* (most restrictive wins).
 *
 * Ported from the web app's server/rules/index.js to ES modules.
 */

import diabetes from "./diabetes.js";
import dyslipidemia from "./dyslipidemia.js";
import heartFailure from "./heartFailure.js";
import ckd from "./ckd.js";
import ironDeficiencyAnemia from "./ironDeficiencyAnemia.js";
import pregnancy from "./pregnancy.js";
import weightLoss from "./weightLoss.js";
import metabolicSyndrome from "./metabolicSyndrome.js";

const rules = {
  "diabetes":               diabetes,
  "prediabetes":            diabetes,
  "dyslipidemia":           dyslipidemia,
  "heart-failure":          heartFailure,
  "ckd":                    ckd,
  "iron-deficiency-anemia": ironDeficiencyAnemia,
  "anemia":                 ironDeficiencyAnemia,
  "pregnancy":              pregnancy,
  "weight-loss":            weightLoss,
  "obesity":                weightLoss,
  "metabolic-syndrome":     metabolicSyndrome
};

export function listConditions() {
  return [
    { id: "diabetes",               label: "Type 2 Diabetes / Prediabetes" },
    { id: "dyslipidemia",           label: "Dyslipidemia" },
    { id: "heart-failure",          label: "Heart Failure" },
    { id: "ckd",                    label: "Chronic Kidney Disease" },
    { id: "iron-deficiency-anemia", label: "Iron Deficiency Anemia" },
    { id: "pregnancy",              label: "Pregnancy / Lactation" },
    { id: "weight-loss",            label: "Weight Loss / Obesity" },
    { id: "metabolic-syndrome",     label: "Metabolic Syndrome" }
  ];
}

export default rules;
