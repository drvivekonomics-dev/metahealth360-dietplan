/**
 * Root layout for expo-router. Initialises the Firebase auth listener and
 * exposes it through PlanContext so screens can stash the currently-generated
 * plan between the form and the preview screens without re-running the engine.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../src/firebase/config";
import { ActivityIndicator, View, StyleSheet } from "react-native";

// ------ Plan context (holds the most recently generated plan object) ----------
const PlanContext = createContext({ plan: null, setPlan: () => {} });
export function usePlan() {
  return useContext(PlanContext);
}

// ------ Email allowlist -------------------------------------------------------
// The Firebase project is public (web-app apiKey is a public identifier) and
// anyone with the config could call createUserWithEmailAndPassword against it.
// To keep the app clinic-only, we enforce a client-side allowlist in addition
// to disabling self-signup in Firebase Console → Authentication → Settings.
const ALLOWED_EMAILS = new Set([
  "dr.vivekonomics@gmail.com"
]);

function isAllowed(user) {
  const email = user?.email?.toLowerCase?.();
  return !!email && ALLOWED_EMAILS.has(email);
}

// ------ Auth gate -------------------------------------------------------------
function useProtectedRoute(user, ready) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === "login";
    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, ready, segments]);
}

export default function RootLayout() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      // If someone signs up / signs in with an un-allowlisted email, kick them
      // back out before any app state is exposed.
      if (u && !isAllowed(u)) {
        try { await signOut(auth); } catch {}
        setUser(null);
        setReady(true);
        return;
      }
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  useProtectedRoute(user, ready);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B6E4F" />
      </View>
    );
  }

  return (
    <PlanContext.Provider value={{ plan, setPlan }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0B6E4F" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" }
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ title: "MetaHealth360" }} />
        <Stack.Screen name="patient-form" options={{ title: "New Patient" }} />
        <Stack.Screen name="plan-preview" options={{ title: "Diet Plan" }} />
        <Stack.Screen name="archive" options={{ title: "Patient Archive" }} />
      </Stack>
    </PlanContext.Provider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#E9F5F0" }
});
