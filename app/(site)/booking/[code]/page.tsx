import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { id as localeId } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Hourglass,
  MapPin,
  PlayCircle,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { requireUser } from "@/src/lib/auth/guards";
import { getBookingForViewer, syncScheduledSessions } from "@/src/lib/booking/service";
import { getSettings, FALLBACK_SETTINGS } from "@/src/lib/settings";
import { isCancellable } from "@/src/lib/booking/status";
import { durationLabel } from "@/src/lib/time";
import { formatIDR } from "@/src/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/src/lib/constants";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { BookingSummary } from "@/src/components/booking/BookingSummary";
import { PaymentCountdown } from "@/src/components/booking/PaymentCountdown";
import { CancelBookingButton, CopyButton } from "@/src/components/booking/BookingActions";
import { GlassButton } from "@/src/components/ui/GlassButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detail Booking",
};

const STATUS_COPY: Record<string, { title: string; description: string; icon: typeof CheckCircle2 }> = {
  PENDING: {
    title: "Menunggu pembayaran",
    description:
      "Selesaikan pembayaran sesuai metode yang dipilih, lalu tunjukkan bukti ke staff. Slot kami tahan sampai batas waktu pembayaran.",
    icon: Hourglass,
  },
  CONFIRMED: {
    title: "Reservasi terkonfirmasi",
    description: "Pembayaran sudah diverifikasi. Datang 5–10 menit lebih awal dan tunjukkan kode booking.",
    icon: CheckCircle2,
  },
  CHECKED_IN: {
    title: "Kamu sudah check-in",
    description: "Staff sedang menyiapkan station-mu. Sesi dimulai otomatis saat jam booking tiba.",
    icon: CalendarCheck,
  },
  ACTIVE: {
    title: "Sesi sedang berjalan",
    description:
      "Selamat bermain! Sesi selesai otomatis sesuai jam akhir booking, jadi datang terlambat berarti sisa waktunya lebih singkat.",
    icon: PlayCircle,
  },
  COMPLETED: {
    title: "Sesi selesai",
    description: "Terima kasih sudah bermain di LEVELUP. Sampai jumpa di sesi berikutnya!",
    icon: Sparkles,
  },
  CANCELLED: {
    title: "Booking dibatalkan",
    description: "Slot sudah dilepas. Kamu bisa membuat reservasi baru kapan saja.",
    icon: XCircle,
  },
  EXPIRED: {
    title: "Booking kedaluwarsa",
    description: "Batas pembayaran terlewat sehingga slot dilepas otomatis.",
    icon: XCircle,
  },
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await requireUser(`/booking/${code}`);

  let settings = FALLBACK_SETTINGS;
  let booking;
  try {
    // Keep the status in sync with the booked schedule before rendering.
    await syncScheduledSessions();
    [settings, booking] = await Promise.all([
      getSettings(),
      getBookingForViewer(code, { id: user.id, role: user.role }),
    ]);
  } catch (error) {
    console.error("Gagal memuat booking", error);
    return (
      <div className="container-wide max-w-2xl py-10">
        <div className="glass-subtle rounded-3xl border-rose-300/20 bg-rose-300/[0.04] p-6">
          <h1 className="text-lg font-semibold text-rose-200">Booking tidak dapat dimuat</h1>
          <p className="mt-2 text-sm text-muted">Coba muat ulang halaman beberapa saat lagi.</p>
          <div className="mt-4">
            <GlassButton href="/dashboard" variant="secondary">
              Kembali ke dashboard
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) notFound();

  const paymentMethod = booking.payment?.method ?? "BANK_TRANSFER";
  const paymentStatus = booking.payment?.status ?? "UNPAID";
  const isCash = paymentMethod === "CASH";
  const qrisImageUrl = (process.env.NEXT_PUBLIC_QRIS_IMAGE_URL ?? "").trim();

  let copy = STATUS_COPY[booking.status] ?? STATUS_COPY.PENDING;
  if (booking.status === "PENDING" && paymentMethod === "QRIS") {
    copy = {
      title: "Menunggu pembayaran QRIS",
      description:
        "Pindai QRIS resmi lounge, lalu staff akan memverifikasi pembayaranmu. Slot ditahan sampai batas waktu pembayaran.",
      icon: Hourglass,
    };
  } else if (isCash && paymentStatus !== "VERIFIED" && booking.status === "CONFIRMED") {
    copy = {
      title: "Reservasi terkonfirmasi — bayar di tempat",
      description:
        "Tunjukkan kode booking ini di kasir saat datang. Pembayaran dicatat staff setelah uang benar-benar diterima.",
      icon: CheckCircle2,
    };
  } else if (
    isCash &&
    paymentStatus !== "VERIFIED" &&
    (booking.status === "CHECKED_IN" || booking.status === "ACTIVE")
  ) {
    copy = {
      title: "Pembayaran di tempat belum dicatat",
      description:
        "Sesi sudah berjalan, tetapi pembayaran belum diverifikasi. Hubungi kasir untuk menyelesaikan pembayaran.",
      icon: CreditCard,
    };
  }
  const StatusIcon = copy.icon;
  const startLabel = formatInTimeZone(booking.startAt, settings.timezone, "EEEE, d MMMM yyyy", {
    locale: localeId,
  });
  const timeLabel = `${formatInTimeZone(booking.startAt, settings.timezone, "HH:mm")}–${formatInTimeZone(
    booking.endAt,
    settings.timezone,
    "HH:mm",
  )} WIB`;

  const isStaff = user.role === "ADMIN" || user.role === "STAFF";
  const canCancelStatus = isCancellable(booking.status);
  let cancelDisabledReason: string | undefined;
  if (!canCancelStatus) {
    cancelDisabledReason = "Booking berstatus ini tidak dapat dibatalkan.";
  } else if (booking.status === "CONFIRMED") {
    const cutoff = new Date(
      booking.startAt.getTime() - settings.cancellationHours * 60 * 60 * 1000,
    );
    if (new Date() > cutoff) {
      cancelDisabledReason = `Batas pembatalan sudah lewat (${settings.cancellationHours} jam sebelum sesi). Hubungi staff untuk bantuan.`;
    }
  }

  const timeline: { label: string; at: Date | null; icon: typeof CheckCircle2 }[] = [
    { label: "Booking dibuat", at: booking.createdAt, icon: ReceiptText },
    { label: "Pembayaran diverifikasi", at: booking.payment?.verifiedAt ?? null, icon: CreditCard },
    { label: "Check-in", at: booking.checkedInAt, icon: CalendarCheck },
    { label: "Sesi dimulai", at: booking.startedAt, icon: PlayCircle },
    { label: "Sesi selesai", at: booking.completedAt, icon: Sparkles },
    { label: "Dibatalkan", at: booking.cancelledAt, icon: XCircle },
  ].filter((entry) => entry.at);

  return (
    <div className="container-wide pb-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={isStaff ? "/admin/bookings" : "/dashboard"}
          className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {isStaff ? "Kembali ke admin" : "Kembali ke dashboard"}
        </Link>
        {isStaff ? (
          <GlassButton href={`/admin/bookings/${booking.id}`} variant="secondary" size="sm">
            Kelola booking
            <ArrowRight className="h-3.5 w-3.5" />
          </GlassButton>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <div className="glass-strong glass-sheen relative overflow-hidden rounded-3xl p-6">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet/25 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.16em] text-white/40">
                  Nomor Referensi Booking
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-2xl font-semibold tracking-[0.08em] text-foreground">
                    {booking.code}
                  </span>
                  <CopyButton value={booking.code} />
                </div>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            <div className="relative mt-6 flex items-start gap-3 rounded-2xl border border-white/8 bg-black/25 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet/12 text-violet">
                <StatusIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{copy.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{copy.description}</p>
                {booking.status === "PENDING" && booking.paymentExpiresAt ? (
                  <div className="mt-3">
                    <PaymentCountdown expiresAt={booking.paymentExpiresAt.toISOString()} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="glass glass-sheen mt-4 rounded-3xl p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-cyan" />
              Detail sesi
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">Tanggal</p>
                <p className="mt-1 text-xs capitalize text-white/85">{startLabel}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">Waktu</p>
                <p className="mt-1 text-xs text-white/85">{timeLabel}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">Durasi</p>
                <p className="mt-1 text-xs text-white/85">
                  {durationLabel(booking.durationMinutes)}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-white/8 pt-4">
              <h3 className="text-[0.72rem] font-medium uppercase tracking-[0.1em] text-white/40">
                Linimasa
              </h3>
              <ol className="mt-3 space-y-3">
                {timeline.map((entry) => (
                  <li key={entry.label} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-300">
                      <entry.icon className="h-3 w-3" />
                    </span>
                    <div className="flex flex-1 flex-wrap items-baseline justify-between gap-1">
                      <span className="text-xs text-white/75">{entry.label}</span>
                      <span className="text-[0.68rem] text-white/35">
                        {entry.at
                          ? formatInTimeZone(entry.at, settings.timezone, "d MMM yyyy · HH:mm", {
                              locale: localeId,
                            })
                          : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {booking.notes ? (
              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">Catatan</p>
                <p className="mt-1 text-xs leading-relaxed text-white/70">{booking.notes}</p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
              <div className="text-xs text-white/40">
                Lokasi: <span className="text-white/70">{settings.address}</span>
              </div>
              {cancelDisabledReason ? (
                <p className="max-w-sm text-xs text-white/35">{cancelDisabledReason}</p>
              ) : (
                <CancelBookingButton bookingId={booking.id} />
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28">
          <BookingSummary
            setupName={booking.setup.name}
            setupCategory={booking.setup.category}
            imageUrl={booking.setup.imageUrl}
            rows={[
              { label: "Kode", value: <span className="font-mono">{booking.code}</span> },
              { label: "Tanggal", value: <span className="capitalize">{startLabel}</span> },
              { label: "Waktu", value: timeLabel },
              { label: "Durasi", value: durationLabel(booking.durationMinutes) },
              { label: "Harga / jam", value: formatIDR(booking.hourlyRate) },
            ]}
            total={booking.totalPrice}
          />

          <div className="glass-subtle rounded-3xl p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4 text-violet" />
              Pembayaran
            </h2>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/40">Status</span>
                <StatusBadge status={paymentStatus} kind="payment" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Metode</span>
                <span className="text-white/80">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Nominal</span>
                <span className="font-medium text-white/85">{formatIDR(booking.totalPrice)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/40">Nomor referensi</span>
                <span className="font-mono text-white/75">{booking.code}</span>
              </div>
              {booking.payment?.transactionRef ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/40">Ref. pembayaran</span>
                  <span className="truncate font-mono text-white/75">
                    {booking.payment.transactionRef}
                  </span>
                </div>
              ) : null}
            </div>

            {paymentStatus !== "VERIFIED" && paymentStatus !== "REFUNDED" ? (
              <div className="mt-4 rounded-2xl border border-white/8 bg-black/25 p-4">
                {paymentMethod === "BANK_TRANSFER" ? (
                  <>
                    <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">
                      Transfer ke
                    </p>
                    <p className="mt-1 text-sm text-white/60">{settings.bankName}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="font-mono text-base tracking-wide text-foreground">
                        {settings.bankAccountNumber}
                      </p>
                      <CopyButton value={settings.bankAccountNumber} />
                    </div>
                    <p className="text-xs text-white/50">a.n. {settings.bankAccountName}</p>
                    <p className="mt-2 text-[0.68rem] leading-relaxed text-white/35">
                      Nominal: {formatIDR(booking.totalPrice)} · Cantumkan kode {booking.code} pada
                      berita transfer.
                    </p>
                  </>
                ) : paymentMethod === "QRIS" ? (
                  <>
                    <p className="flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.1em] text-white/35">
                      <QrCode className="h-3.5 w-3.5" /> Pembayaran QRIS
                    </p>
                    {qrisImageUrl ? (
                      <div className="mt-3 flex flex-col items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrisImageUrl}
                          alt={`QRIS resmi ${settings.loungeName}`}
                          className="h-48 w-48 rounded-xl border border-white/10 bg-white p-2"
                        />
                        <p className="text-[0.65rem] text-white/35">
                          Pastikan nama merchant: {settings.loungeName}.
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-[0.7rem] leading-relaxed text-white/55">
                        QRIS resmi lounge ditampilkan oleh staff di kasir. Tunjukkan kode booking{" "}
                        <span className="font-mono text-white/85">{booking.code}</span> sebelum
                        memindai. Kami tidak menampilkan QR buatan atau QR tanpa verifikasi.
                      </p>
                    )}
                    <p className="mt-3 text-[0.68rem] leading-relaxed text-white/35">
                      Nominal: {formatIDR(booking.totalPrice)} · Referensi: {booking.code}. Status
                      berubah menjadi terverifikasi hanya setelah staff memastikan pembayaran masuk.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.1em] text-white/35">
                      <Banknote className="h-3.5 w-3.5" /> Bayar di tempat
                    </p>
                    <p className="mt-2 text-[0.7rem] leading-relaxed text-white/55">
                      Datang 5–10 menit lebih awal, lalu tunjukkan kode booking{" "}
                      <span className="font-mono text-white/85">{booking.code}</span> di kasir.
                      Bayar <strong className="text-white/85">{formatIDR(booking.totalPrice)}</strong>{" "}
                      saat tiba. Status pembayaran tetap belum lunas sampai staff mencatat uang yang
                      diterima.
                    </p>
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div className="glass-subtle rounded-3xl p-5 text-xs leading-relaxed text-muted">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              Pembayaran diverifikasi manual oleh staff. Kami tidak pernah meminta password atau
              kode OTP-mu.
            </p>
            <p className="mt-3 flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
              {settings.address}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
