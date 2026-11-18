"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, LogIn, PlayCircle, ShieldCheck, XCircle } from "lucide-react";
import { staffTransitionAction, staffVerifyPaymentAction } from "@/src/actions/bookings";
import { useToast } from "@/src/components/ui/ToastProvider";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { FormField } from "@/src/components/ui/FormField";
import { PAYMENT_METHOD_LABELS } from "@/src/lib/constants";
import { formatIDR } from "@/src/lib/utils";

type TransitionAction = "check_in" | "start" | "complete" | "cancel";
type PaymentMethod = "BANK_TRANSFER" | "QRIS" | "CASH";

export function BookingManagePanel({
  bookingId,
  bookingCode,
  status,
  paymentStatus,
  totalPrice,
  transactionRef,
  method,
  endTimeLabel,
  scheduleEnded,
}: {
  bookingId: string;
  bookingCode: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  transactionRef: string | null;
  method: PaymentMethod;
  endTimeLabel: string;
  scheduleEnded: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const isCashPayment = method === "CASH";
  const [ref, setRef] = useState(transactionRef ?? (isCashPayment ? bookingCode : ""));
  const [refError, setRefError] = useState<string | undefined>();
  const [payMethod, setPayMethod] = useState<PaymentMethod>(method);
  const [verifyPending, startVerify] = useTransition();

  const runTransition = (action: TransitionAction) => {
    startTransition(async () => {
      const result = await staffTransitionAction(bookingId, action);
      if (result.ok) {
        toast(result.message ?? "Status diperbarui.", { variant: "success" });
        router.refresh();
      } else {
        toast(result.message, { variant: "error" });
      }
    });
  };

  const verify = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRefError(undefined);
    if (ref.trim().length < 3) {
      setRefError("Referensi transaksi minimal 3 karakter.");
      return;
    }
    startVerify(async () => {
      const result = await staffVerifyPaymentAction({
        bookingId,
        transactionRef: ref.trim(),
        method: payMethod,
      });
      if (result.ok) {
        toast(result.message ?? "Pembayaran diverifikasi.", { variant: "success" });
        router.refresh();
      } else {
        toast(result.message, { variant: "error" });
      }
    });
  };

  const paymentSettled = paymentStatus === "VERIFIED" || paymentStatus === "REFUNDED";
  const canVerify =
    !paymentSettled &&
    (status === "PENDING" ||
      (isCashPayment && ["CONFIRMED", "CHECKED_IN", "ACTIVE", "COMPLETED"].includes(status)));
  const canCheckIn = status === "CONFIRMED" && !scheduleEnded;
  const canStart = status === "CHECKED_IN" && !scheduleEnded;
  const canComplete = status === "ACTIVE" || (status === "CHECKED_IN" && scheduleEnded);
  const canCancel = status === "PENDING" || status === "CONFIRMED";
  const verifyTitle = isCashPayment
    ? "Konfirmasi pembayaran di tempat"
    : method === "QRIS"
      ? "Verifikasi pembayaran QRIS"
      : "Verifikasi pembayaran transfer";
  const verifyDescription = isCashPayment
    ? `Konfirmasi setelah uang sebesar ${formatIDR(totalPrice)} benar-benar diterima di kasir. Jangan menekan tombol sebelum pembayaran diterima.`
    : `Pastikan dana sebesar ${formatIDR(totalPrice)} sudah masuk sebelum memverifikasi. Status booking akan berubah menjadi terkonfirmasi.`;

  return (
    <div className="space-y-4">
      {canVerify ? (
        <form onSubmit={verify} className="surface rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            {verifyTitle}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{verifyDescription}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            <FormField
              label="Referensi pembayaran"
              htmlFor="transactionRef"
              error={refError}
              hint={
                isCashPayment
                  ? "Nomor nota kasir atau kode booking. Default memakai kode booking."
                  : "Nomor referensi bank / ID transaksi QRIS."
              }
            >
              <input
                id="transactionRef"
                value={ref}
                onChange={(event) => setRef(event.target.value)}
                className="field font-mono text-xs"
                placeholder={isCashPayment ? bookingCode : "TRX-2026-0001"}
              />
            </FormField>
            <FormField label="Metode diterima" htmlFor="paymentMethod">
              <select
                id="paymentMethod"
                value={payMethod}
                onChange={(event) => setPayMethod(event.target.value as PaymentMethod)}
                className="field"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <button
            type="submit"
            disabled={verifyPending}
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-400 px-5 text-sm font-semibold text-[#07130c] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
          >
            {verifyPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isCashPayment ? "Konfirmasi pembayaran diterima" : "Verifikasi pembayaran"}
          </button>
        </form>
      ) : null}

      <div className="surface rounded-2xl p-5">
        <h2 className="text-sm font-semibold">Aksi sesi</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Alur: terkonfirmasi → check-in → aktif → selesai. Setelah pelanggan check-in, sesi
          dimulai otomatis saat jam booking tiba dan selalu selesai otomatis pukul{" "}
          <span className="text-white/70">{endTimeLabel}</span>. Pelanggan yang datang terlambat
          tetap selesai pada jam tersebut, jadi sisa waktunya terpotong.
        </p>
        {scheduleEnded && (status === "CHECKED_IN" || status === "CONFIRMED") ? (
          <p className="mt-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-3 text-[0.7rem] leading-relaxed text-amber-100">
            Jadwal sesi sudah berakhir pukul {endTimeLabel}. Check-in dan mulai sesi ditolak
            sistem; selesaikan sesi atau batalkan booking sesuai kebijakan lounge.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {canCheckIn ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => runTransition("check_in")}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-cyan/30 bg-cyan/10 px-4 text-xs font-medium text-cyan transition hover:bg-cyan/20 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
              Check-in pelanggan
            </button>
          ) : null}

          {canStart ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => runTransition("start")}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-violet/30 bg-violet/15 px-4 text-xs font-medium text-violet-bright transition hover:bg-violet/25 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
              Mulai sesi
            </button>
          ) : null}

          {canComplete ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => runTransition("complete")}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/20 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Selesaikan sesi
            </button>
          ) : null}

          {canCancel ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setCancelOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-300/25 bg-rose-300/[0.06] px-4 text-xs font-medium text-rose-200 transition hover:bg-rose-300/[0.12] disabled:opacity-60"
            >
              <XCircle className="h-3.5 w-3.5" />
              Batalkan booking
            </button>
          ) : null}

          {!canCheckIn && !canStart && !canComplete && !canCancel ? (
            <p className="text-xs text-white/40">
              Tidak ada aksi tersedia untuk status booking ini.
            </p>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Batalkan booking ini?"
        description="Slot akan dilepas. Jika pembayaran sudah diverifikasi, status pembayaran akan ditandai refund."
        confirmLabel="Ya, batalkan"
        onConfirm={() => runTransition("cancel")}
      />
    </div>
  );
}
