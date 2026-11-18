"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Settings,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { cn, initials } from "@/src/lib/utils";
import { logoutFormAction } from "@/src/actions/auth";

type IconKey =
  | "overview"
  | "bookings"
  | "setups"
  | "profile"
  | "users"
  | "settings"
  | "home"
  | "catalog";

const ICONS: Record<IconKey, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  bookings: CalendarDays,
  setups: Monitor,
  profile: UserCircle,
  users: Users,
  settings: Settings,
  home: ArrowLeft,
  catalog: Gamepad2,
};

interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
  exact?: boolean;
}

const CUSTOMER_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Ringkasan", icon: "overview", exact: true },
  { href: "/dashboard/profile", label: "Profil", icon: "profile" },
  { href: "/setups", label: "Pesan setup", icon: "catalog" },
  { href: "/", label: "Kembali ke situs", icon: "home" },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin", label: "Ringkasan", icon: "overview", exact: true },
  { href: "/admin/bookings", label: "Booking", icon: "bookings" },
  { href: "/admin/setups", label: "Setup", icon: "setups" },
];

const ADMIN_ONLY: NavItem[] = [
  { href: "/admin/users", label: "Pengguna", icon: "users" },
  { href: "/admin/settings", label: "Pengaturan", icon: "settings" },
];

export function DashboardSidebar({
  variant,
  user,
}: {
  variant: "customer" | "admin";
  user: { name: string; email: string; role: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = variant === "admin";
  const items = isAdmin ? [...ADMIN_ITEMS, ...(user.role === "ADMIN" ? ADMIN_ONLY : [])] : CUSTOMER_ITEMS;

  const content = (
    <div className="flex h-full flex-col rounded-3xl border border-white/8 bg-[#0d0d17]/95 p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
      <Link href="/" className="flex items-center gap-2.5 rounded-2xl px-2 py-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-bright via-violet to-[#5a3df0] text-[0.8rem] font-black text-[#0a0a12] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
          L
        </span>
        <div>
          <p className="text-[0.78rem] font-semibold tracking-[0.16em]">LEVELUP</p>
          <p className="text-[0.6rem] uppercase tracking-[0.12em] text-white/30">
            {isAdmin ? "Konsol admin" : "Area member"}
          </p>
        </div>
      </Link>

      <nav className="mt-4 flex-1 space-y-1" aria-label="Navigasi dashboard">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.82rem] transition",
                active
                  ? "bg-white/[0.07] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-muted hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-violet" />
              ) : null}
              <Icon className={cn("h-4 w-4", active ? "text-violet" : "text-white/35")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {isAdmin ? (
        <div className="mx-1 mb-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-[0.65rem] leading-relaxed text-white/40">
          <BarChart3 className="mb-1 h-3.5 w-3.5 text-cyan" />
          Semua aksi staff tercatat di audit log.
        </div>
      ) : null}

      <div className="mt-2 border-t border-white/8 pt-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet/70 to-cyan/50 text-[0.65rem] font-bold text-[#0b0b14]">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.78rem] font-medium text-foreground">{user.name}</p>
            <p className="truncate text-[0.65rem] text-white/35">{user.email}</p>
          </div>
        </div>
        <form action={logoutFormAction} className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[0.78rem] text-muted transition hover:bg-white/[0.04] hover:text-foreground"
          >
            <LogOut className="h-4 w-4 text-white/35" />
            Keluar
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 -mx-4 mb-4 border-b border-white/8 bg-[#080810]/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-bright via-violet to-[#5a3df0] text-[0.7rem] font-black text-[#0a0a12]">
              L
            </span>
            <span className="text-xs font-semibold tracking-[0.16em]">LEVELUP</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka menu dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-6 h-[calc(100dvh-3rem)]">{content}</div>
      </aside>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="h-full w-72 p-3"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative h-full">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup menu"
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-muted"
                >
                  <X className="h-4 w-4" />
                </button>
                {content}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
