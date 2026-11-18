"use client";

import { Clock } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Skeleton } from "@/src/components/ui/LoadingSkeleton";

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
  endLabel: string;
  available: boolean;
}

export function TimeSlotPicker({
  slots,
  selected,
  onSelect,
  loading,
  error,
}: {
  slots: TimeSlot[];
  selected: string;
  onSelect: (start: string) => void;
  loading: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2" aria-busy="true" aria-label="Memuat slot">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-rose-300/20 bg-rose-300/[0.05] px-3 py-2.5 text-xs text-rose-200">
        {error}
      </p>
    );
  }

  if (!slots.length) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3 text-xs text-muted">
        <Clock className="h-3.5 w-3.5" />
        Tidak ada slot untuk durasi ini di tanggal tersebut. Coba tanggal atau durasi lain.
      </div>
    );
  }

  const availableCount = slots.filter((slot) => slot.available).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[0.68rem] text-white/35">
        <span>{availableCount} slot tersedia</span>
        <span>WIB</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot) => {
          const isSelected = selected === slot.start;
          return (
            <button
              key={slot.start}
              type="button"
              disabled={!slot.available}
              onClick={() => onSelect(slot.start)}
              aria-pressed={isSelected}
              className={cn(
                "flex h-10 flex-col items-center justify-center rounded-xl border text-[0.72rem] transition duration-200",
                isSelected
                  ? "border-violet/60 bg-violet/20 text-white shadow-[0_0_0_1px_rgba(155,123,255,0.35),0_8px_20px_-10px_rgba(155,123,255,0.7)]"
                  : slot.available
                    ? "border-white/10 bg-white/[0.03] text-white/75 hover:-translate-y-0.5 hover:border-cyan/40 hover:bg-cyan/10 hover:text-white"
                    : "cursor-not-allowed border-white/5 bg-white/[0.01] text-white/20 line-through",
              )}
            >
              <span className="font-medium">
                {slot.label}–{slot.endLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
