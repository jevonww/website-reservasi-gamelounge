import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Monitor, Plus } from "lucide-react";
import { prisma } from "@/src/lib/db";
import { requireStaff } from "@/src/lib/auth/guards";
import { formatIDR } from "@/src/lib/utils";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { GlassButton } from "@/src/components/ui/GlassButton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { DataTable, TableCell, TableRow } from "@/src/components/ui/DataTable";
import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { SetupRowActions } from "@/src/components/admin/SetupRowActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kelola Setups",
};

export default async function AdminSetupsPage() {
  await requireStaff("/admin/setups");

  let setups: Awaited<ReturnType<typeof loadSetups>> = [];
  let failed = false;

  async function loadSetups() {
    return prisma.setup.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { bookings: true } },
      },
    });
  }

  try {
    setups = await loadSetups();
  } catch (error) {
    console.error("Gagal memuat setups admin", error);
    failed = true;
  }

  const available = setups.filter((setup) => setup.status === "AVAILABLE").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Katalog"
        title="Kelola setups"
        description="Tambah, ubah, dan atur status station. Menonaktifkan setup tidak menghapus riwayat booking."
        action={
          <GlassButton href="/admin/setups/new" size="sm">
            <Plus className="h-4 w-4" />
            Setup baru
          </GlassButton>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface rounded-2xl p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.1em] text-white/35">Total setup</p>
          <p className="mt-1 text-xl font-semibold">{setups.length}</p>
        </div>
        <div className="surface rounded-2xl p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.1em] text-white/35">Tersedia</p>
          <p className="mt-1 text-xl font-semibold text-emerald-300">{available}</p>
        </div>
        <div className="surface rounded-2xl p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.1em] text-white/35">Perlu perhatian</p>
          <p className="mt-1 text-xl font-semibold text-amber-300">{setups.length - available}</p>
        </div>
      </div>

      {failed ? (
        <div className="glass-subtle rounded-2xl border-rose-300/20 bg-rose-300/[0.04] px-4 py-3 text-sm text-rose-200">
          Daftar setup gagal dimuat. Coba muat ulang halaman.
        </div>
      ) : setups.length ? (
        <DataTable
          caption="Daftar setup"
          columns={[
            { key: "setup", label: "Setup" },
            { key: "kategori", label: "Kategori" },
            { key: "harga", label: "Harga / jam" },
            { key: "status", label: "Status" },
            { key: "booking", label: "Booking" },
            { key: "aksi", label: "Aksi", className: "text-right" },
          ]}
          footer={
            <>
              <span>{setups.length} setup terdaftar</span>
              <Link
                href="/setups"
                className="inline-flex items-center gap-1 text-violet-bright transition hover:text-white"
              >
                Lihat katalog publik
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </>
          }
        >
          {setups.map((setup) => (
            <TableRow key={setup.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    <Image
                      src={setup.imageUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/setups/${setup.slug}`}
                      className="block truncate text-sm text-white/85 transition hover:text-violet-bright"
                    >
                      {setup.name}
                    </Link>
                    <p className="truncate font-mono text-[0.65rem] text-white/30">
                      /{setup.slug}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs text-white/60">{setup.category}</span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-white/75">{formatIDR(setup.hourlyRate)}</span>
              </TableCell>
              <TableCell>
                <StatusBadge status={setup.status} kind="setup" />
              </TableCell>
              <TableCell>
                <span className="text-xs text-white/50">{setup._count.bookings}</span>
              </TableCell>
              <TableCell>
                <SetupRowActions
                  setupId={setup.id}
                  setupName={setup.name}
                  status={setup.status}
                />
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      ) : (
        <EmptyState
          icon={<Monitor className="h-5 w-5" />}
          title="Belum ada setup"
          description="Tambahkan setup pertama agar pelanggan dapat mulai melakukan reservasi."
          action={
            <GlassButton href="/admin/setups/new" size="sm">
              <Plus className="h-4 w-4" />
              Setup baru
            </GlassButton>
          }
        />
      )}
    </div>
  );
}
