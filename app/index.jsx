/**
 * Home screen (post-login). Doctor chooses to create a new patient plan or
 * sign out. (History/archive list could be added later by listing
 * firebase Storage at /plans/{uid}/).
 */
import React from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../src/firebase/config";

export default function HomeScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const doSignOut = () => {
    Alert.alert("Sign out", "Confirm sign-out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut(auth) }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.greet}>
        <Text style={styles.hi}>Hello, Dr. Vivek Raskar</Text>
        <Text style={styles.sub}>{user?.email}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/patient-form")}
      >
        <Text style={styles.primaryText}>+ New patient plan</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/archive")}
      >
        <Text style={styles.secondaryText}>Patient archive (last 10)</Text>
      </Pressable>

      <Pressable onPress={doSignOut} style={styles.signoutBtn}>
        <Text style={styles.signoutText}>Sign out</Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        Decision-support only. All generated plans must be reviewed by a licensed clinician.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E9F5F0", padding: 24 },
  greet: { marginTop: 20, marginBottom: 40 },
  hi: { fontSize: 22, fontWeight: "700", color: "#14213D" },
  sub: { fontSize: 13, color: "#555", marginTop: 4 },
  primary: {
    backgroundColor: "#0B6E4F",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondary: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0B6E4F"
  },
  secondaryText: { color: "#0B6E4F", fontSize: 15, fontWeight: "600" },
  signoutBtn: { marginTop: 30, alignSelf: "center" },
  signoutText: { color: "#B23A48", fontSize: 14 },
  disclaimer: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    color: "#555",
    fontSize: 10,
    textAlign: "center"
  }
});
