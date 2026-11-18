import type { Metadata } from "next";
import { Info, Lock } from "lucide-react";
import { requireAdmin } from "@/src/lib/auth/guards";
import { getSettings, FALLBACK_SETTINGS } from "@/src/lib/settings";
import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { SettingsForm, type SettingsFormValues } from "@/src/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pengaturan Lounge",
};

export default async function AdminSettingsPage() {
  await requireAdmin("/admin/settings");

  let settings = FALLBACK_SETTINGS;
  let failed = false;

  try {
    settings = await getSettings();
  } catch (error) {
    console.error("Gagal memuat pengaturan", error);
    failed = true;
  }

  const initial: SettingsFormValues = {
    loungeName: settings.loungeName,
    tagline: settings.tagline,
    timezone: settings.timezone,
    openTime: settings.openTime,
    closeTime: settings.closeTime,
    minDurationMinutes: settings.minDurationMinutes,
    maxDurationMinutes: settings.maxDurationMinutes,
    slotIntervalMinutes: settings.slotIntervalMinutes,
    paymentExpirationMinutes: settings.paymentExpirationMinutes,
    cancellationHours: settings.cancellationHours,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    instagram: settings.instagram,
    mapsUrl: settings.mapsUrl,
    bankName: settings.bankName,
    bankAccountNumber: settings.bankAccountNumber,
    bankAccountName: settings.bankAccountName,
    cancellationPolicy: settings.cancellationPolicy,
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Administrasi"
        title="Pengaturan lounge"
        description="Atur identitas, jam operasional, aturan booking, kontak, dan instruksi pembayaran. Hanya admin yang dapat mengubah pengaturan."
      />

      <div className="glass-subtle flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs leading-relaxed text-white/50">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet" />
        <p>
          Perubahan disimpan sebagai satu baris pengaturan global dan langsung dipakai oleh halaman
          publik serta mesin booking.
        </p>
      </div>

      {failed ? (
        <div className="glass-subtle rounded-2xl border-rose-300/20 bg-rose-300/[0.04] px-4 py-3 text-sm text-rose-200">
          Pengaturan gagal dimuat dari database. Form ditampilkan dengan nilai default dan
          penyimpanan mungkin gagal sampai koneksi pulih.
        </div>
      ) : null}

      <SettingsForm initial={initial} />

      <div className="glass-subtle flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[0.7rem] leading-relaxed text-white/35">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" />
        <p>
          Semua waktu disimpan dalam UTC dan ditampilkan mengikuti zona waktu lounge. Pastikan
          waktu buka lebih awal dari waktu tutup; booking lintas tengah malam tidak didukung.
        </p>
      </div>
    </div>
  );
}
