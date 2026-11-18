import Image from "next/image";
import { cn } from "@/src/lib/utils";

export function BookingSummary({
  setupName,
  setupCategory,
  imageUrl,
  rows,
  total,
  totalLabel = "Total",
  footnote,
  className,
}: {
  setupName: string;
  setupCategory?: string;
  imageUrl?: string;
  rows: { label: string; value: React.ReactNode; emphasis?: boolean }[];
  total?: number | string;
  totalLabel?: string;
  footnote?: string;
  className?: string;
}) {
  return (
    <div className={cn("glass glass-sheen rounded-3xl p-5", className)}>
      <div className="flex items-center gap-3">
        {imageUrl ? (
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10">
            <Image src={imageUrl} alt="" fill sizes="80px" className="object-cover" />
          </div>
        ) : null}
        <div className="min-w-0">
          {setupCategory ? (
            <p className="text-[0.65rem] uppercase tracking-[0.1em] text-white/35">{setupCategory}</p>
          ) : null}
          <h3 className="truncate text-base font-semibold">{setupName}</h3>
        </div>
      </div>

      <dl className="mt-5 space-y-2.5 border-t border-white/8 pt-4 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4">
            <dt className="text-white/40">{row.label}</dt>
            <dd className={cn("text-right text-white/80", row.emphasis && "font-medium text-foreground")}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {typeof total !== "undefined" ? (
        <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
          <p className="text-[0.68rem] uppercase tracking-[0.1em] text-white/40">{totalLabel}</p>
          <p className="text-xl font-semibold text-foreground">
            {typeof total === "number"
              ? new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(total)
              : total}
          </p>
        </div>
      ) : null}

      {footnote ? <p className="mt-3 text-[0.68rem] leading-relaxed text-white/35">{footnote}</p> : null}
    </div>
  );
}
