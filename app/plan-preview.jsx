/**
 * Plan preview — summary card, then "Generate PDF" button which:
 *   1. Renders HTML from src/pdf/buildHtml.js
 *   2. Calls expo-print.printToFileAsync → local PDF file URI
 *   3. Opens the device share sheet (WhatsApp, email, Drive, print, etc.)
 *
 * No cloud archive. The PDF exists on device just long enough for the doctor
 * to share it with the patient; then it's the patient's copy. If the doctor
 * needs a new plan later, they re-enter the labs — that's explicit policy.
 */
import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { buildHtml } from "../src/pdf/buildHtml";
import { usePlan } from "./_layout";
import { useRouter } from "expo-router";
import { savePlan } from "../src/storage/archive";
import { auth } from "../src/firebase/config";

export default function PlanPreviewScreen() {
  const { plan } = usePlan();
  const router = useRouter();
  const [working, setWorking] = useState(false);

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyMsg}>No plan to preview. Generate one first.</Text>
        <Pressable style={styles.primary} onPress={() => router.replace("/patient-form")}>
          <Text style={styles.primaryText}>New patient</Text>
        </Pressable>
      </View>
    );
  }

  const t = plan.targets || {};
  const m = t.macros || {};
  const c = plan.calculators || {};
  const ix = plan.interactions || { drugItems: [], allergyItems: [] };
  const ov = plan.overlay || { id: "none", notes: [] };

  const exportPdf = async () => {
    setWorking(true);
    try {
      // 1. HTML → PDF (local file URI)
      const html = buildHtml(plan);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      // 2. Archive this patient's plan locally (cap 10, per doctor).
      //    Best-effort — don't block PDF share if storage fails.
      try {
        await savePlan(auth.currentUser?.uid, plan);
      } catch (err) {
        console.warn("Archive save failed:", err?.message);
      }

      // 3. Offer the system share sheet (WhatsApp, email, Drive, print)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Diet plan PDF",
          UTI: "com.adobe.pdf"
        });
      } else {
        Alert.alert("PDF ready", `Saved to: ${uri}`);
      }
    } catch (e) {
      Alert.alert("PDF export failed", e.message);
    } finally {
      setWorking(false);
    }
  };

  // Meal-slot preview works for both the legacy planner (day.meals[slot]) and
  // the cuisine templates (day[slot] flat string).
  const slotPreview = (day, slot) => {
    const legacy = day?.meals?.[slot];
    if (Array.isArray(legacy) && legacy.length) {
      return legacy.map((i) => i.food).join(", ");
    }
    return day?.[slot] || "—";
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.name}>{plan.patient?.name || "Patient"}</Text>
        <Text style={styles.meta}>
          {plan.patient?.age} / {plan.patient?.sex} · {(plan.patient?.conditions || []).join(", ") || "No conditions"}
        </Text>
        <Text style={styles.meta}>
          Cuisine: {cuisineLabel(plan.patient?.cuisine)}
          {ov.id && ov.id !== "none" ? "  ·  " + overlayLabel(ov.id) : ""}
        </Text>
        {plan.followUpDate ? (
          <Text style={styles.meta}>Next follow-up: {plan.followUpDate}</Text>
        ) : null}
      </View>

      {plan.trend && plan.trend.rows?.length ? (
        <Section title="Visit-to-Visit Trend">
          {plan.trend.rows.map((r, i) => (
            <View key={i} style={styles.kvRow}>
              <Text style={styles.kvK}>{r.label}</Text>
              <Text style={styles.kvV}>
                {r.previous == null ? "—" : r.previous} → {r.current == null ? "—" : r.current}
                {r.delta != null ? `   (${r.delta > 0 ? "+" : ""}${Number(r.delta).toFixed(1)})` : ""}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      {(ix.drugItems?.length || ix.allergyItems?.length) ? (
        <Section title="Clinical Warnings" color="#B23A48">
          {ix.drugItems.map((d, i) => (
            <View key={`d${i}`} style={{ marginBottom: 6 }}>
              <Text style={styles.ixDrug}>{d.drug}</Text>
              {d.warnings.map((w, k) => (
                <Text key={k} style={[styles.bullet, { color: "#14213D" }]}>• {w}</Text>
              ))}
            </View>
          ))}
          {ix.allergyItems.map((a, i) => (
            <View key={`a${i}`} style={{ marginBottom: 6 }}>
              <Text style={[styles.ixDrug, { color: "#B23A48" }]}>{a.allergy} — avoid</Text>
              <Text style={[styles.bullet, { color: "#14213D" }]}>
                {a.avoid.join(", ")}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      {ov.id && ov.id !== "none" && Array.isArray(ov.notes) && ov.notes.length ? (
        <Section title={"Dietary Observance — " + overlayLabel(ov.id)}>
          {ov.notes.map((n, i) => (
            <Text key={i} style={styles.bullet}>• {n}</Text>
          ))}
        </Section>
      ) : null}

      {plan.glpIf && plan.glpIf.enabled ? renderGlpIfCard(plan.glpIf) : null}

      <Section title="Calculators">
        <KV k="BMI" v={c.bmi} />
        <KV k="BMR" v={`${c.bmr || "—"} kcal`} />
        <KV k="TDEE" v={`${c.tdee || "—"} kcal`} />
        <KV k="eGFR" v={c.egfr == null ? "—" : `${c.egfr} mL/min/1.73m²`} />
      </Section>

      <Section title="Daily Targets">
        <KV k="Energy" v={`${t.kcal || "—"} kcal`} />
        <KV k="Carbs" v={`${m.carbG || "—"} g`} />
        <KV k="Protein" v={`${m.proteinG || "—"} g`} />
        <KV k="Fat" v={`${m.fatG || "—"} g`} />
        {t.sodiumMaxMgPerDay ? <KV k="Sodium (max)" v={`${t.sodiumMaxMgPerDay} mg`} /> : null}
        {t.potassiumMaxMgPerDay ? <KV k="Potassium (max)" v={`${t.potassiumMaxMgPerDay} mg`} /> : null}
        {t.phosphorusMaxMgPerDay ? <KV k="Phosphorus (max)" v={`${t.phosphorusMaxMgPerDay} mg`} /> : null}
        {t.fluidMaxMlPerDay ? <KV k="Fluid (max)" v={`${t.fluidMaxMlPerDay} ml`} /> : null}
      </Section>

      <Section title="Clinical Rules">
        {(plan.rules || []).map((r, i) => (
          <Text key={i} style={styles.bullet}>• {r}</Text>
        ))}
      </Section>

      <Section title="DO's" color="#0B6E4F">
        {(plan.doList || []).map((x, i) => (
          <Text key={i} style={[styles.bullet, { color: "#0B6E4F" }]}>✔ {x}</Text>
        ))}
      </Section>

      <Section title="DON'Ts" color="#B23A48">
        {(plan.dontList || []).map((x, i) => (
          <Text key={i} style={[styles.bullet, { color: "#B23A48" }]}>✘ {x}</Text>
        ))}
      </Section>

      <Section title="7-Day Meal Plan (Preview)">
        {(plan.mealPlan || []).slice(0, 2).map((d, idx) => (
          <View key={d.day || idx} style={{ marginBottom: 10 }}>
            <Text style={styles.dayHeading}>{d.day || `Day ${idx + 1}`}</Text>
            {["breakfast", "lunch", "dinner"].map((slot) => (
              <Text key={slot} style={styles.dayLine}>
                <Text style={{ fontWeight: "700" }}>{slot[0].toUpperCase() + slot.slice(1)}: </Text>
                {slotPreview(d, slot)}
              </Text>
            ))}
          </View>
        ))}
        <Text style={styles.previewNote}>Full 7-day plan included in the PDF.</Text>
      </Section>

      {Array.isArray(plan.shoppingList) && plan.shoppingList.length ? (
        <Section title="Weekly Shopping List (Preview)">
          {plan.shoppingList.slice(0, 4).map((b, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              <Text style={styles.aisle}>{b.aisle}</Text>
              <Text style={styles.dayLine}>{b.items.join(" · ")}</Text>
            </View>
          ))}
          {plan.shoppingList.length > 4 ? (
            <Text style={styles.previewNote}>+ {plan.shoppingList.length - 4} more aisles in the PDF.</Text>
          ) : null}
        </Section>
      ) : null}

      {plan.doctorNotes ? (
        <Section title="Doctor's Notes">
          <Text style={styles.bullet}>{plan.doctorNotes}</Text>
        </Section>
      ) : null}

      {plan.stamp ? (
        <Text style={styles.stamp}>
          Plan ID {plan.stamp.planId}  ·  v{plan.stamp.appVersion} ({plan.stamp.rulesetDate})
        </Text>
      ) : null}

      <Pressable
        style={[styles.primary, working && { opacity: 0.5 }]}
        disabled={working}
        onPress={exportPdf}
      >
        {working ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.primaryText}>Generate &amp; Share PDF</Text>
        )}
      </Pressable>

      <Pressable style={styles.secondary} onPress={() => router.replace("/patient-form")}>
        <Text style={styles.secondaryText}>New patient</Text>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ---------- Tiny presentational helpers ----------
const Section = ({ title, children, color }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, color && { color }]}>{title}</Text>
    {children}
  </View>
);
const KV = ({ k, v }) => (
  <View style={styles.kvRow}>
    <Text style={styles.kvK}>{k}</Text>
    <Text style={styles.kvV}>{String(v ?? "—")}</Text>
  </View>
);

function cuisineLabel(id) {
  const map = {
    "general": "General Indian",
    "north-indian": "North Indian",
    "maharashtrian": "Maharashtrian",
    "gujarati": "Gujarati",
    "south-indian": "South Indian",
    "bengali": "Bengali"
  };
  return map[id] || "General Indian";
}

function overlayLabel(id) {
  const map = { none: "—", jain: "Jain", satvik: "Satvik", navratri: "Navratri", ramadan: "Ramadan" };
  return map[id] || "—";
}

function dayLabelFull(key) {
  const m = { mon:"Monday", tue:"Tuesday", wed:"Wednesday", thu:"Thursday", fri:"Friday", sat:"Saturday", sun:"Sunday" };
  return m[key] || key || "—";
}

function renderGlpIfCard(glpIf) {
  const safety = glpIf.safety || {};
  const drugLabel = (glpIf.drugMeta && glpIf.drugMeta.label) || glpIf.drug || "—";
  const doseUnit  = (glpIf.drugMeta && glpIf.drugMeta.doseUnit) || "mg";
  const ifLabel   = (glpIf.ifMeta && glpIf.ifMeta.label) || glpIf.ifProtocol || "—";
  const windowStr = glpIf.window && glpIf.window.start && glpIf.window.end
    ? `${glpIf.window.start} – ${glpIf.window.end}`
    : "—";

  if (safety.contraindicated) {
    return (
      <View style={[styles.section, { backgroundColor: "#fdecee", borderLeftWidth: 4, borderLeftColor: "#B23A48" }]}>
        <Text style={[styles.sectionTitle, { color: "#B23A48" }]}>
          ⛔ GLP-1 / GIP Agonist — Contraindicated
        </Text>
        {(safety.reasons || []).map((r, i) => (
          <Text key={i} style={[styles.bullet, { color: "#B23A48" }]}>• {r}</Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>GLP-1 / GIP Agonist + Intermittent Fasting</Text>
      <View style={styles.kvRow}>
        <Text style={styles.kvK}>Medication</Text>
        <Text style={styles.kvV}>{drugLabel}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvK}>Dose</Text>
        <Text style={styles.kvV}>{glpIf.dose ? `${glpIf.dose} ${doseUnit}` : "—"}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvK}>Dose day</Text>
        <Text style={styles.kvV}>{dayLabelFull(glpIf.doseDay)}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvK}>Fasting protocol</Text>
        <Text style={styles.kvV}>{ifLabel}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvK}>Eating window</Text>
        <Text style={styles.kvV}>{windowStr}</Text>
      </View>
      {glpIf.drugMeta && glpIf.drugMeta.typicalWeightLoss ? (
        <View style={styles.kvRow}>
          <Text style={styles.kvK}>Expected wt-loss</Text>
          <Text style={styles.kvV}>{glpIf.drugMeta.typicalWeightLoss}</Text>
        </View>
      ) : null}
      {Array.isArray(safety.warnings) && safety.warnings.length ? (
        <View style={{ marginTop: 8, padding: 8, backgroundColor: "#fff8e6", borderLeftWidth: 3, borderLeftColor: "#E0A000", borderRadius: 4 }}>
          <Text style={{ fontWeight: "700", color: "#7a5a00", fontSize: 12, marginBottom: 4 }}>
            ⚠ Monitor / Adjust
          </Text>
          {safety.warnings.map((w, i) => (
            <Text key={i} style={[styles.bullet, { color: "#7a5a00" }]}>• {w}</Text>
          ))}
        </View>
      ) : null}
      <Text style={styles.previewNote}>Full dose-phase schedule, macro targets, counselling and references included in the PDF.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  emptyMsg: { marginBottom: 20, color: "#14213D", fontSize: 14 },

  header: {
    backgroundColor: "#0B6E4F",
    padding: 14,
    borderRadius: 8,
    marginBottom: 12
  },
  name: { color: "#fff", fontSize: 18, fontWeight: "700" },
  meta: { color: "#E9F5F0", fontSize: 12, marginTop: 4 },

  section: { marginBottom: 14, padding: 12, backgroundColor: "#E9F5F0", borderRadius: 6 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#0B6E4F", marginBottom: 6 },
  kvRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  kvK: { color: "#14213D", fontWeight: "600", fontSize: 12 },
  kvV: { color: "#14213D", fontSize: 12 },
  bullet: { color: "#14213D", fontSize: 12, marginVertical: 2, lineHeight: 18 },
  dayHeading: { color: "#0B6E4F", fontWeight: "700", fontSize: 13, marginBottom: 4 },
  dayLine: { color: "#14213D", fontSize: 11, marginBottom: 2, lineHeight: 16 },
  previewNote: { color: "#555", fontSize: 11, fontStyle: "italic", marginTop: 4 },
  aisle: { color: "#0B6E4F", fontWeight: "700", fontSize: 12, marginTop: 2 },
  ixDrug: { color: "#0B6E4F", fontWeight: "700", fontSize: 12, marginBottom: 2 },
  stamp: { color: "#666", fontSize: 10, textAlign: "center", marginVertical: 8 },

  primary: { backgroundColor: "#0B6E4F", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondary: { marginTop: 10, paddingVertical: 12, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#0B6E4F" },
  secondaryText: { color: "#0B6E4F", fontWeight: "600", fontSize: 14 }
});
