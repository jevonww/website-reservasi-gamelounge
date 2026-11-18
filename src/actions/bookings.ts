"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/db";
import { getCurrentUser } from "@/src/lib/auth/guards";
import { actionError, actionOk, type ActionResult } from "@/src/lib/action-result";
import {
  BookingError,
  cancelOwnBooking,
  createBooking,
  expireStaleBookings,
  transitionBooking,
  verifyBookingPayment,
} from "@/src/lib/booking/service";
import {
  bookingRequestSchema,
  paymentVerificationSchema,
  profileSchema,
} from "@/src/lib/validation/schemas";
import type { BookingStatus } from "@/src/generated/prisma/enums";

function bookingErrorMessage(error: unknown) {
  if (error instanceof BookingError) return error.message;
  console.error("booking action failed", error);
  return "Terjadi kesalahan. Coba lagi beberapa saat lagi.";
}

export async function createBookingAction(
  input: unknown,
): Promise<ActionResult<{ code: string }>> {
  const user = await getCurrentUser();
  if (!user) return actionError("Silakan login terlebih dahulu.");

  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data reservasi tidak valid.", parsed.error.flatten().fieldErrors);
  }

  try {
    const booking = await createBooking({
      userId: user.id,
      setupId: parsed.data.setupId,
      startAt: parsed.data.startAt,
      durationMinutes: parsed.data.durationMinutes,
      notes: parsed.data.notes,
      contactPhone: parsed.data.contactPhone?.trim() || undefined,
      paymentMethod: parsed.data.paymentMethod,
    });

    revalidatePath("/dashboard");
    revalidatePath(`/setups`);
    return actionOk("Reservasi berhasil dibuat.", { code: booking.code });
  } catch (error) {
    return actionError(bookingErrorMessage(error));
  }
}

export async function cancelBookingAction(bookingId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return actionError("Silakan login terlebih dahulu.");

  try {
    const booking = await cancelOwnBooking({
      bookingId,
      userId: user.id,
      role: user.role,
    });
    revalidatePath("/dashboard");
    revalidatePath(`/booking/${booking.code}`);
    revalidatePath("/admin/bookings");
    return actionOk("Booking berhasil dibatalkan.");
  } catch (error) {
    return actionError(bookingErrorMessage(error));
  }
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return actionError("Silakan login terlebih dahulu.");

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Periksa kembali data profil.", parsed.error.flatten().fieldErrors);
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone?.trim() || null,
      },
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
    return actionOk("Profil berhasil diperbarui.");
  } catch (error) {
    console.error("updateProfileAction failed", error);
    return actionError("Profil gagal diperbarui.");
  }
}

async function requireStaffAction() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    return null;
  }
  return user;
}

export async function staffVerifyPaymentAction(input: unknown): Promise<ActionResult> {
  const staff = await requireStaffAction();
  if (!staff) return actionError("Akses ditolak.");

  const parsed = paymentVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data verifikasi tidak valid.", parsed.error.flatten().fieldErrors);
  }

  try {
    const booking = await verifyBookingPayment({
      bookingId: parsed.data.bookingId,
      actorId: staff.id,
      transactionRef: parsed.data.transactionRef,
      method: parsed.data.method,
    });
    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${booking.id}`);
    revalidatePath("/dashboard");
    return actionOk("Pembayaran berhasil diverifikasi.");
  } catch (error) {
    return actionError(bookingErrorMessage(error));
  }
}

const STAFF_TRANSITIONS: Record<string, BookingStatus> = {
  check_in: "CHECKED_IN",
  start: "ACTIVE",
  complete: "COMPLETED",
};

export async function staffTransitionAction(
  bookingId: string,
  action: keyof typeof STAFF_TRANSITIONS | "cancel",
): Promise<ActionResult> {
  const staff = await requireStaffAction();
  if (!staff) return actionError("Akses ditolak.");

  try {
    if (action === "cancel") {
      await cancelOwnBooking({
        bookingId,
        userId: staff.id,
        role: staff.role,
      });
      revalidatePath("/admin/bookings");
      revalidatePath(`/admin/bookings/${bookingId}`);
      return actionOk("Booking dibatalkan oleh staff.");
    }

    const to = STAFF_TRANSITIONS[action];
    if (!to) return actionError("Aksi tidak dikenal.");

    await transitionBooking({ bookingId, to, actorId: staff.id });
    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath("/admin");
    return actionOk("Status booking diperbarui.");
  } catch (error) {
    return actionError(bookingErrorMessage(error));
  }
}

export async function expireBookingsAction(): Promise<ActionResult<{ count: number }>> {
  const staff = await requireStaffAction();
  if (!staff) return actionError("Akses ditolak.");
  try {
    const result = await expireStaleBookings();
    revalidatePath("/admin/bookings");
    return actionOk(`${result.count} booking kedaluwarsa dirilis.`, { count: result.count });
  } catch (error) {
    console.error("expireBookingsAction failed", error);
    return actionError("Gagal merilis booking kedaluwarsa.");
  }
}
