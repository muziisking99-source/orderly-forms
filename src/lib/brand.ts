/** Golden Fresh Biscuits / Yunma Foods brand + document helpers */

export const COMPANY = {
  brandName: "GOLDEN FRESH BISCUITS",
  legalName: "YUNMA FOODS CC",
  address: "P O Box 21226, Roshnee, 1936",
  tel: "(011) 857-1455",
  fax: "(011) 857-1458",
  email: "accounts@goldenfresh.co.za",
  salesEmail: "sales@goldenfresh.co.za",
  ckNo: "1998/60253/23",
  vatNo: "4280177702",
} as const;

export const BRAND = {
  navy: "#0B1F3A",
  navyMuted: "#1A3358",
  red: "#C41E3A",
  gold: "#C9A227",
  goldSoft: "#E8D5A3",
  paper: "#FFFEF9",
  ink: "#1A1A1A",
  rule: "#D4D0C8",
  muted: "#5C5C5C",
} as const;

export function formatTaxExempt(taxRate: number | null | undefined): string {
  if (taxRate == null) return "—";
  if (Number(taxRate) === 0) return "Exempt";
  return `${taxRate}%`;
}

export function formatDisplayDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Infer a product-range group label from a product code. */
export function productGroupLabel(code: string): string {
  const c = code.trim().toUpperCase();

  if (/^SB[-_]?/.test(c) || /^GG[-_]?/.test(c) || /^CC[-_]?/.test(c)) {
    return "Shortbread / Ginger / Choc Chip";
  }
  if (/^ALL0?\d/i.test(c) || /^ALL[-_]/.test(c)) {
    return "All Star";
  }
  if (/^TRIO0?\d/i.test(c) || /^TRIO[-_]/.test(c)) {
    return "Trio";
  }
  if (/^LAL/i.test(c)) {
    return "LAL";
  }
  if (/^JG/i.test(c)) {
    return "JG";
  }

  const letterPrefix = c.match(/^([A-Z]{2,5})(?=\d|[-_])/);
  if (letterPrefix) return letterPrefix[1];

  const alpha = c.match(/^[A-Z]+/);
  if (alpha && alpha[0].length >= 2) return alpha[0];

  return "Other";
}

export type GroupedProducts<T extends { code: string }> = {
  label: string;
  products: T[];
};

export function groupProductsByRange<T extends { code: string }>(products: T[]): GroupedProducts<T>[] {
  const map = new Map<string, T[]>();
  for (const p of products) {
    const label = productGroupLabel(p.code);
    const list = map.get(label) ?? [];
    list.push(p);
    map.set(label, list);
  }
  return Array.from(map.entries()).map(([label, items]) => ({
    label,
    products: items,
  }));
}
