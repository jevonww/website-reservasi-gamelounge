import "server-only";
import { prisma } from "@/src/lib/db";
import type { LoungeSettings } from "@/src/generated/prisma/client";

export type LoungeSettingsView = {
  id: string;
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
};

export const FALLBACK_SETTINGS: LoungeSettingsView = {
  id: "default",
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

function toView(row: LoungeSettings): LoungeSettingsView {
  return {
    id: row.id,
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

/** Read the singleton settings row, falling back to sane defaults if unset. */
export async function getSettings(): Promise<LoungeSettingsView> {
  const row = await prisma.loungeSettings.findUnique({ where: { id: "default" } });
  return row ? toView(row) : FALLBACK_SETTINGS;
}

export async function ensureSettings() {
  const row = await prisma.loungeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  return toView(row);
}
