"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { FilterSelect } from "@/src/components/ui/FilterSelect";
import { cn } from "@/src/lib/utils";
import { SORT_OPTIONS } from "@/src/lib/constants";

const PRICE_RANGES = [
  { value: "", label: "Semua harga", min: "", max: "" },
  { value: "0-20000", label: "≤ Rp20.000", min: "0", max: "20000" },
  { value: "20000-40000", label: "Rp20.000 – Rp40.000", min: "20000", max: "40000" },
  { value: "40000-", label: "≥ Rp40.000", min: "40000", max: "" },
];

export interface SetupFilterState {
  q: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
}

export function SetupFilters({
  categories,
  initial,
}: {
  categories: { name: string; count: number }[];
  initial: SetupFilterState;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(initial.q);
  const [lastQ, setLastQ] = useState(initial.q);

  // Keep the search input in sync with URL-driven navigation.
  if (lastQ !== initial.q) {
    setLastQ(initial.q);
    setQuery(initial.q);
  }

  const pushWith = (patch: Partial<SetupFilterState>) => {
    const next = { ...initial, ...patch };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.category) params.set("category", next.category);
    if (next.minPrice) params.set("minPrice", next.minPrice);
    if (next.maxPrice) params.set("maxPrice", next.maxPrice);
    if (next.sort && next.sort !== "recommended") params.set("sort", next.sort);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/setups?${qs}` : "/setups", { scroll: false });
    });
  };

  const currentPrice =
    PRICE_RANGES.find(
      (range) => range.min === initial.minPrice && range.max === initial.maxPrice,
    )?.value ?? "";

  const hasFilters = Boolean(
    initial.q || initial.category || initial.minPrice || initial.maxPrice || initial.sort !== "recommended",
  );

  return (
    <div className="glass glass-sheen rounded-3xl p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            pushWith({ q: query.trim() });
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari setup, mis. PC Pro atau PS5…"
              className="field pl-10"
              aria-label="Cari setup"
            />
          </div>
          <button
            type="submit"
            className="h-[2.7rem] shrink-0 rounded-xl border border-violet/30 bg-violet/15 px-4 text-sm font-medium text-violet-bright transition hover:bg-violet/25"
          >
            Cari
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => pushWith({ category: "" })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              !initial.category
                ? "border-violet/40 bg-violet/15 text-violet-bright"
                : "border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-foreground",
            )}
          >
            Semua
          </button>
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => pushWith({ category: category.name })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                initial.category === category.name
                  ? "border-violet/40 bg-violet/15 text-violet-bright"
                  : "border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-foreground",
              )}
            >
              {category.name}
              <span className="ml-1.5 text-white/30">{category.count}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter
          </div>
          <FilterSelect
            value={currentPrice}
            onChange={(nextPrice) => {
              const range = PRICE_RANGES.find((item) => item.value === nextPrice);
              pushWith({ minPrice: range?.min ?? "", maxPrice: range?.max ?? "" });
            }}
            label="Filter harga"
            options={PRICE_RANGES.map((range) => ({ value: range.value, label: range.label }))}
            className="w-auto min-w-[10.5rem]"
            buttonClassName="h-9 py-0 text-xs"
          />
          <FilterSelect
            value={initial.sort}
            onChange={(nextSort) => pushWith({ sort: nextSort })}
            label="Urutkan setup"
            options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            className="w-auto min-w-[10.5rem]"
            buttonClassName="h-9 py-0 text-xs"
          />
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                startTransition(() => router.push("/setups"));
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-muted transition hover:bg-white/[0.06] hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          ) : null}
          {pending ? <span className="text-xs text-violet">Memuat…</span> : null}
        </div>
      </div>
    </div>
  );
}
