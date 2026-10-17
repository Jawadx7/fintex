// Display helpers for compliance values. Client-safe, no dependencies.

const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string): Intl.NumberFormat {
  const existing = moneyFormatters.get(currency);
  if (existing) return existing;
  const created = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  moneyFormatters.set(currency, created);
  return created;
}

/** Format a decimal money string (or number) as e.g. GHS 2,500.00. */
export function formatMoney(amount: string | number, currency = "GHS"): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return "—";
  return moneyFormatter(currency).format(value);
}

/** Format an ISO timestamp/Date as a short, readable date-time. */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Render a 0–1 risk score as a percentage, or "—" when absent. */
export function formatRiskScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return `${Math.round(score * 100)}%`;
}

/** Shorten a long wallet id for dense tables: wlt_AB12CD…9F0A. */
export function shortWallet(wallet: string): string {
  if (wallet.length <= 14) return wallet;
  return `${wallet.slice(0, 8)}…${wallet.slice(-4)}`;
}
