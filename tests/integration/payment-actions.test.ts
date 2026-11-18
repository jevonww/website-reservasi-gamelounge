import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  currentUser: null as null | {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "STAFF" | "CUSTOMER";
    phone: string | null;
    createdAt: Date;
  },
}));

vi.mock("@/src/lib/auth/guards", () => ({
  getCurrentUser: async () => state.currentUser,
  requireUser: async () => state.currentUser,
  requireStaff: async () => state.currentUser,
  requireAdmin: async () => state.currentUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

const { prisma } = await import("@/src/lib/db");
const { staffVerifyPaymentAction } = await import("@/src/actions/bookings");

const suffix = Math.random().toString(36).slice(2, 8);

let staffId: string;
let customerId: string;
let setupId: string;
let qrisBookingId: string;
let cashBookingId: string;

function as(role: "ADMIN" | "STAFF" | "CUSTOMER", id: string) {
  state.currentUser = {
    id,
    name: `${role} Tester`,
    email: `${role.toLowerCase()}-${suffix}@test.levelup`,
    role,
    phone: null,
    createdAt: new Date(),
  };
}

async function createBookingWithPayment(input: {
  method: "BANK_TRANSFER" | "QRIS" | "CASH";
  status: "PENDING" | "CONFIRMED";
  minutesFromNow: number;
  code: string;
}) {
  const startAt = new Date(Date.now() + input.minutesFromNow * 60 * 1000);
  return prisma.booking.create({
    data: {
      code: input.code,
      userId: customerId,
      setupId,
      startAt,
      endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
      durationMinutes: 60,
      hourlyRate: 25_000,
      totalPrice: 25_000,
      status: input.status,
      payment: {
        create: {
          amount: 25_000,
          method: input.method,
          status: "UNPAID",
        },
      },
    },
  });
}

beforeAll(async () => {
  const [staff, customer] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Staff Pembayaran",
        email: `staff-pay-${suffix}@test.levelup`,
        passwordHash: "x",
        role: "STAFF",
      },
    }),
    prisma.user.create({
      data: {
        name: "Customer Pembayaran",
        email: `customer-pay-${suffix}@test.levelup`,
        passwordHash: "x",
      },
    }),
  ]);
  staffId = staff.id;
  customerId = customer.id;

  const setup = await prisma.setup.create({
    data: {
      name: `Payment Test ${suffix}`,
      slug: `payment-test-${suffix}`,
      description: "Setup untuk pengujian otorisasi verifikasi pembayaran LEVELUP.",
      category: "PC Gaming",
      specs: {},
      imageUrl: "/images/setups/pc-alpha.svg",
      hourlyRate: 25_000,
      status: "AVAILABLE",
    },
  });
  setupId = setup.id;

  const qris = await createBookingWithPayment({
    method: "QRIS",
    status: "PENDING",
    minutesFromNow: 60 * 24 * 20,
    code: `LVL-QRIS${suffix.slice(0, 4).toUpperCase()}`,
  });
  qrisBookingId = qris.id;

  const cash = await createBookingWithPayment({
    method: "CASH",
    status: "CONFIRMED",
    minutesFromNow: 60 * 24 * 21,
    code: `LVL-CASH${suffix.slice(0, 4).toUpperCase()}`,
  });
  cashBookingId = cash.id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { entityType: "Booking" } });
  await prisma.booking.deleteMany({ where: { setupId } });
  await prisma.setup.deleteMany({ where: { id: setupId } });
  await prisma.user.deleteMany({ where: { id: { in: [staffId, customerId] } } });
  await prisma.$disconnect();
});

describe("payment verification authorization", () => {
  it("denies customers from verifying their own payment", async () => {
    as("CUSTOMER", customerId);
    const result = await staffVerifyPaymentAction({
      bookingId: qrisBookingId,
      transactionRef: `CUST-${suffix}`,
      method: "QRIS",
    });
    expect(result.ok).toBe(false);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId: qrisBookingId } });
    expect(payment.status).toBe("UNPAID");
  });

  it("lets staff verify a QRIS payment and confirms the booking", async () => {
    as("STAFF", staffId);
    const result = await staffVerifyPaymentAction({
      bookingId: qrisBookingId,
      transactionRef: `QRIS-${suffix}`,
      method: "QRIS",
    });
    expect(result.ok).toBe(true);

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: qrisBookingId },
      include: { payment: true },
    });
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.payment?.status).toBe("VERIFIED");
    expect(booking.payment?.verifiedById).toBe(staffId);
  });

  it("rejects verifying the same payment twice", async () => {
    as("STAFF", staffId);
    const result = await staffVerifyPaymentAction({
      bookingId: qrisBookingId,
      transactionRef: `QRIS-${suffix}-ULANG`,
      method: "QRIS",
    });
    expect(result.ok).toBe(false);
  });

  it("records cash received at the lounge without marking it paid on creation", async () => {
    const before = await prisma.payment.findUniqueOrThrow({ where: { bookingId: cashBookingId } });
    expect(before.status).toBe("UNPAID");

    as("STAFF", staffId);
    const result = await staffVerifyPaymentAction({
      bookingId: cashBookingId,
      transactionRef: `NOTA-${suffix}`,
      method: "CASH",
    });
    expect(result.ok).toBe(true);

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: cashBookingId },
      include: { payment: true },
    });
    expect(after.status).toBe("CONFIRMED");
    expect(after.payment?.status).toBe("VERIFIED");
    expect(after.payment?.paidAt).toBeInstanceOf(Date);
  });
});
