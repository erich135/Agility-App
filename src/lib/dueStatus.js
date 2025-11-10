// src/lib/dueStatus.js
function addMonths(d, m) {
  const dt = new Date(d.getTime());
  const day = dt.getDate();
  dt.setMonth(dt.getMonth() + m);
  // handle ends-of-month safely
  if (dt.getDate() < day) dt.setDate(0);
  return dt;
}

function atStartOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function getFilingStatus(regDate, cipcFiledDate, boFiledDate) {
  const today = atStartOfDay(new Date());

  const reg = regDate ? atStartOfDay(new Date(regDate)) : null;
  const cipc = cipcFiledDate ? atStartOfDay(new Date(cipcFiledDate)) : null;
  const bo   = boFiledDate   ? atStartOfDay(new Date(boFiledDate))   : null;
  // If we have a registration date, the registration-month is the baseline
  // for computing the due window. Fully-filed clients (both CIPC and BO
  // filed within the current registration cycle) remain "blue" until the
  // next cycle. If registration date is missing, fall back to filing-based
  // heuristic.
  if (reg) {
    const dueMonth = reg.getMonth(); // 0..11
    const year = today.getFullYear();

    // Determine the start of the current registration cycle (1st of due month)
    const thisCycleStart = new Date(year, dueMonth, 1);
    const cycleStart = today >= thisCycleStart ? thisCycleStart : new Date(year - 1, dueMonth, 1);
    const nextCycleStart = addMonths(cycleStart, 12);

    // If both filings exist and both were done inside the current cycle,
    // treat as fully-filed -> stay blue until next cycle.
    if (cipc && bo) {
      if (cipc >= cycleStart && cipc < nextCycleStart && bo >= cycleStart && bo < nextCycleStart) {
        return "blue";
      }
    }

    // For the active cycle, orange from the 1st of the due month, red from the 16th
    const orangeFrom = cycleStart; // 1st
    const redFrom = new Date(cycleStart.getFullYear(), dueMonth, 16);

    if (today >= redFrom) return "red";
    if (today >= orangeFrom) return "orange";
    return "blue";
  }

  // No registration date: fall back to the older filing-based logic. If both were filed,
  // use the most recent filing as the reset point and count months from there.
  if (cipc && bo) {
    const baseline = cipc > bo ? cipc : bo;
    const orangeFrom = addMonths(baseline, 11);
    const redFrom = new Date(addMonths(baseline, 11).getTime() + 15 * 24 * 60 * 60 * 1000);

    if (today >= redFrom) return "red";
    if (today >= orangeFrom) return "orange";
    return "blue";
  }

  // If we reach here and there's no registration date and not both filings,
  // default to blue (conservative).
  return "blue";
}
