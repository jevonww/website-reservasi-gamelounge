import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  Gamepad2,
  Monitor,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/src/lib/db";
import { getSettings, FALLBACK_SETTINGS } from "@/src/lib/settings";
import { addDays } from "date-fns";
import { todayInZone } from "@/src/lib/time";
import { formatIDR as money } from "@/src/lib/utils";
import { specEntries } from "@/src/lib/specs";
import { SetupGallery } from "@/src/components/setups/SetupGallery";
import { BookingWidget } from "@/src/components/booking/BookingWidget";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { GlassButton } from "@/src/components/ui/GlassButton";
import { Reveal } from "@/src/components/ui/AnimatedSection";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "PC Gaming": <Monitor className="h-4 w-4" />,
  Console: <Gamepad2 className="h-4 w-4" />,
  "Private Room": <Sparkles className="h-4 w-4" />,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const setup = await prisma.setup.findUnique({
      where: { slug },
      select: { name: true, description: true },
    });
    if (!setup) return { title: "Setup tidak ditemukan" };
    return { title: setup.name, description: setup.description.slice(0, 160) };
  } catch {
    return { title: "Setup" };
  }
}

export default async function SetupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let setup;
  let settings = FALLBACK_SETTINGS;
  try {
    setup = await prisma.setup.findUnique({ where: { slug } });
    settings = await getSettings();
  } catch (error) {
    console.error("Gagal memuat detail setup", error);
    return (
      <div className="container-wide py-16">
        <div className="glass-subtle rounded-3xl border-rose-300/20 bg-rose-300/[0.04] p-6">
          <h1 className="text-lg font-semibold text-rose-200">Detail setup tidak dapat dimuat</h1>
          <p className="mt-2 text-sm text-muted">
            Koneksi database bermasalah. Coba muat ulang halaman atau kembali ke katalog.
          </p>
          <div className="mt-4">
            <GlassButton href="/setups" variant="secondary">
              Kembali ke katalog
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  if (!setup) notFound();

  const specs = specEntries(setup.specs);
  const gallery = setup.gallery.length ? setup.gallery : [setup.imageUrl];
  const today = todayInZone(settings.timezone);
  const maxDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(addDays(new Date(), 30));

  return (
    <div className="container-wide pb-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-white/40" aria-label="Breadcrumb">
        <Link href="/setups" className="inline-flex items-center gap-1 transition hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Setups
        </Link>
        <span>/</span>
        <span className="truncate text-white/65">{setup.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-10">
        <Reveal>
          <SetupGallery images={gallery} name={setup.name} priority />

          <div className="mt-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
                {CATEGORY_ICONS[setup.category] ?? <Monitor className="h-4 w-4" />}
                {setup.category}
              </span>
              <StatusBadge status={setup.status} kind="setup" />
              {setup.featured ? (
                <span className="rounded-full border border-violet/25 bg-violet/10 px-2.5 py-1 text-[0.68rem] text-violet-bright">
                  Featured
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {setup.name}
            </h1>
            <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
              {setup.description}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="glass-subtle rounded-2xl p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.1em] text-white/35">Harga</p>
                <p className="mt-1 text-lg font-semibold">
                  {money(setup.hourlyRate)}
                  <span className="ml-1 text-xs font-normal text-muted">/jam</span>
                </p>
              </div>
              <div className="glass-subtle rounded-2xl p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.1em] text-white/35">Jam operasional</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {settings.openTime}–{settings.closeTime} WIB
                </p>
              </div>
              <div className="glass-subtle rounded-2xl p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.1em] text-white/35">Durasi</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {settings.minDurationMinutes / 60}–{settings.maxDurationMinutes / 60} jam
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <section>
                <h2 className="text-sm font-semibold text-foreground">Spesifikasi</h2>
                <ul className="mt-3 space-y-2.5">
                  {specs.map((spec) => (
                    <li
                      key={spec.key}
                      className="flex items-start justify-between gap-4 border-b border-white/6 pb-2.5 text-sm last:border-0"
                    >
                      <span className="text-white/40">{spec.label}</span>
                      <span className="text-right text-white/85">{spec.value}</span>
                    </li>
                  ))}
                  {!specs.length ? (
                    <li className="text-sm text-muted">Spesifikasi belum tersedia.</li>
                  ) : null}
                </ul>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-foreground">Fasilitas</h2>
                <ul className="mt-3 space-y-2">
                  {setup.facilities.map((facility) => (
                    <li key={facility} className="flex items-start gap-2 text-sm text-white/75">
                      <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-300/10 text-emerald-300">
                        <Check className="h-3 w-3" />
                      </span>
                      {facility}
                    </li>
                  ))}
                  {!setup.facilities.length ? (
                    <li className="text-sm text-muted">Fasilitas mengikuti standar lounge.</li>
                  ) : null}
                </ul>
              </section>
            </div>

            <div className="glass-subtle mt-8 rounded-2xl p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-cyan" />
                Penting sebelum datang
              </h2>
              <ul className="mt-3 space-y-2 text-[0.82rem] leading-relaxed text-muted">
                <li>Datang 5–10 menit lebih awal dan tunjukkan kode booking ke staff.</li>
                <li>
                  Pembayaran diverifikasi manual oleh staff. Status terbaru selalu tersedia di
                  dashboard.
                </li>
                <li>{settings.cancellationPolicy}</li>
              </ul>
            </div>
          </div>
        </Reveal>

        <aside className="lg:sticky lg:top-28">
          <BookingWidget
            setup={{
              id: setup.id,
              name: setup.name,
              slug: setup.slug,
              hourlyRate: setup.hourlyRate,
              status: setup.status,
            }}
            settings={{
              timezone: settings.timezone,
              minDurationMinutes: settings.minDurationMinutes,
              maxDurationMinutes: settings.maxDurationMinutes,
              slotIntervalMinutes: settings.slotIntervalMinutes,
              openTime: settings.openTime,
              closeTime: settings.closeTime,
              paymentExpirationMinutes: settings.paymentExpirationMinutes,
            }}
            today={today}
            maxDate={maxDate}
          />
          <div className="glass-subtle mt-4 flex items-center gap-3 rounded-2xl p-4 text-xs text-muted">
            <Clock className="h-4 w-4 shrink-0 text-violet" />
            Butuh bantuan memilih? Hubungi staff di {settings.phone}.
          </div>
        </aside>
      </div>
    </div>
  );
}
