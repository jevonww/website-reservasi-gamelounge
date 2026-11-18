import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/src/lib/db";
import { getSettings, type LoungeSettingsView } from "@/src/lib/settings";
import {
  BookingError,
  cancelOwnBooking,
  createBooking,
  expireStaleBookings,
  getBookingForViewer,
  getSetupAvailability,
  syncScheduledSessions,
  transitionBooking,
  verifyBookingPayment,
} from "@/src/lib/booking/service";
import {
  minutesToTime,
  parseTimeToMinutes,
  zonedDateTimeToUtc,
} from "@/src/lib/time";

const suffix = Math.random().toString(36).slice(2, 8);
const SETUP_SLUG = `test-setup-${suffix}`;
const CUSTOMER_EMAIL = `customer-${suffix}@test.levelup`;
const OTHER_EMAIL = `other-${suffix}@test.levelup`;
const STAFF_EMAIL = `staff-${suffix}@test.levelup`;

let settings: LoungeSettingsView;
let setupId: string;
let customerId: string;
let otherId: string;
let staffId: string;

function startFor(dayOffset: number, minutesAfterOpen = 60) {
  const date = formatInTimeZone(
    addDays(new Date(), 3 + dayOffset),
    settings.timezone,
    "yyyy-MM-dd",
  );
  const time = minutesToTime(parseTimeToMinutes(settings.openTime) + minutesAfterOpen);
  return zonedDateTimeToUtc(date, time, settings.timezone);
}

async function book(dayOffset: number, minutesAfterOpen = 60, durationMinutes = 60) {
  const booking = await createBooking({
    userId: customerId,
    setupId,
    startAt: startFor(dayOffset, minutesAfterOpen),
    durationMinutes,
  });
  return booking;
}

async function expectBookingError(promise: Promise<unknown>, code: string) {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(BookingError);
  expect((caught as BookingError).code).toBe(code);
  return caught as BookingError;
}

beforeAll(async () => {
  settings = await getSettings();

  const [customer, other, staff] = await Promise.all([
    prisma.user.create({
      data: { name: "Test Customer", email: CUSTOMER_EMAIL, passwordHash: "test-hash" },
    }),
    prisma.user.create({
      data: { name: "Other Customer", email: OTHER_EMAIL, passwordHash: "test-hash" },
    }),
    prisma.user.create({
      data: { name: "Test Staff", email: STAFF_EMAIL, passwordHash: "test-hash", role: "STAFF" },
    }),
  ]);
  customerId = customer.id;
  otherId = other.id;
  staffId = staff.id;

  const setup = await prisma.setup.create({
    data: {
      name: `Test Setup ${suffix}`,
      slug: SETUP_SLUG,
      description: "Setup khusus pengujian integrasi booking LEVELUP.",
      category: "PC Gaming",
      specs: {},
      imageUrl: "/images/setups/pc-alpha.svg",
      hourlyRate: 20_000,
      status: "AVAILABLE",
    },
  });
  setupId = setup.id;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { setupId } });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { entityType: "Setup", entityId: setupId },
        { entityType: "User", entityId: { in: [customerId, otherId, staffId] } },
      ],
    },
  });
  await prisma.setup.deleteMany({ where: { id: setupId } });
  await prisma.user.deleteMany({ where: { id: { in: [customerId, otherId, staffId] } } });
  await prisma.$disconnect();
});

describe("availability", () => {
  it("rejects unknown and unavailable setups", async () => {
    await expectBookingError(
      getSetupAvailability({
        setupId: "missing-setup",
        date: formatInTimeZone(new Date(), settings.timezone, "yyyy-MM-dd"),
        durationMinutes: 60,
      }),
      "SETUP_NOT_FOUND",
    );

    await prisma.setup.update({ where: { id: setupId }, data: { status: "MAINTENANCE" } });
    await expectBookingError(
      getSetupAvailability({
        setupId,
        date: formatInTimeZone(addDays(new Date(), 1), settings.timezone, "yyyy-MM-dd"),
        durationMinutes: 60,
      }),
      "SETUP_UNAVAILABLE",
    );
    await prisma.setup.update({ where: { id: setupId }, data: { status: "AVAILABLE" } });
  });

  it("marks a booked slot unavailable", async () => {
    const booking = await book(10);
    const date = formatInTimeZone(booking.startAt, settings.timezone, "yyyy-MM-dd");
    const availability = await getSetupAvailability({
      setupId,
      date,
      durationMinutes: 60,
    });
    const slot = availability.slots.find(
      (candidate) => candidate.start === booking.startAt.toISOString(),
    );
    expect(slot?.available).toBe(false);
  });
});

describe("booking creation", () => {
  it("computes price on the server and creates a pending payment", async () => {
    const booking = await book(0);
    expect(booking.status).toBe("PENDING");
    expect(booking.code).toMatch(/^LVL-\d{6}-[A-Z2-9]{8}$/);
    expect(booking.hourlyRate).toBe(20_000);
    expect(booking.totalPrice).toBe(20_000);
    expect(booking.payment).not.toBeNull();
    expect(booking.payment?.amount).toBe(booking.totalPrice);
    expect(booking.payment?.status).toBe("UNPAID");
    expect(booking.paymentExpiresAt).toBeInstanceOf(Date);
    expect(booking.paymentExpiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects an invalid contact WhatsApp number", async () => {
    await expectBookingError(
      createBooking({
        userId: customerId,
        setupId,
        startAt: startFor(21),
        durationMinutes: 60,
        contactPhone: "0812",
      }),
      "INVALID_INPUT",
    );
  });

  it("saves the contact WhatsApp number to the customer profile", async () => {
    const booking = await createBooking({
      userId: customerId,
      setupId,
      startAt: startFor(20),
      durationMinutes: 60,
      contactPhone: "0812-3456-7890",
    });
    expect(booking.user.phone).toBe("+6281234567890");

    const user = await prisma.user.findUnique({
      where: { id: customerId },
      select: { phone: true },
    });
    expect(user?.phone).toBe("+6281234567890");
  });

  it("prevents overlapping bookings for the same setup", async () => {
    const first = await book(1);
    await expectBookingError(
      createBooking({
        userId: customerId,
        setupId,
        startAt: first.startAt,
        durationMinutes: 60,
      }),
      "SLOT_TAKEN",
    );
  });

  it("allows a booking that starts exactly when another ends", async () => {
    const first = await book(2);
    const adjacent = await createBooking({
      userId: customerId,
      setupId,
      startAt: first.endAt,
      durationMinutes: 60,
    });
    expect(adjacent.startAt.getTime()).toBe(first.endAt.getTime());
    expect(adjacent.status).toBe("PENDING");
  });

  it("rejects a start time in the past", async () => {
    await expectBookingError(
      createBooking({
        userId: customerId,
        setupId,
        startAt: new Date(Date.now() - 60 * 60 * 1000),
        durationMinutes: 60,
      }),
      "PAST_TIME",
    );
  });

  it("rejects sessions outside operating hours", async () => {
    const date = formatInTimeZone(addDays(new Date(), 4), settings.timezone, "yyyy-MM-dd");
    await expectBookingError(
      createBooking({
        userId: customerId,
        setupId,
        startAt: zonedDateTimeToUtc(date, settings.closeTime, settings.timezone),
        durationMinutes: 60,
      }),
      "OUTSIDE_HOURS",
    );
  });

  it("rejects durations outside the configured limits", async () => {
    await expectBookingError(
      createBooking({
        userId: customerId,
        setupId,
        startAt: startFor(5),
        durationMinutes: 15,
      }),
      "INVALID_INPUT",
    );
  });

  it("serializes concurrent reservations so only one succeeds", async () => {
    const startAt = startFor(6).toISOString();
    const attempt = () =>
      createBooking({ userId: customerId, setupId, startAt, durationMinutes: 60 });

    const results = await Promise.allSettled([attempt(), attempt()]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason as BookingError;
    expect(reason).toBeInstanceOf(BookingError);
    expect(reason.code).toBe("SLOT_TAKEN");
  });

  it("enforces the overlap constraint at the database level", async () => {
    const booking = await book(7);
    let failure: unknown;
    try {
      await prisma.booking.create({
        data: {
          code: `LVL-TEST${suffix.slice(0, 4).toUpperCase()}`,
          userId: customerId,
          setupId,
          startAt: booking.startAt,
          endAt: booking.endAt,
          durationMinutes: 60,
          hourlyRate: 20_000,
          totalPrice: 20_000,
          status: "PENDING",
        },
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeTruthy();
    expect(JSON.stringify(failure)).toMatch(/overlap|23P01|P2004|exclusion/i);
  });
});

describe("payment verification", () => {
  it("confirms a pending booking when the amount matches", async () => {
    const booking = await book(8);
    const confirmed = await verifyBookingPayment({
      bookingId: booking.id,
      actorId: staffId,
      transactionRef: `TRX-${suffix}-1`,
      method: "BANK_TRANSFER",
    });
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.payment?.status).toBe("VERIFIED");
    expect(confirmed.payment?.verifiedById).toBe(staffId);
    expect(confirmed.payment?.verifiedAt).toBeInstanceOf(Date);
  });

  it("rejects verification when the payment amount does not match", async () => {
    const booking = await book(9);
    await prisma.payment.update({
      where: { bookingId: booking.id },
      data: { amount: booking.totalPrice - 1 },
    });
    await expectBookingError(
      verifyBookingPayment({
        bookingId: booking.id,
        actorId: staffId,
        transactionRef: `TRX-${suffix}-2`,
        method: "QRIS",
      }),
      "PAYMENT_INVALID",
    );
  });

  it("rejects verifying the same booking twice", async () => {
    const booking = await book(10, 240);
    await verifyBookingPayment({
      bookingId: booking.id,
      actorId: staffId,
      transactionRef: `TRX-${suffix}-3`,
      method: "CASH",
    });
    await expectBookingError(
      verifyBookingPayment({
        bookingId: booking.id,
        actorId: staffId,
        transactionRef: `TRX-${suffix}-4`,
        method: "CASH",
      }),
      "PAYMENT_INVALID",
    );
  });
});

describe("payment methods", () => {
  it("creates a QRIS booking as pending and never marks it paid automatically", async () => {
    const booking = await createBooking({
      userId: customerId,
      setupId,
      startAt: startFor(30),
      durationMinutes: 60,
      paymentMethod: "QRIS",
    });

    expect(booking.status).toBe("PENDING");
    expect(booking.payment?.method).toBe("QRIS");
    expect(booking.payment?.status).toBe("UNPAID");
    expect(booking.payment?.verifiedAt).toBeNull();
    expect(booking.paymentExpiresAt).toBeInstanceOf(Date);

    const reloaded = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { payment: true },
    });
    expect(reloaded.status).toBe("PENDING");
    expect(reloaded.payment?.status).toBe("UNPAID");
  });

  it("creates a Bayar di Tempat booking as confirmed but still unpaid", async () => {
    const booking = await createBooking({
      userId: customerId,
      setupId,
      startAt: startFor(31),
      durationMinutes: 60,
      paymentMethod: "CASH",
    });

    expect(booking.status).toBe("CONFIRMED");
    expect(booking.payment?.method).toBe("CASH");
    expect(booking.payment?.status).toBe("UNPAID");
    expect(booking.paymentExpiresAt).toBeNull();

    const date = formatInTimeZone(booking.startAt, settings.timezone, "yyyy-MM-dd");
    const availability = await getSetupAvailability({
      setupId,
      date,
      durationMinutes: 60,
    });
    const slot = availability.slots.find(
      (candidate) => candidate.start === booking.startAt.toISOString(),
    );
    expect(slot?.available).toBe(false);
  });

  it("keeps the same reference through verification and session transitions", async () => {
    const booking = await createBooking({
      userId: customerId,
      setupId,
      startAt: startFor(32),
      durationMinutes: 60,
      paymentMethod: "QRIS",
    });
    const reference = booking.code;

    const confirmed = await verifyBookingPayment({
      bookingId: booking.id,
      actorId: staffId,
      transactionRef: `TRX-REF-${suffix}`,
      method: "QRIS",
    });
    expect(confirmed.code).toBe(reference);

    const checkedIn = await transitionBooking({
      bookingId: booking.id,
      to: "CHECKED_IN",
      actorId: staffId,
    });
    expect(checkedIn.code).toBe(reference);

    const active = await transitionBooking({
      bookingId: booking.id,
      to: "ACTIVE",
      actorId: staffId,
    });
    expect(active.code).toBe(reference);
  });

  it("records cash after check-in without regressing the booking status", async () => {
    const booking = await createBooking({
      userId: customerId,
      setupId,
      startAt: startFor(33),
      durationMinutes: 60,
      paymentMethod: "CASH",
    });
    await transitionBooking({
      bookingId: booking.id,
      to: "CHECKED_IN",
      actorId: staffId,
    });

    const verified = await verifyBookingPayment({
      bookingId: booking.id,
      actorId: staffId,
      transactionRef: `NOTA-${suffix}`,
      method: "CASH",
    });
    expect(verified.status).toBe("CHECKED_IN");
    expect(verified.payment?.status).toBe("VERIFIED");
  });

  it("rejects a payment reference already used by another booking", async () => {
    const first = await book(34);
    const second = await book(34, 180);

    await verifyBookingPayment({
      bookingId: first.id,
      actorId: staffId,
      transactionRef: `SAMA-${suffix}`,
      method: "BANK_TRANSFER",
    });
    await expectBookingError(
      verifyBookingPayment({
        bookingId: second.id,
        actorId: staffId,
        transactionRef: `SAMA-${suffix}`,
        method: "BANK_TRANSFER",
      }),
      "PAYMENT_INVALID",
    );
  });
});

describe("ownership and cancellation", () => {
  it("hides a booking from other customers but shows it to the owner and staff", async () => {
    const booking = await book(11);
    expect(await getBookingForViewer(booking.code, { id: otherId, role: "CUSTOMER" })).toBeNull();
    expect(await getBookingForViewer(booking.code, { id: customerId, role: "CUSTOMER" })).not.toBeNull();
    expect(await getBookingForViewer(booking.code, { id: staffId, role: "STAFF" })).not.toBeNull();
  });

  it("forbids cancelling someone else's booking", async () => {
    const booking = await book(12);
    await expectBookingError(
      cancelOwnBooking({ bookingId: booking.id, userId: otherId, role: "CUSTOMER" }),
      "FORBIDDEN",
    );
  });

  it("cancels a pending booking and frees the slot", async () => {
    const booking = await book(13);
    const cancelled = await cancelOwnBooking({
      bookingId: booking.id,
      userId: customerId,
      role: "CUSTOMER",
    });
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledAt).toBeInstanceOf(Date);

    const rebooked = await createBooking({
      userId: customerId,
      setupId,
      startAt: booking.startAt,
      durationMinutes: 60,
    });
    expect(rebooked.status).toBe("PENDING");
  });

  it("enforces the cancellation cutoff for confirmed bookings", async () => {
    const booking = await book(14);
    await verifyBookingPayment({
      bookingId: booking.id,
      actorId: staffId,
      transactionRef: `TRX-${suffix}-5`,
      method: "QRIS",
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        startAt: new Date(Date.now() + 30 * 60 * 1000),
        endAt: new Date(Date.now() + 90 * 60 * 1000),
      },
    });

    await expectBookingError(
      cancelOwnBooking({ bookingId: booking.id, userId: customerId, role: "CUSTOMER" }),
      "NOT_CANCELLABLE",
    );

    const byStaff = await cancelOwnBooking({
      bookingId: booking.id,
      userId: staffId,
      role: "STAFF",
    });
    expect(byStaff.status).toBe("CANCELLED");
  });
});

describe("status transitions", () => {
  it("walks a booking through the full lifecycle and stamps timestamps", async () => {
    const booking = await book(15);

    const confirmed = await transitionBooking({
      bookingId: booking.id,
      to: "CONFIRMED",
      actorId: staffId,
    });
    expect(confirmed.status).toBe("CONFIRMED");

    const checkedIn = await transitionBooking({
      bookingId: booking.id,
      to: "CHECKED_IN",
      actorId: staffId,
    });
    expect(checkedIn.status).toBe("CHECKED_IN");
    expect(checkedIn.checkedInAt).toBeInstanceOf(Date);

    const active = await transitionBooking({
      bookingId: booking.id,
      to: "ACTIVE",
      actorId: staffId,
    });
    expect(active.status).toBe("ACTIVE");
    expect(active.startedAt).toBeInstanceOf(Date);

    const completed = await transitionBooking({
      bookingId: booking.id,
      to: "COMPLETED",
      actorId: staffId,
    });
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).toBeInstanceOf(Date);
  });

  it("rejects an illegal status jump", async () => {
    const booking = await book(16);
    await expectBookingError(
      transitionBooking({ bookingId: booking.id, to: "ACTIVE", actorId: staffId }),
      "INVALID_STATUS",
    );
  });

  it("records an audit entry for each transition", async () => {
    const booking = await book(17);
    await transitionBooking({ bookingId: booking.id, to: "CONFIRMED", actorId: staffId });
    const logs = await prisma.auditLog.findMany({ where: { bookingId: booking.id } });
    expect(logs.some((log) => log.action === "booking.confirmed")).toBe(true);
  });
});

describe("expiry", () => {
  it("expires unpaid bookings after the payment window and releases the slot", async () => {
    const booking = await book(18);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentExpiresAt: new Date(Date.now() - 60_000) },
    });

    const result = await expireStaleBookings(setupId);
    expect(result.count).toBeGreaterThanOrEqual(1);

    const expired = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(expired.status).toBe("EXPIRED");

    const rebooked = await createBooking({
      userId: customerId,
      setupId,
      startAt: booking.startAt,
      durationMinutes: 60,
    });
    expect(rebooked.status).toBe("PENDING");
  });

  it("does not expire bookings with future payment windows", async () => {
    const booking = await book(19);
    await expireStaleBookings(setupId);
    const stillPending = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(stillPending.status).toBe("PENDING");
  });
});

describe("scheduled session automation", () => {
  async function cashBooking(dayOffset: number) {
    return createBooking({
      userId: customerId,
      setupId,
      startAt: startFor(dayOffset),
      durationMinutes: 60,
      paymentMethod: "CASH",
    });
  }

  it("starts a checked-in session at the booked start time and records a system audit entry", async () => {
    const booking = await cashBooking(40);
    await transitionBooking({ bookingId: booking.id, to: "CHECKED_IN", actorId: staffId });

    const startAt = new Date(Date.now() - 10 * 60_000);
    const endAt = new Date(Date.now() + 50 * 60_000);
    const checkedInAt = new Date(startAt.getTime() - 5 * 60_000);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { startAt, endAt, checkedInAt },
    });

    const result = await syncScheduledSessions();
    expect(result.started).toBeGreaterThanOrEqual(1);

    const started = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(started.status).toBe("ACTIVE");
    expect(started.startedAt?.toISOString()).toBe(startAt.toISOString());
    expect(started.completedAt).toBeNull();

    const log = await prisma.auditLog.findFirst({
      where: { bookingId: booking.id, action: "booking.auto_started" },
    });
    expect(log).not.toBeNull();
    expect(log?.actorId).toBeNull();

    // Free the slot for the next scenario (the DB blocks overlapping sessions).
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  });

  it("cuts a late arrival short by keeping the booked end time", async () => {
    const booking = await cashBooking(41);
    await transitionBooking({ bookingId: booking.id, to: "CHECKED_IN", actorId: staffId });

    const startAt = new Date(Date.now() - 30 * 60_000);
    const endAt = new Date(Date.now() + 30 * 60_000);
    const checkedInAt = new Date(Date.now() - 10 * 60_000); // 20 minutes late
    await prisma.booking.update({
      where: { id: booking.id },
      data: { startAt, endAt, checkedInAt },
    });

    await syncScheduledSessions();
    const active = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(active.status).toBe("ACTIVE");
    expect(active.startedAt?.toISOString()).toBe(checkedInAt.toISOString());
    expect(active.endAt.toISOString()).toBe(endAt.toISOString());

    // One second after the booked end the session completes at that end time.
    await syncScheduledSessions(new Date(endAt.getTime() + 1000));
    const completed = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt?.toISOString()).toBe(endAt.toISOString());
  });

  it("completes an already-ended checked-in session without starting it", async () => {
    const booking = await cashBooking(42);
    await transitionBooking({ bookingId: booking.id, to: "CHECKED_IN", actorId: staffId });

    const startAt = new Date(Date.now() - 2 * 60 * 60_000);
    const endAt = new Date(Date.now() - 60 * 60_000);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { startAt, endAt, checkedInAt: startAt },
    });

    const result = await syncScheduledSessions();
    expect(result.completed).toBeGreaterThanOrEqual(1);

    const completed = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(completed.status).toBe("COMPLETED");
    expect(completed.startedAt).toBeNull();
    expect(completed.completedAt?.toISOString()).toBe(endAt.toISOString());

    const autoStart = await prisma.auditLog.findFirst({
      where: { bookingId: booking.id, action: "booking.auto_started" },
    });
    expect(autoStart).toBeNull();
  });

  it("leaves a no-show booking untouched", async () => {
    const booking = await cashBooking(43);
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        startAt: new Date(Date.now() - 20 * 60 * 60_000),
        endAt: new Date(Date.now() - 19 * 60 * 60_000),
      },
    });

    await syncScheduledSessions();
    const unchanged = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(unchanged.status).toBe("CONFIRMED");
    expect(unchanged.completedAt).toBeNull();
  });

  it("rejects check-in after the booked end time", async () => {
    const booking = await cashBooking(44);
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        startAt: new Date(Date.now() - 4 * 60 * 60_000),
        endAt: new Date(Date.now() - 3 * 60 * 60_000),
      },
    });

    await expectBookingError(
      transitionBooking({ bookingId: booking.id, to: "CHECKED_IN", actorId: staffId }),
      "INVALID_STATUS",
    );

    const unchanged = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(unchanged.status).toBe("CONFIRMED");
    expect(unchanged.checkedInAt).toBeNull();
  });

  it("allows cash verification after the session completed automatically", async () => {
    const booking = await cashBooking(45);
    await transitionBooking({ bookingId: booking.id, to: "CHECKED_IN", actorId: staffId });

    const endAt = new Date(Date.now() - 60_000);
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        startAt: new Date(Date.now() - 61 * 60_000),
        endAt,
        checkedInAt: new Date(Date.now() - 61 * 60_000),
      },
    });

    await syncScheduledSessions(new Date(endAt.getTime() + 1000));
    const completed = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(completed.status).toBe("COMPLETED");

    const verified = await verifyBookingPayment({
      bookingId: booking.id,
      actorId: staffId,
      transactionRef: `KASIR-AUTO-${suffix}`,
      method: "CASH",
    });
    expect(verified.status).toBe("COMPLETED");
    expect(verified.payment?.status).toBe("VERIFIED");
  });
});

describe("database timezone", () => {
  it("stores booking instants without an offset shift", async () => {
    const startAt = startFor(46);
    const booking = await createBooking({
      userId: customerId,
      setupId,
      startAt,
      durationMinutes: 60,
    });

    const raw = await prisma.$queryRaw<
      { epoch: number }[]
    >`select extract(epoch from "startAt") as epoch from "Booking" where id = ${booking.id}`;

    expect(Number(raw[0].epoch)).toBe(startAt.getTime() / 1000);
    expect(booking.startAt.toISOString()).toBe(startAt.toISOString());
  });
});

