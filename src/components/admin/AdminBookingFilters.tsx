"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw, Search } from "lucide-react";
import { FilterSelect } from "@/src/components/ui/FilterSelect";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/src/lib/constants";

export interface AdminBookingFilterState {
  q: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  date: string;
}

export function AdminBookingFilters({ initial }: { initial: AdminBookingFilterState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(initial.q);
  const [status, setStatus] = useState(initial.status);
  const [paymentStatus, setPaymentStatus] = useState(initial.paymentStatus);
  const [paymentMethod, setPaymentMethod] = useState(initial.paymentMethod);
  const [date, setDate] = useState(initial.date);
  const [synced, setSynced] = useState(initial);

  if (
    synced.q !== initial.q ||
    synced.status !== initial.status ||
    synced.paymentStatus !== initial.paymentStatus ||
    synced.paymentMethod !== initial.paymentMethod ||
    synced.date !== initial.date
  ) {
    setSynced(initial);
    setQuery(initial.q);
    setStatus(initial.status);
    setPaymentStatus(initial.paymentStatus);
    setPaymentMethod(initial.paymentMethod);
    setDate(initial.date);
  }

  const apply = (next: AdminBookingFilterState) => {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.status) params.set("status", next.status);
    if (next.paymentStatus) params.set("paymentStatus", next.paymentStatus);
    if (next.paymentMethod) params.set("paymentMethod", next.paymentMethod);
    if (next.date) params.set("date", next.date);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/admin/bookings?${qs}` : "/admin/bookings", { scroll: false });
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply({ q: query, status, paymentStatus, paymentMethod, date });
      }}
      className="surface rounded-2xl p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="admin-booking-search"
            className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-white/40"
          >
            Cari booking
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="admin-booking-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari kode, nama, email, setup…"
              className="field h-11 pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet/30 bg-violet/15 px-4 text-sm font-medium text-violet-bright transition hover:bg-violet/25 disabled:opacity-60 lg:flex-none"
          >
            <Filter className="h-3.5 w-3.5" />
            Terapkan
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatus("");
              setPaymentStatus("");
              setPaymentMethod("");
              setDate("");
              startTransition(() => router.push("/admin/bookings"));
            }}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-muted transition hover:border-white/20 hover:bg-white/[0.04] hover:text-foreground"
            aria-label="Reset semua filter"
            title="Reset semua filter"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0">
          <label
            htmlFor="admin-booking-status"
            className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-white/40"
          >
            Status booking
          </label>
          <FilterSelect
            id="admin-booking-status"
            value={status}
            onChange={(nextStatus) => {
              setStatus(nextStatus);
              apply({ q: query, status: nextStatus, paymentStatus, paymentMethod, date });
            }}
            label="Status booking"
            options={[
              { value: "", label: "Semua status" },
              ...Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            buttonClassName="h-11"
          />
        </div>

        <div className="min-w-0">
          <label
            htmlFor="admin-payment-status"
            className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-white/40"
          >
            Status pembayaran
          </label>
          <FilterSelect
            id="admin-payment-status"
            value={paymentStatus}
            onChange={(nextStatus) => {
              setPaymentStatus(nextStatus);
              apply({ q: query, status, paymentStatus: nextStatus, paymentMethod, date });
            }}
            label="Status pembayaran"
            options={[
              { value: "", label: "Semua pembayaran" },
              ...Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            buttonClassName="h-11"
          />
        </div>

        <div className="min-w-0">
          <label
            htmlFor="admin-payment-method"
            className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-white/40"
          >
            Metode pembayaran
          </label>
          <FilterSelect
            id="admin-payment-method"
            value={paymentMethod}
            onChange={(nextMethod) => {
              setPaymentMethod(nextMethod);
              apply({ q: query, status, paymentStatus, paymentMethod: nextMethod, date });
            }}
            label="Metode pembayaran"
            options={[
              { value: "", label: "Semua metode" },
              ...Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            buttonClassName="h-11"
          />
        </div>

        <div className="min-w-0">
          <label
            htmlFor="admin-booking-date"
            className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-white/40"
          >
            Tanggal sesi
          </label>
          <input
            id="admin-booking-date"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              apply({ q: query, status, paymentStatus, paymentMethod, date: event.target.value });
            }}
            className="field h-11 min-w-0"
          />
        </div>
      </div>

      {pending ? (
        <p className="mt-3 text-xs text-violet" role="status">
          Memuat hasil…
        </p>
      ) : null}
    </form>
  );
}
