import Link from "next/link";
import { ArrowUpRight, AtSign, Clock, Mail, MapPin, Phone } from "lucide-react";
import type { LoungeSettingsView } from "@/src/lib/settings";

export function SiteFooter({ settings }: { settings: LoungeSettingsView }) {
  return (
    <footer className="relative mt-24 border-t border-white/8 pb-10 pt-16">
      <div className="container-wide">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-bright via-violet to-[#5a3df0] text-sm font-black text-[#0a0a12] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                L
              </span>
              <span className="text-lg font-semibold tracking-[0.16em]">{settings.loungeName}</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {settings.tagline}. Reservasi online untuk PC gaming, console, dan private room —
              tanpa antre, langsung main.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-muted">
              <Clock className="h-4 w-4 text-violet" />
              Setiap hari · {settings.openTime}–{settings.closeTime} WIB
            </div>
          </div>

          <div>
            <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-white/45">
              Navigasi
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { href: "/", label: "Home" },
                { href: "/setups", label: "Setups" },
                { href: "/#how-it-works", label: "How It Works" },
                { href: "/#about", label: "About" },
                { href: "/dashboard", label: "Dashboard" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1 text-muted transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-white/45">
              Kunjungi Kami
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-violet" />
                <span>{settings.phone}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-violet" />
                <a href={`mailto:${settings.email}`} className="transition hover:text-foreground">
                  {settings.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <AtSign className="h-4 w-4 shrink-0 text-violet" />
                <span>{settings.instagram}</span>
              </li>
            </ul>
            <a
              href={settings.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-sm text-cyan transition hover:text-white"
            >
              Buka di Maps
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="hairline my-8" />

        <div className="flex flex-col items-start justify-between gap-3 text-xs text-white/35 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {settings.loungeName}. Semua hak dilindungi.
          </p>
          <p>Dibangun untuk pengalaman gaming premium.</p>
        </div>
      </div>
    </footer>
  );
}
