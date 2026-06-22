// Client-side helper: returns "YYYY-MM-DD" in local time (browser timezone)
export function getLocalDateString(d?: Date): string {
  const date = d || new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
