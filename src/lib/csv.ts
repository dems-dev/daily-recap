/**
 * Minimal RFC 4180 CSV writer. Text cells that start with = + - @ are prefixed
 * with ' so spreadsheet apps don't run them as formulas (CSV injection).
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return String(value);
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
