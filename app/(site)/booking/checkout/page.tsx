import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, Building2, CalendarDays, Check, Clock, ShieldCheck } from "lucide-react";
import { prisma } from "@/src/lib/db";
import { getSettings, FALLBACK_SETTINGS } from "@/src/lib/settings";
import { requireUser } from "@/src/lib/auth/guards";
import { calculateBookingPrice, validateDuration } from "@/src/lib/pricing";
import { durationLabel, isInPast, isWithinOperatingHours } from "@/src/lib/time";
import { getSetupAvailability } from "@/src/lib/booking/service";
import { BookingSummary } from "@/src/components/booking/BookingSummary";
import { CheckoutForm } from "@/src/components/booking/CheckoutForm";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { GlassButton } from "@/src/components/ui/GlassButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout Reservasi",
  description: "Konfirmasi jadwal dan buat reservasi LEVELUP.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const setupSlug = (first(params.setup) ?? "").trim();
  const startRaw = (first(params.start) ?? "").trim();
  const duration = Number(first(params.duration) ?? "0");

  const query = new URLSearchParams();
  if (setupSlug) query.set("setup", setupSlug);
  if (startRaw) query.set("start", startRaw);
  if (duration) query.set("duration", String(duration));
  const checkoutPath = `/booking/checkout${query.size ? `?${query.toString()}` : ""}`;

  const user = await requireUser(checkoutPath);

  const invalid = (message: string, detail?: string) => (
    <div className="container-wide max-w-2xl py-10">
      <div className="glass-subtle rounded-3xl border-amber-300/20 bg-amber-300/[0.04] p-6">
        <h1 className="text-lg font-semibold text-amber-200">{message}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {detail ?? "Silakan pilih ulang setup dan jadwal dari halaman detail setup."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <GlassButton href={setupSlug ? `/setups/${setupSlug}` : "/setups"} variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke setup
          </GlassButton>
          <GlassButton href="/setups" variant="ghost">
            Lihat katalog
          </GlassButton>
        </div>
      </div>
    </div>
  );

  if (!setupSlug || !startRaw || !Number.isFinite(duration)) {
    return invalid("Data reservasi tidak lengkap.");
  }

  const startDate = new Date(startRaw);
  if (Number.isNaN(startDate.getTime())) {
    return invalid("Waktu mulai tidak valid.");
  }

  let settings = FALLBACK_SETTINGS;
  let setup;
  try {
    [settings, setup] = await Promise.all([
      getSettings(),
      prisma.setup.findUnique({ where: { slug: setupSlug } }),
    ]);
  } catch (error) {
    console.error("Gagal memuat checkout", error);
    return invalid("Data checkout tidak dapat dimuat.", "Koneksi database bermasalah. Coba lagi.");
  }

  if (!setup) return invalid("Setup tidak ditemukan.");
  if (setup.status !== "AVAILABLE") {
    return invalid("Setup sedang tidak dapat dipesan.", "Pilih setup lain yang tersedia.");
  }

  const durationError = validateDuration(duration, settings);
  if (durationError) return invalid("Durasi tidak valid.", durationError);

  const endDate = addMinutes(startDate, duration);
  if (isInPast(startDate)) {
    return invalid("Waktu mulai sudah lewat.", "Pilih slot waktu yang masih tersedia.");
  }
  if (
    !isWithinOperatingHours({
      start: startDate,
      end: endDate,
      timeZone: settings.timezone,
      openTime: settings.openTime,
      closeTime: settings.closeTime,
    })
  ) {
    return invalid(
      "Jadwal di luar jam operasional.",
      `Reservasi harus berada di antara ${settings.openTime}–${settings.closeTime} WIB.`,
    );
  }

  const dateKey = formatInTimeZone(startDate, settings.timezone, "yyyy-MM-dd");
  try {
    const availability = await getSetupAvailability({
      setupId: setup.id,
      date: dateKey,
      durationMinutes: duration,
    });
    const matching = availability.slots.find(
      (slot) => new Date(slot.start).getTime() === startDate.getTime(),
    );
    if (!matching || !matching.available) {
      return invalid(
        "Slot tersebut sudah tidak tersedia.",
        "Mungkin baru saja dipesan orang lain. Silakan pilih waktu lain.",
      );
    }
  } catch (error) {
    console.error("Gagal memvalidasi ketersediaan", error);
    return invalid("Ketersediaan tidak dapat diverifikasi.", "Coba lagi beberapa saat lagi.");
  }

  const total = calculateBookingPrice(setup.hourlyRate, duration);
  const dateLabel = formatInTimeZone(startDate, settings.timezone, "EEEE, d MMMM yyyy", {
    locale: localeId,
  });
  const timeLabel = `${formatInTimeZone(startDate, settings.timezone, "HH:mm")}–${formatInTimeZone(
    endDate,
    settings.timezone,
    "HH:mm",
  )} WIB`;

  const paymentExpiresAt = addMinutes(new Date(), settings.paymentExpirationMinutes);
  const expiresLabel = formatInTimeZone(
    paymentExpiresAt,
    settings.timezone,
    "HH:mm",
  );

  return (
    <div className="container-wide pb-10">
      <div className="mb-6">
        <Link
          href={`/setups/${setup.slug}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke detail setup
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-white/35">
        <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-emerald-200">
          1 · Pilih jadwal
        </span>
        <span className="rounded-full border border-violet/40 bg-violet/15 px-2.5 py-1 text-violet-bright">
          2 · Konfirmasi
        </span>
        <span className="rounded-full border border-white/10 px-2.5 py-1">3 · Pembayaran</span>
      </div>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <SectionHeading
            eyebrow="Checkout"
            title="Satu langkah lagi."
            description="Periksa kembali detail sesi. Reservasi akan dibuat setelah kamu menekan tombol konfirmasi."
          />

          <div className="glass glass-sheen mt-6 overflow-hidden rounded-3xl">
            <div className="relative aspect-[16/8]">
              <Image
                src={setup.imageUrl}
                alt={setup.name}
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080810] via-[#080810]/20 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-white/50">
                  {setup.category}
                </p>
                <h2 className="text-xl font-semibold">{setup.name}</h2>
              </div>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <p className="flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.1em] text-white/35">
                  <CalendarDays className="h-3 w-3" /> Tanggal
                </p>
                <p className="mt-1 text-xs capitalize text-white/85">{dateLabel}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <p className="flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.1em] text-white/35">
                  <Clock className="h-3 w-3" /> Waktu
                </p>
                <p className="mt-1 text-xs text-white/85">{timeLabel}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">Durasi</p>
                <p className="mt-1 text-xs text-white/85">{durationLabel(duration)}</p>
              </div>
            </div>
          </div>

          <div className="glass-subtle mt-4 rounded-3xl p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4 text-cyan" />
              Metode pembayaran
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Pilih metode pada formulir konfirmasi. Untuk Transfer Bank dan QRIS, selesaikan
              pembayaran sebelum{" "}
              <strong className="text-white/85">{expiresLabel} WIB</strong> agar slot tidak
              dilepas. Reservasi Bayar di Tempat tetap dikonfirmasi tanpa batas pembayaran.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-black/25 p-3">
                <p className="text-xs font-medium text-white/80">Transfer Bank</p>
                <p className="mt-1 text-[0.68rem] leading-relaxed text-white/40">
                  {settings.bankName} · {settings.bankAccountNumber} a.n. {settings.bankAccountName}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/25 p-3">
                <p className="text-xs font-medium text-white/80">QRIS</p>
                <p className="mt-1 text-[0.68rem] leading-relaxed text-white/40">
                  Pindai QRIS resmi lounge di kasir atau yang diberikan staff. Status lunas hanya
                  setelah diverifikasi.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/25 p-3">
                <p className="text-xs font-medium text-white/80">Bayar di Tempat</p>
                <p className="mt-1 text-[0.68rem] leading-relaxed text-white/40">
                  Bayar di kasir saat datang. Slot langsung diamankan sampai jadwal sesi.
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5 text-[0.78rem] text-muted">
              <li className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                Semua pembayaran diverifikasi manual oleh staff, bukan otomatis.
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                Nomor referensi dan instruksi lengkap muncul di halaman detail booking.
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                {settings.cancellationPolicy}
              </li>
            </ul>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28">
          <BookingSummary
            setupName={setup.name}
            setupCategory={setup.category}
            imageUrl={setup.imageUrl}
            rows={[
              { label: "Tanggal", value: <span className="capitalize">{dateLabel}</span> },
              { label: "Waktu", value: timeLabel },
              { label: "Durasi", value: durationLabel(duration) },
              { label: "Harga per jam", value: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(setup.hourlyRate) },
            ]}
            total={total}
            footnote="Total dihitung ulang di server saat reservasi dibuat. Harga tidak dapat diubah dari sisi klien."
          />

          <div className="glass-strong glass-sheen mt-4 rounded-3xl p-5">
            <h2 className="text-base font-semibold">Konfirmasi reservasi</h2>
            <p className="mt-1 text-xs text-muted">
              Masuk sebagai <span className="text-white/80">{user.name}</span> · {user.email}
            </p>
            <div className="mt-4">
              <CheckoutForm
                setupId={setup.id}
                startAt={startDate.toISOString()}
                durationMinutes={duration}
                total={total}
                defaultPhone={user.phone ?? ""}
              />
            </div>
          </div>

          <p className="mt-3 flex items-start gap-1.5 px-1 text-[0.68rem] leading-relaxed text-white/30">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
            Data pembayaran hanya digunakan untuk verifikasi manual oleh staff lounge.
          </p>
        </aside>
      </div>
    </div>
  );
}
