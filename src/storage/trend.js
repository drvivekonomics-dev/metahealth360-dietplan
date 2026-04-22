/**
 * Pure helper that extracts the comparable vitals/labs from a stored plan.
 *
 * Kept separate from archive.js on purpose — archive.js pulls in the native
 * AsyncStorage module, which would blow up if imported from the Node test
 * environment or the pure diet engine. This module has no native deps.
 */

export function trendSnapshot(entry) {
  if (!entry || !entry.plan || !entry.plan.patient) return null;
  const p = entry.plan.patient;
  return {
    savedAt: entry.savedAt,
    weight: p.weight ?? null,
    bmi:    p.bmi ?? null,
    sbp:    p.sbp ?? null,
    dbp:    p.dbp ?? null,
    fbs:    p.fbs ?? null,
    ppbs:   p.ppbs ?? null,
    hba1c:  p.hba1c ?? null,
    ldl:    p.ldl ?? null,
    hdl:    p.hdl ?? null,
    tg:     p.tg ?? null,
    creatinine: p.creatinine ?? null,
    egfr:   p.egfr ?? null,
    hb:     p.hb ?? null
  };
}

export default { trendSnapshot };
