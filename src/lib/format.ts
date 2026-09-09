export function formatXOF(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " XOF";
}

export function formatDate(d: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", opts ?? { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateShort(d: string | Date): string {
  return formatDate(d, { day: "numeric", month: "short" });
}

/** Parse une plage Postgres `[2026-11-10,2026-11-14)` */
export function parseRange(range: string): { start: string; end: string } {
  const m = range.match(/[[(]"?([\d-]+)"?,\s*"?([\d-]+)"?[)\]]/);
  return { start: m?.[1] ?? "", end: m?.[2] ?? "" };
}

export function nightsBetween(start: string, end: string): number {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}
