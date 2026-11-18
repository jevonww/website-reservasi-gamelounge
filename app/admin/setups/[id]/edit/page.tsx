import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/db";
import { requireStaff } from "@/src/lib/auth/guards";
import { asRecord } from "@/src/lib/utils";
import { AdminBackLink, AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { SetupForm, type SetupFormValues } from "@/src/components/admin/SetupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit Setup",
};

function specValue(specs: Record<string, unknown>, key: string) {
  const value = specs[key];
  return typeof value === "string" ? value : "";
}

export default async function EditSetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireStaff(`/admin/setups/${id}/edit`);

  let setup;
  try {
    setup = await prisma.setup.findUnique({ where: { id } });
  } catch (error) {
    console.error("Gagal memuat setup", error);
    setup = null;
  }

  if (!setup) notFound();

  const specs = asRecord(setup.specs);
  const initial: Partial<SetupFormValues> = {
    name: setup.name,
    slug: setup.slug,
    category: setup.category,
    description: setup.description,
    hourlyRate: setup.hourlyRate,
    status: setup.status,
    featured: setup.featured,
    imageUrl: setup.imageUrl,
    gallery: setup.gallery.join("\n"),
    facilities: setup.facilities.join("\n"),
    processor: specValue(specs, "processor"),
    graphics: specValue(specs, "graphics"),
    memory: specValue(specs, "memory"),
    storage: specValue(specs, "storage"),
    display: specValue(specs, "display"),
    accessories: specValue(specs, "accessories"),
    console: specValue(specs, "console"),
    audio: specValue(specs, "audio"),
    seating: specValue(specs, "seating"),
    stations: specValue(specs, "stations"),
    room: specValue(specs, "room"),
  };

  return (
    <div className="space-y-5">
      <div>
        <AdminBackLink href="/admin/setups" label="Kembali ke daftar setup" />
        <AdminPageHeader
          className="mt-3"
          eyebrow="Katalog"
          title={setup.name}
          description="Perubahan langsung terlihat di katalog. Riwayat booking tetap tersimpan."
        />
      </div>
      <SetupForm setupId={setup.id} initial={initial} />
    </div>
  );
}
