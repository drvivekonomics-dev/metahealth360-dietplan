/**
 * Metro bundler config.
 *
 * Why this exists:
 *   The project lives on an exFAT external volume (VIVEK1). On exFAT,
 *   macOS stores extended attributes as sidecar files named `._<original>`
 *   (AppleDouble). Metro sees `._layout.jsx`, thinks it's JavaScript,
 *   and crashes parsing the binary header.
 *
 *   The blockList below is a single combined regex — one path matches
 *   either an AppleDouble sidecar OR a .DS_Store. Real source files
 *   are unaffected.
 *
 *   We use a literal regex (not metro-config's exclusionList helper)
 *   because that helper's subpath is no longer exported in current Metro.
 */
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = /(^|\/)\._.*|(^|\/)\.DS_Store$/;

module.exports = config;
