/**
 * Patient plan archive — local-only, device-side, per-doctor.
 *
 * Keeps the last 10 plans per doctor (keyed by Firebase UID). Oldest entry is
 * evicted FIFO when the 11th is added. No cloud sync — explicit policy: PDFs
 * live on the patient's device, a short list of "recent patients" lives on the
 * doctor's device so they can pull up the last handful without re-entering labs.
 *
 * Storage:
 *   - AsyncStorage, one obfuscated blob per doctor under `mh360:archive:<uid>`.
 *   - Each blob decodes to a JSON array of entries.
 *   - Obfuscation is XOR+base64, NOT AES (see storage/obfuscate.js) — good
 *     enough to defeat casual file-browser snooping on a lost device.
 *
 * Each entry:
 *   { id, savedAt, name, age, sex, conditions, plan }
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { encode, decode } from "./obfuscate";
import { trendSnapshot as _trendSnapshot } from "./trend";

const MAX_ENTRIES = 10;
const keyFor = (uid) => `mh360:archive:${uid || "anon"}`;

export async function listArchive(uid) {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    if (!raw) return [];
    const arr = decode(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeArchive(uid, list) {
  const blob = encode(list);
  if (blob == null) return;
  await AsyncStorage.setItem(keyFor(uid), blob);
}

export async function savePlan(uid, plan) {
  const list = await listArchive(uid);
  const p = plan.patient || {};
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: Date.now(),
    name: p.name || "Unnamed patient",
    age: p.age,
    sex: p.sex,
    conditions: p.conditions || [],
    plan
  };
  // Newest first, cap at MAX_ENTRIES (FIFO eviction of oldest).
  const next = [entry, ...list].slice(0, MAX_ENTRIES);
  await writeArchive(uid, next);
  return entry;
}

export async function deleteEntry(uid, id) {
  const list = await listArchive(uid);
  const next = list.filter((e) => e.id !== id);
  await writeArchive(uid, next);
  return next;
}

export async function clearArchive(uid) {
  await AsyncStorage.removeItem(keyFor(uid));
}

/**
 * Look up the most recent archive entry that matches `name` (case-insensitive
 * trimmed). Used for visit-to-visit trend comparison on the new plan.
 * Returns null if no match.
 */
export async function findByName(uid, name) {
  if (!name) return null;
  const needle = String(name).trim().toLowerCase();
  if (!needle) return null;
  const list = await listArchive(uid);
  for (const e of list) {
    if (e && e.name && String(e.name).trim().toLowerCase() === needle) {
      return e;
    }
  }
  return null;
}

// Re-export for backwards-compat with earlier callers.
export const trendSnapshot = _trendSnapshot;

export const ARCHIVE_CAP = MAX_ENTRIES;
