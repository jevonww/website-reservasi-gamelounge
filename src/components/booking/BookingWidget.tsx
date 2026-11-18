"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AlertCircle, ArrowRight, CalendarDays, Loader2, ShieldCheck, Timer } from "lucide-react";
import { BookingCalendar } from "@/src/components/booking/BookingCalendar";
import { TimeSlotPicker, type TimeSlot } from "@/src/components/booking/TimeSlotPicker";
import { durationOptions, calculateBookingPrice } from "@/src/lib/pricing";
import { durationLabel } from "@/src/lib/time";
import { cn, formatIDR } from "@/src/lib/utils";

export function BookingWidget({
  setup,
  settings,
  today,
  maxDate,
}: {
  setup: { id: string; name: string; slug: string; hourlyRate: number; status: string };
  settings: {
    timezone: string;
    minDurationMinutes: number;
    maxDurationMinutes: number;
    slotIntervalMinutes: number;
    openTime: string;
    closeTime: string;
    paymentExpirationMinutes: number;
  };
  today: string;
  maxDate: string;
}) {
  const options = useMemo(
    () =>
      durationOptions({
        minDurationMinutes: settings.minDurationMinutes,
        maxDurationMinutes: settings.maxDurationMinutes,
        slotIntervalMinutes: settings.slotIntervalMinutes,
      }),
    [settings],
  );

  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState(settings.minDurationMinutes);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const available = setup.status === "AVAILABLE";

  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();

    async function loadSlots() {
      setLoading(true);
      setError(null);
      setSelected("");
      setSlots([]);

      try {
        const response = await fetch(
          `/api/availability?setupId=${encodeURIComponent(setup.id)}&date=${date}&duration=${duration}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const data = (await response.json()) as { slots?: TimeSlot[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Gagal memuat slot.");
        setSlots(data.slots ?? []);
      } catch (cause) {
        if ((cause as Error).name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Gagal memuat slot.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadSlots();
    return () => controller.abort();
  }, [available, date, duration, setup.id]);

  const selectedSlot = slots.find((slot) => slot.start === selected) ?? null;
  const total = selectedSlot ? calculateBookingPrice(setup.hourlyRate, duration) : 0;

  const checkoutHref = selectedSlot
    ? `/booking/checkout?${new URLSearchParams({
        setup: setup.slug,
        start: selectedSlot.start,
        duration: String(duration),
      }).toString()}`
    : "/setups";

  return (
    <div className="glass-strong glass-sheen rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/40">Reservasi</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Pilih jadwal sesi</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.68rem] text-white/55">
          {settings.openTime}–{settings.closeTime}
        </div>
      </div>

      {!available ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-3.5 text-xs leading-relaxed text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Setup ini sedang {setup.status === "MAINTENANCE" ? "dalam perawatan" : "tidak aktif"} dan
          belum dapat dipesan. Silakan pilih setup lain.
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-4">
            <div>
              <p className="label flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-violet" />
                Tanggal
              </p>
              <BookingCalendar
                value={date}
                onChange={setDate}
                minDate={today}
                maxDate={maxDate}
                timezoneLabel={settings.timezone}
              />
            </div>

            <div>
              <label className="label flex items-center gap-1.5" htmlFor="duration">
                <Timer className="h-3.5 w-3.5 text-cyan" />
                Durasi
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="field"
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {durationLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="label">Jam mulai</p>
              <TimeSlotPicker
                slots={slots}
                selected={selected}
                onSelect={setSelected}
                loading={loading}
                error={error}
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-black/25 p-4">
            <div className="flex items-center justify-between text-xs text-white/45">
              <span>{formatIDR(setup.hourlyRate)} / jam</span>
              <span>{durationLabel(duration)}</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.1em] text-white/35">
                  Estimasi total
                </p>
                <p className="text-xl font-semibold text-foreground">
                  {selectedSlot ? formatIDR(total) : "—"}
                </p>
              </div>
              {selectedSlot ? (
                <div className="text-right text-xs text-white/55">
                  <p className="capitalize">
                    {format(parseISO(date), "d MMMM yyyy", { locale: localeId })}
                  </p>
                  <p className="mt-0.5">
                    {selectedSlot.label}–{selectedSlot.endLabel} WIB
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <Link
            href={checkoutHref}
            aria-disabled={!selectedSlot}
            className={cn(
              "btn-shine group mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[0.92rem] font-semibold transition",
              selectedSlot
                ? "bg-gradient-to-b from-violet-bright to-violet text-[#0a0a12] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_36px_-14px_rgba(155,123,255,0.7)] hover:-translate-y-0.5"
                : "cursor-not-allowed border border-white/8 bg-white/[0.03] text-white/30",
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Lanjut ke Checkout
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>

          <p className="mt-3 flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-white/35">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
            Harga final dihitung ulang di server. Slot dicek ulang saat checkout untuk mencegah
            double booking.
          </p>
        </>
      )}
    </div>
  );
}
