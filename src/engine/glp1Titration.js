/**
 * GLP-1 titration decision engine.
 *
 * Sibling of glpIfProtocol.js. glpIfProtocol renders the *current-state*
 * protocol (weekly schedule, macros, counselling). This module decides
 * the *next move*: escalate / hold / reduce / discontinue.
 *
 * Scope (matches clinician's current practice):
 *   - Semaglutide SC (Ozempic / Wegovy) — weekly, ladder 0.25 → 0.5 → 1.0 → 1.7 → 2.4 mg
 *   - Oral semaglutide (Rybelsus)       — daily, ladder 3 → 7 → 14 mg
 *
 * Design note: this is *decision support*, not automation. The clinician's
 * signature is still required. When in doubt the engine prefers "HOLD"
 * and surfaces the clinical reasoning.
 *
 * Primary references:
 *   - Wegovy (semaglutide 2.4 mg) FDA label, titration Section 2.2
 *   - Rybelsus FDA label (Novo Nordisk 2019, updated 2024)
 *   - AACE/ACE Obesity Clinical Practice Guidelines 2022 + 2024 update
 *   - American Diabetes Association Standards of Care 2025 — pharm management
 *   - OSSI (India) 2023 position statement on GLP-1 use in Indian patients
 */

import { GLP_DRUGS } from "./glpIfProtocol.js";

// ---- Titration rules per drug ---------------------------------------------
// Encoded separately from GLP_DRUGS so we don't bloat the protocol catalog.

const TITRATION_RULES = {
  semaglutide: {
    minIntervalDays: 28,         // ≥4 weeks per label
    targetIntervalDays: 28,
    maintenanceDose: 2.4,        // Wegovy maintenance; Ozempic caps at 2.0 for T2D
    plateauThresholdPct: 1.0,    // <1% weight change since escalation = plateau
    rapidLossThresholdPct: 2.0,  // >2%/week = too fast, reduce
    diabeticHbA1cTarget: 7.0,
    weightLossTargetPct: 15.0    // ≥15% loss of baseline = goal for obesity
  },
  rybelsus: {
    minIntervalDays: 30,         // ≥30 days per label (monthly)
    targetIntervalDays: 30,
    maintenanceDose: 14,
    plateauThresholdPct: 1.0,
    rapidLossThresholdPct: 2.0,
    diabeticHbA1cTarget: 7.0,
    weightLossTargetPct: 5.0     // oral sema is weaker — 3-5% typical
  }
};

// ---- Helpers ---------------------------------------------------------------

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isFinite(d.getTime()) ? d : null;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date, n) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

function iso(date) {
  // YYYY-MM-DD, timezone-agnostic for a simple date.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ladderIndex(drug, dose) {
  const meta = GLP_DRUGS[drug];
  if (!meta) return -1;
  const n = Number(dose);
  if (!isFinite(n)) return -1;
  return meta.doseLadder.findIndex(x => Math.abs(x - n) < 1e-6);
}

function nextLadderDose(drug, dose) {
  const meta = GLP_DRUGS[drug];
  if (!meta) return null;
  const idx = ladderIndex(drug, dose);
  if (idx < 0 || idx >= meta.doseLadder.length - 1) return null;
  return meta.doseLadder[idx + 1];
}

function prevLadderDose(drug, dose) {
  const meta = GLP_DRUGS[drug];
  if (!meta) return null;
  const idx = ladderIndex(drug, dose);
  if (idx <= 0) return null;
  return meta.doseLadder[idx - 1];
}

/**
 * Compute weight-loss velocity in % per week between lastVisit and now.
 * Returns null if either weight missing.
 */
function weightLossPctPerWeek({ weightKg, lastVisitWeightKg, daysSinceLastVisit }) {
  if (!weightKg || !lastVisitWeightKg || !daysSinceLastVisit) return null;
  if (daysSinceLastVisit < 7) return null;   // too short to infer velocity
  const pctChange = ((lastVisitWeightKg - weightKg) / lastVisitWeightKg) * 100;
  const weeks = daysSinceLastVisit / 7;
  return pctChange / weeks;
}

function cumulativeLossPct({ weightKg, baselineWeightKg }) {
  if (!weightKg || !baselineWeightKg) return null;
  return ((baselineWeightKg - weightKg) / baselineWeightKg) * 100;
}

// ---- Main decision function -----------------------------------------------

/**
 * Decide the next titration action.
 *
 * Input shape (typically assembled by patient-form.jsx):
 *   patient.glpIf   = { enabled, drug, dose, doseDay, ... }           (existing)
 *   patient.glpFlags = { mtcHistory, ... }                             (existing)
 *   patient.titrationVisit = {
 *     startedDate:        ISO date the CURRENT dose was started
 *     previousDose:       last ladder dose before current (for reduce fallback)
 *     weightKg:           today's weight
 *     lastVisitWeightKg:  weight at previous visit (for velocity)
 *     lastVisitDate:      ISO date of previous visit (for velocity)
 *     baselineWeightKg:   weight at GLP-1 start (for cumulative loss)
 *     nvGrade:            0 / 1 / 2 / 3 (CTCAE nausea-vomiting grade)
 *     pancreatitisSigns:  bool — severe epigastric pain radiating to back
 *     gallbladderSx:      bool — RUQ pain, fatty-food intolerance during rapid WL
 *     severeDehydration:  bool — orthostatic, AKI, poor oral intake
 *     lastHbA1c:          % (for T2D indication)
 *     targetAchieved:     clinician override — marks HOLD on maintenance
 *     notes:              free text, echoed into the card
 *   }
 *   patient.type = "T2DM" | "obesity" | "both" — drives which target applies
 *
 * Returns:
 *   {
 *     enabled:        true
 *     drug, drugMeta
 *     currentDose:    mg
 *     previousDose:   mg (or null)
 *     action:         "escalate" | "hold" | "reduce" | "discontinue"
 *     nextDose:       mg — what to dose at next visit (null if discontinue)
 *     nextReviewDate: ISO YYYY-MM-DD
 *     weeksOnDose:    int
 *     weightDelta: { perWeekPct, cumulativePct, lastVisitPct }
 *     tone:           "ok" | "warn" | "danger" — drives card color
 *     reasoning:      string[]  — one-line bullets, clinical
 *     warnings:       string[]  — cautions attached regardless of action
 *   }
 */
export function decideTitration(patient) {
  const cfg = patient.glpIf || {};
  if (!cfg.enabled) return { enabled: false };

  const drug = cfg.drug;
  if (drug !== "semaglutide" && drug !== "rybelsus") {
    // Other drugs are supported in the protocol module but this titration
    // engine intentionally only rules on sema SC + oral sema per clinician scope.
    return {
      enabled: false,
      unsupported: true,
      note: `Titration decision-support is defined only for semaglutide SC and rybelsus. For ${drug}, follow manual titration.`
    };
  }

  const meta = GLP_DRUGS[drug];
  const rules = TITRATION_RULES[drug];
  const v = patient.titrationVisit || {};
  const currentDose = Number(cfg.dose);
  const startDate = parseDate(v.startedDate);
  const lastVisitDate = parseDate(v.lastVisitDate);
  const today = new Date();
  const daysOnDose = startDate ? Math.max(0, daysBetween(startDate, today)) : null;
  const weeksOnDose = daysOnDose != null ? Math.floor(daysOnDose / 7) : null;
  const daysSinceLastVisit = lastVisitDate ? Math.max(0, daysBetween(lastVisitDate, today)) : null;

  const wklyLossPct = weightLossPctPerWeek({
    weightKg: Number(v.weightKg),
    lastVisitWeightKg: Number(v.lastVisitWeightKg),
    daysSinceLastVisit
  });
  const cumLossPct = cumulativeLossPct({
    weightKg: Number(v.weightKg),
    baselineWeightKg: Number(v.baselineWeightKg)
  });

  const reasoning = [];
  const warnings = [];
  const addWarn = (s) => warnings.push(s);

  // ----- RED FLAGS → DISCONTINUE -------------------------------------------
  if (v.pancreatitisSigns) {
    return buildResult({
      drug, meta, currentDose, previousDose: null,
      action: "discontinue",
      nextDose: null,
      nextReviewDate: iso(addDays(today, 7)),
      weeksOnDose, wklyLossPct, cumLossPct, daysSinceLastVisit,
      tone: "danger",
      reasoning: [
        "Red-flag symptoms suggest pancreatitis — STOP drug immediately.",
        "Order serum lipase / amylase + contrast-enhanced CT abdomen today.",
        "Admit if ongoing pain, vomiting, or lab confirmation. Do NOT rechallenge without gastroenterology clearance."
      ],
      warnings
    });
  }

  // ----- DEHYDRATION / AKI → REDUCE (one step back) ------------------------
  if (v.severeDehydration) {
    const prev = prevLadderDose(drug, currentDose);
    return buildResult({
      drug, meta, currentDose, previousDose: prev,
      action: "reduce",
      nextDose: prev != null ? prev : currentDose,
      nextReviewDate: iso(addDays(today, 14)),
      weeksOnDose, wklyLossPct, cumLossPct, daysSinceLastVisit,
      tone: "danger",
      reasoning: [
        "Severe dehydration / pre-renal injury risk — reduce dose or pause until rehydrated.",
        prev != null
          ? `Step down to ${prev} ${meta.doseUnit} and reassess in 2 weeks after oral rehydration.`
          : "Already at starting dose — pause drug, rehydrate, restart at starting dose after 1–2 weeks.",
        "Recheck serum creatinine + electrolytes at next visit."
      ],
      warnings
    });
  }

  // ----- RAPID LOSS → REDUCE ------------------------------------------------
  if (wklyLossPct != null && wklyLossPct > rules.rapidLossThresholdPct) {
    const prev = prevLadderDose(drug, currentDose);
    return buildResult({
      drug, meta, currentDose, previousDose: prev,
      action: "reduce",
      nextDose: prev != null ? prev : currentDose,
      nextReviewDate: iso(addDays(today, 28)),
      weeksOnDose, wklyLossPct, cumLossPct, daysSinceLastVisit,
      tone: "warn",
      reasoning: [
        `Weight loss ${wklyLossPct.toFixed(1)}% per week exceeds the 2%/week ceiling — excessive.`,
        "Too-fast loss drives lean-mass loss, gallstones, and hair shedding.",
        prev != null
          ? `Step down to ${prev} ${meta.doseUnit}; reinforce protein floor ≥ 1.4 g/kg IBW + resistance training 2×/week.`
          : "Already at starting dose — slow the plan with extra kcal, not more drug."
      ],
      warnings
    });
  }

  // ----- TOLERABILITY: GRADE 2+ N/V → HOLD ---------------------------------
  if (Number(v.nvGrade) >= 2) {
    return buildResult({
      drug, meta, currentDose, previousDose: null,
      action: "hold",
      nextDose: currentDose,
      nextReviewDate: iso(addDays(today, 14)),
      weeksOnDose, wklyLossPct, cumLossPct, daysSinceLastVisit,
      tone: "warn",
      reasoning: [
        `CTCAE N/V grade ${v.nvGrade} — dose-limiting GI toxicity at current dose.`,
        "HOLD at current dose for 2 weeks. Add ondansetron 4 mg PRN. Small protein-dense meals, avoid fried/creamy foods.",
        "If grade 2 persists at 2-week reassessment, reduce one ladder step."
      ],
      warnings
    });
  }

  if (Number(v.nvGrade) === 1) {
    addWarn("Mild N/V (grade 1) — expected in first 4-6 weeks of each dose. Ginger/peppermint tea, small meals, avoid late-night eating.");
  }

  // ----- GALLBLADDER WARNING (doesn't block escalation, but surface it) ----
  if (v.gallbladderSx) {
    addWarn("RUQ pain / post-prandial fatty intolerance — rule out cholelithiasis (USG abdomen). Common during rapid GLP-1 weight loss.");
  }

  // ----- TARGET ACHIEVED → HOLD (maintenance) ------------------------------
  const atWeightTarget = cumLossPct != null && cumLossPct >= rules.weightLossTargetPct;
  const atHbA1cTarget = Number(v.lastHbA1c) > 0 && Number(v.lastHbA1c) < rules.diabeticHbA1cTarget;
  if (v.targetAchieved || atWeightTarget || (patient.type === "T2DM" && atHbA1cTarget)) {
    return buildResult({
      drug, meta, currentDose, previousDose: null,
      action: "hold",
      nextDose: currentDose,
      nextReviewDate: iso(addDays(today, 90)),
      weeksOnDose, wklyLossPct, cumLossPct, daysSinceLastVisit,
      tone: "ok",
      reasoning: [
        atWeightTarget
          ? `Cumulative weight loss ${cumLossPct.toFixed(1)}% ≥ ${rules.weightLossTargetPct}% target — treatment goal achieved.`
          : atHbA1cTarget
            ? `HbA1c ${v.lastHbA1c}% < ${rules.diabeticHbA1cTarget}% target — glycemic goal achieved.`
            : "Clinician marked target achieved.",
        "HOLD at current dose for maintenance. Review in 3 months; retest HbA1c + lipids + weight.",
        "Continue protein floor + resistance training. Premature discontinuation causes rebound weight gain."
      ],
      warnings
    });
  }

  // ----- AT MAX DOSE → HOLD (ceiling) --------------------------------------
  const idx = ladderIndex(drug, currentDose);
  if (idx === meta.doseLadder.length - 1) {
    return buildResult({
      drug, meta, currentDose, previousDose: null,
      action: "hold",
      nextDose: currentDose,
      nextReviewDate: iso(addDays(today, 84)),
      weeksOnDose, wklyLossPct, cumLossPct, daysSinceLastVisit,
      tone: "ok",
      reasoning: [
        `At maximum labelled dose (${currentDose} ${meta.doseUnit}) — ladder exhausted.`,
        "If inadequate response persists at 12 weeks on max dose, consider class switch (e.g. sema → tirzepatide) or add metformin / bariatric referral.",
        "Continue current dose; reassess in 12 weeks."
      ],
      warnings
    });
  }

  // ----- INTERVAL NOT MET → HOLD -------------------------------------------
  if (daysOnDose != null && daysOnDose < rules.minIntervalDays) {
    const daysLeft = rules.minIntervalDays - daysOnDose;
    return buildResult({
      drug, meta, currentDose, previousDose: null,
      action: "hold",
      nextDose: currentDose,
      nextReviewDate: iso(addDays(today, daysLeft)),
      weeksOnDose, wklyLossPct, cumLossPct, daysSinceLastVisit,
      tone: "ok",
      reasoning: [
        `Only ${daysOnDose} days at ${currentDose} ${meta.doseUnit}. Minimum ${rules.minIntervalDays} days at each step before escalation.`,
        `Reassess in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${iso(addDays(today, daysLeft))}).`,
        "Premature escalation worsens GI toxicity without faster weight loss."
      ],
      warnings
    });
  }

  // ----- PLATEAU → ESCALATE -------------------------------------------------
  // Plateau: velocity below threshold AND cumulative not at target yet.
  const plateau = wklyLossPct != null && wklyLossPct < rules.plateauThresholdPct;
  if (plateau) {
    const next = nextLadderDose(drug, currentDose);
    return buildResult({
      drug, meta, currentDose, previousDose: null,
      action: "escalate",
      nextDose: next,
      nextReviewDate: iso(addDays(today, rules.targetIntervalDays)),
      weeksOnDose, wklyLossPct, cumLossPct, daysSinceLastVisit,
      tone: "ok",
      reasoning: [
        `${weeksOnDose}w at ${currentDose} ${meta.doseUnit}; velocity ${wklyLossPct.toFixed(2)}%/wk — plateau below ${rules.plateauThresholdPct}%.`,
        `Cumulative loss ${cumLossPct != null ? cumLossPct.toFixed(1) + "%" : "—"} (target ${rules.weightLossTargetPct}%). Escalate to ${next} ${meta.doseUnit}.`,
        `Warn patient: GI side effects may return transiently in the first 1-2 weeks post-escalation.`
      ],
      warnings
    });
  }

  // ----- ON TRACK → HOLD (positive) ----------------------------------------
  return buildResult({
    drug, meta, currentDose, previousDose: null,
    action: "hold",
    nextDose: currentDose,
    nextReviewDate: iso(addDays(today, rules.targetIntervalDays)),
    weeksOnDose, wklyLossPct, cumLossPct, daysSinceLastVisit,
    tone: "ok",
    reasoning: [
      wklyLossPct != null
        ? `On track: ${wklyLossPct.toFixed(2)}%/wk weight loss within 0.5–2% safe-progression band.`
        : "On track at current dose (weight velocity not computable — first follow-up visit).",
      `Continue ${currentDose} ${meta.doseUnit}; reassess at ${rules.targetIntervalDays}-day follow-up.`,
      "Protein floor + 2× weekly resistance training remain non-negotiable."
    ],
    warnings
  });
}

function buildResult({
  drug, meta, currentDose, previousDose,
  action, nextDose, nextReviewDate,
  weeksOnDose, wklyLossPct, cumLossPct, daysSinceLastVisit,
  tone, reasoning, warnings
}) {
  return {
    enabled: true,
    drug,
    drugMeta: meta,
    currentDose,
    currentDoseUnit: meta.doseUnit,
    previousDose,
    action,
    nextDose,
    nextReviewDate,
    weeksOnDose: weeksOnDose ?? null,
    weightDelta: {
      perWeekPct: wklyLossPct != null ? +wklyLossPct.toFixed(2) : null,
      cumulativePct: cumLossPct != null ? +cumLossPct.toFixed(1) : null,
      daysSinceLastVisit: daysSinceLastVisit ?? null
    },
    tone,
    reasoning,
    warnings
  };
}

// ---- PDF fragment: the printed "Titration Card" --------------------------

const TONE_COLORS = {
  ok:     { bg: "#E9F5F0", border: "#0B6E4F", label: "#0B6E4F" },
  warn:   { bg: "#FFF4E0", border: "#F4A261", label: "#B8630A" },
  danger: { bg: "#FDECEC", border: "#C0392B", label: "#8B1A1A" }
};

const ACTION_LABEL = {
  escalate:    "↑ ESCALATE",
  hold:        "→ HOLD",
  reduce:      "↓ REDUCE",
  discontinue: "✕ DISCONTINUE"
};

function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * HTML fragment for the printed titration card. Clinician cuts this out
 * or the patient photographs it — contains the two things the patient
 * *must* carry between visits: current dose + next dose + review date.
 */
export function buildTitrationCard(patient, decision) {
  if (!decision || !decision.enabled) return "";
  const tone = TONE_COLORS[decision.tone] || TONE_COLORS.ok;
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const unit = decision.currentDoseUnit || "mg";
  const name = escHtml(patient?.name || "");
  const nextDose = decision.nextDose != null
    ? `${decision.nextDose} ${unit}`
    : "—";
  const velocity = decision.weightDelta?.perWeekPct != null
    ? `${decision.weightDelta.perWeekPct}%/wk`
    : "—";
  const cumulative = decision.weightDelta?.cumulativePct != null
    ? `${decision.weightDelta.cumulativePct}% from baseline`
    : "—";
  const reasoningHtml = (decision.reasoning || []).map(r => `<li>${escHtml(r)}</li>`).join("");
  const warningsHtml = (decision.warnings || []).map(w => `<li>${escHtml(w)}</li>`).join("");

  return `
    <section class="titration-card" style="
      border: 2px solid ${tone.border};
      background: ${tone.bg};
      border-radius: 8px;
      padding: 14px 16px;
      margin: 16px 0 20px 0;
      page-break-inside: avoid;
    ">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div>
          <div style="font-size:11px; color:${tone.label}; font-weight:700; letter-spacing:0.5px;">GLP-1 TITRATION CARD</div>
          <div style="font-size:16px; color:#14213D; font-weight:700; margin-top:2px;">${escHtml(decision.drugMeta?.label || decision.drug)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px; color:#666;">${escHtml(todayIso)}</div>
          <div style="font-size:11px; color:#666;">${name}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:10px; margin-bottom:10px;">
        <div style="background:#fff; padding:8px; border-radius:4px;">
          <div style="font-size:10px; color:#666; text-transform:uppercase;">Today's dose</div>
          <div style="font-size:14px; font-weight:700; color:#14213D;">${escHtml(decision.currentDose)} ${escHtml(unit)}</div>
        </div>
        <div style="background:#fff; padding:8px; border-radius:4px;">
          <div style="font-size:10px; color:#666; text-transform:uppercase;">Decision</div>
          <div style="font-size:14px; font-weight:700; color:${tone.label};">${escHtml(ACTION_LABEL[decision.action] || decision.action)}</div>
        </div>
        <div style="background:#fff; padding:8px; border-radius:4px;">
          <div style="font-size:10px; color:#666; text-transform:uppercase;">Next dose</div>
          <div style="font-size:14px; font-weight:700; color:#14213D;">${escHtml(nextDose)}</div>
        </div>
        <div style="background:#fff; padding:8px; border-radius:4px;">
          <div style="font-size:10px; color:#666; text-transform:uppercase;">Review on</div>
          <div style="font-size:14px; font-weight:700; color:#14213D;">${escHtml(decision.nextReviewDate || "—")}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:10px; font-size:11px; color:#333;">
        <div><strong>On dose:</strong> ${decision.weeksOnDose != null ? decision.weeksOnDose + " weeks" : "—"}</div>
        <div><strong>Velocity:</strong> ${escHtml(velocity)}</div>
        <div><strong>Cumulative:</strong> ${escHtml(cumulative)}</div>
      </div>

      ${reasoningHtml ? `
        <div style="font-size:12px; color:#14213D;">
          <div style="font-weight:700; margin-bottom:4px;">Reasoning</div>
          <ul style="margin:0 0 0 18px; padding:0;">${reasoningHtml}</ul>
        </div>` : ""}

      ${warningsHtml ? `
        <div style="font-size:12px; color:#8B1A1A; margin-top:8px;">
          <div style="font-weight:700; margin-bottom:4px;">⚠ Cautions</div>
          <ul style="margin:0 0 0 18px; padding:0;">${warningsHtml}</ul>
        </div>` : ""}

      <div style="margin-top:12px; padding-top:8px; border-top:1px dashed ${tone.border}; display:flex; justify-content:space-between; font-size:11px; color:#666;">
        <div>Patient must bring this card to every visit.</div>
        <div>Clinician sig: __________________</div>
      </div>
    </section>
  `;
}

export default { decideTitration, buildTitrationCard };
