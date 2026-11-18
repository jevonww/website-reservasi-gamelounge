import type { Metadata } from "next";
import Link from "next/link";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { id as localeId } from "date-fns/locale";
import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  Clock,
  Gamepad2,
  Hourglass,
  Monitor,
  ReceiptText,
  Users,
} from "lucide-react";
import { prisma } from "@/src/lib/db";
import { requireStaff } from "@/src/lib/auth/guards";
import { getSettings, FALLBACK_SETTINGS } from "@/src/lib/settings";
import { expireStaleBookings, syncScheduledSessions } from "@/src/lib/booking/service";
import { parseTimeToMinutes, startOfLoungeDayUtc } from "@/src/lib/time";
import { formatIDR, formatNumber } from "@/src/lib/utils";
import { StatCard } from "@/src/components/ui/StatCard";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { GlassButton } from "@/src/components/ui/GlassButton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Overview",
};

const CHART_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "ACTIVE",
  "COMPLETED",
] as const;

export default async function AdminOverviewPage() {
  const staff = await requireStaff("/admin");

  let settings = FALLBACK_SETTINGS;
  let failed = false;

  let totalBookings = 0;
  let todayCount = 0;
  let pendingCount = 0;
  let activeCount = 0;
  let verifiedRevenue = 0;
  let userCount = 0;
  let setupCount = 0;
  let utilizationPercent = 0;
  let utilizationRows: {
    id: string;
    name: string;
    category: string;
    status: string;
    bookedMinutes: number;
  }[] = [];
  let chart: { key: string; label: string; count: number }[] = [];
  let recent: {
    id: string;
    code: string;
    status: string;
    startAt: Date;
    totalPrice: number;
    user: { name: string };
    setup: { name: string };
  }[] = [];
  let activity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: Date;
    actor: { name: string } | null;
  }[] = [];

  try {
    settings = await getSettings();
    await expireStaleBookings();
    await syncScheduledSessions();

    const todayKey = formatInTimeZone(new Date(), settings.timezone, "yyyy-MM-dd");
    const todayStart = startOfLoungeDayUtc(todayKey, settings.timezone);
    const todayEnd = addDays(todayStart, 1);

    const [
      total,
      today,
      pending,
      active,
      revenue,
      users,
      setups,
      todayBookings,
      recentRows,
      activityRows,
      weekRows,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { startAt: { gte: todayStart, lt: todayEnd } } }),
      prisma.booking.count({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          payment: { is: { status: { in: ["UNPAID", "PENDING"] } } },
        },
      }),
      prisma.booking.count({ where: { status: { in: ["CHECKED_IN", "ACTIVE"] } } }),
      prisma.payment.aggregate({
        where: { status: "VERIFIED" },
        _sum: { amount: true },
      }),
      prisma.user.count(),
      prisma.setup.findMany({
        select: { id: true, name: true, category: true, status: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.booking.groupBy({
        by: ["setupId"],
        where: {
          startAt: { lt: todayEnd },
          endAt: { gt: todayStart },
          status: { in: [...CHART_STATUSES] },
        },
        _sum: { durationMinutes: true },
      }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          code: true,
          status: true,
          startAt: true,
          totalPrice: true,
          user: { select: { name: true } },
          setup: { select: { name: true } },
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      }),
      prisma.booking.findMany({
        where: { createdAt: { gte: addDays(new Date(), -6) } },
        select: { createdAt: true },
      }),
    ]);

    totalBookings = total;
    todayCount = today;
    pendingCount = pending;
    activeCount = active;
    verifiedRevenue = revenue._sum.amount ?? 0;
    userCount = users;
    setupCount = setups.length;
    recent = recentRows;
    activity = activityRows;

    const minutesBySetup = new Map(
      todayBookings.map((row) => [row.setupId, row._sum.durationMinutes ?? 0]),
    );
    const capacityMinutes = Math.max(
      0,
      parseTimeToMinutes(settings.closeTime) - parseTimeToMinutes(settings.openTime),
    );
    const availableSetups = setups.filter((setup) => setup.status === "AVAILABLE");

    utilizationRows = setups.map((setup) => ({
      ...setup,
      bookedMinutes: minutesBySetup.get(setup.id) ?? 0,
    }));

    const bookedMinutes = utilizationRows.reduce((sum, row) => sum + row.bookedMinutes, 0);
    utilizationPercent =
      availableSetups.length && capacityMinutes
        ? Math.min(
            100,
            Math.round((bookedMinutes / (availableSetups.length * capacityMinutes)) * 100),
          )
        : 0;

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(new Date(), -(6 - index));
      return {
        key: formatInTimeZone(date, settings.timezone, "yyyy-MM-dd"),
        label: formatInTimeZone(date, settings.timezone, "EEE", { locale: localeId }),
        count: 0,
      };
    });
    const dayIndex = new Map(days.map((day, index) => [day.key, index]));
    for (const row of weekRows) {
      const key = formatInTimeZone(row.createdAt, settings.timezone, "yyyy-MM-dd");
      const index = dayIndex.get(key);
      if (index !== undefined) days[index].count += 1;
    }
    chart = days;
  } catch (error) {
    console.error("Gagal memuat admin overview", error);
    failed = true;
  }

  const maxChart = Math.max(1, ...chart.map((day) => day.count));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin console"
        title={`Selamat datang, ${staff.name.split(" ")[0]}.`}
        description="Ringkasan operasional lounge hari ini. Semua angka diambil langsung dari database."
        action={
          <div className="flex flex-wrap gap-2">
            <GlassButton href="/admin/bookings" variant="secondary" size="sm">
              <CalendarDays className="h-4 w-4" />
              Kelola booking
            </GlassButton>
            <GlassButton href="/admin/setups/new" size="sm">
              <Monitor className="h-4 w-4" />
              Setup baru
            </GlassButton>
          </div>
        }
      />

      {failed ? (
        <div className="glass-subtle rounded-2xl border-rose-300/20 bg-rose-300/[0.04] px-4 py-3 text-sm text-rose-200">
          Sebagian data gagal dimuat. Pastikan database berjalan lalu muat ulang halaman.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total booking"
          value={formatNumber(totalBookings)}
          hint="Seluruh waktu"
          icon={<ReceiptText />}
          accent="violet"
        />
        <StatCard
          label="Booking hari ini"
          value={formatNumber(todayCount)}
          hint={`${todayCount} sesi terjadwal`}
          icon={<CalendarClock />}
          accent="cyan"
        />
        <StatCard
          label="Menunggu pembayaran"
          value={formatNumber(pendingCount)}
          hint="Perlu verifikasi staff"
          icon={<Hourglass />}
          accent="amber"
        />
        <StatCard
          label="Sesi aktif"
          value={formatNumber(activeCount)}
          hint="Check-in / sedang bermain"
          icon={<Gamepad2 />}
          accent="emerald"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="surface rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Booking 7 hari terakhir</h2>
              <p className="mt-0.5 text-xs text-muted">Berdasarkan waktu pembuatan booking.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.68rem] text-muted">
              {chart.reduce((sum, day) => sum + day.count, 0)} booking
            </span>
          </div>

          <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3">
            {chart.map((day) => {
              const height = Math.max(4, Math.round((day.count / maxChart) * 100));
              return (
                <div key={day.key} className="group flex flex-1 flex-col items-center gap-2">
                  <span className="text-[0.65rem] text-white/40 opacity-0 transition group-hover:opacity-100">
                    {day.count}
                  </span>
                  <div className="flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-violet/30 via-violet/70 to-cyan/70 transition group-hover:from-violet/50 group-hover:to-cyan"
                      style={{ height: `${height}%` }}
                      title={`${day.count} booking`}
                    />
                  </div>
                  <span className="text-[0.65rem] text-white/35">{day.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-4">
          <section className="surface rounded-2xl p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <CircleDollarSign className="h-4 w-4 text-emerald-300" />
              Pendapatan terverifikasi
            </h2>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {formatIDR(verifiedRevenue)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Hanya pembayaran berstatus terverifikasi, bukan estimasi.
            </p>
          </section>

          <section className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-cyan" />
                Utilisasi hari ini
              </h2>
              <span className="text-lg font-semibold text-foreground">{utilizationPercent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet via-[#7f8cff] to-cyan"
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[0.7rem] text-muted">
              {setupCount} setup · {userCount} pengguna terdaftar
            </p>
          </section>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-violet" />
              Booking terbaru
            </h2>
            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-foreground"
            >
              Lihat semua
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="surface overflow-hidden rounded-2xl">
            {recent.length ? (
              <ul className="divide-y divide-white/[0.055]">
                {recent.map((booking) => (
                  <li key={booking.id}>
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.025]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-violet">
                        <Gamepad2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white/85">
                          {booking.setup.name}
                          <span className="ml-2 font-mono text-[0.65rem] text-white/35">
                            {booking.code}
                          </span>
                        </p>
                        <p className="truncate text-[0.7rem] text-white/40">
                          {booking.user.name} ·{" "}
                          {formatInTimeZone(booking.startAt, settings.timezone, "d MMM HH:mm", {
                            locale: localeId,
                          })}{" "}
                          WIB
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={booking.status} />
                        <span className="text-[0.7rem] text-white/50">
                          {formatIDR(booking.totalPrice)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4">
                <EmptyState
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="Belum ada booking"
                  description="Booking baru akan muncul di sini setelah pelanggan melakukan reservasi."
                />
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-cyan" />
              Aktivitas terbaru
            </h2>
          </div>
          <div className="surface rounded-2xl p-4">
            {activity.length ? (
              <ol className="space-y-3">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[0.6rem] text-white/50">
                      {entry.actor?.name?.[0]?.toUpperCase() ?? "·"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-white/70">
                        <span className="font-mono text-[0.68rem] text-cyan">{entry.action}</span>
                        <span className="text-white/35"> · {entry.entityType}</span>
                      </p>
                      <p className="text-[0.68rem] text-white/35">
                        {entry.actor?.name ?? "Sistem"} ·{" "}
                        {formatInTimeZone(entry.createdAt, settings.timezone, "d MMM HH:mm", {
                          locale: localeId,
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-6 text-center text-xs text-muted">
                Belum ada aktivitas tercatat.
              </p>
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Monitor className="h-4 w-4 text-violet" />
            Utilisasi per setup hari ini
          </h2>
          <span className="text-xs text-white/35">
            Kapasitas {settings.openTime}–{settings.closeTime}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {utilizationRows.map((row) => {
            const capacity = Math.max(
              1,
              parseTimeToMinutes(settings.closeTime) - parseTimeToMinutes(settings.openTime),
            );
            const percent = Math.min(100, Math.round((row.bookedMinutes / capacity) * 100));
            return (
              <div key={row.id} className="surface rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-[0.68rem] text-white/35">{row.category}</p>
                  </div>
                  <StatusBadge status={row.status} kind="setup" dot={false} />
                </div>
                <p className="mt-3 text-lg font-semibold">{percent}%</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[0.68rem] text-white/35">
                  {Math.round((row.bookedMinutes / 60) * 10) / 10} jam terpesan
                </p>
              </div>
            );
          })}
          {!utilizationRows.length ? (
            <div className="sm:col-span-2 xl:col-span-4">
              <EmptyState
                icon={<Monitor className="h-5 w-5" />}
                title="Belum ada setup"
                description="Tambahkan setup pertama lewat menu Setups."
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-xs text-muted">
        <p className="flex items-center gap-2">
          <Users className="h-4 w-4 text-violet" />
          {userCount} pengguna · {setupCount} setup · {formatNumber(totalBookings)} booking total
        </p>
        <p className="text-white/35">
          Booking menunggu pembayaran otomatis kedaluwarsa sesuai pengaturan lounge.
        </p>
      </section>
    </div>
  );
}
