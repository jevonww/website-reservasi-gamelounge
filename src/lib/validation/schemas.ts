import { z } from "zod";
import { CATEGORY_OPTIONS } from "@/src/lib/constants";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email wajib diisi.")
  .email("Format email tidak valid.");

export const loginSchema = z.object({
  // Login accepts either an email address or a username. The key stays `email`
  // to match the shared auth form, but it is not restricted to email format.
  email: z.string().trim().toLowerCase().min(1, "Email atau username wajib diisi."),
  // Password policy applies at registration; existing accounts may have
  // shorter legacy passwords, so login only requires a non-empty value.
  password: z.string().min(1, "Password wajib diisi."),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama minimal 2 karakter.")
      .max(80, "Nama maksimal 80 karakter."),
    email: emailSchema,
    password: z
      .string()
      .min(8, "Password minimal 8 karakter.")
      .max(72, "Password maksimal 72 karakter."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(80, "Nama maksimal 80 karakter."),
  phone: z
    .string()
    .trim()
    .max(24, "Nomor telepon terlalu panjang.")
    .optional()
    .or(z.literal("")),
});

export const bookingRequestSchema = z.object({
  setupId: z.string().min(1, "Setup tidak valid."),
  startAt: z.string().datetime({ offset: true, message: "Waktu mulai tidak valid." }),
  durationMinutes: z.coerce.number().int().positive(),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional(),
  contactPhone: z
    .string()
    .trim()
    .max(24, "Nomor WhatsApp terlalu panjang.")
    .optional()
    .or(z.literal("")),
  paymentMethod: z.enum(["BANK_TRANSFER", "QRIS", "CASH"]).default("BANK_TRANSFER"),
});

export const setupFormSchema = z.object({
  name: z.string().trim().min(2, "Nama setup wajib diisi.").max(90),
  slug: z
    .string()
    .trim()
    .min(2, "Slug wajib diisi.")
    .max(90)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung."),
  category: z.enum(CATEGORY_OPTIONS),
  description: z.string().trim().min(20, "Deskripsi minimal 20 karakter.").max(1200),
  hourlyRate: z.coerce
    .number()
    .int("Harga harus bilangan bulat.")
    .min(1000, "Harga minimal Rp1.000.")
    .max(10_000_000, "Harga terlalu tinggi."),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "INACTIVE"]),
  featured: z.coerce.boolean().default(false),
  imageUrl: z.string().trim().min(1, "Gambar wajib diisi."),
  gallery: z.string().trim().optional(),
  facilities: z.string().trim().optional(),
  processor: z.string().trim().max(120).optional(),
  graphics: z.string().trim().max(120).optional(),
  memory: z.string().trim().max(120).optional(),
  storage: z.string().trim().max(120).optional(),
  display: z.string().trim().max(120).optional(),
  accessories: z.string().trim().max(120).optional(),
  console: z.string().trim().max(120).optional(),
  audio: z.string().trim().max(120).optional(),
  seating: z.string().trim().max(120).optional(),
  stations: z.string().trim().max(120).optional(),
  room: z.string().trim().max(120).optional(),
});

export const settingsFormSchema = z.object({
  loungeName: z.string().trim().min(2).max(60),
  tagline: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(3).max(60),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:MM."),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:MM."),
  minDurationMinutes: z.coerce.number().int().min(30).max(600),
  maxDurationMinutes: z.coerce.number().int().min(60).max(720),
  slotIntervalMinutes: z.coerce.number().int().min(15).max(180),
  paymentExpirationMinutes: z.coerce.number().int().min(5).max(1440),
  cancellationHours: z.coerce.number().int().min(0).max(72),
  address: z.string().trim().min(5).max(300),
  phone: z.string().trim().min(5).max(40),
  email: emailSchema,
  instagram: z.string().trim().max(60),
  mapsUrl: z.string().trim().url("URL maps tidak valid."),
  bankName: z.string().trim().min(2).max(60),
  bankAccountNumber: z.string().trim().min(4).max(40),
  bankAccountName: z.string().trim().min(2).max(80),
  cancellationPolicy: z.string().trim().min(5).max(500),
});

export const paymentVerificationSchema = z.object({
  bookingId: z.string().min(1),
  transactionRef: z.string().trim().min(3, "Referensi transaksi wajib diisi.").max(80),
  method: z.enum(["BANK_TRANSFER", "QRIS", "CASH"]),
});

export const roleUpdateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["CUSTOMER", "STAFF", "ADMIN"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
export type SetupFormInput = z.infer<typeof setupFormSchema>;
export type SettingsFormInput = z.infer<typeof settingsFormSchema>;
