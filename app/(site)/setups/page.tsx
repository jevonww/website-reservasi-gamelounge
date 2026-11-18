import type { Metadata } from "next";
import { AlertCircle, Monitor } from "lucide-react";
import { prisma } from "@/src/lib/db";
import { getSettings, FALLBACK_SETTINGS } from "@/src/lib/settings";
import { SetupCard } from "@/src/components/setups/SetupCard";
import { SetupFilters, type SetupFilterState } from "@/src/components/setups/SetupFilters";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { Pagination } from "@/src/components/ui/Pagination";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { GlassButton } from "@/src/components/ui/GlassButton";
import { Reveal } from "@/src/components/ui/AnimatedSection";
import type { Prisma } from "@/src/generated/prisma/client";
import type { Setup } from "@/src/generated/prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Setups",
  description: "Jelajahi PC gaming, console, dan private room yang tersedia di LEVELUP.",
};

const PAGE_SIZE = 9;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePrice(value: string | undefined) {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function sortOrder(sort: string): Prisma.SetupOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ hourlyRate: "asc" }, { name: "asc" }];
    case "price-desc":
      return [{ hourlyRate: "desc" }, { name: "asc" }];
    case "name-asc":
      return [{ name: "asc" }];
    default:
      return [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }];
  }
}

export default async function SetupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = (first(params.q) ?? "").trim();
  const category = (first(params.category) ?? "").trim();
  const minPrice = first(params.minPrice) ?? "";
  const maxPrice = first(params.maxPrice) ?? "";
  const sort = first(params.sort) ?? "recommended";
  const pageParam = Number(first(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  const initial: SetupFilterState = { q, category, minPrice, maxPrice, sort };

  const where: Prisma.SetupWhereInput = {
    status: { in: ["AVAILABLE", "MAINTENANCE"] },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
    ...(parsePrice(minPrice) !== undefined || parsePrice(maxPrice) !== undefined
      ? {
          hourlyRate: {
            ...(parsePrice(minPrice) !== undefined ? { gte: parsePrice(minPrice) } : {}),
            ...(parsePrice(maxPrice) !== undefined ? { lte: parsePrice(maxPrice) } : {}),
          },
        }
      : {}),
  };

  let setups: Setup[] = [];
  let total = 0;
  let groups: { category: string; _count: { _all: number } }[] = [];
  let settings = FALLBACK_SETTINGS;
  let failed = false;

  try {
    [setups, total, groups, settings] = await Promise.all([
      prisma.setup.findMany({
        where,
        orderBy: sortOrder(sort),
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
      prisma.setup.count({ where }),
      prisma.setup.groupBy({
        by: ["category"],
        where: { status: { in: ["AVAILABLE", "MAINTENANCE"] } },
        _count: { _all: true },
      }),
      getSettings(),
    ]);
  } catch (error) {
    console.error("Gagal memuat katalog setup", error);
    failed = true;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const categories = groups
    .map((group) => ({ name: group.category, count: group._count._all }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="container-wide pb-10">
      <div className="max-w-2xl">
        <SectionHeading
          eyebrow="Setup Catalog"
          title="Temukan station yang tepat."
          description={`Semua setup ${settings.loungeName} dikelola langsung dari lounge. Ketersediaan dan harga selalu mengikuti data terbaru.`}
        />
      </div>

      <div className="mt-8">
        <SetupFilters categories={categories} initial={initial} />
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-muted">
        <p>
          {failed ? "Gagal memuat data" : `${total} setup ditemukan`}
          {category ? ` · ${category}` : ""}
          {q ? ` · “${q}”` : ""}
        </p>
        {totalPages > 1 ? (
          <p className="text-xs text-white/35">
            Halaman {page} dari {totalPages}
          </p>
        ) : null}
      </div>

      {failed ? (
        <div className="glass-subtle mt-5 flex flex-col items-start gap-3 rounded-2xl border-rose-300/20 bg-rose-300/[0.04] p-5">
          <div className="flex items-center gap-2 text-rose-200">
            <AlertCircle className="h-4.5 w-4.5" />
            <p className="text-sm font-medium">Katalog tidak dapat dimuat.</p>
          </div>
          <p className="text-sm text-muted">
            Koneksi database sedang bermasalah. Coba muat ulang halaman atau hubungi staff.
          </p>
          <GlassButton href="/setups" variant="secondary" size="sm">
            Coba lagi
          </GlassButton>
        </div>
      ) : setups.length ? (
        <>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {setups.map((setup, index) => (
              <Reveal key={setup.id} delay={Math.min(index, 5) * 0.04}>
                <SetupCard setup={setup} priority={index < 2} />
              </Reveal>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/setups"
            searchParams={{ q, category, minPrice, maxPrice, sort }}
          />
        </>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon={<Monitor className="h-5 w-5" />}
            title="Tidak ada setup yang cocok"
            description="Coba ubah kata kunci, kategori, atau rentang harga. Semua filter bisa direset."
            action={
              <GlassButton href="/setups" variant="secondary">
                Reset filter
              </GlassButton>
            }
          />
        </div>
      )}
    </div>
  );
}
