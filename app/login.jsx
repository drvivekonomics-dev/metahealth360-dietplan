/**
 * Login screen — Firebase Email + Password auth.
 *
 * Why email/password instead of Google sign-in:
 *   Google OAuth in Expo Go requires redirect-URI registration in Google Cloud
 *   Console + published consent screen + SHA-1 fingerprint for the APK. That
 *   configuration can be done later; right now we need a sign-in that works
 *   out of the box so the rest of the app is testable.
 *
 *   Firebase "Email/Password" provider is a single toggle in the Firebase
 *   console and has no external OAuth plumbing.
 *
 * Modes:
 *   - "Sign in" (default) — signInWithEmailAndPassword
 *   - "Create account" — createUserWithEmailAndPassword
 *   Users toggle between them on this screen.
 *
 * Google sign-in can be added back later as an ADDITIONAL option once the
 * OAuth client is properly configured. The original implementation is preserved
 * in git history.
 */
import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from "react-native";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../src/firebase/config";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      Alert.alert("Missing fields", "Enter both email and password.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, e, password);
      } else {
        await createUserWithEmailAndPassword(auth, e, password);
      }
    } catch (err) {
      const msg = humanise(err.code) || err.message;
      Alert.alert(mode === "signin" ? "Sign-in failed" : "Sign-up failed", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>MetaHealth360</Text>
        <Text style={styles.tagline}>Precision Nutrition for Metabolic Health</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {mode === "signin" ? "Doctor Sign In" : "Create Doctor Account"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9AA3B2"
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9AA3B2"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && { opacity: 0.7 }]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {mode === "signin" ? "Sign In" : "Create Account"}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
          <Text style={styles.switchText}>
            {mode === "signin"
              ? "No account yet? Create one"
              : "Already have an account? Sign in"}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>
        For licensed physicians and dietitians only. This software is decision
        support and does not replace clinical judgement.
      </Text>
    </KeyboardAvoidingView>
  );
}

function humanise(code) {
  switch (code) {
    case "auth/invalid-email":          return "That email address isn't valid.";
    case "auth/user-not-found":         return "No account found for that email. Create one?";
    case "auth/wrong-password":         return "Incorrect password.";
    case "auth/invalid-credential":     return "Email or password is incorrect.";
    case "auth/email-already-in-use":   return "An account already exists for that email. Sign in instead.";
    case "auth/weak-password":          return "Password is too weak. Use at least 6 characters.";
    case "auth/network-request-failed": return "Network error. Check your internet connection.";
    case "auth/too-many-requests":      return "Too many failed attempts. Wait a minute and try again.";
    case "auth/operation-not-allowed":  return "Email/Password sign-in is not enabled in Firebase Authentication. Enable it in the Firebase console.";
    default: return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B6E4F",
    padding: 24,
    justifyContent: "center"
  },
  brandBlock: { alignItems: "center", marginBottom: 28 },
  brand: { fontSize: 32, color: "#fff", fontWeight: "700", letterSpacing: 0.5 },
  tagline: { fontSize: 12, color: "#E9F5F0", marginTop: 6 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#14213D",
    marginBottom: 14,
    textAlign: "center"
  },

  input: {
    borderWidth: 1,
    borderColor: "#CFE3D8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#14213D",
    marginBottom: 12,
    backgroundColor: "#F6FBF9"
  },

  primaryBtn: {
    backgroundColor: "#0B6E4F",
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  switchText: {
    color: "#0B6E4F",
    textAlign: "center",
    marginTop: 14,
    fontSize: 13,
    fontWeight: "600"
  },

  disclaimer: {
    color: "#E9F5F0",
    fontSize: 10,
    textAlign: "center",
    marginTop: 28,
    opacity: 0.85,
    lineHeight: 14
  }
});
