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

  // If BOTH were filed at least once, use the most recent filing as the baseline.
  if (cipc && bo) {
    const baseline = cipc > bo ? cipc : bo;          // the reset point
    const orangeFrom = addMonths(baseline, 11);      // blue until 11 months after filing
    const redFrom    = new Date(addMonths(baseline, 11).getTime() + 15 * 24 * 60 * 60 * 1000);

    if (today >= redFrom)    return "red";
    if (today >= orangeFrom) return "orange";
    return "blue";
  }

  // Fallback (one or both not filed yet): use the reg anniversary window
  // Orange: from the 1st of the due month; Red: from the 16th of the due month.
  if (!reg) return "blue";

  const dueMonth = reg.getMonth(); // 0..11
  const year = today.getFullYear();

  const thisYearStart = new Date(year, dueMonth, 1);
  const lastCycleStart = (today >= thisYearStart)
    ? thisYearStart
    : new Date(year - 1, dueMonth, 1);

  const orangeFrom = lastCycleStart;                              // 1st
  const redFrom    = new Date(lastCycleStart.getFullYear(), dueMonth, 16); // 16th

  if (today >= redFrom)    return "red";
  if (today >= orangeFrom) return "orange";
  return "blue";
}
