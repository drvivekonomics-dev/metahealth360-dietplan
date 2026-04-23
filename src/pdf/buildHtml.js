/**
 * Build an HTML string for a MetaHealth360 diet plan. This HTML is fed to
 * expo-print's printToFileAsync to produce a PDF on-device. No pdfkit, no
 * server round-trip — everything runs in the RN JS engine.
 *
 * Input: the `plan` envelope returned by src/engine/dietEngine.generatePlan().
 * Output: a single self-contained HTML string (inline CSS, no external assets).
 */
import { buildCitations } from "./citations.js";
import { t as tr } from "../i18n/translations.js";
import { buildTitrationCard } from "../engine/glp1Titration.js";

const BRAND = {
  primary: "#0B6E4F",
  accent: "#F4A261",
  ink: "#14213D",
  soft: "#E9F5F0",
  danger: "#B23A48"
};

const esc = (s) =>
  String(s ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function kv(k, v) {
  return `<div class="kv"><span class="k">${esc(k)}:</span> <span class="v">${esc(v)}</span></div>`;
}

function cuisineLabel(id) {
  const map = {
    "general":       "General Indian",
    "north-indian":  "North Indian",
    "maharashtrian": "Maharashtrian",
    "gujarati":      "Gujarati",
    "south-indian":  "South Indian",
    "bengali":       "Bengali"
  };
  return map[id] || "General Indian";
}

function overlayLabel(id) {
  const map = {
    none: "—",
    jain: "Jain",
    satvik: "Satvik",
    navratri: "Navratri",
    ramadan: "Ramadan"
  };
  return map[id] || "—";
}

function bullets(list, color) {
  if (!list || !list.length) return "";
  return `<ul class="bullets" style="color:${color || BRAND.ink}">${list
    .map((x) => `<li>${esc(x)}</li>`)
    .join("")}</ul>`;
}

function section(title, inner) {
  return `
    <section>
      <h2>${esc(title)}</h2>
      ${inner}
    </section>`;
}

function mealDay(day, lang) {
  const order = ["earlyMorning", "breakfast", "midMorning", "lunch", "evening", "dinner", "bedtime"];
  const times = {
    earlyMorning: "6–7 am",
    breakfast:    "8–9 am",
    midMorning:   "11 am",
    lunch:        "1–2 pm",
    evening:      "5 pm",
    dinner:       "7–8 pm",
    bedtime:      "10 pm"
  };

  // Cuisine templates return flat strings per slot + an optional `notes`
  // array. The legacy pan-Indian planner returns `meals: { slot: [{food,qty,note}] }`.
  const renderSlot = (slot) => {
    const legacy = day.meals && day.meals[slot];
    if (Array.isArray(legacy) && legacy.length) {
      return `
        <div class="slot">
          <div class="slot-label">${esc(tr(lang, slot))} (${esc(times[slot])})</div>
          <ul>${legacy
            .map((i) => `<li>${esc(i.food)}${i.qty ? " — " + esc(i.qty) : ""}${
              i.note ? ` <em>(${esc(i.note)})</em>` : ""
            }</li>`)
            .join("")}</ul>
        </div>`;
    }
    const flat = day[slot];
    if (flat) {
      return `
        <div class="slot">
          <div class="slot-label">${esc(tr(lang, slot))} (${esc(times[slot])})</div>
          <div class="flat-line">${esc(flat)}</div>
        </div>`;
    }
    return "";
  };

  const notesBlock = Array.isArray(day.notes) && day.notes.length
    ? `<div class="day-notes">${day.notes.map((n) => `<div>• ${esc(n)}</div>`).join("")}</div>`
    : "";

  return `
    <div class="day">
      <h3>${esc(day.day || (tr(lang, "day") + " " + (day.dayIdx ?? "")))}</h3>
      ${order.map(renderSlot).join("")}
      ${notesBlock}
    </div>`;
}

function formatDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (!isFinite(+d)) return String(v);
  try {
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d.toDateString();
  }
}

function arrow(delta) {
  if (delta == null) return "";
  if (delta > 0) return `<span style="color:${BRAND.danger}">▲ +${Number(delta).toFixed(1)}</span>`;
  if (delta < 0) return `<span style="color:${BRAND.primary}">▼ ${Number(delta).toFixed(1)}</span>`;
  return `<span>●</span>`;
}

function renderTrend(trend, lang) {
  if (!trend || !trend.rows || !trend.rows.length) return "";
  const prevDate = formatDate(trend.previousSavedAt) || "—";
  const rows = trend.rows.map((r) => `
    <tr>
      <td>${esc(r.label)}${r.unit ? ` <span class="u">(${esc(r.unit)})</span>` : ""}</td>
      <td>${r.previous == null ? "—" : esc(r.previous)}</td>
      <td>${r.current == null ? "—" : esc(r.current)}</td>
      <td>${arrow(r.delta)}</td>
    </tr>`).join("");
  const inner = `
    <div class="trend-meta">Previous visit on file: <b>${esc(prevDate)}</b></div>
    <table class="trend">
      <thead><tr><th>Parameter</th><th>Previous</th><th>Current</th><th>Change</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return section(tr(lang, "trends"), inner);
}

function renderInteractions(ix, lang) {
  if (!ix) return "";
  const hasDrug = Array.isArray(ix.drugItems) && ix.drugItems.length;
  const hasAllergy = Array.isArray(ix.allergyItems) && ix.allergyItems.length;
  if (!hasDrug && !hasAllergy) return "";

  const drugHtml = hasDrug
    ? `<h3>${esc(tr(lang, "interactions"))}</h3>` + ix.drugItems.map((d) => `
        <div class="ix-item">
          <div class="ix-drug">${esc(d.drug)}</div>
          <ul class="bullets">${d.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
        </div>`).join("")
    : "";

  const allergyHtml = hasAllergy
    ? `<h3>${esc(tr(lang, "allergyAvoid"))}</h3>` + ix.allergyItems.map((a) => `
        <div class="ix-item">
          <div class="ix-drug" style="color:${BRAND.danger}">${esc(a.allergy)}</div>
          <div class="ix-note">Avoid: ${esc(a.avoid.join(", "))}</div>
        </div>`).join("")
    : "";

  return section(tr(lang, "warnings"), `<div class="ix-wrap">${drugHtml}${allergyHtml}</div>`);
}

function renderOverlay(ov, lang) {
  if (!ov || !ov.id || ov.id === "none") return "";
  const notes = Array.isArray(ov.notes) ? ov.notes : [];
  return section(
    tr(lang, "overlay"),
    `<div class="overlay-head"><b>${esc(overlayLabel(ov.id))}</b></div>${bullets(notes)}`
  );
}

function renderShopping(list, lang) {
  if (!Array.isArray(list) || !list.length) return "";
  const inner = list.map((bucket) => `
    <div class="shop-bucket">
      <div class="shop-aisle">${esc(bucket.aisle)}</div>
      <ul class="bullets">${bucket.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
    </div>`).join("");
  return section(tr(lang, "shopping"), `<div class="shop-grid">${inner}</div>`);
}

function renderDoctorNotes(notes, lang) {
  if (!notes || !String(notes).trim()) return "";
  return section(tr(lang, "doctorNotes"), `<div class="dr-notes">${esc(notes)}</div>`);
}

function renderFollowUp(date, lang) {
  if (!date) {
    return `<p>Review scheduled after 4 weeks. Repeat relevant labs 1 week before follow-up.</p>`;
  }
  return `<p><b>${esc(tr(lang, "followUp"))}:</b> ${esc(formatDate(date))}. Repeat relevant labs 1 week before the visit.</p>`;
}

// ---- GLP-1 + IF rendering ------------------------------------------------

function dayLabelLocalized(dayKey, lang) {
  const en = { mon:"Monday", tue:"Tuesday", wed:"Wednesday", thu:"Thursday", fri:"Friday", sat:"Saturday", sun:"Sunday" };
  const hi = { mon:"सोमवार", tue:"मंगलवार", wed:"बुधवार", thu:"गुरुवार", fri:"शुक्रवार", sat:"शनिवार", sun:"रविवार" };
  const mr = { mon:"सोमवार", tue:"मंगळवार", wed:"बुधवार", thu:"गुरुवार", fri:"शुक्रवार", sat:"शनिवार", sun:"रविवार" };
  const dict = lang === "hi" ? hi : lang === "mr" ? mr : en;
  return dict[dayKey] || en[dayKey] || dayKey;
}

function phaseBadge(phase, lang) {
  const map = {
    "dose-day":         { key: "glpIfPhaseDoseDay",  cls: "ph-dose" },
    "peak-suppression": { key: "glpIfPhasePeak",     cls: "ph-peak" },
    "steady":           { key: "glpIfPhaseSteady",   cls: "ph-steady" },
    "appetite-return":  { key: "glpIfPhaseAppetite", cls: "ph-appetite" },
    "low-cal-day":      { key: "glpIfPhaseLowCal",   cls: "ph-lowcal" },
    "daily-agent":      { key: "glpIfPhaseDaily",    cls: "ph-daily" }
  };
  const e = map[phase] || map.steady;
  return `<span class="ph-badge ${e.cls}">${esc(tr(lang, e.key))}</span>`;
}

function renderGlpIf(glpIf, lang) {
  if (!glpIf || !glpIf.enabled) return "";
  const safety = glpIf.safety || {};

  // Contraindicated: show only the red safety card. Never render the rest —
  // we do not want a clinician skimming a protocol they must not initiate.
  if (safety.contraindicated) {
    return section(
      tr(lang, "glpIfTitle"),
      `<div class="glp-contra">
        <div class="glp-contra-title">⛔ ${esc(tr(lang, "glpIfContraindicated"))}</div>
        ${bullets(safety.reasons || [], BRAND.danger)}
      </div>`
    );
  }

  const drugLabel = (glpIf.drugMeta && glpIf.drugMeta.label) || glpIf.drug || "—";
  const doseUnit  = (glpIf.drugMeta && glpIf.drugMeta.doseUnit) || "mg";
  const doseStr   = glpIf.dose ? `${esc(glpIf.dose)} ${esc(doseUnit)}` : "—";
  const ifLabel   = (glpIf.ifMeta && glpIf.ifMeta.label) || glpIf.ifProtocol || "—";
  const windowStr = glpIf.window && glpIf.window.start && glpIf.window.end
    ? `${esc(glpIf.window.start)} – ${esc(glpIf.window.end)}`
    : "—";

  const warningsBlock = Array.isArray(safety.warnings) && safety.warnings.length
    ? `<div class="glp-warn">
        <div class="glp-warn-title">⚠ ${esc(tr(lang, "glpIfWarnings"))}</div>
        ${bullets(safety.warnings, "#7a5a00")}
      </div>`
    : "";

  const m = glpIf.macroTargets || {};
  const macrosGrid = `
    <div class="glp-macros">
      <div><span class="k">${esc(tr(lang, "calories"))}</span><span class="v">${esc(m.kcal ?? "—")} kcal</span></div>
      <div><span class="k">${esc(tr(lang, "protein"))}</span><span class="v">${esc(m.protein_g ?? "—")} g${m.protein_gPerKgIBW ? ` (${m.protein_gPerKgIBW} g/kg IBW)` : ""}</span></div>
      <div><span class="k">Carbs</span><span class="v">${esc(m.carb_g ?? "—")} g</span></div>
      <div><span class="k">Fat</span><span class="v">${esc(m.fat_g ?? "—")} g</span></div>
      <div><span class="k">${esc(tr(lang, "fluid"))}</span><span class="v">${esc(m.fluid_ml ?? "—")} ml</span></div>
      ${m.electrolytes ? `<div class="full"><span class="k">Electrolytes</span><span class="v">${esc(m.electrolytes)}</span></div>` : ""}
    </div>`;

  const schedRows = (glpIf.weeklySchedule || []).map((d) => `
    <tr class="row-${esc(d.phase)}">
      <td>${esc(dayLabelLocalized(d.dayKey, lang))}${d.doseDay ? " ⦿" : ""}</td>
      <td>${phaseBadge(d.phase, lang)}</td>
      <td>${d.fastHours ? esc(d.fastHours) + " h" : "—"}</td>
      <td class="advice">${esc(d.advice || "")}</td>
    </tr>`).join("");

  const scheduleTable = `
    <table class="glp-sched">
      <thead>
        <tr>
          <th>${esc(tr(lang, "day"))}</th>
          <th>Phase</th>
          <th>Fast</th>
          <th>Advice</th>
        </tr>
      </thead>
      <tbody>${schedRows}</tbody>
    </table>`;

  const headerGrid = `
    <div class="grid">
      ${kv(tr(lang, "glpIfMedication"), drugLabel)}
      ${kv(tr(lang, "glpIfDose"), doseStr)}
      ${kv(tr(lang, "glpIfDoseDay"), dayLabelLocalized(glpIf.doseDay, lang))}
      ${kv(tr(lang, "glpIfProtocol"), ifLabel)}
      ${kv(tr(lang, "glpIfWindow"), windowStr)}
      ${glpIf.drugMeta && glpIf.drugMeta.typicalWeightLoss ? kv("Expected wt-loss", glpIf.drugMeta.typicalWeightLoss) : ""}
    </div>`;

  return section(
    tr(lang, "glpIfTitle"),
    `${headerGrid}
     ${warningsBlock}
     <h3>${esc(tr(lang, "glpIfMacros"))}</h3>
     ${macrosGrid}
     <h3>${esc(tr(lang, "glpIfWeeklySchedule"))}</h3>
     ${scheduleTable}
     <div class="glp-foods">
       <div>
         <h3 class="glp-favor">✔ ${esc(tr(lang, "glpIfFavor"))}</h3>
         ${bullets(glpIf.favor, BRAND.primary)}
       </div>
       <div>
         <h3 class="glp-avoid">✘ ${esc(tr(lang, "glpIfAvoid"))}</h3>
         ${bullets(glpIf.avoid, BRAND.danger)}
       </div>
     </div>
     <h3>${esc(tr(lang, "glpIfCounselling"))}</h3>
     ${bullets(glpIf.counselling)}`
  );
}

export function buildHtml(plan) {
  const p = plan.patient || {};
  const c = plan.calculators || {};
  const t = plan.targets || {};
  const m = t.macros || {};
  const lang = plan.language || "en";
  const stamp = plan.stamp || {};
  const generated = new Date(plan.generatedAt || Date.now()).toLocaleDateString("en-IN");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>MetaHealth360 Diet Plan — ${esc(p.name || "Patient")}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; color: ${BRAND.ink}; font-size: 11px; line-height: 1.45; }
      header.bar {
        background: ${BRAND.primary}; color: #fff;
        padding: 14px 32px; display: flex; justify-content: space-between; align-items: center;
      }
      header.bar .brand { font-size: 20px; font-weight: 700; letter-spacing: 0.3px; }
      header.bar .brand .tm { font-size: 9px; font-weight: 700; margin-left: 2px; vertical-align: super; }
      header.bar .tagline { font-size: 10px; opacity: 0.9; }
      header.bar .clinic { text-align: right; }
      header.bar .clinic-name { font-size: 14px; font-weight: 700; letter-spacing: 0.3px; }
      header.bar .clinic-sub { font-size: 9.5px; opacity: 0.92; margin-top: 1px; }
      header.bar .clinic-date { font-size: 9px; opacity: 0.85; margin-top: 4px; }
      main { padding: 20px 32px 20px; }
      h2 {
        font-size: 13px; color: ${BRAND.primary}; margin: 18px 0 6px;
        border-bottom: 1.5px solid ${BRAND.accent}; padding-bottom: 3px;
      }
      h3 { font-size: 12px; color: ${BRAND.primary}; margin: 12px 0 4px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 18px; }
      .kv { padding: 2px 0; }
      .kv .k { font-weight: 700; }
      ul.bullets { margin: 4px 0 8px 18px; padding: 0; }
      ul.bullets li { margin-bottom: 2px; }
      .day { break-inside: avoid; margin-bottom: 12px; padding: 8px 10px; background: ${BRAND.soft}; border-radius: 4px; }
      .slot { margin: 3px 0 3px 4px; }
      .slot-label { font-weight: 700; font-size: 10.5px; margin-top: 4px; }
      .slot ul { margin: 2px 0 4px 18px; padding: 0; }
      .flat-line { margin: 2px 0 4px 4px; }
      .day-notes { margin-top: 4px; font-size: 10px; color: ${BRAND.danger}; }
      .signature { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-start; font-size: 10px; }
      .sig-block { width: 260px; }
      .sig-line { border-top: 1px solid ${BRAND.ink}; padding-top: 4px; text-align: center; }
      .creds { margin-top: 6px; text-align: center; line-height: 1.4; }
      .creds .doc-name { color: ${BRAND.primary}; font-weight: 700; font-size: 11px; letter-spacing: 0.3px; }
      .creds .deg { font-size: 9px; color: ${BRAND.ink}; margin-top: 1px; }
      .creds .reg { font-size: 9px; color: ${BRAND.ink}; margin-top: 3px; font-weight: 700; }
      footer.bar {
        background: ${BRAND.soft}; padding: 10px 32px; font-size: 8px;
        margin-top: 24px;
      }
      footer.bar .disclaimer { color: ${BRAND.ink}; }
      footer.bar .addr { color: ${BRAND.primary}; font-weight: 700; text-align: center; margin-top: 4px; }
      footer.bar .stamp { text-align: center; font-size: 7.5px; color: #555; margin-top: 3px; letter-spacing: 0.3px; }
      .do { color: ${BRAND.primary}; }
      .dont { color: ${BRAND.danger}; }

      .citations { margin-top: 14px; padding: 10px 12px; background: #fafafa; border-left: 3px solid ${BRAND.accent}; border-radius: 3px; }
      .citations .cite-title { font-size: 11px; font-weight: 700; color: ${BRAND.primary}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
      .citations ol { margin: 0 0 0 18px; padding: 0; }
      .citations ol li { font-size: 9px; line-height: 1.4; color: ${BRAND.ink}; margin-bottom: 3px; }
      .citations .cite-note { font-size: 8.5px; color: #555; margin-top: 6px; font-style: italic; }

      /* Trend */
      .trend-meta { font-size: 10px; margin-bottom: 4px; }
      table.trend { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
      table.trend th { text-align: left; background: ${BRAND.soft}; padding: 4px 6px; font-size: 10px; }
      table.trend td { padding: 3px 6px; border-bottom: 1px solid #eee; }
      table.trend .u { color: #666; font-size: 9px; }

      /* Interactions */
      .ix-wrap { padding: 4px 0; }
      .ix-item { margin: 4px 0 6px; }
      .ix-drug { font-weight: 700; font-size: 10.5px; color: ${BRAND.primary}; }
      .ix-note { font-size: 10px; margin-left: 4px; }

      /* Overlay */
      .overlay-head { margin-bottom: 2px; font-size: 11px; }

      /* Shopping list */
      .shop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; }
      .shop-bucket { break-inside: avoid; padding: 4px 6px; background: #fafafa; border-radius: 3px; }
      .shop-aisle { font-weight: 700; color: ${BRAND.primary}; font-size: 10.5px; margin-bottom: 2px; }

      /* Doctor notes */
      .dr-notes { padding: 8px 10px; background: #fff8e6; border-left: 3px solid ${BRAND.accent}; white-space: pre-wrap; font-size: 10.5px; }

      /* GLP-1 + IF */
      .glp-contra { background: #fdecee; border-left: 4px solid ${BRAND.danger}; padding: 8px 12px; border-radius: 3px; }
      .glp-contra-title { font-weight: 700; color: ${BRAND.danger}; font-size: 12px; margin-bottom: 4px; }
      .glp-warn { background: #fff8e6; border-left: 4px solid #e0a000; padding: 8px 12px; border-radius: 3px; margin: 6px 0; }
      .glp-warn-title { font-weight: 700; color: #7a5a00; font-size: 11px; margin-bottom: 3px; }
      .glp-macros { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px 12px; margin: 4px 0 8px; }
      .glp-macros > div { padding: 3px 6px; background: ${BRAND.soft}; border-radius: 3px; font-size: 10.5px; }
      .glp-macros > div.full { grid-column: 1 / -1; background: #fafafa; }
      .glp-macros .k { font-weight: 700; margin-right: 6px; }
      table.glp-sched { width: 100%; border-collapse: collapse; font-size: 10px; margin: 4px 0 10px; }
      table.glp-sched th { background: ${BRAND.soft}; text-align: left; padding: 4px 6px; font-size: 10px; }
      table.glp-sched td { padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
      table.glp-sched td.advice { font-size: 9.5px; color: #333; }
      .ph-badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: 700; letter-spacing: 0.2px; }
      .ph-dose { background: ${BRAND.accent}; color: #fff; }
      .ph-peak { background: ${BRAND.primary}; color: #fff; }
      .ph-steady { background: ${BRAND.soft}; color: ${BRAND.ink}; }
      .ph-appetite { background: #f5d98b; color: ${BRAND.ink}; }
      .ph-lowcal { background: #4F7FA8; color: #fff; }
      .ph-daily { background: #d6d6d6; color: ${BRAND.ink}; }
      tr.row-dose-day td { background: rgba(244,162,97,0.08); }
      tr.row-peak-suppression td { background: rgba(11,110,79,0.05); }
      tr.row-appetite-return td { background: rgba(224,160,0,0.06); }
      tr.row-low-cal-day td { background: rgba(79,127,168,0.06); }
      .glp-foods { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
      .glp-foods h3.glp-favor { color: ${BRAND.primary}; }
      .glp-foods h3.glp-avoid { color: ${BRAND.danger}; }
    </style>
  </head>
  <body>
    <header class="bar">
      <div class="left">
        <div class="brand">MetaHealth360<sup class="tm">TM</sup></div>
        <div class="tagline">Precision Nutrition for Metabolic Health</div>
      </div>
      <div class="clinic">
        <div class="clinic-name">Dr. Raskar's Clinic</div>
        <div class="clinic-sub">Center of Excellence in Diabetes Care &amp; Metabolic Diseases</div>
        <div class="clinic-date">Plan date: ${esc(generated)}</div>
      </div>
    </header>

    <main>
      ${section(
        tr(lang, "patientDetails"),
        `<div class="grid">
          ${kv(tr(lang, "name"), p.name)}
          ${kv(tr(lang, "age") + " / " + tr(lang, "sex"), `${p.age ?? "—"} / ${p.sex ?? "—"}`)}
          ${kv(tr(lang, "weight") + " (kg)", p.weight)}
          ${kv(tr(lang, "height") + " (cm)", p.height)}
          ${kv("Waist (cm)", p.waist || "—")}
          ${kv(tr(lang, "cuisine"), cuisineLabel(p.cuisine))}
          ${kv(tr(lang, "conditions"), (p.conditions || []).join(", "))}
          ${plan.overlay && plan.overlay.id && plan.overlay.id !== "none"
              ? kv(tr(lang, "overlay"), overlayLabel(plan.overlay.id)) : ""}
        </div>`
      )}

      ${buildTitrationCard(p, plan.titrationDecision)}

      ${section(
        "Clinical Calculators",
        `<div class="grid">
          ${kv(tr(lang, "bmi"), c.bmi)}
          ${kv("Ideal body wt (Devine)", (c.ibw ?? "—") + " kg")}
          ${kv("BMR (Mifflin-St Jeor)", (c.bmr ?? "—") + " kcal")}
          ${kv("TDEE (activity adj.)", (c.tdee ?? "—") + " kcal")}
          ${kv("eGFR (CKD-EPI 2021)", c.egfr == null ? "—" : c.egfr + " mL/min/1.73m²")}
          ${kv("Waist/Height ratio", c.waistHtRatio ?? "—")}
        </div>`
      )}

      ${section(
        tr(lang, "dailyTargets"),
        `<div class="grid">
          ${kv(tr(lang, "calories"), `${t.kcal ?? "—"} kcal`)}
          ${kv("Carbohydrate", `${m.carbG ?? "—"} g (${Math.round((m.carb || 0) * 100)}%)`)}
          ${kv(tr(lang, "protein"), `${m.proteinG ?? "—"} g (${Math.round((m.pro || 0) * 100)}%)${
            t.proteinGPerKg ? " | " + t.proteinGPerKg + " g/kg" : ""
          }`)}
          ${kv("Fat", `${m.fatG ?? "—"} g (${Math.round((m.fat || 0) * 100)}%)`)}
          ${kv(tr(lang, "fiber") + " (min)", `${t.fiberMinGperDay ?? "—"} g`)}
          ${t.sodiumMaxMgPerDay ? kv(tr(lang, "sodium") + " (max)", `${t.sodiumMaxMgPerDay} mg`) : ""}
          ${t.potassiumMaxMgPerDay ? kv("Potassium (max)", `${t.potassiumMaxMgPerDay} mg`) : ""}
          ${t.phosphorusMaxMgPerDay ? kv("Phosphorus (max)", `${t.phosphorusMaxMgPerDay} mg`) : ""}
          ${t.fluidMaxMlPerDay ? kv(tr(lang, "fluid") + " (max)", `${t.fluidMaxMlPerDay} ml`) : ""}
          ${t.fluidTargetMlPerDay ? kv(tr(lang, "fluid") + " (target)", `${t.fluidTargetMlPerDay} ml`) : ""}
          ${t.addedSugarMaxGperDay != null ? kv("Added sugar (max)", `${t.addedSugarMaxGperDay} g`) : ""}
          ${t.extraProteinGPerDay ? kv("Protein add-on (pregnancy/lactation)", `+${t.extraProteinGPerDay} g`) : ""}
          ${t.ironTargetMgPerDay ? kv(tr(lang, "iron") + " (target)", `${t.ironTargetMgPerDay} mg`) : ""}
          ${t.folateTargetMcgPerDay ? kv("Folate (target)", `${t.folateTargetMcgPerDay} mcg`) : ""}
          ${t.calciumTargetMgPerDay ? kv("Calcium (target)", `${t.calciumTargetMgPerDay} mg`) : ""}
          ${t.vitaminB12TargetMcgPerDay ? kv("Vitamin B12 (target)", `${t.vitaminB12TargetMcgPerDay} mcg`) : ""}
          ${t.iodineTargetMcgPerDay ? kv("Iodine (target)", `${t.iodineTargetMcgPerDay} mcg`) : ""}
          ${t.dhaTargetMgPerDay ? kv("DHA (target)", `${t.dhaTargetMgPerDay} mg`) : ""}
        </div>`
      )}

      ${renderTrend(plan.trend, lang)}
      ${renderInteractions(plan.interactions, lang)}
      ${renderOverlay(plan.overlay, lang)}
      ${renderGlpIf(plan.glpIf, lang)}

      ${section("Clinical Rules (Why this plan looks this way)", bullets(plan.rules))}
      ${section("✔ " + tr(lang, "do") + "'s — Include in Every Day", bullets(plan.doList, BRAND.primary))}
      ${section("✘ " + tr(lang, "dont") + "'s — Avoid Strictly", bullets(plan.dontList, BRAND.danger))}

      ${section(
        tr(lang, "weeklyPlan"),
        (plan.mealPlan || []).map((d) => mealDay(d, lang)).join("")
      )}

      ${renderShopping(plan.shoppingList, lang)}
      ${renderDoctorNotes(plan.doctorNotes, lang)}

      ${section(
        tr(lang, "citations"),
        `<div class="citations">
          <div class="cite-title">Guidelines used for this plan</div>
          <ol>
            ${buildCitations(p.conditions || [], { glpIfEnabled: !!(plan.glpIf && plan.glpIf.enabled) }).map((c) => `<li>${esc(c)}</li>`).join("")}
          </ol>
          <div class="cite-note">All dietary recommendations derived from the above guidelines, adapted for Indian dietary patterns and regional cuisine. Local food composition values sourced from IFCT 2017 (ICMR-NIN).</div>
        </div>`
      )}

      <section>
        <h2>${esc(tr(lang, "followUp"))} &amp; ${esc(tr(lang, "signature"))}</h2>
        ${renderFollowUp(plan.followUpDate, lang)}
        <div class="signature">
          <div class="sig-block">
            <div class="sig-line">Patient signature</div>
          </div>
          <div class="sig-block">
            <div class="sig-line">${esc(tr(lang, "signature"))} &amp; seal</div>
            <div class="creds">
              <div class="doc-name">Dr. Vivek Raskar</div>
              <div class="deg">M.B.B.S. (Sir J. J. Hosp; Mumbai)</div>
              <div class="deg">Fellowship In Diabetes &amp; Endocrinology</div>
              <div class="deg">Donnell D. Etzwiler Scholar 2020, International Diabetes Centre, Minneapolis, MN, US.</div>
              <div class="deg">C.C.E.B.D.M. (International Diabetes Federation)</div>
              <div class="deg">Member of American Diabetes Association (ADA)</div>
              <div class="reg">Reg. : 2011/08/2846</div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="bar">
      <div class="disclaimer">
        ${esc(tr(lang, "disclaimer"))}
      </div>
      <div class="addr">MetaHealth360<sup style="font-size:6px;">TM</sup> is part of the Metahealth360 Lifestyle app &mdash; a property of Dr. Raskar's Wellness Clinic.</div>
      <div class="stamp">
        ${esc(tr(lang, "planId"))}: ${esc(stamp.planId || "—")} &nbsp;·&nbsp;
        ${esc(tr(lang, "version"))}: v${esc(stamp.appVersion || "—")} (${esc(stamp.rulesetDate || "—")})
      </div>
    </footer>
  </body>
</html>`;
}

export default buildHtml;
