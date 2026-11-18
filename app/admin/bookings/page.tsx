import type { Metadata } from "next";
import Link from "next/link";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { id as localeId } from "date-fns/locale";
import { ArrowUpRight, CalendarDays, Inbox } from "lucide-react";
import { prisma } from "@/src/lib/db";
import { requireStaff } from "@/src/lib/auth/guards";
import { getSettings, FALLBACK_SETTINGS } from "@/src/lib/settings";
import { expireStaleBookings, syncScheduledSessions } from "@/src/lib/booking/service";
import { startOfLoungeDayUtc } from "@/src/lib/time";
import { formatIDR } from "@/src/lib/utils";
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/src/lib/constants";
import type { BookingStatus, PaymentStatus, PaymentMethod, Prisma } from "@/src/generated/prisma/client";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Pagination } from "@/src/components/ui/Pagination";
import { DataTable, TableCell, TableRow } from "@/src/components/ui/DataTable";
import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { AdminBookingFilters } from "@/src/components/admin/AdminBookingFilters";
import { ExpireBookingsButton } from "@/src/components/admin/ExpireBookingsButton";
import { AutoRefresh } from "@/src/components/admin/AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kelola Bookings",
};

const PAGE_SIZE = 20;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff("/admin/bookings");

  const params = await searchParams;
  const q = (first(params.q) ?? "").trim();
  const rawStatus = (first(params.status) ?? "").trim();
  const status = (Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).includes(
    rawStatus as BookingStatus,
  )
    ? (rawStatus as BookingStatus)
    : "";
  const rawPaymentStatus = (first(params.paymentStatus) ?? "").trim();
  const paymentStatus = (Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).includes(
    rawPaymentStatus as PaymentStatus,
  )
    ? (rawPaymentStatus as PaymentStatus)
    : "";
  const rawPaymentMethod = (first(params.paymentMethod) ?? "").trim();
  const paymentMethod = (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).includes(
    rawPaymentMethod as PaymentMethod,
  )
    ? (rawPaymentMethod as PaymentMethod)
    : "";
  const rawDate = (first(params.date) ?? "").trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "";
  const pageParam = Number(first(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  let settings = FALLBACK_SETTINGS;
  let bookings: Awaited<ReturnType<typeof loadBookings>> = [];
  let total = 0;
  let failed = false;

  const paymentFilter: Prisma.PaymentWhereInput = {
    ...(paymentStatus ? { status: paymentStatus } : {}),
    ...(paymentMethod ? { method: paymentMethod } : {}),
  };
  const hasPaymentFilter = Boolean(paymentStatus || paymentMethod);

  async function loadBookings(where: Prisma.BookingWhereInput) {
    return prisma.booking.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        setup: { select: { name: true, category: true } },
        payment: { select: { status: true, method: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    });
  }

  try {
    settings = await getSettings();
    await expireStaleBookings();
    await syncScheduledSessions();

    const where: Prisma.BookingWhereInput = {
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { user: { name: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { setup: { name: { contains: q, mode: "insensitive" } } },
              {
                payment: {
                  is: { transactionRef: { contains: q, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(hasPaymentFilter ? { payment: { is: paymentFilter } } : {}),
      ...(date
        ? {
            startAt: {
              gte: startOfLoungeDayUtc(date, settings.timezone),
              lt: addDays(startOfLoungeDayUtc(date, settings.timezone), 1),
            },
          }
        : {}),
    };

    [bookings, total] = await Promise.all([loadBookings(where), prisma.booking.count({ where })]);
  } catch (error) {
    console.error("Gagal memuat bookings admin", error);
    failed = true;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(q || status || date || hasPaymentFilter);

  return (
    <div className="space-y-5">
      <AutoRefresh />
      <AdminPageHeader
        eyebrow="Operasional"
        title="Kelola bookings"
        description="Verifikasi pembayaran, check-in pelanggan, dan jalankan sesi. Semua perubahan tercatat di audit log."
        action={<ExpireBookingsButton />}
      />

      <AdminBookingFilters
        initial={{ q, status, paymentStatus, paymentMethod, date }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <p>
          {failed ? "Gagal memuat data" : `${total} booking ditemukan`}
          {status ? ` · ${BOOKING_STATUS_LABELS[status]}` : ""}
          {paymentStatus ? ` · ${PAYMENT_STATUS_LABELS[paymentStatus]}` : ""}
          {paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[paymentMethod]}` : ""}
          {date ? ` · ${date}` : ""}
          {q ? ` · “${q}”` : ""}
        </p>
        {totalPages > 1 ? (
          <p className="text-white/35">
            Halaman {page} dari {totalPages}
          </p>
        ) : null}
      </div>

      {failed ? (
        <div className="glass-subtle rounded-2xl border-rose-300/20 bg-rose-300/[0.04] px-4 py-3 text-sm text-rose-200">
          Booking gagal dimuat. Coba muat ulang halaman.
        </div>
      ) : bookings.length ? (
        <>
          <DataTable
            caption="Daftar booking"
            columns={[
              { key: "kode", label: "Kode" },
              { key: "pelanggan", label: "Pelanggan" },
              { key: "setup", label: "Setup" },
              { key: "jadwal", label: "Jadwal" },
              { key: "status", label: "Status" },
              { key: "bayar", label: "Pembayaran" },
              { key: "total", label: "Total", className: "text-right" },
              { key: "aksi", label: "", className: "text-right" },
            ]}
          >
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <Link
                    href={`/admin/bookings/${booking.id}`}
                    className="font-mono text-xs text-white/80 transition hover:text-violet-bright"
                  >
                    {booking.code}
                  </Link>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-white/85">{booking.user.name}</p>
                  <p className="text-[0.68rem] text-white/35">{booking.user.email}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-white/80">{booking.setup.name}</p>
                  <p className="text-[0.68rem] text-white/35">{booking.setup.category}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-white/70">
                    {formatInTimeZone(booking.startAt, settings.timezone, "d MMM yyyy", {
                      locale: localeId,
                    })}
                  </p>
                  <p className="text-[0.68rem] text-white/35">
                    {formatInTimeZone(booking.startAt, settings.timezone, "HH:mm")}–
                    {formatInTimeZone(booking.endAt, settings.timezone, "HH:mm")} WIB
                  </p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={booking.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={booking.payment?.status ?? "UNPAID"} kind="payment" />
                    <span className="text-[0.65rem] text-white/40">
                      {booking.payment
                        ? PAYMENT_METHOD_LABELS[booking.payment.method]
                        : "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-xs text-white/75">{formatIDR(booking.totalPrice)}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/bookings/${booking.id}`}
                    className="inline-flex items-center gap-1 text-xs text-violet-bright transition hover:text-white"
                  >
                    Kelola
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>

          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/admin/bookings"
            searchParams={{ q, status, paymentStatus, paymentMethod, date }}
          />
        </>
      ) : (
        <EmptyState
          icon={hasFilters ? <Inbox className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
          title={hasFilters ? "Tidak ada booking yang cocok" : "Belum ada booking"}
          description={
            hasFilters
              ? "Coba ubah kata kunci, status, atau tanggal. Filter dapat direset."
              : "Booking dari pelanggan akan muncul di sini secara otomatis."
          }
        />
      )}
    </div>
  );
}
