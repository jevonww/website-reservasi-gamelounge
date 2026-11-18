import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { id as localeId } from "date-fns/locale";
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { prisma } from "@/src/lib/db";
import { requireStaff } from "@/src/lib/auth/guards";
import { getSettings, FALLBACK_SETTINGS } from "@/src/lib/settings";
import { durationLabel } from "@/src/lib/time";
import { formatIDR } from "@/src/lib/utils";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/src/lib/constants";
import { publicBookingUrl } from "@/src/lib/whatsapp";
import { syncScheduledSessions } from "@/src/lib/booking/service";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { GlassButton } from "@/src/components/ui/GlassButton";
import { AdminBackLink } from "@/src/components/admin/AdminPageHeader";
import { BookingManagePanel } from "@/src/components/admin/BookingManagePanel";
import { WhatsAppConfirmPanel } from "@/src/components/admin/WhatsAppConfirmPanel";
import { AutoRefresh } from "@/src/components/admin/AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detail Booking",
};

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireStaff(`/admin/bookings/${id}`);

  let settings = FALLBACK_SETTINGS;
  let booking;
  try {
    // Advance scheduled sessions before reading so the page shows live status.
    await syncScheduledSessions();
    [settings, booking] = await Promise.all([
      getSettings(),
      prisma.booking.findUnique({
        where: { id },
        include: {
          user: true,
          setup: true,
          payment: true,
          auditLogs: {
            orderBy: { createdAt: "desc" },
            take: 25,
            include: { actor: { select: { name: true } } },
          },
        },
      }),
    ]);
  } catch (error) {
    console.error("Gagal memuat booking admin", error);
    booking = null;
  }

  if (!booking) notFound();

  const dateLabel = formatInTimeZone(booking.startAt, settings.timezone, "EEEE, d MMMM yyyy", {
    locale: localeId,
  });
  const timeLabel = `${formatInTimeZone(booking.startAt, settings.timezone, "HH:mm")}–${formatInTimeZone(
    booking.endAt,
    settings.timezone,
    "HH:mm",
  )} WIB`;

  const paymentExpiresLabel = booking.paymentExpiresAt
    ? formatInTimeZone(booking.paymentExpiresAt, settings.timezone, "d MMM yyyy · HH:mm", {
        locale: localeId,
      })
    : null;

  const bookingUrl = publicBookingUrl(process.env.NEXT_PUBLIC_APP_URL, booking.code);
  const endTimeLabel = `${formatInTimeZone(booking.endAt, settings.timezone, "HH:mm")} WIB`;
  const now = new Date();
  const scheduleEnded = booking.endAt.getTime() <= now.getTime();

  const timeline: { label: string; at: Date | null }[] = [
    { label: "Dibuat", at: booking.createdAt },
    { label: "Diverifikasi", at: booking.payment?.verifiedAt ?? null },
    { label: "Check-in", at: booking.checkedInAt },
    { label: "Sesi dimulai", at: booking.startedAt },
    { label: "Selesai", at: booking.completedAt },
    { label: "Dibatalkan", at: booking.cancelledAt },
  ];

  return (
    <div className="space-y-5">
      <AutoRefresh />
      <div>
        <AdminBackLink href="/admin/bookings" label="Kembali ke daftar booking" />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.16em] text-white/40">
              Nomor referensi booking
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-2xl font-semibold tracking-[0.06em] sm:text-3xl">
                {booking.code}
              </h1>
              <StatusBadge status={booking.status} />
            </div>
          </div>
          <GlassButton href={`/booking/${booking.code}`} variant="secondary" size="sm">
            Lihat sebagai pelanggan
            <ArrowUpRight className="h-3.5 w-3.5" />
          </GlassButton>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="surface rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UserRound className="h-4 w-4 text-violet" />
            Pelanggan
          </h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-white/40">Nama</dt>
              <dd className="text-right text-white/85">{booking.user.name}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="flex items-center gap-1.5 text-white/40">
                <Mail className="h-3.5 w-3.5" /> Email
              </dt>
              <dd className="break-all text-right text-white/75">{booking.user.email}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="flex items-center gap-1.5 text-white/40">
                <Phone className="h-3.5 w-3.5" /> Telepon
              </dt>
              <dd className="text-right text-white/75">{booking.user.phone ?? "—"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-white/40">Role</dt>
              <dd>
                <StatusBadge status={booking.user.role} kind="role" />
              </dd>
            </div>
          </dl>
          {booking.notes ? (
            <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">
                Catatan pelanggan
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">{booking.notes}</p>
            </div>
          ) : null}
        </section>

        <section className="surface rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-cyan" />
            Sesi
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">Setup</p>
              <p className="mt-1 text-xs text-white/85">{booking.setup.name}</p>
              <p className="text-[0.68rem] text-white/35">{booking.setup.category}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <p className="flex items-center gap-1 text-[0.62rem] uppercase tracking-[0.1em] text-white/35">
                <Clock className="h-3 w-3" /> Waktu
              </p>
              <p className="mt-1 text-xs capitalize text-white/85">{dateLabel}</p>
              <p className="text-[0.68rem] text-white/35">{timeLabel}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">Durasi</p>
              <p className="mt-1 text-xs text-white/85">{durationLabel(booking.durationMinutes)}</p>
              <p className="text-[0.68rem] text-white/35">
                {formatIDR(booking.hourlyRate)} / jam
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-2 border-t border-white/8 pt-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-white/40">Total</dt>
              <dd className="font-semibold text-foreground">{formatIDR(booking.totalPrice)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-white/40">Batas pembayaran</dt>
              <dd className="text-xs text-white/65">
                {paymentExpiresLabel ?? "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-3 text-xs text-white/40">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-violet" />
              {settings.address}
            </span>
          </div>
        </section>
      </div>

      <WhatsAppConfirmPanel
        key={`${booking.status}-${booking.payment?.status ?? "UNPAID"}`}
        customerName={booking.user.name}
        customerPhone={booking.user.phone}
        status={booking.status}
        paymentStatus={booking.payment?.status ?? "UNPAID"}
        loungeName={settings.loungeName}
        bookingCode={booking.code}
        setupName={booking.setup.name}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        durationLabel={durationLabel(booking.durationMinutes)}
        totalLabel={formatIDR(booking.totalPrice)}
        paymentMethodLabel={PAYMENT_METHOD_LABELS[booking.payment?.method ?? "BANK_TRANSFER"]}
        paymentStatusLabel={PAYMENT_STATUS_LABELS[booking.payment?.status ?? "UNPAID"]}
        paymentExpiresLabel={paymentExpiresLabel}
        cancellationPolicy={settings.cancellationPolicy}
        address={settings.address}
        loungePhone={settings.phone}
        bookingUrl={bookingUrl}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="surface rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4 text-violet" />
            Pembayaran
          </h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-white/40">Status</dt>
              <dd>
                <StatusBadge status={booking.payment?.status ?? "UNPAID"} kind="payment" />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-white/40">Nominal</dt>
              <dd className="text-white/80">
                {formatIDR(booking.payment?.amount ?? booking.totalPrice)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-white/40">Metode</dt>
              <dd className="text-white/80">
                {booking.payment ? PAYMENT_METHOD_LABELS[booking.payment.method] : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/40">Referensi</dt>
              <dd className="truncate font-mono text-xs text-white/75">
                {booking.payment?.transactionRef ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-white/40">Diverifikasi oleh</dt>
              <dd className="text-xs text-white/65">
                {booking.payment?.verifiedAt
                  ? formatInTimeZone(booking.payment.verifiedAt, settings.timezone, "d MMM yyyy · HH:mm", {
                      locale: localeId,
                    })
                  : "Belum diverifikasi"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[0.7rem] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
            Sistem menolak verifikasi jika nominal pembayaran tidak sama dengan total booking.
          </div>
        </section>

        <BookingManagePanel
          bookingId={booking.id}
          bookingCode={booking.code}
          status={booking.status}
          paymentStatus={booking.payment?.status ?? "UNPAID"}
          totalPrice={booking.totalPrice}
          transactionRef={booking.payment?.transactionRef ?? null}
          method={booking.payment?.method ?? "BANK_TRANSFER"}
          endTimeLabel={endTimeLabel}
          scheduleEnded={scheduleEnded}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="surface rounded-2xl p-5">
          <h2 className="text-sm font-semibold">Linimasa</h2>
          <ol className="mt-4 space-y-3">
            {timeline
              .filter((entry) => entry.at)
              .map((entry) => (
                <li key={entry.label} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-white/65">{entry.label}</span>
                  <span className="text-[0.68rem] text-white/35">
                    {entry.at
                      ? formatInTimeZone(entry.at, settings.timezone, "d MMM yyyy · HH:mm", {
                          locale: localeId,
                        })
                      : ""}
                  </span>
                </li>
              ))}
            {!timeline.some((entry) => entry.at) ? (
              <li className="text-xs text-white/35">Belum ada riwayat.</li>
            ) : null}
          </ol>
        </section>

        <section className="surface rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Audit log booking</h2>
            <span className="text-[0.68rem] text-white/35">{booking.auditLogs.length} entri</span>
          </div>
          {booking.auditLogs.length ? (
            <ul className="mt-4 space-y-2.5">
              {booking.auditLogs.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 border-b border-white/[0.055] pb-2.5 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[0.7rem] text-cyan">{entry.action}</p>
                    <p className="text-[0.68rem] text-white/35">
                      {entry.actor?.name ?? "Sistem"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.65rem] text-white/30">
                    {formatInTimeZone(entry.createdAt, settings.timezone, "d MMM HH:mm", {
                      locale: localeId,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-white/35">Belum ada aktivitas tercatat.</p>
          )}
        </section>
      </div>

      <p className="text-[0.68rem] text-white/25">
        ID internal: <span className="font-mono">{booking.id}</span> ·{" "}
        <Link href={`/setups/${booking.setup.slug}`} className="text-violet-bright hover:text-white">
          Buka halaman setup
        </Link>
      </p>
    </div>
  );
}
