import { describe, expect, it } from "vitest";
import {
  bookingRequestSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  roleUpdateSchema,
  settingsFormSchema,
  setupFormSchema,
} from "@/src/lib/validation/schemas";

const validSetup = {
  name: "LEVELUP PC Titan",
  slug: "levelup-pc-titan",
  category: "PC Gaming",
  description: "Stasiun PC performa tinggi untuk ranked dan streaming harian.",
  hourlyRate: 25_000,
  status: "AVAILABLE",
  featured: false,
  imageUrl: "/images/setups/pc-alpha.svg",
  gallery: "",
  facilities: "Headset\nKursi gaming",
  processor: "Intel Core i7",
};

describe("auth schemas", () => {
  it("accepts an email or username identifier and a non-empty password", () => {
    const parsed = loginSchema.safeParse({
      email: "  ADMINLEVELUP ",
      password: "200209",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("adminlevelup");

    const emailLogin = loginSchema.safeParse({
      email: "  PLAYER@LEVELUP.ID ",
      password: "Player#2026",
    });
    expect(emailLogin.success).toBe(true);
    if (emailLogin.success) expect(emailLogin.data.email).toBe("player@levelup.id");

    expect(loginSchema.safeParse({ email: "   ", password: "12345678" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "adminlevelup", password: "" }).success).toBe(false);
  });

  it("requires matching password confirmation on register", () => {
    const base = {
      name: "Player One",
      email: "player@levelup.id",
      password: "Player#2026",
      confirmPassword: "Player#2026",
    };
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, confirmPassword: "Other#2026" }).success).toBe(
      false,
    );
  });

  it("allows an empty optional phone number on the profile", () => {
    expect(profileSchema.safeParse({ name: "Player", phone: "" }).success).toBe(true);
    expect(profileSchema.safeParse({ name: "Player", phone: "+62 812 3456" }).success).toBe(true);
    expect(profileSchema.safeParse({ name: "P", phone: "" }).success).toBe(false);
  });
});

describe("setup schema", () => {
  it("accepts a complete setup payload", () => {
    expect(setupFormSchema.safeParse(validSetup).success).toBe(true);
  });

  it("rejects invalid slugs", () => {
    for (const slug of ["Level Up", "levelup_pc", "-levelup", "levelup-", "a"]) {
      expect(setupFormSchema.safeParse({ ...validSetup, slug }).success).toBe(false);
    }
  });

  it("rejects a price below the minimum and non-integer prices", () => {
    expect(setupFormSchema.safeParse({ ...validSetup, hourlyRate: 500 }).success).toBe(false);
    expect(setupFormSchema.safeParse({ ...validSetup, hourlyRate: 1500.5 }).success).toBe(false);
  });

  it("rejects short descriptions and unknown categories", () => {
    expect(setupFormSchema.safeParse({ ...validSetup, description: "Terlalu pendek." }).success).toBe(
      false,
    );
    expect(setupFormSchema.safeParse({ ...validSetup, category: "Arcade" }).success).toBe(false);
  });
});

describe("booking request schema", () => {
  it("requires an ISO timestamp with an offset", () => {
    expect(
      bookingRequestSchema.safeParse({
        setupId: "setup_1",
        startAt: "2026-11-05T10:00:00.000Z",
        durationMinutes: 60,
      }).success,
    ).toBe(true);
    expect(
      bookingRequestSchema.safeParse({
        setupId: "setup_1",
        startAt: "2026-11-05 10:00",
        durationMinutes: 60,
      }).success,
    ).toBe(false);
  });

  it("coerces duration and validates notes length", () => {
    const parsed = bookingRequestSchema.safeParse({
      setupId: "setup_1",
      startAt: "2026-11-05T10:00:00.000Z",
      durationMinutes: "90",
      notes: "Mohon siapkan headset ekstra.",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.durationMinutes).toBe(90);

    expect(
      bookingRequestSchema.safeParse({
        setupId: "setup_1",
        startAt: "2026-11-05T10:00:00.000Z",
        durationMinutes: 60,
        notes: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("accepts an optional WhatsApp contact number", () => {
    const base = {
      setupId: "setup_1",
      startAt: "2026-11-05T10:00:00.000Z",
      durationMinutes: 60,
    };

    const parsed = bookingRequestSchema.safeParse({ ...base, contactPhone: "+62 812 3456 7890" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.contactPhone).toBe("+62 812 3456 7890");

    expect(bookingRequestSchema.safeParse(base).success).toBe(true);
    expect(
      bookingRequestSchema.safeParse({ ...base, contactPhone: "0".repeat(25) }).success,
    ).toBe(false);
  });

  it("accepts only the supported payment methods and defaults to bank transfer", () => {
    const base = {
      setupId: "setup_1",
      startAt: "2026-11-05T10:00:00.000Z",
      durationMinutes: 60,
    };

    const fallback = bookingRequestSchema.safeParse(base);
    expect(fallback.success).toBe(true);
    if (fallback.success) expect(fallback.data.paymentMethod).toBe("BANK_TRANSFER");

    for (const method of ["BANK_TRANSFER", "QRIS", "CASH"] as const) {
      const parsed = bookingRequestSchema.safeParse({ ...base, paymentMethod: method });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.paymentMethod).toBe(method);
    }

    expect(
      bookingRequestSchema.safeParse({ ...base, paymentMethod: "EWALLET" }).success,
    ).toBe(false);
  });
});

describe("settings schema", () => {
  const validSettings = {
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
    address: "Jl. Contoh No. 12, Jakarta Selatan",
    phone: "+62 812 0000 0000",
    email: "hello@levelup.id",
    instagram: "@levelup.gaming",
    mapsUrl: "https://maps.google.com",
    bankName: "BCA",
    bankAccountNumber: "1234567890",
    bankAccountName: "PT LEVELUP GAMING",
    cancellationPolicy: "Pembatalan gratis hingga 2 jam sebelum sesi dimulai.",
  };

  it("accepts valid lounge settings", () => {
    expect(settingsFormSchema.safeParse(validSettings).success).toBe(true);
  });

  it("validates time format and ranges", () => {
    expect(settingsFormSchema.safeParse({ ...validSettings, openTime: "9:00" }).success).toBe(false);
    expect(settingsFormSchema.safeParse({ ...validSettings, closeTime: "22:00:00" }).success).toBe(
      false,
    );
    expect(
      settingsFormSchema.safeParse({ ...validSettings, slotIntervalMinutes: 5 }).success,
    ).toBe(false);
    expect(
      settingsFormSchema.safeParse({ ...validSettings, paymentExpirationMinutes: 0 }).success,
    ).toBe(false);
  });

  it("validates the maps URL", () => {
    expect(settingsFormSchema.safeParse({ ...validSettings, mapsUrl: "not a url" }).success).toBe(
      false,
    );
  });
});

describe("role update schema", () => {
  it("accepts only known roles", () => {
    expect(roleUpdateSchema.safeParse({ userId: "user_1", role: "STAFF" }).success).toBe(true);
    expect(roleUpdateSchema.safeParse({ userId: "user_1", role: "SUPERADMIN" }).success).toBe(false);
  });
});
