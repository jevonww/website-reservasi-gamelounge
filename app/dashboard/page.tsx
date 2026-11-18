import type { Metadata } from "next";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { id as localeId } from "date-fns/locale";
import {
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  Clock,
  Gamepad2,
  Hourglass,
  Plus,
  ReceiptText,
  Sparkles,
  Wallet,
} from "lucide-react";
import { prisma } from "@/src/lib/db";
import { requireUser } from "@/src/lib/auth/guards";
import { getSettings, FALLBACK_SETTINGS } from "@/src/lib/settings";
import { expireStaleBookings, syncScheduledSessions } from "@/src/lib/booking/service";
import { durationLabel } from "@/src/lib/time";
import { formatIDR } from "@/src/lib/utils";
import { StatCard } from "@/src/components/ui/StatCard";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { GlassButton } from "@/src/components/ui/GlassButton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { DataTable, TableCell, TableRow } from "@/src/components/ui/DataTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");

  let settings = FALLBACK_SETTINGS;
  let bookings: Awaited<ReturnType<typeof fetchBookings>> = [];
  let failed = false;

  async function fetchBookings() {
    return prisma.booking.findMany({
      where: { userId: user.id },
      include: { setup: true, payment: true },
      orderBy: { startAt: "desc" },
      take: 60,
    });
  }

  try {
    await expireStaleBookings();
    await syncScheduledSessions();
    [settings, bookings] = await Promise.all([getSettings(), fetchBookings()]);
  } catch (error) {
    console.error("Gagal memuat dashboard", error);
    failed = true;
  }

  const now = new Date();
  const active = bookings.filter(
    (booking) => booking.status === "CHECKED_IN" || booking.status === "ACTIVE",
  );
  const upcoming = bookings
    .filter(
      (booking) =>
        (booking.status === "PENDING" || booking.status === "CONFIRMED") &&
        booking.endAt.getTime() >= now.getTime(),
    )
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const history = bookings.filter(
    (booking) => !active.includes(booking) && !upcoming.includes(booking),
  );
  const pendingPayment = bookings.filter(
    (booking) =>
      (booking.status === "PENDING" || booking.status === "CONFIRMED") &&
      booking.payment?.status !== "VERIFIED" &&
      booking.payment?.status !== "REFUNDED" &&
      booking.endAt.getTime() >= now.getTime(),
  ).length;
  const verifiedSpend = bookings.reduce(
    (total, booking) =>
      booking.payment?.status === "VERIFIED" ? total + booking.payment.amount : total,
    0,
  );

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-violet">
            Member area
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Halo, {firstName}.
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Pantau sesi, pembayaran, dan riwayat reservasimu di satu tempat.
          </p>
        </div>
        <GlassButton href="/setups" size="md">
          <Plus className="h-4 w-4" />
          Booking baru
        </GlassButton>
      </div>

      {failed ? (
        <div className="glass-subtle rounded-2xl border-rose-300/20 bg-rose-300/[0.04] px-4 py-3 text-sm text-rose-200">
          Data dashboard gagal dimuat. Coba muat ulang halaman.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Booking aktif"
          value={active.length}
          hint={active.length ? "Sesi berjalan / check-in" : "Tidak ada sesi berjalan"}
          icon={<Gamepad2 />}
          accent="emerald"
        />
        <StatCard
          label="Akan datang"
          value={upcoming.length}
          hint={pendingPayment ? `${pendingPayment} menunggu pembayaran` : "Semua terjadwal"}
          icon={<CalendarDays />}
          accent="violet"
        />
        <StatCard
          label="Total booking"
          value={bookings.length}
          hint="Termasuk riwayat"
          icon={<ReceiptText />}
          accent="cyan"
        />
        <StatCard
          label="Total terverifikasi"
          value={formatIDR(verifiedSpend)}
          hint="Pembayaran yang sudah diverifikasi"
          icon={<Wallet />}
          accent="amber"
        />
      </div>

      {active.length ? (
        <section className="glass-strong glass-sheen rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              Sesi berjalan
            </h2>
            <span className="text-xs text-white/35">{active.length} aktif</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {active.map((booking) => (
              <Link
                key={booking.id}
                href={`/booking/${booking.code}`}
                className="group rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.07]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{booking.setup.name}</p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {formatInTimeZone(booking.startAt, settings.timezone, "HH:mm")}–
                      {formatInTimeZone(booking.endAt, settings.timezone, "HH:mm")} WIB ·{" "}
                      {durationLabel(booking.durationMinutes)}
                    </p>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[0.7rem] text-white/40">
                  <span className="font-mono">{booking.code}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-300 transition group-hover:text-white">
                    Lihat detail
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="glass glass-sheen rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarCheck className="h-4 w-4 text-violet" />
            Reservasi mendatang
          </h2>
          <Link href="/setups" className="text-xs text-muted transition hover:text-foreground">
            Tambah sesi
          </Link>
        </div>

        {upcoming.length ? (
          <div className="mt-4 space-y-2.5">
            {upcoming.map((booking) => {
              const day = formatInTimeZone(booking.startAt, settings.timezone, "dd");
              const month = formatInTimeZone(booking.startAt, settings.timezone, "MMM", {
                locale: localeId,
              });
              return (
                <Link
                  key={booking.id}
                  href={`/booking/${booking.code}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3 transition hover:border-white/15 hover:bg-white/[0.05]"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-black/25">
                    <span className="text-base font-semibold leading-none">{day}</span>
                    <span className="mt-0.5 text-[0.6rem] uppercase text-white/40">{month}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{booking.setup.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.7rem] text-white/40">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatInTimeZone(booking.startAt, settings.timezone, "HH:mm")}–
                        {formatInTimeZone(booking.endAt, settings.timezone, "HH:mm")}
                      </span>
                      <span>·</span>
                      <span>{durationLabel(booking.durationMinutes)}</span>
                      <span>·</span>
                      <span className="font-mono">{booking.code}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={booking.status} />
                    <span className="text-xs text-white/60">{formatIDR(booking.totalPrice)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title="Belum ada reservasi mendatang"
              description="Pilih setup favoritmu dan amankan slot sebelum penuh."
              action={
                <GlassButton href="/setups" variant="secondary" size="sm">
                  Jelajahi setups
                </GlassButton>
              }
            />
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Hourglass className="h-4 w-4 text-cyan" />
            Riwayat booking
          </h2>
          <span className="text-xs text-white/35">{history.length} entri</span>
        </div>

        {history.length ? (
          <DataTable
            columns={[
              { key: "code", label: "Kode" },
              { key: "setup", label: "Setup" },
              { key: "jadwal", label: "Jadwal" },
              { key: "status", label: "Status" },
              { key: "total", label: "Total", className: "text-right" },
              { key: "action", label: "", className: "text-right" },
            ]}
            caption="Riwayat booking"
          >
            {history.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <span className="font-mono text-xs text-white/70">{booking.code}</span>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-white/85">{booking.setup.name}</p>
                  <p className="text-[0.68rem] text-white/35">{booking.setup.category}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-white/70">
                    {formatInTimeZone(booking.startAt, settings.timezone, "d MMM yyyy", {
                      locale: localeId,
                    })}
                  </p>
                  <p className="text-[0.68rem] text-white/35">
                    {formatInTimeZone(booking.startAt, settings.timezone, "HH:mm")} WIB
                  </p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={booking.status} />
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-xs text-white/70">{formatIDR(booking.totalPrice)}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/booking/${booking.code}`}
                    className="inline-flex items-center gap-1 text-xs text-violet-bright transition hover:text-white"
                  >
                    Detail
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        ) : (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="Belum ada riwayat"
            description="Setelah sesi pertamamu selesai, riwayat booking akan muncul di sini."
          />
        )}
      </section>
    </div>
  );
}
