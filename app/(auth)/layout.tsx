import Link from "next/link";
import { CalendarCheck, ShieldCheck, Sparkles } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: CalendarCheck,
    title: "Slot aman & anti double-booking",
    description: "Jadwal diverifikasi ulang di server sebelum reservasi disimpan.",
  },
  {
    icon: ShieldCheck,
    title: "Pembayaran transparan",
    description: "Transfer bank, QRIS, atau bayar di tempat dengan status yang jelas.",
  },
  {
    icon: Sparkles,
    title: "Satu dashboard",
    description: "Pantau status pembayaran, jadwal, dan riwayat sesi kapan saja.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="container-wide flex items-center justify-between gap-4 py-5 sm:py-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="LEVELUP — beranda">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-bright via-violet to-[#5a3df0] text-sm font-black text-[#0a0a12] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
            L
          </span>
          <span className="text-sm font-semibold tracking-[0.16em]">LEVELUP</span>
        </Link>
        <Link
          href="/"
          className="rounded-full px-3 py-2 text-xs text-muted transition hover:bg-white/[0.05] hover:text-foreground"
        >
          ← Kembali ke beranda
        </Link>
      </header>

      <main className="container-wide flex flex-1 items-center py-4 pb-12 sm:py-8 sm:pb-20">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_minmax(380px,440px)] lg:items-center lg:gap-16">
          <section className="hidden lg:block" aria-label="Keunggulan LEVELUP">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden />
              Premium Gaming Lounge
            </p>
            <h2 className="mt-5 max-w-md text-4xl font-semibold leading-[1.08] tracking-tight">
              Masuk. Pesan slot. <span className="text-gradient">Naik level.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              Akun LEVELUP menyimpan detail sesi, nomor referensi, dan status pembayaranmu —
              tanpa perlu mencatat ulang.
            </p>
            <ul className="mt-8 space-y-4">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-violet">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white/85">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/45">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="mx-auto w-full max-w-md lg:mx-0">{children}</div>
        </div>
      </main>

      <footer className="container-wide pb-6 text-center text-[0.68rem] leading-relaxed text-white/30">
        © {new Date().getFullYear()} LEVELUP Gaming Lounge · Akses akun dilindungi sesi
        HttpOnly.
      </footer>
    </div>
  );
}
