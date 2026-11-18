"use client";

import { useMemo, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { FormField } from "@/src/components/ui/FormField";
import { useToast } from "@/src/components/ui/ToastProvider";
import {
  WHATSAPP_TEMPLATE_LABELS,
  buildBookingWhatsAppMessage,
  buildWhatsAppUrl,
  defaultWhatsAppTemplate,
  formatWhatsAppNumber,
  normalizeWhatsAppNumber,
  type WhatsAppTemplate,
} from "@/src/lib/whatsapp";

type WhatsAppConfirmPanelProps = {
  customerName: string;
  customerPhone: string | null;
  status: string;
  paymentStatus: string;
  loungeName: string;
  bookingCode: string;
  setupName: string;
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
  totalLabel: string;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
  paymentExpiresLabel: string | null;
  cancellationPolicy: string;
  address: string;
  loungePhone: string;
  bookingUrl: string | null;
};

export function WhatsAppConfirmPanel({
  customerName,
  customerPhone,
  status,
  paymentStatus,
  loungeName,
  bookingCode,
  setupName,
  dateLabel,
  timeLabel,
  durationLabel,
  totalLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentExpiresLabel,
  cancellationPolicy,
  address,
  loungePhone,
  bookingUrl,
}: WhatsAppConfirmPanelProps) {
  const { toast } = useToast();
  const defaultTemplate = useMemo(
    () => defaultWhatsAppTemplate(status, paymentStatus),
    [status, paymentStatus],
  );
  const [template, setTemplate] = useState<WhatsAppTemplate>(defaultTemplate);
  const [rawPhone, setRawPhone] = useState(customerPhone ?? "");
  const [copied, setCopied] = useState(false);

  const build = (nextTemplate: WhatsAppTemplate) =>
    buildBookingWhatsAppMessage({
      template: nextTemplate,
      customerName,
      loungeName,
      bookingCode,
      setupName,
      dateLabel,
      timeLabel,
      durationLabel,
      totalLabel,
      paymentMethodLabel,
      paymentStatusLabel,
      address,
      loungePhone,
      paymentExpiresLabel,
      cancellationPolicy,
      bookingUrl,
    });

  const [message, setMessage] = useState(() => build(defaultTemplate));

  const digits = normalizeWhatsAppNumber(rawPhone);
  const displayNumber = formatWhatsAppNumber(rawPhone);
  const url = digits ? buildWhatsAppUrl(digits, message) : null;
  const templateMessage = build(template);
  const edited = message !== templateMessage;

  const phoneError = rawPhone.trim()
    ? digits
      ? undefined
      : "Nomor tidak valid. Gunakan format 08xx, 62xx, atau +62xx."
    : undefined;

  const changeTemplate = (next: WhatsAppTemplate) => {
    setTemplate(next);
    setMessage(build(next));
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast("Pesan WhatsApp disalin.", { variant: "success" });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Gagal menyalin pesan. Salin manual ya.", { variant: "error" });
    }
  };

  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircle className="h-4 w-4 text-emerald-300" />
            Konfirmasi via WhatsApp
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
            Nomor pelanggan dan isi pesan sudah terisi otomatis. WhatsApp terbuka di tab baru —
            periksa sekali lagi lalu tekan kirim di aplikasi WhatsApp.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-white/40">
          Kirim manual
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          <FormField
            label="Nomor WhatsApp pelanggan"
            htmlFor="wa-phone"
            error={phoneError}
            hint={
              customerPhone
                ? "Diambil dari profil pelanggan. Kamu bisa menggantinya."
                : "Pelanggan belum mengisi nomor di profil. Minta nomornya lalu isi di sini."
            }
          >
            <input
              id="wa-phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className="field font-mono text-xs"
              placeholder="08xx xxxx xxxx"
              value={rawPhone}
              onChange={(event) => setRawPhone(event.target.value)}
              aria-invalid={Boolean(phoneError)}
            />
          </FormField>

          <FormField label="Jenis pesan" htmlFor="wa-template">
            <select
              id="wa-template"
              className="field"
              value={template}
              onChange={(event) => changeTemplate(event.target.value as WhatsAppTemplate)}
            >
              {(Object.keys(WHATSAPP_TEMPLATE_LABELS) as WhatsAppTemplate[]).map((value) => (
                <option key={value} value={value}>
                  {WHATSAPP_TEMPLATE_LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>

          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-xs">
            <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">Penerima</p>
            {displayNumber ? (
              <>
                <p className="mt-1 text-white/85">{customerName}</p>
                <p className="font-mono text-[0.7rem] text-emerald-200">{displayNumber}</p>
                <p className="mt-1 text-[0.65rem] text-white/35">
                  Pastikan nomor ini benar-benar milik pelanggan.
                </p>
              </>
            ) : (
              <p className="mt-1 text-[0.7rem] leading-relaxed text-white/45">
                Masukkan nomor WhatsApp yang valid untuk mengaktifkan tombol kirim.
              </p>
            )}
          </div>
        </div>

        <div>
          <FormField
            label="Isi pesan"
            htmlFor="wa-message"
            hint={`${message.length} karakter · bisa diubah sebelum dikirim`}
          >
            <textarea
              id="wa-message"
              rows={11}
              className="field text-xs leading-relaxed"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </FormField>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-400 px-5 text-sm font-semibold text-[#07130c] transition hover:-translate-y-0.5"
              >
                <MessageCircle className="h-4 w-4" />
                Buka WhatsApp
              </a>
            ) : (
              <span className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-400 px-5 text-sm font-semibold text-[#07130c] opacity-50">
                <MessageCircle className="h-4 w-4" />
                Buka WhatsApp
              </span>
            )}

            <button
              type="button"
              onClick={copyMessage}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs text-muted transition hover:border-white/20 hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-300" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Tersalin" : "Salin pesan"}
            </button>

            {edited ? (
              <button
                type="button"
                onClick={() => setMessage(templateMessage)}
                className="text-[0.7rem] text-white/40 underline-offset-2 transition hover:text-white/70 hover:underline"
              >
                Pulihkan teks awal
              </button>
            ) : null}
          </div>

          <p className="mt-2 text-[0.68rem] leading-relaxed text-white/35">
            Aplikasi tidak mengirim pesan otomatis dan tidak memakai WhatsApp API. Pastikan kamu
            mengirim dari nomor lounge yang resmi.
          </p>
        </div>
      </div>
    </section>
  );
}
