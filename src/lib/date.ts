export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(key: string): Date {
  return new Date(key + 'T12:00:00');
}

export function weekStart(d: Date = new Date()): Date {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const dow = day.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  day.setDate(day.getDate() + mondayOffset);
  return day;
}

export function weekKey(d: Date = new Date()): string {
  return dateKey(weekStart(d));
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function dayOfWeek(d: Date | string): number {
  const date = typeof d === 'string' ? parseDate(d) : d;
  return date.getDay();
}

export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DOW_LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
