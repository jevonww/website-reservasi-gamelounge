/**
 * Helpers for staff-initiated WhatsApp confirmations.
 *
 * These are click-to-chat (`wa.me`) links: the staff member opens WhatsApp with
 * the recipient and message already filled in, then presses send there. Nothing
 * is sent automatically and no WhatsApp credentials/API are required.
 */

export type WhatsAppTemplate = "confirmation" | "payment_reminder" | "cancellation";

export const WHATSAPP_TEMPLATE_LABELS: Record<WhatsAppTemplate, string> = {
  confirmation: "Konfirmasi booking",
  payment_reminder: "Pengingat pembayaran",
  cancellation: "Pembatalan booking",
};

export type WhatsAppBookingMessageInput = {
  template: WhatsAppTemplate;
  customerName: string;
  loungeName: string;
  bookingCode: string;
  setupName: string;
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
  totalLabel: string;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
  address: string;
  loungePhone: string;
  /** Formatted deadline for PENDING bookings, e.g. "17 Nov 2026 · 20:30". */
  paymentExpiresLabel?: string | null;
  /** Lounge cancellation policy, included in the cancellation template. */
  cancellationPolicy?: string | null;
  /** Public booking page URL, omitted in local development. */
  bookingUrl?: string | null;
};

/**
 * Normalize a phone number into the digits-only format expected by wa.me.
 * Indonesian numbers may be written as 08xx, 8xx, +62 8xx, or 62 8xx.
 * Returns `null` when the input is not a usable international number.
 */
export function normalizeWhatsAppNumber(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  const hadPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (!hadPlus) {
    if (digits.startsWith("0")) {
      digits = `62${digits.slice(1)}`;
    } else if (digits.startsWith("8")) {
      digits = `62${digits}`;
    }
  }

  // E.164 allows at most 15 digits; 8 is the shortest realistic mobile number.
  if (!/^\d{8,15}$/.test(digits)) return null;
  // Country code 62 is Indonesia, whose numbers never continue with 0.
  if (digits.startsWith("620")) return null;

  return digits;
}

/** Display helper: "+62 812-3456-7890" for Indonesian numbers. */
export function formatWhatsAppNumber(input: string | null | undefined): string | null {
  const digits = normalizeWhatsAppNumber(input);
  if (!digits) return null;
  if (digits.startsWith("62")) {
    const rest = digits.slice(2);
    const parts = [rest.slice(0, 3), rest.slice(3, 7), rest.slice(7)].filter(Boolean);
    return `+62 ${parts.join("-")}`;
  }
  return `+${digits}`;
}

/** Build a wa.me link with a prefilled message, or null for an invalid number. */
export function buildWhatsAppUrl(
  number: string | null | undefined,
  message: string,
): string | null {
  const digits = normalizeWhatsAppNumber(number);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Pick the most useful template from the current booking state. Staff can still
 * switch templates manually in the panel.
 */
export function defaultWhatsAppTemplate(
  status: string,
  paymentStatus: string,
): WhatsAppTemplate {
  if (status === "CANCELLED" || status === "EXPIRED") return "cancellation";
  if (status === "PENDING" && paymentStatus !== "VERIFIED") return "payment_reminder";
  return "confirmation";
}

/**
 * Public URL for the customer booking page. Local URLs are skipped so a
 * confirmation is never sent with an unusable `localhost` link.
 */
export function publicBookingUrl(
  appUrl: string | null | undefined,
  bookingCode: string,
): string | null {
  const base = (appUrl ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) return null;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(base)) return null;
  return `${base}/booking/${encodeURIComponent(bookingCode)}`;
}

function sessionLines(input: WhatsAppBookingMessageInput) {
  return [
    `Kode booking: ${input.bookingCode}`,
    `Setup: ${input.setupName}`,
    `Jadwal: ${input.dateLabel}, ${input.timeLabel}`,
    `Durasi: ${input.durationLabel}`,
    `Total: ${input.totalLabel}`,
  ];
}

/** Compose the Indonesian WhatsApp message for the selected template. */
export function buildBookingWhatsAppMessage(input: WhatsAppBookingMessageInput): string {
  const greeting = `Halo Kak ${input.customerName}!`;
  const contact = `Ada pertanyaan? Hubungi ${input.loungePhone}.`;
  const location = `Lokasi: ${input.address}`;
  const detail = input.bookingUrl ? `Detail booking: ${input.bookingUrl}` : null;

  if (input.template === "payment_reminder") {
    return [
      greeting,
      "",
      `Reservasi kamu di ${input.loungeName} sudah kami tahan. Tinggal menyelesaikan pembayaran agar slot tidak dilepas.`,
      "",
      ...sessionLines(input),
      `Metode pembayaran: ${input.paymentMethodLabel}`,
      input.paymentExpiresLabel ? `Batas pembayaran: ${input.paymentExpiresLabel}` : null,
      "",
      "Setelah membayar, balas pesan ini dengan bukti transfer/QRIS agar staff dapat memverifikasi.",
      location,
      detail,
      "",
      contact,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
  }

  if (input.template === "cancellation") {
    return [
      greeting,
      "",
      `Booking ${input.bookingCode} di ${input.loungeName} sudah dibatalkan. Slot sudah dilepas dan bisa dipesan ulang kapan saja.`,
      "",
      `Setup: ${input.setupName}`,
      `Jadwal sebelumnya: ${input.dateLabel}, ${input.timeLabel}`,
      `Total: ${input.totalLabel}`,
      input.cancellationPolicy ? "" : null,
      input.cancellationPolicy ?? null,
      "",
      contact,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
  }

  return [
    greeting,
    "",
    `Reservasi kamu di ${input.loungeName} sudah terkonfirmasi. ✅`,
    "",
    ...sessionLines(input),
    `Pembayaran: ${input.paymentMethodLabel} — ${input.paymentStatusLabel}`,
    "",
    "Datang 5–10 menit lebih awal dan tunjukkan kode booking ini di kasir.",
    location,
    detail,
    "",
    contact,
    `Sampai jumpa di ${input.loungeName}!`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
