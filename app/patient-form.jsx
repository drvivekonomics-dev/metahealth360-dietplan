/**
 * Patient intake form — ports the web PatientForm.jsx field-for-field.
 * On submit, calls the on-device engine (no network) and navigates to
 * /plan-preview with the plan stashed in PlanContext.
 */
import React, { useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, Switch, Alert
} from "react-native";
import { useRouter } from "expo-router";
import { generatePlan } from "../src/engine/dietEngine";
import { CUISINES } from "../src/engine/cuisineMeals";
import { OVERLAYS } from "../src/engine/dietaryOverlay";
import { LANGUAGES } from "../src/i18n/translations";
import { DRUG_RULES, ALLERGY_RULES } from "../src/engine/interactions";
import { GLP_DRUG_LIST, IF_LIST } from "../src/engine/glpIfProtocol";
import { parseLabText, mergeLabsIntoForm } from "../src/utils/labParser";
import { findByName } from "../src/storage/archive";
import { auth } from "../src/firebase/config";
import { usePlan } from "./_layout";

const CONDITIONS = [
  { id: "diabetes",               label: "Type 2 Diabetes / Prediabetes" },
  { id: "dyslipidemia",           label: "Dyslipidemia" },
  { id: "heart-failure",          label: "Heart Failure" },
  { id: "ckd",                    label: "Chronic Kidney Disease" },
  { id: "iron-deficiency-anemia", label: "Iron Deficiency Anemia" },
  { id: "pregnancy",              label: "Pregnancy / Lactation" },
  { id: "weight-loss",            label: "Weight Loss / Obesity" },
  { id: "metabolic-syndrome",     label: "Metabolic Syndrome" }
];

const ACTIVITIES = [
  { v: "sedentary",   l: "Sedentary" },
  { v: "light",       l: "Light (1–3×/wk)" },
  { v: "moderate",    l: "Moderate (3–5×/wk)" },
  { v: "active",      l: "Active (6–7×/wk)" },
  { v: "very_active", l: "Very active" }
];

const EMPTY = {
  name: "", age: "", sex: "M", vegetarian: true,
  weight: "", height: "", waist: "",
  activityLevel: "light",
  cuisine: "general",
  conditions: [],
  hba1c: "", fbs: "", ppbs: "",
  ldl: "", hdl: "", tg: "", totalCholesterol: "",
  hb: "", serumCreatinine: "", egfr: "", onDialysis: false,
  creatinine: "", ferritin: "", tsh: "", sodium: "", potassium: "", urea: "", albumin: "",
  sbp: "", dbp: "",
  trimester: 2, gdm: false, lactating: false,
  nyhaClass: "II",

  // New in v1.0
  medications: [],
  allergies: [],
  dietaryOverlay: "none",
  language: "en",
  followUpDate: "",
  doctorNotes: "",
  labPasteText: "",

  // GLP-1 / GIP agonist + IF protocol
  glpIf: {
    enabled: false,
    drug: "semaglutide",
    dose: "",
    doseDay: "mon",
    ifProtocol: "16:8",
    eatingWindowStart: "",
    eatingWindowEnd: ""
  },
  glpFlags: {
    mtcHistory: false,
    men2: false,
    pregnancy: false,
    lactation: false,
    gastroparesis: false,
    pancreatitisActive: false,
    pancreatitisHx: false,
    gallbladderDisease: false,
    t1dm: false,
    retinopathyProliferative: false,
    eatingDisorderHx: false
  },

  // Titration follow-up visit — only used when glpIf.enabled AND the
  // clinician is doing a follow-up (not an initiation visit).
  titrationVisit: {
    startedDate: "",
    previousDose: "",
    weightKg: "",
    lastVisitWeightKg: "",
    lastVisitDate: "",
    baselineWeightKg: "",
    nvGrade: 0,
    pancreatitisSigns: false,
    gallbladderSx: false,
    severeDehydration: false,
    lastHbA1c: "",
    targetAchieved: false,
    notes: ""
  }
};

// --------- Tiny building blocks ---------------------------------------------

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Num({ value, onChange, placeholder }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      placeholder={placeholder}
      placeholderTextColor="#999"
      style={styles.input}
    />
  );
}

function Txt({ value, onChange, placeholder }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#999"
      style={styles.input}
    />
  );
}

function Area({ value, onChange, placeholder, height = 90 }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#999"
      multiline
      style={[styles.input, { height, textAlignVertical: "top" }]}
    />
  );
}

function Picker({ value, onChange, options }) {
  // Minimal horizontal pill picker (React Native doesn't ship a good built-in
  // picker; avoids depending on a third-party lib).
  return (
    <View style={styles.pillRow}>
      {options.map((o) => {
        const selected = String(o.v) === String(value);
        return (
          <Pressable
            key={String(o.v)}
            onPress={() => onChange(o.v)}
            style={[styles.pill, selected && styles.pillOn]}
          >
            <Text style={[styles.pillText, selected && styles.pillTextOn]}>{o.l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MultiPicker({ values, onToggle, options }) {
  return (
    <View style={styles.pillRow}>
      {options.map((o) => {
        const on = values.includes(o.v);
        return (
          <Pressable
            key={String(o.v)}
            onPress={() => onToggle(o.v)}
            style={[styles.pill, on && styles.pillOn]}
          >
            <Text style={[styles.pillText, on && styles.pillTextOn]}>{o.l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// --------- Screen ------------------------------------------------------------

export default function PatientFormScreen() {
  const router = useRouter();
  const { setPlan } = usePlan();
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  const update = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleCondition = (id) =>
    setF((p) => ({
      ...p,
      conditions: p.conditions.includes(id)
        ? p.conditions.filter((c) => c !== id)
        : [...p.conditions, id]
    }));
  const toggleIn = (key) => (id) =>
    setF((p) => ({
      ...p,
      [key]: p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id]
    }));
  const updateGlpIf = (k, v) => setF((p) => ({ ...p, glpIf: { ...p.glpIf, [k]: v } }));
  const toggleGlpFlag = (k) =>
    setF((p) => ({ ...p, glpFlags: { ...p.glpFlags, [k]: !p.glpFlags[k] } }));
  const updateTitration = (k, v) =>
    setF((p) => ({ ...p, titrationVisit: { ...p.titrationVisit, [k]: v } }));
  const toggleTitrationFlag = (k) =>
    setF((p) => ({
      ...p,
      titrationVisit: { ...p.titrationVisit, [k]: !p.titrationVisit[k] }
    }));

  const canSubmit = useMemo(() => f.conditions.length > 0 && f.weight && f.height && f.age, [f]);

  const pasteLabs = () => {
    const text = f.labPasteText || "";
    if (!text.trim()) {
      Alert.alert("Paste lab text", "Paste the raw lab-report text above first.");
      return;
    }
    const parsed = parseLabText(text);
    if (!parsed.found.length) {
      Alert.alert("No values found", "Couldn't extract recognised lab values. Please enter them manually.");
      return;
    }
    // Map parser keys -> form field names
    const adapter = { ...parsed.values };
    // Form uses `serumCreatinine` but parser emits `creatinine`
    if (adapter.creatinine != null) adapter.serumCreatinineAuto = adapter.creatinine;
    setF((prev) => {
      const merged = mergeLabsIntoForm(prev, parsed);
      if (adapter.creatinine != null && !prev.serumCreatinine) {
        merged.serumCreatinine = String(adapter.creatinine);
      }
      return merged;
    });
    Alert.alert("Labs filled", `Auto-filled: ${parsed.found.join(", ")}`);
  };

  const payload = async () => {
    const base = {
      ...f,
      cuisine: f.cuisine || "general",
      dietaryOverlay: f.dietaryOverlay || "none",
      language: f.language || "en",
      age: +f.age || undefined,
      weight: +f.weight || undefined,
      height: +f.height || undefined,
      waist: +f.waist || undefined,
      hba1c: +f.hba1c || undefined, fbs: +f.fbs || undefined, ppbs: +f.ppbs || undefined,
      ldl: +f.ldl || undefined, hdl: +f.hdl || undefined, tg: +f.tg || undefined,
      totalCholesterol: +f.totalCholesterol || undefined,
      hb: +f.hb || undefined,
      serumCreatinine: +f.serumCreatinine || undefined,
      creatinine: +(f.creatinine || f.serumCreatinine) || undefined,
      egfr: +f.egfr || undefined,
      sbp: +f.sbp || undefined, dbp: +f.dbp || undefined,
      trimester: +f.trimester || undefined,
      ferritin: +f.ferritin || undefined,
      tsh: +f.tsh || undefined,
      sodium: +f.sodium || undefined,
      potassium: +f.potassium || undefined,
      urea: +f.urea || undefined,
      albumin: +f.albumin || undefined,
      glpIf: f.glpIf && f.glpIf.enabled ? { ...f.glpIf } : { enabled: false },
      glpFlags: { ...f.glpFlags },
      titrationVisit: f.glpIf && f.glpIf.enabled ? {
        ...f.titrationVisit,
        weightKg: +f.titrationVisit.weightKg || undefined,
        lastVisitWeightKg: +f.titrationVisit.lastVisitWeightKg || undefined,
        baselineWeightKg: +f.titrationVisit.baselineWeightKg || undefined,
        lastHbA1c: +f.titrationVisit.lastHbA1c || undefined,
        nvGrade: +f.titrationVisit.nvGrade || 0,
        previousDose: +f.titrationVisit.previousDose || undefined
      } : undefined
    };

    // Visit-to-visit lookup: find the last archived plan for this same name.
    try {
      const uid = auth?.currentUser?.uid;
      if (uid && base.name) {
        const prev = await findByName(uid, base.name);
        if (prev) base.previousVisit = prev;
      }
    } catch { /* ignore — trend is best-effort */ }

    return base;
  };

  const submit = async () => {
    setError(null);
    setWorking(true);
    try {
      const data = await payload();
      const plan = generatePlan(data);
      setPlan(plan);
      router.push("/plan-preview");
    } catch (e) {
      setError(e.message || "Failed to generate plan");
    } finally {
      setWorking(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* ===== Demographics ===== */}
      <Text style={styles.section}>Demographics & Anthropometry</Text>
      <Field label="Patient name">
        <Txt value={f.name} onChange={(v) => update("name", v)} placeholder="Full name" />
      </Field>
      <View style={styles.row}>
        <Field label="Age (yrs)"><Num value={f.age} onChange={(v) => update("age", v)} /></Field>
        <Field label="Sex">
          <Picker value={f.sex} onChange={(v) => update("sex", v)} options={[{v:"M",l:"M"},{v:"F",l:"F"}]} />
        </Field>
      </View>
      <View style={styles.row}>
        <Field label="Weight (kg)"><Num value={f.weight} onChange={(v) => update("weight", v)} /></Field>
        <Field label="Height (cm)"><Num value={f.height} onChange={(v) => update("height", v)} /></Field>
        <Field label="Waist (cm)"><Num value={f.waist} onChange={(v) => update("waist", v)} /></Field>
      </View>
      <Field label="Activity level">
        <Picker value={f.activityLevel} onChange={(v) => update("activityLevel", v)} options={ACTIVITIES} />
      </Field>
      <Field label="Diet type">
        <Picker value={f.vegetarian ? "veg" : "nonveg"}
          onChange={(v) => update("vegetarian", v === "veg")}
          options={[{v:"veg",l:"Vegetarian"},{v:"nonveg",l:"Non-vegetarian"}]} />
      </Field>
      <Field label="Cuisine preference">
        <Picker
          value={f.cuisine}
          onChange={(v) => update("cuisine", v)}
          options={CUISINES.map((c) => ({ v: c.id, l: c.label }))}
        />
      </Field>
      <Field label="Dietary observance">
        <Picker
          value={f.dietaryOverlay}
          onChange={(v) => update("dietaryOverlay", v)}
          options={OVERLAYS.map((o) => ({ v: o.id, l: o.label }))}
        />
      </Field>
      <Field label="PDF language">
        <Picker
          value={f.language}
          onChange={(v) => update("language", v)}
          options={LANGUAGES.map((l) => ({ v: l.id, l: l.label }))}
        />
      </Field>
      <View style={styles.row}>
        <Field label="SBP (mmHg)"><Num value={f.sbp} onChange={(v) => update("sbp", v)} /></Field>
        <Field label="DBP (mmHg)"><Num value={f.dbp} onChange={(v) => update("dbp", v)} /></Field>
      </View>

      {/* ===== Paste labs quick-fill ===== */}
      <Text style={styles.section}>Paste lab report (optional)</Text>
      <Field label="Paste the raw report text; tap ‘Auto-fill’ to extract HbA1c, FBS, lipids, etc.">
        <Area value={f.labPasteText} onChange={(v) => update("labPasteText", v)}
          placeholder={"e.g. HbA1c: 7.4 %\nFBS: 132 mg/dL\nLDL: 110\n…"}
          height={100} />
      </Field>
      <Pressable onPress={pasteLabs} style={styles.secondary}>
        <Text style={styles.secondaryText}>Auto-fill from pasted text</Text>
      </Pressable>

      {/* ===== Glycemic ===== */}
      <Text style={styles.section}>Glycemic profile</Text>
      <View style={styles.row}>
        <Field label="HbA1c (%)"><Num value={f.hba1c} onChange={(v) => update("hba1c", v)} /></Field>
        <Field label="FBS (mg/dL)"><Num value={f.fbs} onChange={(v) => update("fbs", v)} /></Field>
        <Field label="PPBS (mg/dL)"><Num value={f.ppbs} onChange={(v) => update("ppbs", v)} /></Field>
      </View>

      {/* ===== Lipids ===== */}
      <Text style={styles.section}>Lipid profile</Text>
      <View style={styles.row}>
        <Field label="LDL"><Num value={f.ldl} onChange={(v) => update("ldl", v)} /></Field>
        <Field label="HDL"><Num value={f.hdl} onChange={(v) => update("hdl", v)} /></Field>
        <Field label="TG"><Num value={f.tg} onChange={(v) => update("tg", v)} /></Field>
        <Field label="TC"><Num value={f.totalCholesterol} onChange={(v) => update("totalCholesterol", v)} /></Field>
      </View>

      {/* ===== Renal / Heme ===== */}
      <Text style={styles.section}>Renal / Hematology</Text>
      <View style={styles.row}>
        <Field label="Hb (g/dL)"><Num value={f.hb} onChange={(v) => update("hb", v)} /></Field>
        <Field label="S.Creat (mg/dL)"><Num value={f.serumCreatinine} onChange={(v) => update("serumCreatinine", v)} /></Field>
        <Field label="eGFR (if known)"><Num value={f.egfr} onChange={(v) => update("egfr", v)} /></Field>
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>On dialysis</Text>
        <Switch value={f.onDialysis} onValueChange={(v) => update("onDialysis", v)}
          trackColor={{ false: "#ccc", true: "#0B6E4F" }} thumbColor="#fff" />
      </View>

      {/* ===== Pregnancy ===== */}
      <Text style={styles.section}>Pregnancy (if applicable)</Text>
      <Field label="Trimester">
        <Picker value={f.trimester} onChange={(v) => update("trimester", v)}
          options={[{v:1,l:"First"},{v:2,l:"Second"},{v:3,l:"Third"}]} />
      </Field>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>GDM</Text>
        <Switch value={f.gdm} onValueChange={(v) => update("gdm", v)}
          trackColor={{ false: "#ccc", true: "#0B6E4F" }} thumbColor="#fff" />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Lactating</Text>
        <Switch value={f.lactating} onValueChange={(v) => update("lactating", v)}
          trackColor={{ false: "#ccc", true: "#0B6E4F" }} thumbColor="#fff" />
      </View>

      {/* ===== Cardiac ===== */}
      <Text style={styles.section}>Cardiac (if applicable)</Text>
      <Field label="NYHA class">
        <Picker value={f.nyhaClass} onChange={(v) => update("nyhaClass", v)}
          options={[{v:"I",l:"I"},{v:"II",l:"II"},{v:"III",l:"III"},{v:"IV",l:"IV"}]} />
      </Field>

      {/* ===== Conditions ===== */}
      <Text style={styles.section}>Conditions (select all that apply)</Text>
      <View style={styles.conditionGrid}>
        {CONDITIONS.map((c) => {
          const on = f.conditions.includes(c.id);
          return (
            <Pressable
              key={c.id}
              onPress={() => toggleCondition(c.id)}
              style={[styles.conditionPill, on && styles.conditionPillOn]}
            >
              <Text style={[styles.conditionText, on && styles.conditionTextOn]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ===== Current medications ===== */}
      <Text style={styles.section}>Current medications (tap all that apply)</Text>
      <MultiPicker
        values={f.medications}
        onToggle={toggleIn("medications")}
        options={Object.entries(DRUG_RULES).map(([v, r]) => ({ v, l: r.label }))}
      />

      {/* ===== Allergies ===== */}
      <Text style={styles.section}>Food allergies / intolerances</Text>
      <MultiPicker
        values={f.allergies}
        onToggle={toggleIn("allergies")}
        options={Object.entries(ALLERGY_RULES).map(([v, r]) => ({ v, l: r.label }))}
      />

      {/* ===== GLP-1 / GIP agonist + IF ===== */}
      <Text style={styles.section}>GLP-1 / GIP agonist + Intermittent Fasting</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Enable GLP-1 + IF plan</Text>
        <Switch
          value={f.glpIf.enabled}
          onValueChange={(v) => updateGlpIf("enabled", v)}
          trackColor={{ false: "#ccc", true: "#0B6E4F" }}
          thumbColor="#fff"
        />
      </View>

      {f.glpIf.enabled ? (
        <>
          <Field label="Medication">
            <Picker
              value={f.glpIf.drug}
              onChange={(v) => updateGlpIf("drug", v)}
              options={GLP_DRUG_LIST.map((d) => ({ v: d.value, l: d.label }))}
            />
          </Field>
          <View style={styles.row}>
            <Field label="Current dose (mg)">
              <Num
                value={f.glpIf.dose}
                onChange={(v) => updateGlpIf("dose", v)}
                placeholder="e.g. 1.0"
              />
            </Field>
            <Field label="Injection / dose day (weekly agents)">
              <Picker
                value={f.glpIf.doseDay}
                onChange={(v) => updateGlpIf("doseDay", v)}
                options={[
                  { v: "mon", l: "Mon" }, { v: "tue", l: "Tue" }, { v: "wed", l: "Wed" },
                  { v: "thu", l: "Thu" }, { v: "fri", l: "Fri" }, { v: "sat", l: "Sat" },
                  { v: "sun", l: "Sun" }
                ]}
              />
            </Field>
          </View>
          <Field label="Fasting protocol">
            <Picker
              value={f.glpIf.ifProtocol}
              onChange={(v) => updateGlpIf("ifProtocol", v)}
              options={IF_LIST.map((p) => ({ v: p.value, l: p.label }))}
            />
          </Field>
          <View style={styles.row}>
            <Field label="Eating window start (HH:MM, optional)">
              <Txt
                value={f.glpIf.eatingWindowStart}
                onChange={(v) => updateGlpIf("eatingWindowStart", v)}
                placeholder="12:00"
              />
            </Field>
            <Field label="Eating window end (HH:MM, optional)">
              <Txt
                value={f.glpIf.eatingWindowEnd}
                onChange={(v) => updateGlpIf("eatingWindowEnd", v)}
                placeholder="20:00"
              />
            </Field>
          </View>

          <Text style={styles.subsection}>Contraindications (any ✓ blocks initiation)</Text>
          <View style={styles.conditionGrid}>
            {[
              ["mtcHistory", "Personal h/o MTC"],
              ["men2", "MEN-2 syndrome"],
              ["pregnancy", "Pregnant"],
              ["lactation", "Lactating"],
              ["gastroparesis", "Severe gastroparesis"],
              ["pancreatitisActive", "Active pancreatitis"]
            ].map(([id, label]) => {
              const on = f.glpFlags[id];
              return (
                <Pressable
                  key={id}
                  onPress={() => toggleGlpFlag(id)}
                  style={[styles.flagPill, on && styles.flagPillDangerOn]}
                >
                  <Text style={[styles.flagText, on && styles.flagTextOn]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.subsection}>Cautions (dose-adjust / monitor)</Text>
          <View style={styles.conditionGrid}>
            {[
              ["pancreatitisHx", "Pancreatitis history"],
              ["gallbladderDisease", "Gallbladder disease"],
              ["t1dm", "Type 1 DM"],
              ["retinopathyProliferative", "Proliferative retinopathy"],
              ["eatingDisorderHx", "Eating disorder history"]
            ].map(([id, label]) => {
              const on = f.glpFlags[id];
              return (
                <Pressable
                  key={id}
                  onPress={() => toggleGlpFlag(id)}
                  style={[styles.flagPill, on && styles.flagPillWarnOn]}
                >
                  <Text style={[styles.flagText, on && styles.flagTextOn]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* ===== Titration follow-up (sema SC + rybelsus only) ===== */}
          {(f.glpIf.drug === "semaglutide" || f.glpIf.drug === "rybelsus") ? (
            <>
              <Text style={styles.subsection}>
                Titration follow-up visit — leave blank for initiation
              </Text>
              <View style={styles.row}>
                <Field label="Current dose started on (YYYY-MM-DD)">
                  <Txt
                    value={f.titrationVisit.startedDate}
                    onChange={(v) => updateTitration("startedDate", v)}
                    placeholder="e.g. 2026-03-26"
                  />
                </Field>
                <Field label="Previous ladder dose (mg)">
                  <Num
                    value={f.titrationVisit.previousDose}
                    onChange={(v) => updateTitration("previousDose", v)}
                    placeholder="e.g. 0.5"
                  />
                </Field>
              </View>
              <View style={styles.row}>
                <Field label="Today's weight (kg)">
                  <Num
                    value={f.titrationVisit.weightKg}
                    onChange={(v) => updateTitration("weightKg", v)}
                    placeholder="e.g. 78.2"
                  />
                </Field>
                <Field label="Last visit weight (kg)">
                  <Num
                    value={f.titrationVisit.lastVisitWeightKg}
                    onChange={(v) => updateTitration("lastVisitWeightKg", v)}
                    placeholder="e.g. 80.1"
                  />
                </Field>
              </View>
              <View style={styles.row}>
                <Field label="Last visit date (YYYY-MM-DD)">
                  <Txt
                    value={f.titrationVisit.lastVisitDate}
                    onChange={(v) => updateTitration("lastVisitDate", v)}
                    placeholder="e.g. 2026-03-26"
                  />
                </Field>
                <Field label="Baseline weight at GLP-1 start (kg)">
                  <Num
                    value={f.titrationVisit.baselineWeightKg}
                    onChange={(v) => updateTitration("baselineWeightKg", v)}
                    placeholder="e.g. 92.0"
                  />
                </Field>
              </View>
              <View style={styles.row}>
                <Field label="Today's / recent HbA1c (%)">
                  <Num
                    value={f.titrationVisit.lastHbA1c}
                    onChange={(v) => updateTitration("lastHbA1c", v)}
                    placeholder="e.g. 6.8"
                  />
                </Field>
                <Field label="N / V grade (CTCAE 0-3)">
                  <Picker
                    value={String(f.titrationVisit.nvGrade)}
                    onChange={(v) => updateTitration("nvGrade", Number(v))}
                    options={[
                      { v: "0", l: "0 — none" },
                      { v: "1", l: "1 — mild" },
                      { v: "2", l: "2 — moderate" },
                      { v: "3", l: "3 — severe" }
                    ]}
                  />
                </Field>
              </View>

              <Text style={styles.subsection}>Red flags (any ✓ triggers reduce / stop)</Text>
              <View style={styles.conditionGrid}>
                {[
                  ["pancreatitisSigns", "Pancreatitis signs"],
                  ["gallbladderSx", "RUQ pain / gallbladder sx"],
                  ["severeDehydration", "Severe dehydration / AKI"]
                ].map(([id, label]) => {
                  const on = f.titrationVisit[id];
                  return (
                    <Pressable
                      key={id}
                      onPress={() => toggleTitrationFlag(id)}
                      style={[styles.flagPill, on && styles.flagPillDangerOn]}
                    >
                      <Text style={[styles.flagText, on && styles.flagTextOn]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Target achieved (maintenance hold)</Text>
                <Switch
                  value={f.titrationVisit.targetAchieved}
                  onValueChange={(v) => updateTitration("targetAchieved", v)}
                  trackColor={{ false: "#ccc", true: "#0B6E4F" }}
                  thumbColor="#fff"
                />
              </View>
            </>
          ) : null}
        </>
      ) : null}

      {/* ===== Follow-up & notes ===== */}
      <Text style={styles.section}>Follow-up & clinical notes</Text>
      <Field label="Next follow-up date (YYYY-MM-DD)">
        <Txt value={f.followUpDate} onChange={(v) => update("followUpDate", v)} placeholder="e.g. 2026-05-20" />
      </Field>
      <Field label="Doctor's notes for this patient (printed on PDF)">
        <Area value={f.doctorNotes} onChange={(v) => update("doctorNotes", v)}
          placeholder="e.g. Titrate metformin to 1000 mg BD after 2 weeks. Reassess creatinine at follow-up." />
      </Field>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={submit}
          disabled={!canSubmit || working}
          style={[styles.primary, (!canSubmit || working) && { opacity: 0.5 }]}
        >
          <Text style={styles.primaryText}>{working ? "Generating…" : "Generate Plan"}</Text>
        </Pressable>
        <Pressable onPress={() => setF(EMPTY)} style={styles.resetBtn}>
          <Text style={styles.resetText}>Reset form</Text>
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16 },
  section: {
    fontSize: 14, fontWeight: "700", color: "#0B6E4F",
    marginTop: 20, marginBottom: 8,
    borderBottomWidth: 2, borderBottomColor: "#F4A261", paddingBottom: 4
  },
  field: { flex: 1, marginBottom: 10, marginRight: 8 },
  fieldLabel: { fontSize: 11, color: "#14213D", marginBottom: 4, fontWeight: "600" },
  input: {
    borderWidth: 1, borderColor: "#ccc", borderRadius: 6,
    padding: 10, fontSize: 14, color: "#14213D", backgroundColor: "#fafafa"
  },
  row: { flexDirection: "row", flexWrap: "wrap" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "#ccc", borderRadius: 20, backgroundColor: "#fafafa",
    marginRight: 6, marginBottom: 6
  },
  pillOn: { backgroundColor: "#0B6E4F", borderColor: "#0B6E4F" },
  pillText: { fontSize: 12, color: "#14213D" },
  pillTextOn: { color: "#fff", fontWeight: "600" },
  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, paddingHorizontal: 4
  },
  switchLabel: { fontSize: 13, color: "#14213D" },
  conditionGrid: { flexDirection: "row", flexWrap: "wrap" },
  conditionPill: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#0B6E4F", borderRadius: 20,
    marginRight: 8, marginBottom: 8, backgroundColor: "#fff"
  },
  conditionPillOn: { backgroundColor: "#0B6E4F" },
  conditionText: { color: "#0B6E4F", fontSize: 12, fontWeight: "600" },
  conditionTextOn: { color: "#fff" },
  subsection: {
    fontSize: 12, fontWeight: "700", color: "#14213D",
    marginTop: 10, marginBottom: 6
  },
  flagPill: {
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: "#ccc", borderRadius: 16,
    backgroundColor: "#fafafa", marginRight: 6, marginBottom: 6
  },
  flagPillDangerOn: { backgroundColor: "#B23A48", borderColor: "#B23A48" },
  flagPillWarnOn:   { backgroundColor: "#E0A000", borderColor: "#E0A000" },
  flagText:   { fontSize: 11, color: "#14213D" },
  flagTextOn: { color: "#fff", fontWeight: "600" },
  actions: { marginTop: 16 },
  primary: { backgroundColor: "#0B6E4F", paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondary: {
    marginTop: 6, borderWidth: 1, borderColor: "#0B6E4F",
    paddingVertical: 10, borderRadius: 6, alignItems: "center", backgroundColor: "#E9F5F0"
  },
  secondaryText: { color: "#0B6E4F", fontWeight: "700", fontSize: 13 },
  resetBtn: { marginTop: 12, alignSelf: "center" },
  resetText: { color: "#555", fontSize: 12 },
  error: { color: "#B23A48", marginTop: 10, fontSize: 13 }
});
