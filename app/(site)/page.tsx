import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Coffee,
  Cpu,
  Gamepad2,
  Headphones,
  MapPin,
  Monitor,
  ShieldCheck,
  Snowflake,
  Sofa,
  Sparkles,
  Wifi,
  Zap,
} from "lucide-react";
import { prisma } from "@/src/lib/db";
import { getSettings, FALLBACK_SETTINGS, type LoungeSettingsView } from "@/src/lib/settings";
import { Hero } from "@/src/components/home/Hero";
import { SetupCard } from "@/src/components/setups/SetupCard";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { AnimatedSection, Reveal } from "@/src/components/ui/AnimatedSection";
import { GlassButton } from "@/src/components/ui/GlassButton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { formatIDR } from "@/src/lib/utils";
import type { Setup } from "@/src/generated/prisma/client";

export const dynamic = "force-dynamic";

const WHY = [
  {
    icon: Cpu,
    title: "Hardware yang dirawat serius",
    text: "Setiap station dicek sebelum sesi: performa, koneksi, headset, dan kebersihan. Kalau ada kendala, tim kami siap membantu di tempat.",
  },
  {
    icon: Zap,
    title: "Booking tanpa drama",
    text: "Ketersediaan slot dihitung real-time di server. Tidak ada double booking, tidak ada kejutan saat datang.",
  },
  {
    icon: ShieldCheck,
    title: "Pembayaran transparan",
    text: "Harga terkunci saat reservasi dibuat. Pembayaran diverifikasi staff dan status booking selalu bisa kamu cek dari dashboard.",
  },
];

const STEPS = [
  {
    icon: Monitor,
    title: "Pilih setup",
    text: "Jelajahi PC, console, atau private room sesuai kebutuhan squad-mu.",
  },
  {
    icon: CalendarCheck,
    title: "Tentukan jadwal",
    text: "Pilih tanggal, jam mulai, dan durasi. Slot yang bentrok otomatis tidak muncul.",
  },
  {
    icon: Sparkles,
    title: "Konfirmasi & bayar",
    text: "Dapatkan kode booking, lalu ikuti instruksi pembayaran di halaman konfirmasi.",
  },
  {
    icon: Gamepad2,
    title: "Datang & main",
    text: "Tunjukkan kode booking ke staff. Setelah check-in, sesimu langsung berjalan.",
  },
];

const AMENITIES = [
  { icon: Wifi, label: "WiFi fiber 1Gbps" },
  { icon: Snowflake, label: "AC di seluruh ruangan" },
  { icon: Headphones, label: "Headset & audio bersih" },
  { icon: Coffee, label: "Minuman gratis" },
  { icon: Sofa, label: "Sofa & area santai" },
  { icon: ShieldCheck, label: "Staff on-site" },
];

const FAQ = [
  {
    q: "Bagaimana cara melakukan reservasi?",
    a: "Pilih setup di halaman Setups, tentukan tanggal, jam mulai, dan durasi. Setelah login, kamu akan diarahkan ke checkout untuk membuat booking. Kode booking dan instruksi pembayaran muncul di halaman konfirmasi.",
  },
  {
    q: "Berapa lama saya harus menyelesaikan pembayaran?",
    a: "Batas waktu pembayaran ditampilkan di halaman booking. Jika belum dibayar sampai batas tersebut, booking otomatis kedaluwarsa dan slotnya dilepas untuk pengunjung lain.",
  },
  {
    q: "Apakah bisa membatalkan atau mengubah jadwal?",
    a: "Booking yang masih menunggu pembayaran dapat dibatalkan kapan saja. Booking terkonfirmasi dapat dibatalkan hingga beberapa jam sebelum sesi (lihat kebijakan pembatalan di halaman booking). Untuk perubahan jadwal, hubungi staff kami.",
  },
  {
    q: "Apakah harga sudah termasuk semua fasilitas?",
    a: "Ya. Harga per jam yang tertera sudah mencakup penggunaan setup dan fasilitas standar di lounge. Biaya tambahan, jika ada, akan dijelaskan oleh staff sebelum sesi dimulai.",
  },
  {
    q: "Bisa booking untuk rombongan atau turnamen kecil?",
    a: "Bisa. Private Room cocok untuk squad maupun turnamen kecil. Untuk kebutuhan khusus, hubungi kami melalui kontak yang tertera di bawah.",
  },
];

const CATEGORY_META: Record<string, { icon: typeof Monitor; blurb: string; accent: string }> = {
  "PC Gaming": {
    icon: Monitor,
    blurb: "PC esports dan high-end dengan monitor cepat.",
    accent: "from-violet/20 to-transparent text-violet",
  },
  Console: {
    icon: Gamepad2,
    blurb: "PS5 station dengan layar 4K dan dua controller.",
    accent: "from-cyan/16 to-transparent text-cyan",
  },
  "Private Room": {
    icon: Sofa,
    blurb: "Ruang privat untuk squad, santai, atau mini event.",
    accent: "from-emerald-400/14 to-transparent text-emerald-300",
  },
};

export default async function HomePage() {
  let settings: LoungeSettingsView = FALLBACK_SETTINGS;
  let setups: Setup[] = [];
  let heroSetups: Setup[] = [];
  let categoryCounts: { category: string; count: number }[] = [];
  let dbOnline = true;

  try {
    settings = await getSettings();
    const [availableSetups, groups] = await Promise.all([
      prisma.setup.findMany({
        where: { status: "AVAILABLE" },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.setup.groupBy({
        by: ["category"],
        where: { status: "AVAILABLE" },
        _count: { _all: true },
      }),
    ]);
    setups = availableSetups.slice(0, 4);
    heroSetups = availableSetups.slice(0, 6);
    categoryCounts = groups.map((group) => ({
      category: group.category,
      count: group._count._all,
    }));
  } catch (error) {
    console.error("Gagal memuat landing page", error);
    dbOnline = false;
  }

  const heroFeatured = heroSetups.map((setup) => ({
    name: setup.name,
    slug: setup.slug,
    category: setup.category,
    hourlyRate: setup.hourlyRate,
    imageUrl: setup.imageUrl,
    specs: setup.specs,
    status: setup.status,
  }));
  const countFor = (category: string) =>
    categoryCounts.find((entry) => entry.category === category)?.count ?? 0;
  const startingPrice = setups.length
    ? Math.min(...setups.map((setup) => setup.hourlyRate))
    : null;

  return (
    <>
      <Hero
        settings={settings}
        featuredSetups={heroFeatured}
        availableCount={countFor("PC Gaming") + countFor("Console") + countFor("Private Room")}
      />

      {!dbOnline ? (
        <div className="container-wide">
          <div className="glass-subtle rounded-2xl border-amber-300/20 bg-amber-300/[0.04] px-4 py-3 text-sm text-amber-200">
            Data setup sedang tidak dapat dimuat. Pastikan database berjalan, lalu muat ulang halaman.
          </div>
        </div>
      ) : null}

      {/* FEATURED SETUPS */}
      <AnimatedSection id="setups" className="container-wide scroll-mt-28 pt-14 sm:pt-20">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Featured Setups"
            title="Pilih station-mu."
            description="Dari PC kompetitif sampai private room — semua bisa dipesan per jam dengan harga yang jelas."
          />
          <Link
            href="/setups"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
          >
            Lihat semua setup
            <ArrowUpRight className="h-4 w-4 text-violet" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {setups.length ? (
            setups.map((setup, index) => (
              <Reveal key={setup.id} delay={index * 0.06}>
                <SetupCard setup={setup} priority={index === 0} />
              </Reveal>
            ))
          ) : (
            <div className="sm:col-span-2 xl:col-span-3">
              <EmptyState
                icon={<Monitor className="h-5 w-5" />}
                title="Belum ada setup yang tersedia"
                description="Katalog sedang diperbarui. Hubungi kami untuk ketersediaan hari ini."
                action={<GlassButton href="/setups">Cek katalog</GlassButton>}
              />
            </div>
          )}
        </div>
      </AnimatedSection>

      {/* WHY LEVELUP */}
      <AnimatedSection id="about" className="container-wide scroll-mt-28 pt-24 sm:pt-32">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Why LEVELUP"
              title={
                <>
                  Dirancang untuk sesi yang
                  <span className="text-gradient"> benar-benar enak.</span>
                </>
              }
              description="Bukan sekadar tempat mabar. Kami menjaga hardware, ruang, dan alur reservasi supaya kamu bisa fokus ke permainan."
            />
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <span className="glass-subtle inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-white/65">
                <Clock className="h-4 w-4 text-violet" />
                {settings.openTime}–{settings.closeTime} setiap hari
              </span>
              <span className="glass-subtle inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-white/65">
                <MapPin className="h-4 w-4 text-cyan" />
                {settings.address}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {WHY.map((feature, index) => (
              <Reveal
                key={feature.title}
                delay={index * 0.07}
                className={index === 2 ? "sm:col-span-2" : undefined}
              >
                <div className="glass glass-sheen h-full rounded-3xl p-5 transition duration-300 hover:border-white/20">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet/12 text-violet">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-[0.98rem] font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-[0.84rem] leading-relaxed text-muted">{feature.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* CATEGORIES */}
      <AnimatedSection className="container-wide pt-24 sm:pt-32">
        <SectionHeading
          align="center"
          eyebrow="Categories"
          title="Satu lounge, tiga cara main."
          description={
            startingPrice
              ? `Harga mulai ${formatIDR(startingPrice)} per jam. Pilih kategori yang paling cocok.`
              : "Pilih kategori yang paling cocok untuk sesi kamu."
          }
        />
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {Object.entries(CATEGORY_META).map(([category, meta], index) => {
            const count = countFor(category);
            const Icon = meta.icon;
            return (
              <Reveal key={category} delay={index * 0.07}>
                <Link
                  href={`/setups?category=${encodeURIComponent(category)}`}
                  className="group glass glass-sheen relative block overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20"
                >
                  <div
                    className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${meta.accent} blur-2xl`}
                  />
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/80">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.68rem] text-white/55">
                      {count} setup
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{category}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{meta.blurb}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-[0.8rem] text-white/65 transition group-hover:text-violet-bright">
                    Jelajahi
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </AnimatedSection>

      {/* HOW IT WORKS */}
      <AnimatedSection id="how-it-works" className="container-wide scroll-mt-28 pt-24 sm:pt-32">
        <SectionHeading
          eyebrow="How It Works"
          title="Empat langkah, langsung main."
          description="Alur reservasi dirancang singkat. Semua validasi penting terjadi di server, jadi slot yang kamu lihat adalah slot yang benar-benar tersedia."
        />
        <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06}>
              <div className="glass-subtle group relative h-full rounded-3xl p-5 transition duration-300 hover:border-white/15 hover:bg-white/[0.05]">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-violet">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-[0.7rem] font-mono text-white/30">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-[0.95rem] font-semibold">{step.title}</h3>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-muted">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </AnimatedSection>

      {/* AMENITIES */}
      <AnimatedSection className="container-wide pt-24 sm:pt-32">
        <div className="glass glass-sheen relative overflow-hidden rounded-[2rem] p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet/20 blur-3xl" />
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <SectionHeading
              eyebrow="Lounge Amenities"
              title="Detail kecil yang bikin betah."
              description="Fasilitas standar di semua area. Beberapa setup memiliki fasilitas tambahan yang tercantum di halaman detail."
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {AMENITIES.map((amenity) => (
                <div
                  key={amenity.label}
                  className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5"
                >
                  <amenity.icon className="h-4.5 w-4.5 text-cyan" />
                  <span className="text-[0.8rem] text-white/75">{amenity.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* FAQ */}
      <AnimatedSection className="container-wide pt-24 sm:pt-32">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeading
            eyebrow="FAQ"
            title="Pertanyaan yang sering muncul."
            description="Belum menemukan jawaban? Hubungi kami lewat telepon atau email di bagian lokasi."
          />
          <div className="space-y-3">
            {FAQ.map((entry) => (
              <details
                key={entry.q}
                className="group glass-subtle rounded-2xl px-5 py-4 open:border-white/15 open:bg-white/[0.05]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[0.92rem] font-medium text-foreground marker:hidden">
                  {entry.q}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-muted transition group-open:rotate-45 group-open:border-violet/40 group-open:text-violet">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[0.85rem] leading-relaxed text-muted">{entry.a}</p>
              </details>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* LOCATION */}
      <AnimatedSection className="container-wide pt-24 sm:pt-32">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass glass-sheen relative min-h-[280px] overflow-hidden rounded-[2rem] p-6 sm:p-8">
            <div className="ambient-grid absolute inset-0 opacity-60" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-violet">
                  Location & Hours
                </p>
                <h2 className="mt-3 max-w-sm text-2xl font-semibold tracking-tight sm:text-3xl">
                  Mampir dan rasakan sendiri.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
                  {settings.address}
                </p>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white/75 backdrop-blur">
                  <Clock className="h-4 w-4 text-cyan" />
                  {settings.openTime}–{settings.closeTime} WIB
                </span>
                <GlassButton href={settings.mapsUrl} target="_blank" variant="secondary" size="sm">
                  <MapPin className="h-4 w-4 text-violet" />
                  Lihat peta
                </GlassButton>
              </div>
            </div>
            <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 lg:block">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-violet/25">
                <div className="absolute inset-4 rounded-full border border-cyan/20" />
                <div className="absolute inset-10 rounded-full bg-violet/20 blur-xl" />
                <MapPin className="relative h-7 w-7 text-violet" />
              </div>
            </div>
          </div>

          <div className="glass-subtle rounded-[2rem] p-6 sm:p-8">
            <h3 className="text-sm font-semibold text-foreground">Kontak cepat</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05] text-violet">
                  <CalendarCheck className="h-4 w-4" />
                </span>
                Reservasi online 24/7
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05] text-cyan">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                Konfirmasi oleh staff
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05] text-emerald-300">
                  <Sparkles className="h-4 w-4" />
                </span>
                {settings.cancellationPolicy}
              </li>
            </ul>
            <div className="mt-6 rounded-2xl border border-white/8 bg-black/25 p-4 text-sm">
              <p className="text-white/50">Telepon / WhatsApp</p>
              <p className="mt-1 font-medium text-foreground">{settings.phone}</p>
              <p className="mt-3 text-white/50">Email</p>
              <p className="mt-1 font-medium text-foreground">{settings.email}</p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* FINAL CTA */}
      <AnimatedSection className="container-wide pt-24 sm:pt-32">
        <div className="glass-strong glass-sheen relative overflow-hidden rounded-[2.25rem] px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 hero-light opacity-80" />
          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-[0.72rem] text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-violet" />
              Slot terbatas setiap harinya
            </span>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Siap naik ke level berikutnya?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-relaxed text-muted">
              Amankan station favoritmu sekarang. Pilih setup, tentukan jam, dan datang siap main.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <GlassButton href="/setups" size="lg">
                Book Your Setup
                <ArrowRight className="h-4 w-4" />
              </GlassButton>
              <GlassButton href="/register" variant="secondary" size="lg">
                Buat akun gratis
              </GlassButton>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </>
  );
}
