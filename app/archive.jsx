/**
 * Patient archive screen — shows the last 10 plans this doctor has generated
 * on THIS device. Tap a row to re-open the plan (re-shares the PDF without
 * re-entering labs). Swipe/long-press reveals delete.
 *
 * Archive lives in AsyncStorage, keyed by the signed-in doctor's Firebase UID.
 * Cap is enforced at write time by src/storage/archive.js (FIFO, 10 entries).
 */
import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet, Alert, ActivityIndicator
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { auth } from "../src/firebase/config";
import { listArchive, deleteEntry, ARCHIVE_CAP } from "../src/storage/archive";
import { usePlan } from "./_layout";

export default function ArchiveScreen() {
  const router = useRouter();
  const { setPlan } = usePlan();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const uid = auth.currentUser?.uid;
    const list = await listArchive(uid);
    setEntries(list);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const openEntry = (entry) => {
    setPlan(entry.plan);
    router.push("/plan-preview");
  };

  const removeEntry = (entry) => {
    Alert.alert(
      "Delete archived plan?",
      `Remove ${entry.name} from archive? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const uid = auth.currentUser?.uid;
            await deleteEntry(uid, entry.id);
            reload();
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0B6E4F" size="large" />
      </View>
    );
  }

  if (!entries.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No archived patients yet.</Text>
        <Text style={styles.emptySub}>
          Plans you generate are saved here automatically (last {ARCHIVE_CAP} only).
        </Text>
        <Pressable style={styles.primary} onPress={() => router.replace("/patient-form")}>
          <Text style={styles.primaryText}>+ New patient</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {entries.length} of {ARCHIVE_CAP} slots used
      </Text>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
            onPress={() => openEntry(item)}
            onLongPress={() => removeEntry(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.age ?? "—"} / {item.sex ?? "—"}
                {item.conditions?.length ? " · " + item.conditions.join(", ") : ""}
              </Text>
              <Text style={styles.date}>
                Saved {new Date(item.savedAt).toLocaleString("en-IN")}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
      <Text style={styles.hint}>Long-press a row to delete.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E9F5F0" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#E9F5F0", padding: 24 },
  header: { padding: 12, fontSize: 12, color: "#14213D", fontWeight: "600", textAlign: "center", backgroundColor: "#fff" },
  row: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  name: { fontSize: 16, fontWeight: "700", color: "#0B6E4F" },
  meta: { fontSize: 12, color: "#14213D", marginTop: 2 },
  date: { fontSize: 11, color: "#555", marginTop: 4 },
  chevron: { fontSize: 28, color: "#0B6E4F", fontWeight: "300", marginLeft: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#14213D", marginBottom: 8, textAlign: "center" },
  emptySub: { fontSize: 12, color: "#555", marginBottom: 20, textAlign: "center", lineHeight: 18 },
  primary: { backgroundColor: "#0B6E4F", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  hint: { textAlign: "center", fontSize: 11, color: "#555", padding: 10 }
});
