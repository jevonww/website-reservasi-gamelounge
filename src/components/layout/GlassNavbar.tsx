"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, LayoutDashboard, LogIn, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { initials } from "@/src/lib/utils";
import { logoutFormAction } from "@/src/actions/auth";

const LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/setups", label: "Setup" },
  { href: "/#how-it-works", label: "Cara Pesan" },
  { href: "/#about", label: "Tentang" },
];

export function GlassNavbar({
  loungeName = "LEVELUP",
  user,
}: {
  loungeName?: string;
  user: { name: string; role: string } | null;
}) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile menu whenever the route changes, without an effect.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-3 sm:pt-4">
      <div ref={menuRef} className="container-wide">
        <nav
          aria-label="Navigasi utama"
          className={cn(
            "relative flex items-center justify-between gap-4 rounded-full border px-3 py-2 transition-all duration-300 sm:px-4",
            scrolled
              ? "glass-strong glass-sheen border-white/15 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.85)]"
              : "border-white/8 bg-black/10 backdrop-blur-md",
          )}
        >
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-full pl-1 pr-2"
            aria-label={`${loungeName} — beranda`}
          >
            <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-bright via-violet to-[#5a3df0] text-[0.8rem] font-black text-[#0a0a12] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_18px_-6px_rgba(155,123,255,0.8)]">
              L
              <span className="absolute inset-x-0 top-0 h-1/2 bg-white/25" />
            </span>
            <span className="text-[0.95rem] font-semibold tracking-[0.16em] text-foreground">
              {loungeName}
            </span>
          </Link>

          <div className="hidden items-center gap-0.5 lg:flex">
            {LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : !link.href.includes("#") && pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[0.84rem] transition-colors",
                    active ? "text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.07]"
                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    />
                  ) : null}
                  <span className="relative">{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href={user.role === "ADMIN" || user.role === "STAFF" ? "/admin" : "/dashboard"}
                  className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-xs text-muted transition hover:border-white/20 hover:text-foreground sm:flex"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet/70 to-cyan/50 text-[0.65rem] font-bold text-[#0b0b14]">
                    {initials(user.name)}
                  </span>
                  <span className="max-w-24 truncate">{user.name.split(" ")[0]}</span>
                </Link>
                <form action={logoutFormAction} className="hidden sm:block">
                  <button
                    type="submit"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-white/[0.06] hover:text-foreground"
                    aria-label="Keluar dari akun"
                    title="Keluar"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[0.84rem] text-muted transition hover:text-foreground sm:flex"
              >
                <LogIn className="h-4 w-4" />
                Masuk
              </Link>
            )}

            <Link
              href="/setups"
              className="btn-shine group relative hidden h-9 items-center gap-1.5 rounded-full bg-gradient-to-b from-violet-bright to-violet px-4 text-[0.84rem] font-semibold text-[#0a0a12] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_24px_-10px_rgba(155,123,255,0.7)] transition hover:-translate-y-0.5 sm:inline-flex"
            >
              Pesan Sekarang
              <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Tutup menu" : "Buka menu"}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground lg:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open ? (
            <motion.div
              id="mobile-nav"
              initial={{ opacity: 0, y: -8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong glass-sheen mt-2 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl p-2 lg:hidden"
            >
              <div className="flex flex-col">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-2xl px-4 py-3 text-sm text-muted transition hover:bg-white/[0.06] hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="mt-2 border-t border-white/8 p-2">
                {user ? (
                  <div className="flex flex-col gap-1">
                    <Link
                      href={user.role === "ADMIN" || user.role === "STAFF" ? "/admin" : "/dashboard"}
                      className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm text-foreground transition hover:bg-white/[0.06]"
                    >
                      <LayoutDashboard className="h-4 w-4 text-violet" />
                      {user.role === "ADMIN" || user.role === "STAFF" ? "Admin Panel" : "Dashboard"}
                    </Link>
                    <form action={logoutFormAction}>
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm text-muted transition hover:bg-white/[0.06] hover:text-foreground"
                      >
                        <LogOut className="h-4 w-4" />
                        Keluar
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm text-foreground transition hover:bg-white/[0.06]"
                    >
                      <LogIn className="h-4 w-4 text-violet" />
                      Masuk
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2.5 text-sm text-muted transition hover:bg-white/[0.06] hover:text-foreground"
                    >
                      Daftar
                    </Link>
                  </div>
                )}
                <Link
                  href="/setups"
                  className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-violet-bright to-violet text-sm font-semibold text-[#0a0a12]"
                >
                  Pesan Setup
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}
