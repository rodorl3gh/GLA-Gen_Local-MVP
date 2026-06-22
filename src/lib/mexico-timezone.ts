// Mexico City timezone utility (UTC-6, no DST since 2023)

export function getMexicoDate(): Date {
  // Mexico City = UTC-6
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

// Returns UTC timestamp of today at 00:00 Mexico City time
// Example: June 21 00:00 Mexico City = June 21 06:00 UTC
export function getMexicoTodayStartTs(): number {
  const mx = getMexicoDate();
  const todayUtc = Date.UTC(mx.getUTCFullYear(), mx.getUTCMonth(), mx.getUTCDate());
  return Math.floor(todayUtc / 1000) + 6 * 3600;
}

// Returns UTC timestamp of today at 23:59:59 Mexico City time
export function getMexicoTodayEndTs(): number {
  return getMexicoTodayStartTs() + 86400 - 1;
}

// Returns "YYYY-MM-DD" date string for Mexico City
export function getMexicoDateString(): string {
  return getMexicoDate().toISOString().split("T")[0];
}
