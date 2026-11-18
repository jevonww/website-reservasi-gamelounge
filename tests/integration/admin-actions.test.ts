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
const {
  saveSetupAction,
  setSetupStatusAction,
  deleteSetupAction,
  saveSettingsAction,
  updateUserRoleAction,
  uploadSetupImageAction,
} = await import("@/src/actions/admin");

const suffix = Math.random().toString(36).slice(2, 8);

let adminId: string;
let staffId: string;
let customerId: string;
let setupId: string | null = null;
let originalSettings: {
  loungeName: string;
  tagline: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  slotIntervalMinutes: number;
  paymentExpirationMinutes: number;
  cancellationHours: number;
  address: string;
  phone: string;
  email: string;
  instagram: string;
  mapsUrl: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  cancellationPolicy: string;
} | null = null;

function setupPayload(slug: string, name = `Admin Test Setup ${suffix}`) {
  return {
    name,
    slug,
    category: "PC Gaming",
    description: "Setup yang dibuat oleh pengujian integrasi aksi admin LEVELUP.",
    hourlyRate: 30_000,
    status: "AVAILABLE",
    featured: true,
    imageUrl: "/images/setups/pc-alpha.svg",
    gallery: "/images/setups/pc-alpha.svg\n/images/setups/pc-pro.svg",
    facilities: "Headset\nKursi gaming",
    processor: "Intel Core i7",
    graphics: "RTX 4070",
    memory: "32GB",
    storage: "2TB",
    display: "27 inch",
    accessories: "Mouse",
    console: "",
    audio: "Soundbar",
    seating: "Sofa",
    stations: "4",
    room: "",
  };
}

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

beforeAll(async () => {
  const [admin, staff, customer] = await Promise.all([
    prisma.user.create({
      data: { name: "Admin Tester", email: `admin-${suffix}@test.levelup`, passwordHash: "x", role: "ADMIN" },
    }),
    prisma.user.create({
      data: { name: "Staff Tester", email: `staff-${suffix}@test.levelup`, passwordHash: "x", role: "STAFF" },
    }),
    prisma.user.create({
      data: { name: "Customer Tester", email: `customer-${suffix}@test.levelup`, passwordHash: "x" },
    }),
  ]);
  adminId = admin.id;
  staffId = staff.id;
  customerId = customer.id;

  const row = await prisma.loungeSettings.findUnique({ where: { id: "default" } });
  if (row) {
    originalSettings = {
      loungeName: row.loungeName,
      tagline: row.tagline,
      timezone: row.timezone,
      openTime: row.openTime,
      closeTime: row.closeTime,
      minDurationMinutes: row.minDurationMinutes,
      maxDurationMinutes: row.maxDurationMinutes,
      slotIntervalMinutes: row.slotIntervalMinutes,
      paymentExpirationMinutes: row.paymentExpirationMinutes,
      cancellationHours: row.cancellationHours,
      address: row.address,
      phone: row.phone,
      email: row.email,
      instagram: row.instagram,
      mapsUrl: row.mapsUrl,
      bankName: row.bankName,
      bankAccountNumber: row.bankAccountNumber,
      bankAccountName: row.bankAccountName,
      cancellationPolicy: row.cancellationPolicy,
    };
  }
});

afterAll(async () => {
  if (originalSettings) {
    await prisma.loungeSettings.update({ where: { id: "default" }, data: originalSettings });
  }
  if (setupId) {
    await prisma.setup.deleteMany({ where: { id: setupId } });
  }
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { entityType: "Setup", entityId: setupId ?? "" },
        { entityType: "User", entityId: { in: [adminId, staffId, customerId] } },
        { entityType: "LoungeSettings" },
        { actorId: { in: [adminId, staffId, customerId] } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, staffId, customerId] } } });
  await prisma.$disconnect();
});

describe("setup CRUD authorization", () => {
  it("denies setup creation to customers", async () => {
    as("CUSTOMER", customerId);
    const result = await saveSetupAction(setupPayload(`denied-${suffix}`));
    expect(result.ok).toBe(false);
    expect(await prisma.setup.findUnique({ where: { slug: `denied-${suffix}` } })).toBeNull();
  });

  it("lets staff create a setup and writes an audit log", async () => {
    as("STAFF", staffId);
    const result = await saveSetupAction(setupPayload(`created-${suffix}`));
    expect(result.ok).toBe(true);
    if (result.ok) setupId = result.data.id;

    const created = await prisma.setup.findUniqueOrThrow({
      where: { slug: `created-${suffix}` },
    });
    expect(created.hourlyRate).toBe(30_000);
    expect(created.featured).toBe(true);
    expect(created.gallery).toHaveLength(2);
    expect(created.specs).toMatchObject({ processor: "Intel Core i7" });

    const audit = await prisma.auditLog.findFirst({
      where: { action: "setup.created", entityId: created.id },
    });
    expect(audit?.actorId).toBe(staffId);
  });

  it("updates an existing setup", async () => {
    as("STAFF", staffId);
    const result = await saveSetupAction(
      { ...setupPayload(`created-${suffix}`, "Updated Setup"), hourlyRate: 40_000 },
      setupId ?? undefined,
    );
    expect(result.ok).toBe(true);

    const updated = await prisma.setup.findUniqueOrThrow({ where: { id: setupId! } });
    expect(updated.name).toBe("Updated Setup");
    expect(updated.hourlyRate).toBe(40_000);
  });

  it("rejects a duplicate slug with a field error", async () => {
    as("STAFF", staffId);
    const first = await saveSetupAction(setupPayload(`duplicate-${suffix}`));
    expect(first.ok).toBe(true);
    const duplicate = await saveSetupAction(setupPayload(`duplicate-${suffix}`));
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.fieldErrors?.slug?.length).toBe(1);
    }
    await prisma.auditLog.deleteMany({ where: { entityType: "Setup" } });
    await prisma.setup.deleteMany({ where: { slug: `duplicate-${suffix}` } });
  });

  it("changes setup status and rejects unknown setups", async () => {
    as("STAFF", staffId);
    const result = await setSetupStatusAction(setupId!, "MAINTENANCE");
    expect(result.ok).toBe(true);
    const setup = await prisma.setup.findUniqueOrThrow({ where: { id: setupId! } });
    expect(setup.status).toBe("MAINTENANCE");

    const missing = await setSetupStatusAction("missing-setup-id", "INACTIVE");
    expect(missing.ok).toBe(false);
  });

  it("validates setup payloads on the server", async () => {
    as("STAFF", staffId);
    const result = await saveSetupAction({ ...setupPayload(`invalid-${suffix}`), hourlyRate: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.hourlyRate?.length).toBe(1);
  });

  it("deletes a setup that has no booking history", async () => {
    as("STAFF", staffId);
    const created = await saveSetupAction(setupPayload(`deletable-${suffix}`));
    expect(created.ok).toBe(true);
    const targetId = created.ok ? created.data.id : "";

    const deleted = await deleteSetupAction(targetId);
    expect(deleted.ok).toBe(true);
    expect(await prisma.setup.findUnique({ where: { id: targetId } })).toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { action: "setup.deleted", entityId: targetId },
    });
    expect(audit?.actorId).toBe(staffId);
  });

  it("refuses to delete a setup with booking history", async () => {
    as("STAFF", staffId);
    const startAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const booking = await prisma.booking.create({
      data: {
        code: `LVL-DEL${suffix.slice(0, 4).toUpperCase()}`,
        userId: customerId,
        setupId: setupId!,
        startAt,
        endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
        durationMinutes: 60,
        hourlyRate: 30_000,
        totalPrice: 30_000,
        status: "PENDING",
      },
    });

    const blocked = await deleteSetupAction(setupId!);
    expect(blocked.ok).toBe(false);
    expect(await prisma.setup.findUnique({ where: { id: setupId! } })).not.toBeNull();

    await prisma.booking.delete({ where: { id: booking.id } });
  });
});

describe("role management", () => {
  it("denies role changes to non-admins", async () => {
    as("STAFF", staffId);
    const result = await updateUserRoleAction({ userId: customerId, role: "STAFF" });
    expect(result.ok).toBe(false);
    const target = await prisma.user.findUniqueOrThrow({ where: { id: customerId } });
    expect(target.role).toBe("CUSTOMER");
  });

  it("lets an admin promote a customer", async () => {
    as("ADMIN", adminId);
    const result = await updateUserRoleAction({ userId: customerId, role: "STAFF" });
    expect(result.ok).toBe(true);
    const target = await prisma.user.findUniqueOrThrow({ where: { id: customerId } });
    expect(target.role).toBe("STAFF");

    const audit = await prisma.auditLog.findFirst({
      where: { action: "user.role.updated", entityId: customerId },
    });
    expect(audit?.actorId).toBe(adminId);
  });

  it("prevents an admin from changing their own role", async () => {
    as("ADMIN", adminId);
    const result = await updateUserRoleAction({ userId: adminId, role: "CUSTOMER" });
    expect(result.ok).toBe(false);
    const target = await prisma.user.findUniqueOrThrow({ where: { id: adminId } });
    expect(target.role).toBe("ADMIN");
  });

  it("rejects unknown users and roles", async () => {
    as("ADMIN", adminId);
    const missing = await updateUserRoleAction({ userId: "missing-user", role: "STAFF" });
    expect(missing.ok).toBe(false);
    const invalid = await updateUserRoleAction({ userId: customerId, role: "OWNER" });
    expect(invalid.ok).toBe(false);
  });
});

describe("settings management", () => {
  it("denies settings changes to staff", async () => {
    as("STAFF", staffId);
    const result = await saveSettingsAction({
      loungeName: "Hacked",
      tagline: "Nope",
      timezone: "Asia/Jakarta",
      openTime: "10:00",
      closeTime: "22:00",
      minDurationMinutes: 60,
      maxDurationMinutes: 240,
      slotIntervalMinutes: 60,
      paymentExpirationMinutes: 30,
      cancellationHours: 2,
      address: "Jl. Test No. 1, Jakarta",
      phone: "+62 812 0000 0000",
      email: "test@levelup.id",
      instagram: "@levelup.test",
      mapsUrl: "https://maps.google.com",
      bankName: "BCA",
      bankAccountNumber: "1234567890",
      bankAccountName: "PT LEVELUP GAMING",
      cancellationPolicy: "Pembatalan gratis hingga 2 jam sebelum sesi dimulai.",
    });
    expect(result.ok).toBe(false);
  });

  it("persists valid settings for an admin", async () => {
    as("ADMIN", adminId);
    const result = await saveSettingsAction({
      loungeName: `LEVELUP ${suffix}`,
      tagline: "Premium Gaming Lounge",
      timezone: "Asia/Jakarta",
      openTime: "09:00",
      closeTime: "23:00",
      minDurationMinutes: 60,
      maxDurationMinutes: 240,
      slotIntervalMinutes: 60,
      paymentExpirationMinutes: 45,
      cancellationHours: 3,
      address: "Jl. Test No. 1, Jakarta Selatan",
      phone: "+62 812 1111 2222",
      email: "test@levelup.id",
      instagram: "@levelup.test",
      mapsUrl: "https://maps.google.com/levelup",
      bankName: "BCA",
      bankAccountNumber: "9876543210",
      bankAccountName: "PT LEVELUP GAMING",
      cancellationPolicy: "Pembatalan gratis hingga 3 jam sebelum sesi dimulai.",
    });
    expect(result.ok).toBe(true);

    const row = await prisma.loungeSettings.findUniqueOrThrow({ where: { id: "default" } });
    expect(row.loungeName).toBe(`LEVELUP ${suffix}`);
    expect(row.paymentExpirationMinutes).toBe(45);
    expect(row.cancellationHours).toBe(3);
  });

  it("rejects invalid settings and impossible duration ranges", async () => {
    as("ADMIN", adminId);
    const base = {
      loungeName: "LEVELUP",
      tagline: "Premium Gaming Lounge",
      timezone: "Asia/Jakarta",
      openTime: "10:00",
      closeTime: "22:00",
      minDurationMinutes: 60,
      maxDurationMinutes: 240,
      slotIntervalMinutes: 60,
      paymentExpirationMinutes: 30,
      cancellationHours: 2,
      address: "Jl. Test No. 1, Jakarta",
      phone: "+62 812 0000 0000",
      email: "test@levelup.id",
      instagram: "@levelup.test",
      mapsUrl: "https://maps.google.com",
      bankName: "BCA",
      bankAccountNumber: "1234567890",
      bankAccountName: "PT LEVELUP GAMING",
      cancellationPolicy: "Pembatalan gratis hingga 2 jam sebelum sesi dimulai.",
    };

    expect((await saveSettingsAction({ ...base, openTime: "9:00" })).ok).toBe(false);
    expect(
      (await saveSettingsAction({ ...base, minDurationMinutes: 300, maxDurationMinutes: 120 })).ok,
    ).toBe(false);
  });
});

describe("setup image uploads", () => {
  it("stores an uploaded image in the database for staff", async () => {
    as("STAFF", staffId);
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const formData = new FormData();
    formData.set("file", new File([pngHeader], `preview-${suffix}.png`, { type: "image/png" }));

    const result = await uploadSetupImageAction(formData);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.url).toMatch(/^\/api\/setup-images\/[a-z0-9]+$/);
    const imageId = result.data.url.split("/").pop()!;
    const row = await prisma.setupImage.findUnique({ where: { id: imageId } });
    expect(row?.mimeType).toBe("image/png");
    expect(row?.size).toBe(pngHeader.byteLength);

    await prisma.setupImage.delete({ where: { id: imageId } });
  });

  it("rejects non-images and customers", async () => {
    as("CUSTOMER", customerId);
    const denied = await uploadSetupImageAction(new FormData());
    expect(denied.ok).toBe(false);

    as("STAFF", staffId);
    const formData = new FormData();
    formData.set("file", new File(["<svg></svg>"], "evil.svg", { type: "image/svg+xml" }));
    const invalid = await uploadSetupImageAction(formData);
    expect(invalid.ok).toBe(false);
  });
});
