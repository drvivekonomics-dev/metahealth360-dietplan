/**
 * Light-weight obfuscation wrapper for on-device archive blobs.
 *
 * IMPORTANT — this is NOT cryptographic encryption. It is XOR + base64, which
 * stops a casual file browser (e.g. someone opening the APK's sandboxed data
 * via adb or a file manager) from reading plain patient JSON, and that's it.
 *
 * Why not AES?
 *   - react-native-quick-crypto / expo-crypto-* require native modules and an
 *     EAS rebuild. This app ships as a side-loaded APK to one clinic, so the
 *     threat model is "device lost / casual snooping", not state adversary.
 *   - If the threat model changes (multi-device sync, shared tablet), swap
 *     this module for a true AES-GCM implementation behind the same API.
 *
 * API:
 *   encode(obj) -> string (opaque base64)
 *   decode(str) -> object | null
 *
 * Keep the key deterministic per build — if you change this string, older
 * archives become unreadable, so bump the STORAGE_VERSION accordingly.
 */

const KEY = "MH360-RASKAR-DIET-v1";
export const STORAGE_VERSION = 1;

function xor(str, key) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    out.push(String.fromCharCode(c));
  }
  return out.join("");
}

// Polyfilled btoa/atob — React Native doesn't ship window.btoa.
function toB64(binary) {
  if (typeof btoa === "function") return btoa(binary);
  // Fallback — unlikely needed on RN but kept for Node test runs.
  // eslint-disable-next-line no-undef
  return Buffer.from(binary, "binary").toString("base64");
}
function fromB64(b64) {
  if (typeof atob === "function") return atob(b64);
  // eslint-disable-next-line no-undef
  return Buffer.from(b64, "base64").toString("binary");
}

function utf8Encode(s) {
  // encodeURIComponent trick preserves unicode through the XOR pipeline
  return unescape(encodeURIComponent(s));
}
function utf8Decode(s) {
  try { return decodeURIComponent(escape(s)); } catch (_) { return s; }
}

export function encode(obj) {
  try {
    const json = JSON.stringify({ v: STORAGE_VERSION, d: obj });
    const bin  = xor(utf8Encode(json), KEY);
    return "MH1:" + toB64(bin);
  } catch (_) {
    return null;
  }
}

export function decode(str) {
  if (typeof str !== "string") return null;
  // Backwards-compat: if a pre-obfuscation plain-JSON entry slips in, try JSON first.
  if (str.startsWith("{") || str.startsWith("[")) {
    try { return JSON.parse(str); } catch (_) { return null; }
  }
  if (!str.startsWith("MH1:")) return null;
  try {
    const bin  = fromB64(str.slice(4));
    const json = utf8Decode(xor(bin, KEY));
    const parsed = JSON.parse(json);
    return parsed && parsed.d != null ? parsed.d : null;
  } catch (_) {
    return null;
  }
}

export default { encode, decode, STORAGE_VERSION };
