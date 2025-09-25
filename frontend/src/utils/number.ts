export const fmtNum = (n: number | null | undefined, digits = 3): string =>
  n == null || Number.isNaN(n) ? "-" : Number(n).toFixed(digits);

export const parseNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const toNum = (v: unknown): number =>
  v == null || v === "" ? NaN : Number(v);
