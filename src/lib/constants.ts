export const APP_NAME = "LEVELUP";
export const SESSION_COOKIE = "levelup_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export const DEFAULT_TIMEZONE = "Asia/Jakarta";

/** Booking statuses that occupy a slot and block new reservations. */
export const BLOCKING_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "ACTIVE",
] as const;

export const FINAL_BOOKING_STATUSES = ["COMPLETED", "CANCELLED", "EXPIRED"] as const;

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu Pembayaran",
  CONFIRMED: "Terkonfirmasi",
  CHECKED_IN: "Check-in",
  ACTIVE: "Sedang Bermain",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
};

export const SETUP_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Tersedia",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Nonaktif",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Belum Dibayar",
  PENDING: "Menunggu Verifikasi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
  REFUNDED: "Dikembalikan",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Transfer Bank",
  QRIS: "QRIS",
  CASH: "Bayar di Tempat",
};

export const PAYMENT_METHOD_DESCRIPTIONS: Record<string, string> = {
  BANK_TRANSFER: "Transfer ke rekening resmi lounge, lalu staff memverifikasi dana yang masuk.",
  QRIS: "Pindai QRIS resmi lounge. Status lunas hanya setelah staff memverifikasi pembayaran.",
  CASH: "Bayar langsung di kasir saat datang. Slot tetap diamankan sampai jadwal sesi.",
};

export const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  STAFF: "Staff",
  ADMIN: "Admin",
};

export const CATEGORY_OPTIONS = ["PC Gaming", "Console", "Private Room"] as const;

export const SORT_OPTIONS = [
  { value: "recommended", label: "Rekomendasi" },
  { value: "price-asc", label: "Harga terendah" },
  { value: "price-desc", label: "Harga tertinggi" },
  { value: "name-asc", label: "Nama A–Z" },
] as const;
