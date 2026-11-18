import type { Metadata } from "next";
import { requireStaff } from "@/src/lib/auth/guards";
import { AdminBackLink, AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { SetupForm } from "@/src/components/admin/SetupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Setup Baru",
};

export default async function NewSetupPage() {
  await requireStaff("/admin/setups/new");

  return (
    <div className="space-y-5">
      <div>
        <AdminBackLink href="/admin/setups" label="Kembali ke daftar setup" />
        <AdminPageHeader
          className="mt-3"
          eyebrow="Katalog"
          title="Setup baru"
          description="Lengkapi informasi station. Data langsung tampil di katalog publik setelah disimpan."
        />
      </div>
      <SetupForm />
    </div>
  );
}
