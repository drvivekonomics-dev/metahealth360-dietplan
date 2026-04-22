---
name: Clinical rule issue
about: A condition rule, dose, macro target, or clinical citation looks wrong
title: "[clinical] "
labels: ["clinical", "needs-review"]
assignees: []
---

## Which rule / output is wrong?
<!-- e.g. "CKD stage-3 protein target", "Semaglutide titration schedule", "Dyslipidemia fat cap" -->

## What does the engine output?
<!-- Paste the relevant excerpt from plan-preview or the generated PDF. -->

## What should it output?
<!-- What the clinically correct value / rule should be. -->

## Source
<!-- ADA 2025 Sec. X / RSSDI-ESI 2024 / drug PI / peer-reviewed reference. -->

## Patient context (if it depends on the patient)
- Age:
- Sex:
- Comorbidities:
- eGFR:
- Medications:
- Other relevant labs:

## Severity
- [ ] Could lead to patient harm if not corrected (must-fix, blocks release)
- [ ] Clinically suboptimal but not harmful
- [ ] Cosmetic / wording only
