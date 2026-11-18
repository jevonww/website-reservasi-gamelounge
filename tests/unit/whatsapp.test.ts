import { describe, expect, it } from "vitest";
import {
  WHATSAPP_TEMPLATE_LABELS,
  buildBookingWhatsAppMessage,
  buildWhatsAppUrl,
  defaultWhatsAppTemplate,
  formatWhatsAppNumber,
  normalizeWhatsAppNumber,
  publicBookingUrl,
  type WhatsAppBookingMessageInput,
} from "@/src/lib/whatsapp";

const baseInput: WhatsAppBookingMessageInput = {
  template: "confirmation",
  customerName: "Budi Santoso",
  loungeName: "LEVELUP",
  bookingCode: "LVL-261117-ABCD2345",
  setupName: "PC Gaming Pro",
  dateLabel: "Selasa, 17 November 2026",
  timeLabel: "19:00–21:00 WIB",
  durationLabel: "2 jam",
  totalLabel: "Rp150.000",
  paymentMethodLabel: "Transfer Bank",
  paymentStatusLabel: "Terverifikasi",
  address: "Jl. Contoh No. 12, Jakarta Selatan",
  loungePhone: "+62 812 0000 0000",
  paymentExpiresLabel: "17 Nov 2026 · 19:30",
  cancellationPolicy: "Pembatalan gratis hingga 2 jam sebelum sesi dimulai.",
  bookingUrl: "https://levelup.id/booking/LVL-261117-ABCD2345",
};

describe("normalizeWhatsAppNumber", () => {
  it("normalizes Indonesian numbers written in common formats", () => {
    expect(normalizeWhatsAppNumber("0812-3456-7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("(0812) 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("62 812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("0062 812 3456 7890")).toBe("6281234567890");
  });

  it("keeps explicit international numbers", () => {
    expect(normalizeWhatsAppNumber("+65 8123 4567")).toBe("6581234567");
  });

  it("rejects empty, malformed, and out-of-range numbers", () => {
    expect(normalizeWhatsAppNumber(null)).toBeNull();
    expect(normalizeWhatsAppNumber("")).toBeNull();
    expect(normalizeWhatsAppNumber("abc")).toBeNull();
    expect(normalizeWhatsAppNumber("0812")).toBeNull();
    expect(normalizeWhatsAppNumber("+1234567890123456")).toBeNull();
    expect(normalizeWhatsAppNumber("6208123456789")).toBeNull();
  });
});

describe("formatWhatsAppNumber", () => {
  it("renders a readable Indonesian format", () => {
    expect(formatWhatsAppNumber("0812-3456-7890")).toBe("+62 812-3456-7890");
  });

  it("falls back to a plain international format", () => {
    expect(formatWhatsAppNumber("+65 8123 4567")).toBe("+6581234567");
    expect(formatWhatsAppNumber("bukan nomor")).toBeNull();
  });
});

describe("buildWhatsAppUrl", () => {
  it("builds a wa.me link with an encoded message", () => {
    const message = "Halo Budi!\nKode: LVL-1 & tes";
    const url = buildWhatsAppUrl("0812-3456-7890", message);
    expect(url).toBe(
      `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`,
    );
  });

  it("returns null for an invalid number", () => {
    expect(buildWhatsAppUrl("", "halo")).toBeNull();
    expect(buildWhatsAppUrl("0812", "halo")).toBeNull();
  });
});

describe("defaultWhatsAppTemplate", () => {
  it("uses a payment reminder while a booking is still unpaid", () => {
    expect(defaultWhatsAppTemplate("PENDING", "UNPAID")).toBe("payment_reminder");
    expect(defaultWhatsAppTemplate("PENDING", "PENDING")).toBe("payment_reminder");
  });

  it("uses a confirmation for confirmed sessions", () => {
    expect(defaultWhatsAppTemplate("CONFIRMED", "VERIFIED")).toBe("confirmation");
    expect(defaultWhatsAppTemplate("CONFIRMED", "UNPAID")).toBe("confirmation");
    expect(defaultWhatsAppTemplate("ACTIVE", "VERIFIED")).toBe("confirmation");
  });

  it("uses a cancellation message for closed bookings", () => {
    expect(defaultWhatsAppTemplate("CANCELLED", "REFUNDED")).toBe("cancellation");
    expect(defaultWhatsAppTemplate("EXPIRED", "UNPAID")).toBe("cancellation");
  });

  it("has a label for every template", () => {
    expect(Object.keys(WHATSAPP_TEMPLATE_LABELS)).toEqual([
      "confirmation",
      "payment_reminder",
      "cancellation",
    ]);
  });
});

describe("publicBookingUrl", () => {
  it("builds a link for public app URLs", () => {
    expect(publicBookingUrl("https://levelup.id", "LVL-1")).toBe(
      "https://levelup.id/booking/LVL-1",
    );
    expect(publicBookingUrl("https://levelup.id/", "LVL-1")).toBe(
      "https://levelup.id/booking/LVL-1",
    );
  });

  it("skips local and invalid URLs", () => {
    expect(publicBookingUrl("http://localhost:3000", "LVL-1")).toBeNull();
    expect(publicBookingUrl("http://127.0.0.1:3000", "LVL-1")).toBeNull();
    expect(publicBookingUrl("bukan-url", "LVL-1")).toBeNull();
    expect(publicBookingUrl(undefined, "LVL-1")).toBeNull();
  });
});

describe("buildBookingWhatsAppMessage", () => {
  it("includes booking details in the confirmation message", () => {
    const message = buildBookingWhatsAppMessage(baseInput);
    expect(message).toContain("Halo Kak Budi Santoso!");
    expect(message).toContain(baseInput.bookingCode);
    expect(message).toContain(baseInput.setupName);
    expect(message).toContain(baseInput.dateLabel);
    expect(message).toContain(baseInput.timeLabel);
    expect(message).toContain(baseInput.totalLabel);
    expect(message).toContain("sudah terkonfirmasi");
    expect(message).toContain(`Detail booking: ${baseInput.bookingUrl}`);
    expect(message).toContain(baseInput.address);
  });

  it("omits the booking link when no public URL is available", () => {
    const message = buildBookingWhatsAppMessage({ ...baseInput, bookingUrl: null });
    expect(message).not.toContain("Detail booking:");
  });

  it("mentions the payment deadline in the reminder message", () => {
    const message = buildBookingWhatsAppMessage({
      ...baseInput,
      template: "payment_reminder",
    });
    expect(message).toContain("menyelesaikan pembayaran");
    expect(message).toContain("Batas pembayaran: 17 Nov 2026 · 19:30");
    expect(message).toContain("bukti transfer/QRIS");
  });

  it("includes the cancellation policy in the cancellation message", () => {
    const message = buildBookingWhatsAppMessage({
      ...baseInput,
      template: "cancellation",
    });
    expect(message).toContain("sudah dibatalkan");
    expect(message).toContain(baseInput.cancellationPolicy ?? "");
    expect(message).not.toContain(baseInput.bookingUrl ?? "");
  });
});
