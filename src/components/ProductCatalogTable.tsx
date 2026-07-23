import { useMemo } from "react";

import { productGroupLabel } from "@/lib/brand";
import type { ProductCatalogRow } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TableRow =
  | { type: "group"; key: string; label: string }
  | { type: "product"; key: string; product: ProductCatalogRow };

function rowsInImportOrder(products: ProductCatalogRow[]): TableRow[] {
  const rows: TableRow[] = [];
  let lastLabel: string | null = null;
  for (const p of products) {
    const label = productGroupLabel(p.code);
    if (label !== lastLabel) {
      if (label !== "Other") {
        rows.push({ type: "group", key: `h-${label}-${p.id}`, label });
      }
      lastLabel = label;
    }
    rows.push({ type: "product", key: p.id, product: p });
  }
  return rows;
}

export function ProductCatalogTable({
  products,
  quantities,
  prices,
  onQtyChange,
  onPriceChange,
  className,
}: {
  products: ProductCatalogRow[];
  quantities: Record<string, string>;
  prices: Record<string, string>;
  onQtyChange: (productId: string, value: string) => void;
  onPriceChange: (productId: string, value: string) => void;
  className?: string;
}) {
  const rows = useMemo(() => rowsInImportOrder(products), [products]);

  return (
    <div className={cn("h-full overflow-auto overscroll-contain", className)}>
      {/* Mobile: stacked cards so description is fully readable */}
      <div className="sm:hidden">
        {rows.map((row) => {
          if (row.type === "group") {
            return (
              <div
                key={row.key}
                className="bg-muted/50 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                {row.label}
              </div>
            );
          }

          const p = row.product;
          const hasQty = (quantities[p.id] ?? "").trim() !== "";
          const hasPrice = (prices[p.id] ?? "").trim() !== "";

          return (
            <div
              key={row.key}
              className={cn(
                "border-b border-border/70 px-3 py-2.5",
                hasQty || hasPrice ? "bg-primary/5" : undefined,
              )}
            >
              <div className="text-xs font-medium tabular-nums text-muted-foreground">{p.code}</div>
              <div className="mt-0.5 text-sm leading-snug text-foreground">{p.description}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[0.65rem] font-medium text-muted-foreground">
                    Qty
                  </label>
                  <Input
                    type="text"
                    inputMode="text"
                    value={quantities[p.id] ?? ""}
                    onChange={(e) => onQtyChange(p.id, e.target.value)}
                    className="h-9 w-full px-2 text-center text-sm"
                    aria-label={`Quantity for ${p.code}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.65rem] font-medium text-muted-foreground">
                    Price
                  </label>
                  <Input
                    type="text"
                    inputMode="text"
                    value={prices[p.id] ?? ""}
                    onChange={(e) => onPriceChange(p.id, e.target.value)}
                    className="h-9 w-full px-2 text-center text-sm"
                    aria-label={`Price for ${p.code}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
        <div className="h-24" aria-hidden />
      </div>

      {/* Desktop / tablet: table */}
      <table className="hidden w-full table-fixed border-collapse text-sm sm:table">
        <colgroup>
          <col className="w-[7rem]" />
          <col />
          <col className="w-[6rem]" />
          <col className="w-[6rem]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border text-left text-xs font-semibold sm:text-sm">
            <th className="px-3 py-3 font-semibold sm:px-4">Code</th>
            <th className="px-2 py-3 font-semibold">Description</th>
            <th className="px-2 py-3 text-center font-semibold">Qty</th>
            <th className="px-3 py-3 text-center font-semibold sm:px-4">Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (row.type === "group") {
              return (
                <tr key={row.key} className="bg-muted/50">
                  <td
                    colSpan={4}
                    className="px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:px-4 sm:text-[0.7rem]"
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            const p = row.product;
            const hasQty = (quantities[p.id] ?? "").trim() !== "";
            const hasPrice = (prices[p.id] ?? "").trim() !== "";

            return (
              <tr
                key={row.key}
                className={cn(
                  "border-b border-border/70",
                  hasQty || hasPrice ? "bg-primary/5" : "hover:bg-muted/30",
                )}
              >
                <td className="truncate px-3 py-2 text-xs font-medium tabular-nums sm:px-4 sm:text-sm">
                  {p.code}
                </td>
                <td className="px-2 py-2 text-xs text-foreground/90 sm:text-sm">{p.description}</td>
                <td className="px-2 py-1.5">
                  <Input
                    type="text"
                    value={quantities[p.id] ?? ""}
                    onChange={(e) => onQtyChange(p.id, e.target.value)}
                    className="mx-auto h-8 w-full max-w-[5.5rem] px-2 text-center text-xs sm:h-9 sm:text-sm"
                    aria-label={`Quantity for ${p.code}`}
                  />
                </td>
                <td className="px-3 py-1.5 sm:px-4">
                  <Input
                    type="text"
                    value={prices[p.id] ?? ""}
                    onChange={(e) => onPriceChange(p.id, e.target.value)}
                    className="mx-auto h-8 w-full max-w-[5.5rem] px-2 text-center text-xs sm:h-9 sm:text-sm"
                    aria-label={`Price for ${p.code}`}
                  />
                </td>
              </tr>
            );
          })}
          <tr aria-hidden>
            <td colSpan={4} className="h-24 border-0 p-0" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
