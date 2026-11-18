import "server-only";
import { randomBytes } from "node:crypto";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingStatus } from "@/src/generated/prisma/enums";
import type { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import { getSettings } from "@/src/lib/settings";
import {
  BLOCKING_BOOKING_STATUSES,
  FINAL_BOOKING_STATUSES,
} from "@/src/lib/constants";
import {
  buildDailySlots,
  isWithinOperatingHours,
  startOfLoungeDayUtc,
} from "@/src/lib/time";
import { calculateBookingPrice, validateDuration } from "@/src/lib/pricing";
import { assertTransition, isCancellable } from "@/src/lib/booking/status";
import { normalizeWhatsAppNumber } from "@/src/lib/whatsapp";

type Tx = Prisma.TransactionClient;

export class BookingError extends Error {
  code:
    | "INVALID_INPUT"
    | "SETUP_NOT_FOUND"
    | "SETUP_UNAVAILABLE"
    | "OUTSIDE_HOURS"
    | "SLOT_TAKEN"
    | "PAST_TIME"
    | "NOT_FOUND"
    | "FORBIDDEN"
    | "INVALID_STATUS"
    | "NOT_CANCELLABLE"
    | "PAYMENT_INVALID"
    | "CONFLICT";

  constructor(code: BookingError["code"], message: string) {
    super(message);
    this.name = "BookingError";
    this.code = code;
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBookingCode(startAt: Date = new Date(), timeZone = "Asia/Jakarta") {
  const dateStr = formatInTimeZone(startAt, timeZone, "yyMMdd");
  const bytes = randomBytes(8);
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];
  }
  return `LVL-${dateStr}-${code}`;
}

/** Release pending reservations whose payment window has elapsed. */
export async function expireStaleBookings(setupId?: string) {
  return prisma.booking.updateMany({
    where: {
      status: "PENDING",
      paymentExpiresAt: { lt: new Date() },
      ...(setupId ? { setupId } : {}),
    },
    data: { status: "EXPIRED" },
  });
}

export interface SessionSyncResult {
  /** Sessions that moved from CHECKED_IN to ACTIVE. */
  started: number;
  /** Sessions that moved from CHECKED_IN/ACTIVE to COMPLETED. */
  completed: number;
}

/**
 * Advance checked-in sessions according to the booked schedule.
 *
 * - A session starts automatically once the booked start time has passed.
 *   `startedAt` is the later of the booked start and the actual check-in, so a
 *   late arrival never moves the end of the session.
 * - A session always ends at the booked `endAt`, even if the customer arrived
 *   late (the remaining time is simply shorter).
 * - Bookings that were never checked in (CONFIRMED/PENDING) are left alone so
 *   no-shows stay visible for staff to handle.
 *
 * Safe to call from page loads: each update is guarded by the expected status so
 * concurrent calls cannot double-transition or duplicate audit entries.
 */
export async function syncScheduledSessions(now: Date = new Date()): Promise<SessionSyncResult> {
  const [startCandidates, completeCandidates] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: "CHECKED_IN",
        startAt: { lte: now },
        endAt: { gt: now },
      },
      select: { id: true, startAt: true, checkedInAt: true },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["CHECKED_IN", "ACTIVE"] },
        endAt: { lte: now },
      },
      select: { id: true, status: true, endAt: true, startedAt: true, checkedInAt: true },
    }),
  ]);

  // A session whose end time has passed must be completed, never started.
  const endedIds = new Set(completeCandidates.map((booking) => booking.id));

  let started = 0;
  for (const booking of startCandidates) {
    if (endedIds.has(booking.id)) continue;

    const lateByMs =
      booking.checkedInAt && booking.checkedInAt > booking.startAt
        ? booking.checkedInAt.getTime() - booking.startAt.getTime()
        : 0;
    const startedAt =
      lateByMs > 0 && booking.checkedInAt ? booking.checkedInAt : booking.startAt;

    const result = await prisma.booking.updateMany({
      where: { id: booking.id, status: "CHECKED_IN" },
      data: { status: "ACTIVE", startedAt },
    });
    if (result.count === 0) continue;
    started += result.count;

    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: "booking.auto_started",
        entityType: "Booking",
        entityId: booking.id,
        bookingId: booking.id,
        metadata: {
          from: "CHECKED_IN",
          to: "ACTIVE",
          scheduledStartAt: booking.startAt.toISOString(),
          checkedInAt: booking.checkedInAt?.toISOString() ?? null,
          startedAt: startedAt.toISOString(),
          lateMinutes: Math.floor(lateByMs / 60_000),
        },
      },
    });
  }

  let completed = 0;
  for (const booking of completeCandidates) {
    const result = await prisma.booking.updateMany({
      where: { id: booking.id, status: { in: ["CHECKED_IN", "ACTIVE"] } },
      data: { status: "COMPLETED", completedAt: booking.endAt },
    });
    if (result.count === 0) continue;
    completed += result.count;

    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: "booking.auto_completed",
        entityType: "Booking",
        entityId: booking.id,
        bookingId: booking.id,
        metadata: {
          from: booking.status,
          to: "COMPLETED",
          scheduledEndAt: booking.endAt.toISOString(),
          startedAt: booking.startedAt?.toISOString() ?? null,
          checkedInAt: booking.checkedInAt?.toISOString() ?? null,
          completedAt: booking.endAt.toISOString(),
        },
      },
    });
  }

  return { started, completed };
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  label: string;
  endLabel: string;
  available: boolean;
}

export async function getSetupAvailability(input: {
  setupId: string;
  date: string;
  durationMinutes: number;
}): Promise<{ slots: AvailabilitySlot[]; timezone: string; date: string }> {
  const settings = await getSettings();
  const setup = await prisma.setup.findUnique({ where: { id: input.setupId } });
  if (!setup) throw new BookingError("SETUP_NOT_FOUND", "Setup tidak ditemukan.");
  if (setup.status !== "AVAILABLE") {
    throw new BookingError("SETUP_UNAVAILABLE", "Setup sedang tidak dapat dipesan.");
  }

  const durationError = validateDuration(input.durationMinutes, settings);
  if (durationError) throw new BookingError("INVALID_INPUT", durationError);

  await expireStaleBookings(setup.id);
  await syncScheduledSessions();

  const dayStart = startOfLoungeDayUtc(input.date, settings.timezone);
  const dayEnd = addMinutes(dayStart, 24 * 60);

  const bookings = await prisma.booking.findMany({
    where: {
      setupId: setup.id,
      status: { in: [...BLOCKING_BOOKING_STATUSES] },
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
    select: { startAt: true, endAt: true },
  });

  const now = new Date();
  const slots = buildDailySlots({
    date: input.date,
    timeZone: settings.timezone,
    openTime: settings.openTime,
    closeTime: settings.closeTime,
    slotIntervalMinutes: settings.slotIntervalMinutes,
    durationMinutes: input.durationMinutes,
  });

  const available: AvailabilitySlot[] = slots.map((slot) => {
    const overlaps = bookings.some(
      (booking) => booking.startAt < slot.end && booking.endAt > slot.start,
    );
    const endLabel = slot.end.toISOString();
    return {
      start: slot.start.toISOString(),
      end: endLabel,
      label: slot.label,
      endLabel: new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: settings.timezone,
      }).format(slot.end),
      available: !overlaps && slot.start.getTime() > now.getTime(),
    };
  });

  return { slots: available, timezone: settings.timezone, date: input.date };
}

export interface CreateBookingInput {
  userId: string;
  setupId: string;
  startAt: string | Date;
  durationMinutes: number;
  notes?: string;
  /** Optional WhatsApp number; when present it is saved to the customer profile. */
  contactPhone?: string;
  paymentMethod?: "BANK_TRANSFER" | "QRIS" | "CASH";
}

const BOOKING_INCLUDE = {
  setup: true,
  payment: true,
  user: { select: { id: true, name: true, email: true, phone: true } },
} satisfies Prisma.BookingInclude;

export async function createBooking(input: CreateBookingInput) {
  const settings = await getSettings();

  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new BookingError("INVALID_INPUT", "Durasi tidak valid.");
  }

  const durationError = validateDuration(input.durationMinutes, settings);
  if (durationError) throw new BookingError("INVALID_INPUT", durationError);

  const start = input.startAt instanceof Date ? input.startAt : new Date(input.startAt);
  if (Number.isNaN(start.getTime())) {
    throw new BookingError("INVALID_INPUT", "Waktu mulai tidak valid.");
  }
  const end = addMinutes(start, input.durationMinutes);

  if (start.getTime() <= Date.now()) {
    throw new BookingError("PAST_TIME", "Waktu mulai sudah lewat.");
  }

  const setup = await prisma.setup.findUnique({ where: { id: input.setupId } });
  if (!setup) throw new BookingError("SETUP_NOT_FOUND", "Setup tidak ditemukan.");
  if (setup.status !== "AVAILABLE") {
    throw new BookingError("SETUP_UNAVAILABLE", "Setup sedang tidak dapat dipesan.");
  }

  if (
    !isWithinOperatingHours({
      start,
      end,
      timeZone: settings.timezone,
      openTime: settings.openTime,
      closeTime: settings.closeTime,
    })
  ) {
    throw new BookingError(
      "OUTSIDE_HOURS",
      `Reservasi harus berada di dalam jam operasional ${settings.openTime}–${settings.closeTime}.`,
    );
  }

  // Server-side price calculation — never trust the client.
  const totalPrice = calculateBookingPrice(setup.hourlyRate, input.durationMinutes);

  const contactPhone = input.contactPhone?.trim()
    ? normalizeWhatsAppNumber(input.contactPhone)
    : null;
  if (input.contactPhone?.trim() && !contactPhone) {
    throw new BookingError("INVALID_INPUT", "Nomor WhatsApp tidak valid.");
  }

  const method = input.paymentMethod ?? "BANK_TRANSFER";
  const isCash = method === "CASH";
  const bookingStatus = isCash ? "CONFIRMED" : "PENDING";
  const paymentExpiresAt = isCash ? null : addMinutes(new Date(), settings.paymentExpirationMinutes);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = generateBookingCode(start, settings.timezone);
    try {
      return await prisma.$transaction(
        async (tx: Tx) => {
          // Serialize concurrent reservations for the same setup.
          await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${setup.id}, 0))) AS lock`;

          if (!isCash) {
            await tx.booking.updateMany({
              where: {
                setupId: setup.id,
                status: "PENDING",
                paymentExpiresAt: { lt: new Date() },
              },
              data: { status: "EXPIRED" },
            });
          }

          const conflict = await tx.booking.findFirst({
            where: {
              setupId: setup.id,
              status: { in: [...BLOCKING_BOOKING_STATUSES] },
              startAt: { lt: end },
              endAt: { gt: start },
            },
            select: { id: true },
          });
          if (conflict) {
            throw new BookingError(
              "SLOT_TAKEN",
              "Slot tersebut baru saja dipesan. Silakan pilih waktu lain.",
            );
          }

          if (contactPhone) {
            await tx.user.update({
              where: { id: input.userId },
              data: { phone: `+${contactPhone}` },
            });
          }

          const booking = await tx.booking.create({
            data: {
              code,
              userId: input.userId,
              setupId: setup.id,
              startAt: start,
              endAt: end,
              durationMinutes: input.durationMinutes,
              hourlyRate: setup.hourlyRate,
              totalPrice,
              status: bookingStatus,
              paymentExpiresAt,
              notes: input.notes?.trim() || null,
              payment: {
                create: {
                  amount: totalPrice,
                  method: method,
                  status: "UNPAID",
                },
              },
            },
            include: BOOKING_INCLUDE,
          });

          await tx.auditLog.create({
            data: {
              actorId: input.userId,
              action: "booking.created",
              entityType: "Booking",
              entityId: booking.id,
              bookingId: booking.id,
              metadata: {
                code: booking.code,
                setupId: setup.id,
                startAt: start.toISOString(),
                endAt: end.toISOString(),
                totalPrice,
                method,
              },
            },
          });

          return booking;
        },
        { timeout: 15_000 },
      );
    } catch (error) {
      if (error instanceof BookingError) throw error;
      const code = (error as { code?: string }).code;
      // Unique booking code collision — retry with a new code.
      if (code === "P2002") continue;
      // PostgreSQL exclusion constraint violation (23P01).
      if (code === "23P01" || (error as { meta?: { code?: string } }).meta?.code === "23P01") {
        throw new BookingError(
          "SLOT_TAKEN",
          "Slot tersebut baru saja dipesan. Silakan pilih waktu lain.",
        );
      }
      console.error("createBooking failed", error);
      throw new BookingError("CONFLICT", "Reservasi gagal diproses. Coba lagi.");
    }
  }

  throw new BookingError("CONFLICT", "Gagal membuat kode booking unik. Coba lagi.");
}

export async function cancelOwnBooking(input: {
  bookingId: string;
  userId: string;
  role: string;
}) {
  const settings = await getSettings();
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new BookingError("NOT_FOUND", "Booking tidak ditemukan.");

  const isStaff = input.role === "ADMIN" || input.role === "STAFF";
  if (!isStaff && booking.userId !== input.userId) {
    throw new BookingError("FORBIDDEN", "Kamu tidak memiliki akses ke booking ini.");
  }
  if (!isCancellable(booking.status)) {
    throw new BookingError("NOT_CANCELLABLE", "Booking ini tidak dapat dibatalkan.");
  }

  if (booking.status === "CONFIRMED" && !isStaff) {
    const cutoff = new Date(booking.startAt.getTime() - settings.cancellationHours * 60 * 60 * 1000);
    if (new Date() > cutoff) {
      throw new BookingError(
        "NOT_CANCELLABLE",
        `Pembatalan hanya dapat dilakukan hingga ${settings.cancellationHours} jam sebelum sesi.`,
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await tx.payment.updateMany({
      where: { bookingId: booking.id, status: "VERIFIED" },
      data: { status: "REFUNDED" },
    });
    await tx.auditLog.create({
      data: {
        actorId: input.userId,
        action: "booking.cancelled",
        entityType: "Booking",
        entityId: booking.id,
        bookingId: booking.id,
        metadata: { byStaff: isStaff, previousStatus: booking.status },
      },
    });
    return updated;
  });
}

/** Apply a validated staff status transition with the right timestamps. */
export async function transitionBooking(input: {
  bookingId: string;
  to: BookingStatus;
  actorId: string;
  reason?: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${input.bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) throw new BookingError("NOT_FOUND", "Booking tidak ditemukan.");
    if (booking.status === input.to) return booking;

    try {
      assertTransition(booking.status, input.to);
    } catch {
      throw new BookingError(
        "INVALID_STATUS",
        `Tidak dapat mengubah status dari ${booking.status} ke ${input.to}.`,
      );
    }

    const now = new Date();
    if ((input.to === "CHECKED_IN" || input.to === "ACTIVE") && booking.endAt <= now) {
      throw new BookingError(
        "INVALID_STATUS",
        "Jadwal sesi ini sudah berakhir. Check-in atau mulai sesi tidak dapat dilakukan lagi.",
      );
    }

    const data: Prisma.BookingUpdateInput = { status: input.to };
    if (input.to === "CANCELLED") {
      data.cancelledAt = now;
    } else if (input.to === "CHECKED_IN") {
      data.checkedInAt = now;
    } else if (input.to === "ACTIVE") {
      data.startedAt = now;
    } else if (input.to === "COMPLETED") {
      data.completedAt = now;
    }

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data,
      include: BOOKING_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        action: `booking.${input.to.toLowerCase()}`,
        entityType: "Booking",
        entityId: booking.id,
        bookingId: booking.id,
        metadata: {
          from: booking.status,
          to: input.to,
          reason: input.reason ?? null,
        },
      },
    });

    return updated;
  });
}

export async function verifyBookingPayment(input: {
  bookingId: string;
  actorId: string;
  transactionRef: string;
  method?: "BANK_TRANSFER" | "QRIS" | "CASH";
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${input.bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: { payment: true },
    });
    if (!booking) throw new BookingError("NOT_FOUND", "Booking tidak ditemukan.");
    if (!booking.payment) {
      throw new BookingError("PAYMENT_INVALID", "Data pembayaran tidak ditemukan.");
    }
    if (booking.payment.status === "VERIFIED") {
      throw new BookingError("PAYMENT_INVALID", "Pembayaran sudah diverifikasi sebelumnya.");
    }
    if (booking.payment.status === "REFUNDED") {
      throw new BookingError("PAYMENT_INVALID", "Pembayaran yang sudah dikembalikan tidak dapat diverifikasi ulang.");
    }
    if (booking.payment.amount !== booking.totalPrice) {
      throw new BookingError("PAYMENT_INVALID", "Nominal pembayaran tidak sesuai dengan total booking.");
    }

    const isCash = booking.payment.method === "CASH";
    if (isCash) {
      // Bayar di Tempat: uang diterima saat pelanggan datang. Booking sudah
      // CONFIRMED sejak dibuat, dan bisa saja sudah CHECKED_IN/ACTIVE ketika
      // kasir mencatat pembayaran. COMPLETED ikut diizinkan karena sesi bisa
      // selesai otomatis sebelum kasir sempat mencatat uang tunai.
      if (
        !["PENDING", "CONFIRMED", "CHECKED_IN", "ACTIVE", "COMPLETED"].includes(booking.status)
      ) {
        throw new BookingError("PAYMENT_INVALID", "Status booking tidak valid untuk verifikasi pembayaran kasir.");
      }
    } else if (booking.status !== "PENDING") {
      throw new BookingError(
        "PAYMENT_INVALID",
        "Pembayaran hanya dapat diverifikasi untuk booking berstatus menunggu pembayaran.",
      );
    }

    const reference = input.transactionRef.trim();
    const usedReference = await tx.payment.findFirst({
      where: { transactionRef: reference, bookingId: { not: booking.id } },
      select: { bookingId: true },
    });
    if (usedReference) {
      throw new BookingError(
        "PAYMENT_INVALID",
        "Referensi transaksi sudah dipakai booking lain. Periksa kembali nomor referensi.",
      );
    }

    const now = new Date();
    const verifiedMethod = input.method ?? booking.payment.method;

    await tx.payment.update({
      where: { bookingId: booking.id },
      data: {
        status: "VERIFIED",
        method: verifiedMethod,
        transactionRef: reference,
        paidAt: booking.payment.paidAt ?? now,
        verifiedAt: now,
        verifiedById: input.actorId,
      },
    });

    const updated = await tx.booking.update({
      where: { id: booking.id },
      // Jangan menurunkan status sesi yang sudah check-in/aktif. Hanya booking
      // PENDING yang perlu dipindahkan ke CONFIRMED setelah pembayaran sah.
      data: booking.status === "PENDING" ? { status: "CONFIRMED" } : {},
      include: BOOKING_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        action: "payment.verified",
        entityType: "Booking",
        entityId: booking.id,
        bookingId: booking.id,
        metadata: {
          amount: booking.payment.amount,
          method: verifiedMethod,
          transactionRef: reference,
          previousBookingStatus: booking.status,
        },
      },
    });

    return updated;
  });
}

export async function getBookingForViewer(code: string, viewer: { id: string; role: string }) {
  const booking = await prisma.booking.findUnique({
    where: { code },
    include: BOOKING_INCLUDE,
  });
  if (!booking) return null;
  const isStaff = viewer.role === "ADMIN" || viewer.role === "STAFF";
  if (!isStaff && booking.userId !== viewer.id) return null;
  return booking;
}

export { FINAL_BOOKING_STATUSES };
