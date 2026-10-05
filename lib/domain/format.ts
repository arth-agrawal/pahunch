export function formatINR(value: number): string {
  const negative = value < 0;
  const formatted = Math.abs(value).toLocaleString("en-IN", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
  return `${negative ? "-" : ""}₹${formatted}`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

export function formatRate(rate: number | null, digits = 1): string {
  if (rate == null) return "—";
  return `${(rate * 100).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatPoints(points: number): string {
  const formatted = points.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(points) ? 0 : 1,
    maximumFractionDigits: 2,
  });
  return `${formatted} percentage point${points === 1 ? "" : "s"}`;
}
