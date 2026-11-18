"use client";

import { useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isAfter,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function BookingCalendar({
  value,
  onChange,
  minDate,
  maxDate,
  timezoneLabel,
}: {
  value: string;
  onChange: (date: string) => void;
  minDate: string;
  maxDate: string;
  timezoneLabel?: string;
}) {
  const selected = value ? parseISO(value) : parseISO(minDate);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));

  const min = parseISO(minDate);
  const max = parseISO(maxDate);

  const monthStart = startOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let cursor = gridStart; !isAfter(cursor, gridEnd); cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }

  const prevDisabled = isBefore(endOfMonth(subMonths(monthStart, 1)), min) || isBefore(subMonths(monthStart, 1), startOfMonth(min));
  const nextDisabled = isAfter(startOfMonth(addMonths(monthStart, 1)), max);

  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3.5">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setViewMonth((current) => subMonths(current, 1))}
          disabled={prevDisabled}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-white/[0.08] hover:text-foreground disabled:opacity-30"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium capitalize text-foreground">
          {format(viewMonth, "MMMM yyyy", { locale: localeId })}
        </p>
        <button
          type="button"
          onClick={() => setViewMonth((current) => addMonths(current, 1))}
          disabled={nextDisabled}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-white/[0.08] hover:text-foreground disabled:opacity-30"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
          <span key={day} className="py-1 text-[0.62rem] uppercase tracking-wide text-white/30">
            {day}
          </span>
        ))}
        {days.map((day) => {
          const disabled = isBefore(day, min) || isAfter(day, max);
          const isSelected = isSameDay(day, selected);
          const inMonth = isSameMonth(day, viewMonth);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onChange(format(day, "yyyy-MM-dd"))}
              aria-pressed={isSelected}
              aria-label={format(day, "d MMMM yyyy", { locale: localeId })}
              className={cn(
                "relative flex h-8 items-center justify-center rounded-lg text-xs transition",
                !inMonth && "opacity-35",
                disabled
                  ? "cursor-not-allowed text-white/20"
                  : "text-white/75 hover:bg-white/[0.08] hover:text-foreground",
                isSelected &&
                  "bg-gradient-to-b from-violet-bright to-violet font-semibold text-[#0b0b14] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_12px_-4px_rgba(155,123,255,0.7)] hover:from-violet-bright hover:to-violet",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      {timezoneLabel ? (
        <p className="mt-2 text-center text-[0.62rem] text-white/30">
          Zona waktu lounge: {timezoneLabel}
        </p>
      ) : null}
    </div>
  );
}
