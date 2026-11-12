export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function dateOnly(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function timeOnly(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const [hours, minutes, seconds = "0"] = value.split(":");
  const date = new Date(1970, 0, 1, Number(hours), Number(minutes), Number(seconds));
  return date;
}

export function toDateString(value?: Date | string | null) {
  if (!value) return null;

  if (typeof value === "string") {
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

export function toTimeString(value?: Date | string | null) {
  if (!value) return null;

  if (typeof value === "string") {
    // Already HH:mm:ss
    if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
      return value;
    }

    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(11, 19);
  }

  return value.toISOString().slice(11, 19);
}
export function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

export function workingDaysInclusive(start: Date, end: Date) {
  let count = 0;
  for (let day = dateOnly(start); day <= end; day = addDays(day, 1)) {
    const weekday = day.getDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

export function parseReportRange(period: string, year: number, month?: number | null, week?: number | null) {
  if (period === "year") return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
  if (period === "month") {
    if (!month) throw new Error("month required for monthly report");
    return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0) };
  }
  if (period === "week") {
    if (!week) throw new Error("week number required for weekly report");
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const day = simple.getDay();
    const monday = addDays(simple, day <= 1 ? 1 - day : 8 - day);
    return { start: dateOnly(monday), end: addDays(dateOnly(monday), 6) };
  }
  throw new Error("period must be: week | month | year");
}

