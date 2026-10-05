export const IST = "Asia/Kolkata";

export function dateKey(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function endOfRunMs(date: string): number {
  return Date.parse(`${date}T15:30:00.000Z`);
}

export function formatStamp(ms: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(ms);
}

export function formatDay(date: string, today: string): string {
  const tomorrow = addDays(today, 1);
  const pretty = new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(Date.parse(`${date}T00:00:00.000Z`));
  if (date === today) return `Today, ${pretty}`;
  if (date === tomorrow) return `Tomorrow, ${pretty}`;
  return pretty;
}

export function plannedRunDates(today: string): string[] {
  return [addDays(today, 1), addDays(today, 2)];
}

export function advanceMs(ms: number, days: number): number {
  return ms + days * 24 * 60 * 60 * 1000;
}
