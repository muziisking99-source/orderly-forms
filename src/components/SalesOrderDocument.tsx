import type { CSSProperties } from "react";
import { COMPANY, BRAND, PALLET_CONFIGURATION, formatDisplayDate } from "@/lib/brand";

export type SalesOrderViewModel = {
  documentNumber: string;
  orderDate: string;
  customerName: string;
  deliveryAddress: string | null;
  accountCode: string | null;
  reference: string | null;
  orderBy: string | null;
  items: {
    id?: string;
    code: string;
    description: string;
    quantity: string;
    price?: string | null;
  }[];
};

function hasAnyPrice(items: SalesOrderViewModel["items"]) {
  return items.some((it) => (it.price ?? "").trim() !== "");
}

function padItems(items: SalesOrderViewModel["items"], min = 3) {
  const rows = [...items];
  while (rows.length < min) {
    rows.push({ id: `blank-${rows.length}`, code: "", description: "", quantity: "", price: "" });
  }
  return rows;
}

/** On-screen / print layout for an Order Requisition document. */
export function SalesOrderDocument({ order }: { order: SalesOrderViewModel }) {
  const rows = padItems(order.items);
  const showPrice = hasAnyPrice(order.items);

  return (
    <article
      className="sales-order-doc mx-auto w-full max-w-[210mm] overflow-hidden bg-white text-[var(--so-ink)] shadow-sm print:max-w-none print:shadow-none"
      style={
        {
          "--so-navy": BRAND.navy,
          "--so-red": BRAND.red,
          "--so-gold": BRAND.gold,
          "--so-paper": BRAND.paper,
          "--so-ink": BRAND.ink,
          "--so-muted": BRAND.muted,
          "--so-rule": BRAND.rule,
        } as CSSProperties
      }
    >
      <header className="bg-[var(--so-navy)] px-4 py-3 text-white sm:px-6 print:px-5 print:py-2.5">
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <img
            src="/golden-fresh-logo.png"
            alt="Golden Fresh"
            className="mb-2 h-11 w-auto object-contain sm:h-12"
          />
          <p className="text-[0.7rem] leading-snug text-white/90">{COMPANY.address}</p>
          <p className="mt-0.5 text-[0.7rem] text-white/90">Tel: {COMPANY.tel}</p>
          <p className="mt-0.5 text-[0.7rem] font-semibold text-white">{COMPANY.salesEmail}</p>
        </div>
      </header>
      <div className="h-[2.5px] bg-[var(--so-gold)]" />
      <div className="h-[1.25px] bg-[var(--so-red)]" />

      <div className="px-4 py-3 sm:px-6 sm:py-4 print:px-5 print:py-3">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
          <div className="flex flex-col justify-center">
            <div className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--so-red)]">
              Official document
            </div>
            <h2 className="font-display text-xl text-[var(--so-navy)] sm:text-2xl">
              Order Requisition
            </h2>
          </div>
          <dl className="w-full border border-[var(--so-navy)] bg-[#F7F5F0] text-sm font-body sm:min-w-[9.5rem] sm:w-auto">
            <div className="flex justify-between gap-3 border-b border-[var(--so-rule)] px-2 py-1">
              <dt className="text-[0.55rem] font-bold uppercase tracking-wide text-[var(--so-muted)]">
                Document
              </dt>
              <dd className="text-xs font-semibold text-[var(--so-navy)]">{order.documentNumber}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-[var(--so-rule)] px-2 py-1">
              <dt className="text-[0.55rem] font-bold uppercase tracking-wide text-[var(--so-muted)]">
                Date
              </dt>
              <dd className="text-xs font-semibold text-[var(--so-navy)]">
                {formatDisplayDate(order.orderDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 px-2 py-1">
              <dt className="text-[0.55rem] font-bold uppercase tracking-wide text-[var(--so-muted)]">
                Page
              </dt>
              <dd className="text-xs font-semibold text-[var(--so-navy)]">1 of 1</dd>
            </div>
          </dl>
        </div>

        <div className="mb-3 grid gap-2 sm:grid-cols-[1.4fr_1fr]">
          <section className="border border-[var(--so-rule)] px-2.5 py-1.5 font-body">
            <div className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-[var(--so-red)]">
              Deliver to
            </div>
            <div className="mt-0.5 text-sm font-bold text-[var(--so-navy)]">{order.customerName}</div>
            {order.deliveryAddress && (
              <div className="mt-0.5 whitespace-pre-line text-xs leading-snug text-[var(--so-ink)]">
                {order.deliveryAddress}
              </div>
            )}
          </section>

          <div className="border border-[var(--so-rule)] font-body">
            <MetaCell label="Account Code" value={order.accountCode} />
            <MetaCell label="Order By" value={order.orderBy} last />
          </div>
        </div>

        <table className="w-full border-collapse border border-[var(--so-navy)] font-body text-xs">
          <thead>
            <tr className="bg-[var(--so-navy)] text-left text-white">
              <th className="w-[18%] px-1.5 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em]">
                Code
              </th>
              <th className="px-1.5 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em]">
                Description
              </th>
              <th
                className={`${showPrice ? "w-[16%]" : "w-[22%]"} px-1.5 py-1.5 text-right text-[0.6rem] font-bold uppercase tracking-[0.08em]`}
              >
                Quantity
              </th>
              {showPrice ? (
                <th className="w-[16%] px-1.5 py-1.5 text-right text-[0.6rem] font-bold uppercase tracking-[0.08em]">
                  Price
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((it, i) => (
              <tr
                key={it.id ?? i}
                className={`border-b border-[var(--so-rule)] ${i % 2 === 1 && it.code ? "bg-[#F7F5F0]" : ""}`}
              >
                <td className="px-1.5 py-1 align-top tabular-nums text-[var(--so-navy)]">
                  {it.code || <span className="opacity-0">—</span>}
                </td>
                <td className="px-1.5 py-1 align-top">{it.description}</td>
                <td className="px-1.5 py-1 text-right align-top">{it.quantity}</td>
                {showPrice ? (
                  <td className="px-1.5 py-1 text-right align-top">{it.price}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 overflow-hidden border border-[var(--so-ink)] font-body text-[0.55rem] uppercase leading-tight text-[var(--so-ink)]">
          <div className="border-b border-[var(--so-ink)] py-1 text-center text-[0.6rem] font-bold tracking-[0.08em]">
            Pallet Configuration
          </div>
          <table className="w-full table-fixed border-collapse">
            <tbody>
              {PALLET_CONFIGURATION.map((pair, i) => {
                const left = pair[0] ?? { product: "", qty: "" };
                const right = pair[1] ?? { product: "", qty: "" };
                return (
                  <tr key={i} className="border-b border-[var(--so-ink)] last:border-b-0">
                    <td className="w-[34%] border-r border-[var(--so-ink)] px-1 py-0.5">
                      {left.product}
                    </td>
                    <td className="w-[16%] border-r border-[var(--so-ink)] px-1 py-0.5">{left.qty}</td>
                    <td className="w-[34%] border-r border-[var(--so-ink)] px-1 py-0.5">
                      {right.product}
                    </td>
                    <td className="w-[16%] px-1 py-0.5">{right.qty}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 border-t border-[var(--so-rule)] pt-1.5 text-[0.6rem] text-[var(--so-muted)]">
          {COMPANY.brandName} · {COMPANY.legalName}
        </div>
      </div>
    </article>
  );
}

function MetaCell({
  label,
  value,
  last,
}: {
  label: string;
  value: string | null | undefined;
  last?: boolean;
}) {
  return (
    <div className={`px-2.5 py-1.5 ${last ? "" : "border-b border-[var(--so-rule)]"}`}>
      <div className="text-[0.55rem] font-bold uppercase tracking-[0.08em] text-[var(--so-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-semibold text-[var(--so-navy)]">{value || "—"}</div>
    </div>
  );
}
