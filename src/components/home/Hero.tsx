"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, CalendarCheck, Gamepad2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { cn, formatIDR } from "@/src/lib/utils";
import { specEntries } from "@/src/lib/specs";
import type { LoungeSettingsView } from "@/src/lib/settings";

interface FeaturedSetup {
  name: string;
  slug: string;
  category: string;
  hourlyRate: number;
  imageUrl: string;
  specs: unknown;
  status: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export function Hero({
  settings,
  featuredSetups,
  availableCount,
}: {
  settings: LoungeSettingsView;
  featuredSetups: FeaturedSetup[];
  availableCount: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = featuredSetups.length;
  const activeIndex = count ? index % count : 0;
  const active = featuredSetups[activeIndex] ?? null;
  const specs = active ? specEntries(active.specs, 2) : [];

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [count, paused]);

  return (
    <section className="relative overflow-hidden pb-16 pt-6 sm:pb-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/images/hero-lounge.svg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" />
      </div>

      <div className="container-wide">
        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
          <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl">
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[0.72rem] text-white/70 backdrop-blur-md">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
                </span>
                Buka setiap hari · {settings.openTime}–{settings.closeTime} WIB
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-6 text-balance text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.035em] sm:text-6xl xl:text-[4.4rem]"
            >
              YOUR NEXT LEVEL
              <br />
              <span className="text-gradient">STARTS HERE.</span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-xl text-[0.98rem] leading-relaxed text-muted sm:text-lg"
            >
              {settings.loungeName} adalah lounge gaming premium untuk sesi ranked, co-op, atau
              private room. Pilih setup, tentukan jam, dan konfirmasi reservasimu dalam hitungan
              detik.
            </motion.p>

            <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/setups"
                className="btn-shine group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-violet-bright to-violet px-6 text-[0.95rem] font-semibold text-[#0a0a12] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_18px_40px_-14px_rgba(155,123,255,0.75)] transition hover:-translate-y-0.5"
              >
                Book Your Setup
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/setups"
                className="glass inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.95rem] font-medium text-foreground transition hover:-translate-y-0.5 hover:border-white/25"
              >
                Explore Setups
                <ArrowUpRight className="h-4 w-4 text-violet" />
              </Link>
            </motion.div>

            <motion.div
              variants={item}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.78rem] text-white/55"
            >
              <span className="inline-flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-violet" /> Reservasi online 24/7
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan" /> Konfirmasi oleh staff
              </span>
              <span className="inline-flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet" /> Slot real-time
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto"
          >
            {active ? (
              <>
                <div className="relative animate-float-slow">
                  <div className="glass-strong glass-sheen relative overflow-hidden rounded-[2rem] p-2.5">
                    <motion.div
                      key={active.slug}
                      initial={{ opacity: 0.35, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.6rem]">
                        <Image
                          src={active.imageUrl}
                          alt={active.name}
                          fill
                          priority={activeIndex === 0}
                          sizes="(max-width: 1024px) 90vw, 34vw"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080810]/90 via-transparent to-transparent" />
                        <div className="absolute left-4 top-4 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[0.68rem] text-white/80 backdrop-blur-md">
                            <Sparkles className="h-3 w-3 text-violet" />
                            Featured Setup
                          </span>
                        </div>
                        {count > 1 ? (
                          <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[0.65rem] tabular-nums text-white/70 backdrop-blur-md">
                            {activeIndex + 1} / {count}
                          </span>
                        ) : null}
                        <div className="absolute inset-x-4 bottom-4">
                          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/50">
                            {active.category}
                          </p>
                          <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                            {active.name}
                          </h2>
                        </div>
                      </div>

                      <div className="px-4 pb-3 pt-4">
                        <div className="grid min-h-[3.9rem] grid-cols-2 content-start gap-3">
                          {specs.map((spec) => (
                            <div key={spec.key} className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
                              <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">
                                {spec.label}
                              </p>
                              <p className="mt-0.5 truncate text-[0.78rem] text-white/80">{spec.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
                          <div>
                            <p className="text-[0.62rem] uppercase tracking-[0.12em] text-white/35">
                              Per jam
                            </p>
                            <p className="text-lg font-semibold">
                              {formatIDR(active.hourlyRate)}
                              <span className="ml-1 text-xs font-normal text-muted">/jam</span>
                            </p>
                          </div>
                          <Link
                            href={`/setups/${active.slug}`}
                            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/[0.08] px-4 text-sm font-medium text-foreground transition hover:bg-violet hover:text-[#0a0a12]"
                          >
                            Pesan Sekarang
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="glass-strong absolute -bottom-7 -left-4 hidden items-center gap-3 rounded-2xl px-4 py-3 sm:flex"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/12 text-emerald-300">
                      <Gamepad2 className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.1em] text-white/40">
                        Setup tersedia
                      </p>
                      <p className="text-sm font-semibold">
                        {availableCount} unit siap dimainkan
                      </p>
                    </div>
                  </motion.div>
                </div>

                {count > 1 ? (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    {featuredSetups.map((setup, dotIndex) => (
                      <button
                        key={setup.slug}
                        type="button"
                        onClick={() => setIndex(dotIndex)}
                        aria-label={`Tampilkan ${setup.name}`}
                        aria-pressed={dotIndex === activeIndex}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300",
                          dotIndex === activeIndex
                            ? "w-7 bg-violet-bright"
                            : "w-2.5 bg-white/25 hover:bg-white/50",
                        )}
                      />
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="glass-strong glass-sheen rounded-[2rem] p-8">
                <p className="text-sm text-muted">
                  Katalog setup sedang disiapkan. Silakan kembali beberapa saat lagi.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink to-transparent" />
    </section>
  );
}
