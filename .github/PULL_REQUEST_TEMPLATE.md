## Summary
<!-- One or two lines: what changed and why. -->

## Type of change
- [ ] Clinical rule change (dose, macro, contraindication, eligibility)
- [ ] New condition / module
- [ ] UI / UX
- [ ] PDF rendering
- [ ] i18n (EN / HI / MR)
- [ ] Tooling / CI / docs

## Clinical review
<!-- Required for anything touching src/rules/, src/engine/, or GLP-1 / IF logic. -->
- [ ] Rule sourced to a guideline or peer-reviewed reference (cite below)
- [ ] Citation updated in `src/pdf/citations.js` if the PDF references it
- [ ] Contraindication / warning pathway still behaves correctly
- Source:

## Verification
- [ ] `node smoke.mjs` passes locally
- [ ] `node --check` passes for changed `.js` files
- [ ] JSX parse check passes for changed `.jsx` files
- [ ] EAS preview APK built and installed on a test device (if UI changed)
- [ ] Generated PDF visually reviewed in all three languages (if i18n / PDF changed)

## Screenshots / PDF excerpts
<!-- For UI or PDF changes. -->
