import type { Metadata } from "next";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { id as localeId } from "date-fns/locale";
import { Search, ShieldCheck, UserRound, Users } from "lucide-react";
import { prisma } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth/guards";
import { getSettings, FALLBACK_SETTINGS } from "@/src/lib/settings";
import { ROLE_LABELS } from "@/src/lib/constants";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Pagination } from "@/src/components/ui/Pagination";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { DataTable, TableCell, TableRow } from "@/src/components/ui/DataTable";
import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { RoleSelect } from "@/src/components/admin/RoleSelect";
import type { Prisma } from "@/src/generated/prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kelola Pengguna",
};

const PAGE_SIZE = 20;
const ROLES = ["CUSTOMER", "STAFF", "ADMIN"] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin("/admin/users");

  const params = await searchParams;
  const q = (first(params.q) ?? "").trim();
  const rawRole = (first(params.role) ?? "").trim();
  const role = ROLES.includes(rawRole as (typeof ROLES)[number]) ? rawRole : "";
  const pageParam = Number(first(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  let settings = FALLBACK_SETTINGS;
  let users: Awaited<ReturnType<typeof loadUsers>> = [];
  let total = 0;
  let counts = { CUSTOMER: 0, STAFF: 0, ADMIN: 0 };
  let failed = false;

  async function loadUsers(where: Prisma.UserWhereInput) {
    return prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: { select: { bookings: true } },
      },
    });
  }

  try {
    settings = await getSettings();

    const where: Prisma.UserWhereInput = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(role ? { role: role as (typeof ROLES)[number] } : {}),
    };

    const [rows, count, grouped] = await Promise.all([
      loadUsers(where),
      prisma.user.count({ where }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    ]);

    users = rows;
    total = count;
    counts = { CUSTOMER: 0, STAFF: 0, ADMIN: 0 };
    for (const entry of grouped) {
      if (entry.role in counts) {
        counts[entry.role as keyof typeof counts] = entry._count._all;
      }
    }
  } catch (error) {
    console.error("Gagal memuat pengguna admin", error);
    failed = true;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(q || role);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Administrasi"
        title="Kelola pengguna"
        description="Atur hak akses akun. Perubahan role langsung berlaku pada request berikutnya dan tercatat di audit log."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface rounded-2xl p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.1em] text-white/35">Customer</p>
          <p className="mt-1 text-xl font-semibold">{counts.CUSTOMER}</p>
        </div>
        <div className="surface rounded-2xl p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.1em] text-white/35">Staff</p>
          <p className="mt-1 text-xl font-semibold text-cyan">{counts.STAFF}</p>
        </div>
        <div className="surface rounded-2xl p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.1em] text-white/35">Admin</p>
          <p className="mt-1 text-xl font-semibold text-violet-bright">{counts.ADMIN}</p>
        </div>
      </div>

      <form className="surface rounded-2xl p-4" action="/admin/users">
        <div className="grid gap-3 sm:grid-cols-[1.8fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Cari nama, email, atau telepon…"
              className="field pl-10"
              aria-label="Cari pengguna"
            />
          </div>
          <select name="role" defaultValue={role} className="field" aria-label="Filter role">
            <option value="">Semua role</option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-[2.7rem] items-center justify-center gap-1.5 rounded-xl border border-violet/30 bg-violet/15 px-4 text-sm font-medium text-violet-bright transition hover:bg-violet/25"
          >
            <Search className="h-3.5 w-3.5" />
            Cari
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <p>
          {failed ? "Gagal memuat data" : `${total} pengguna ditemukan`}
          {role ? ` · ${ROLE_LABELS[role]}` : ""}
          {q ? ` · “${q}”` : ""}
        </p>
        {totalPages > 1 ? (
          <p className="text-white/35">
            Halaman {page} dari {totalPages}
          </p>
        ) : null}
      </div>

      {failed ? (
        <div className="glass-subtle rounded-2xl border-rose-300/20 bg-rose-300/[0.04] px-4 py-3 text-sm text-rose-200">
          Daftar pengguna gagal dimuat. Coba muat ulang halaman.
        </div>
      ) : users.length ? (
        <>
          <DataTable
            caption="Daftar pengguna"
            columns={[
              { key: "pengguna", label: "Pengguna" },
              { key: "telepon", label: "Telepon" },
              { key: "booking", label: "Booking" },
              { key: "bergabung", label: "Bergabung" },
              { key: "role", label: "Role" },
              { key: "aksi", label: "Aksi", className: "text-right" },
            ]}
            footer={
              <>
                <span>{total} pengguna terdaftar</span>
                <span className="inline-flex items-center gap-1.5 text-white/35">
                  <ShieldCheck className="h-3 w-3" />
                  Role dibaca ulang dari database setiap request.
                </span>
              </>
            }
          >
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet/60 to-cyan/40 text-[0.65rem] font-bold text-[#0b0b14]">
                      {user.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm text-white/85">
                        {user.name}
                        {user.id === admin.id ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[0.58rem] uppercase tracking-wide text-white/40">
                            kamu
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[0.68rem] text-white/35">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-white/55">{user.phone || "—"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-white/55">{user._count.bookings}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-white/55">
                    {formatInTimeZone(user.createdAt, settings.timezone, "d MMM yyyy", {
                      locale: localeId,
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.role} kind="role" />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <RoleSelect
                      userId={user.id}
                      role={user.role}
                      isSelf={user.id === admin.id}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>

          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/admin/users"
            searchParams={{ q, role }}
          />
        </>
      ) : (
        <EmptyState
          icon={hasFilters ? <UserRound className="h-5 w-5" /> : <Users className="h-5 w-5" />}
          title={hasFilters ? "Tidak ada pengguna yang cocok" : "Belum ada pengguna"}
          description={
            hasFilters
              ? "Coba ubah kata kunci atau filter role."
              : "Pengguna yang mendaftar akan muncul di sini secara otomatis."
          }
          action={
            hasFilters ? (
              <Link
                href="/admin/users"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 px-4 text-xs text-muted transition hover:border-white/20 hover:text-foreground"
              >
                Reset filter
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
