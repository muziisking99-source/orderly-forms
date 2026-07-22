import type { CSSProperties } from "react";
import { COMPANY, BRAND, formatDisplayDate } from "@/lib/brand";

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
  }[];
};

function padItems(items: SalesOrderViewModel["items"], min = 6) {
  const rows = [...items];
  while (rows.length < min) {
    rows.push({ id: `blank-${rows.length}`, code: "", description: "", quantity: "" });
  }
  return rows;
}

/** On-screen / print layout for an Order Requisition document. */
export function SalesOrderDocument({ order }: { order: SalesOrderViewModel }) {
  const rows = padItems(order.items);

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
      <header className="bg-[var(--so-navy)] px-8 py-6 text-white print:px-6">
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <img
            src="/golden-fresh-logo.png"
            alt="Golden Fresh"
            className="mb-4 h-16 w-auto object-contain sm:h-[4.5rem]"
          />
          <p className="text-[0.8rem] leading-relaxed text-white/90">{COMPANY.address}</p>
          <p className="mt-1 text-[0.8rem] text-white/90">Tel: {COMPANY.tel}</p>
          <p className="mt-1 text-[0.8rem] font-semibold text-white">{COMPANY.salesEmail}</p>
        </div>
      </header>
      <div className="h-[3px] bg-[var(--so-gold)]" />
      <div className="h-[1.5px] bg-[var(--so-red)]" />

      <div className="px-8 py-6 print:px-6">
        <div className="mb-5 flex items-stretch justify-between gap-4">
          <div className="flex flex-col justify-center">
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--so-red)]">
              Official document
            </div>
            <h2 className="font-display text-2xl text-[var(--so-navy)] sm:text-[1.85rem]">
              Order Requisition
            </h2>
          </div>
          <dl className="min-w-[10.5rem] border border-[var(--so-navy)] bg-[#F7F5F0] text-sm font-body">
            <div className="flex justify-between gap-3 border-b border-[var(--so-rule)] px-2.5 py-1.5">
              <dt className="text-[0.6rem] font-bold uppercase tracking-wide text-[var(--so-muted)]">
                Document
              </dt>
              <dd className="font-semibold text-[var(--so-navy)]">{order.documentNumber}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-[var(--so-rule)] px-2.5 py-1.5">
              <dt className="text-[0.6rem] font-bold uppercase tracking-wide text-[var(--so-muted)]">
                Date
              </dt>
              <dd className="font-semibold text-[var(--so-navy)]">
                {formatDisplayDate(order.orderDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 px-2.5 py-1.5">
              <dt className="text-[0.6rem] font-bold uppercase tracking-wide text-[var(--so-muted)]">
                Page
              </dt>
              <dd className="font-semibold text-[var(--so-navy)]">1 of 1</dd>
            </div>
          </dl>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <section className="border border-[var(--so-rule)] px-3 py-2.5 font-body">
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--so-red)]">
              Deliver to
            </div>
            <div className="mt-1 text-base font-bold text-[var(--so-navy)]">{order.customerName}</div>
            {order.deliveryAddress && (
              <div className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[var(--so-ink)]">
                {order.deliveryAddress}
              </div>
            )}
          </section>

          <div className="border border-[var(--so-rule)] font-body">
            <MetaCell label="Account Code" value={order.accountCode} />
            <MetaCell label="Your Reference" value={order.reference} />
            <MetaCell label="Order By" value={order.orderBy} last />
          </div>
        </div>

        <table className="w-full border-collapse border border-[var(--so-navy)] font-body text-sm">
          <thead>
            <tr className="bg-[var(--so-navy)] text-left text-white">
              <th className="w-[18%] px-2 py-2.5 text-[0.7rem] font-bold uppercase tracking-[0.08em]">
                Code
              </th>
              <th className="px-2 py-2.5 text-[0.7rem] font-bold uppercase tracking-[0.08em]">
                Description
              </th>
              <th className="w-[22%] px-2 py-2.5 text-right text-[0.7rem] font-bold uppercase tracking-[0.08em]">
                Quantity
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it, i) => (
              <tr
                key={it.id ?? i}
                className={`border-b border-[var(--so-rule)] ${i % 2 === 1 && it.code ? "bg-[#F7F5F0]" : ""}`}
              >
                <td className="px-2 py-2.5 align-top tabular-nums text-[var(--so-navy)]">
                  {it.code || <span className="opacity-0">—</span>}
                </td>
                <td className="px-2 py-2.5 align-top">{it.description}</td>
                <td className="px-2 py-2.5 text-right align-top">{it.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-12 border-t-[1.5px] border-[var(--so-navy)] pt-4 font-body">
          <div className="font-semibold text-[var(--so-navy)]">Received in good order</div>
          <div className="mt-8 grid grid-cols-2 gap-10">
            <div>
              <div className="border-b border-[var(--so-ink)] pb-1">&nbsp;</div>
              <div className="mt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--so-muted)]">
                Signed
              </div>
            </div>
            <div>
              <div className="border-b border-[var(--so-ink)] pb-1">&nbsp;</div>
              <div className="mt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--so-muted)]">
                Date
              </div>
            </div>
          </div>
        </footer>

        <div className="mt-8 flex justify-between border-t border-[var(--so-rule)] pt-2 text-[0.65rem] text-[var(--so-muted)]">
          <span>
            {COMPANY.brandName} · {COMPANY.legalName}
          </span>
          <span>
            CK {COMPANY.ckNo} · VAT {COMPANY.vatNo}
          </span>
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
    <div className={`px-3 py-2.5 ${last ? "" : "border-b border-[var(--so-rule)]"}`}>
      <div className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--so-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[var(--so-navy)]">{value || "—"}</div>
    </div>
  );
}
