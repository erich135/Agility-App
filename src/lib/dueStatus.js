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

  // Use the registration month as the authority for the filing cycle.
  // Regardless of last-filed dates, colour is determined from the reg month.
  const reg = regDate ? atStartOfDay(new Date(regDate)) : null;
  if (!reg) return "blue";

  const dueMonth = reg.getMonth(); // 0..11
  const year = today.getFullYear();

  // Determine the start of the most recent cycle for the registration month.
  const thisYearStart = new Date(year, dueMonth, 1);
  const cycleStart = today >= thisYearStart ? thisYearStart : new Date(year - 1, dueMonth, 1);

  // If BOTH filings exist and the most recent filing occurred on or after
  // the start of the current registration cycle, consider the client fully
  // filed for this cycle and keep them BLUE until next cycle.
  const cipc = cipcFiledDate ? atStartOfDay(new Date(cipcFiledDate)) : null;
  const bo = boFiledDate ? atStartOfDay(new Date(boFiledDate)) : null;

  if (cipc && bo) {
    const mostRecent = cipc > bo ? cipc : bo;
    if (mostRecent >= cycleStart) return "blue";
  }

  // Otherwise, apply the registration-month window: orange from 1st, red from 16th.
  const orangeFrom = cycleStart; // 1st of due month
  const redFrom = new Date(cycleStart.getFullYear(), dueMonth, 16); // 16th of due month

  if (today >= redFrom) return "red";
  if (today >= orangeFrom) return "orange";
  return "blue";
}
