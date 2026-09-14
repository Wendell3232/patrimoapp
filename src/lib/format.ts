const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatBRL(value: number): string {
  return brl.format(Number.isFinite(value) ? value : 0);
}

export function formatBRLCompact(value: number): string {
  return brlCompact.format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits).replace(".", ",")}%`;
}

/** Parses "1.234,56" or "1234.56" into a number. */
export function parseBRLInput(raw: string): number {
  const cleaned = raw
    .replace(/\s|R\$/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDayMonth(iso: string): string {
  return parseISODate(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function formatMonthLabel(date: Date): string {
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatShortMonth(date: Date): string {
  const label = date.toLocaleDateString("pt-BR", { month: "short" });
  return label.replace(".", "").charAt(0).toUpperCase() + label.replace(".", "").slice(1);
}

/** Current month as "YYYY-MM". */
export function monthKeyToday(date: Date = new Date()): string {
  return toISODate(date).slice(0, 7);
}
