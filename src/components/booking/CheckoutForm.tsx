"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Building2, Loader2, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";
import { createBookingAction } from "@/src/actions/bookings";
import { useToast } from "@/src/components/ui/ToastProvider";
import { formatIDR, cn } from "@/src/lib/utils";
import { normalizeWhatsAppNumber } from "@/src/lib/whatsapp";

type PaymentMethod = "BANK_TRANSFER" | "QRIS" | "CASH";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  icon: typeof Building2;
}[] = [
  { id: "BANK_TRANSFER", label: "Transfer Bank", icon: Building2 },
  { id: "QRIS", label: "QRIS", icon: QrCode },
  { id: "CASH", label: "Bayar di Tempat", icon: Banknote },
];

export function CheckoutForm({
  setupId,
  startAt,
  durationMinutes,
  total,
  defaultPhone = "",
}: {
  setupId: string;
  startAt: string;
  durationMinutes: number;
  total: number;
  defaultPhone?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [accepted, setAccepted] = useState(false);
  const [phone, setPhone] = useState(defaultPhone);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!accepted) {
      setError("Centang persetujuan kebijakan reservasi terlebih dahulu.");
      return;
    }
    if (!normalizeWhatsAppNumber(phone)) {
      setPhoneError("Masukkan nomor WhatsApp yang valid, contoh 0812 3456 7890.");
      return;
    }
    setPhoneError(null);

    startTransition(async () => {
      const result = await createBookingAction({
        setupId,
        startAt,
        durationMinutes,
        notes: notes.trim() || undefined,
        contactPhone: phone.trim(),
        paymentMethod,
      });

      if (!result.ok) {
        setError(result.message);
        toast(result.message, { variant: "error" });
        return;
      }

      toast(
        paymentMethod === "CASH"
          ? "Reservasi dikonfirmasi. Bayar di kasir saat datang."
          : "Reservasi dibuat. Selesaikan pembayaran sesuai instruksi.",
        { variant: "success" },
      );
      router.push(`/booking/${result.data?.code}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-3">
        <p className="label" id="payment-method-label">
          Metode Pembayaran
        </p>
        <div
          role="radiogroup"
          aria-labelledby="payment-method-label"
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
        >
          {PAYMENT_METHODS.map((method) => {
            const selected = paymentMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={pending}
                onClick={() => setPaymentMethod(method.id)}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border p-3 text-left transition disabled:opacity-60",
                  selected
                    ? "border-violet/50 bg-violet/[0.12] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "border-white/8 bg-white/[0.02] text-muted hover:border-white/15 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    selected ? "bg-violet/20 text-violet-bright" : "bg-white/[0.05] text-white/50",
                  )}
                >
                  <method.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium">{method.label}</span>
                  <span className="mt-0.5 block text-[0.62rem] text-white/40">
                    {selected ? "Dipilih" : "Pilih metode"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-[0.68rem] leading-relaxed text-white/45">
          {paymentMethod === "CASH"
            ? "Slot akan langsung dikonfirmasi. Pembayaran tetap berstatus belum lunas sampai staff mencatat uang yang diterima di kasir."
            : paymentMethod === "QRIS"
              ? "Status pembayaran tetap belum lunas setelah reservasi dibuat. Staff akan memverifikasi QRIS sebelum status berubah menjadi terverifikasi."
              : "Instruksi transfer dan nomor referensi muncul di halaman detail booking setelah reservasi dibuat."}
        </p>
      </div>

      <div>
        <label htmlFor="contactPhone" className="label">
          Nomor WhatsApp <span className="text-white/30">(untuk konfirmasi)</span>
        </label>
        <input
          id="contactPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setPhoneError(null);
          }}
          maxLength={24}
          disabled={pending}
          className="field font-mono text-xs"
          placeholder="0812 3456 7890"
          aria-invalid={Boolean(phoneError)}
          aria-describedby={phoneError ? "contactPhone-error" : "contactPhone-hint"}
        />
        {phoneError ? (
          <p id="contactPhone-error" className="field-message" role="alert">
            {phoneError}
          </p>
        ) : (
          <p id="contactPhone-hint" className="field-hint">
            Staff memakai nomor ini untuk mengirim konfirmasi reservasi via WhatsApp. Nomor
            tersimpan di profilmu.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="label">
          Catatan untuk staff <span className="text-white/30">(opsional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={500}
          rows={3}
          disabled={pending}
          className="field"
          placeholder="Contoh: datang bersama 2 teman, butuh headset tambahan…"
        />
        <p className="field-hint">{notes.length}/500 karakter</p>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-xs leading-relaxed text-white/60 transition hover:border-white/15">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          disabled={pending}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#9b7bff]"
        />
        <span>
          Saya menyetujui kebijakan reservasi dan pembatalan lounge, serta memahami bahwa total
          final <strong className="text-white/85">{formatIDR(total)}</strong> dihitung ulang di
          server saat booking dibuat.
        </span>
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3.5 py-2.5 text-xs text-rose-200"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !accepted}
        className="btn-shine inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-violet-bright to-violet text-sm font-semibold text-[#0a0a12] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_36px_-14px_rgba(155,123,255,0.7)] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
        Konfirmasi Reservasi
      </button>

      <p className="flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-white/35">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
        Ketersediaan dan harga diverifikasi ulang secara transaksional sebelum booking disimpan.
      </p>
    </form>
  );
}
