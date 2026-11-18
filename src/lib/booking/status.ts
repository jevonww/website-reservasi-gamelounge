import type { BookingStatus } from "@/src/generated/prisma/enums";

/**
 * Allowed booking status transitions. Both customer and staff actions must
 * respect these rules; staff-only transitions are enforced separately.
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "EXPIRED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "COMPLETED", "EXPIRED"],
  CHECKED_IN: ["ACTIVE", "CANCELLED", "COMPLETED"],
  ACTIVE: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export const ACTIVE_SESSION_STATUSES: BookingStatus[] = ["CHECKED_IN", "ACTIVE"];

export function canTransition(from: BookingStatus, to: BookingStatus) {
  return BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: BookingStatus, to: BookingStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Perubahan status dari ${from} ke ${to} tidak diizinkan.`);
  }
}

export function isFinalStatus(status: BookingStatus) {
  return BOOKING_TRANSITIONS[status]?.length === 0;
}

export function isCancellable(status: BookingStatus) {
  return status === "PENDING" || status === "CONFIRMED";
}
