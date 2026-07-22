import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { productGroupLabel } from "@/lib/brand";
import type { ProductCatalogRow } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type VirtualRow =
  | { type: "header"; key: string; label: string }
  | { type: "product"; key: string; product: ProductCatalogRow };

function rowsInImportOrder(products: ProductCatalogRow[]): VirtualRow[] {
  const rows: VirtualRow[] = [];
  let lastLabel: string | null = null;
  for (const p of products) {
    const label = productGroupLabel(p.code);
    if (label !== lastLabel) {
      rows.push({ type: "header", key: `h-${label}-${p.id}`, label });
      lastLabel = label;
    }
    rows.push({ type: "product", key: p.id, product: p });
  }
  return rows;
}

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 32;

export function ProductCatalogTable({
  products,
  quantities,
  prices,
  onQtyChange,
  onPriceChange,
}: {
  products: ProductCatalogRow[];
  quantities: Record<string, string>;
  prices: Record<string, string>;
  onQtyChange: (productId: string, value: string) => void;
  onPriceChange: (productId: string, value: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualRows = useMemo(() => rowsInImportOrder(products), [products]);

  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (virtualRows[index]?.type === "header" ? HEADER_HEIGHT : ROW_HEIGHT),
    overscan: 12,
  });

  return (
    <div className="overflow-hidden">
      <div className="sticky top-0 z-10 grid grid-cols-[4.5rem_minmax(0,1fr)_5rem_5rem] gap-1.5 border-b border-border bg-card px-2 py-2.5 text-left text-xs font-semibold sm:grid-cols-[6rem_1fr_6.5rem_6.5rem] sm:gap-3 sm:px-4 sm:py-3 sm:text-sm">
        <div>Code</div>
        <div>Description</div>
        <div className="text-right">Qty</div>
        <div className="text-right">Price</div>
      </div>

      <div
        ref={parentRef}
        className="max-h-[50vh] overflow-auto overscroll-contain md:max-h-[60vh]"
      >
        <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((vItem) => {
            const row = virtualRows[vItem.index];
            if (!row) return null;

            if (row.type === "header") {
              return (
                <div
                  key={row.key}
                  className="absolute left-0 top-0 w-full bg-muted/50 px-2 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:px-4 sm:text-[0.7rem]"
                  style={{
                    height: `${vItem.size}px`,
                    transform: `translateY(${vItem.start}px)`,
                  }}
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
                  "absolute left-0 top-0 grid w-full grid-cols-[4.5rem_minmax(0,1fr)_5rem_5rem] items-center gap-1.5 border-b border-border/70 px-2 transition-colors sm:grid-cols-[6rem_1fr_6.5rem_6.5rem] sm:gap-3 sm:px-4",
                  hasQty || hasPrice ? "bg-primary/5" : "hover:bg-muted/30",
                )}
                style={{
                  height: `${vItem.size}px`,
                  transform: `translateY(${vItem.start}px)`,
                }}
              >
                <div className="truncate text-xs font-medium tabular-nums text-foreground sm:text-sm">
                  {p.code}
                </div>
                <div className="truncate text-xs text-foreground/90 sm:text-sm">{p.description}</div>
                <div className="text-right">
                  <Input
                    type="text"
                    placeholder=""
                    value={quantities[p.id] ?? ""}
                    onChange={(e) => onQtyChange(p.id, e.target.value)}
                    className="ml-auto h-8 w-full text-right text-xs focus-visible:ring-2 sm:h-9 sm:w-24 sm:text-sm"
                    aria-label={`Quantity for ${p.code}`}
                  />
                </div>
                <div className="text-right">
                  <Input
                    type="text"
                    placeholder=""
                    value={prices[p.id] ?? ""}
                    onChange={(e) => onPriceChange(p.id, e.target.value)}
                    className="ml-auto h-8 w-full text-right text-xs focus-visible:ring-2 sm:h-9 sm:w-24 sm:text-sm"
                    aria-label={`Price for ${p.code}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
