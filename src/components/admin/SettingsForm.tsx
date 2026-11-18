"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Clock, CreditCard, Loader2, MapPin, Save, Sparkles } from "lucide-react";
import { saveSettingsAction } from "@/src/actions/admin";
import { settingsFormSchema } from "@/src/lib/validation/schemas";
import { FormField } from "@/src/components/ui/FormField";
import { useToast } from "@/src/components/ui/ToastProvider";

export interface SettingsFormValues {
  loungeName: string;
  tagline: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  slotIntervalMinutes: number;
  paymentExpirationMinutes: number;
  cancellationHours: number;
  address: string;
  phone: string;
  email: string;
  instagram: string;
  mapsUrl: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  cancellationPolicy: string;
}

const NUMBER_FIELDS = [
  "minDurationMinutes",
  "maxDurationMinutes",
  "slotIntervalMinutes",
  "paymentExpirationMinutes",
  "cancellationHours",
] as const;

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({ defaultValues: initial });

  const onSubmit = handleSubmit((values) => {
    const payload = { ...values };
    for (const key of NUMBER_FIELDS) payload[key] = Number(payload[key]);

    const parsed = settingsFormSchema.safeParse(payload);
    if (!parsed.success) {
      for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (messages?.length) {
          setError(field as keyof SettingsFormValues, { message: messages[0] });
        }
      }
      toast("Periksa kembali pengaturan.", { variant: "error" });
      return;
    }

    if (parsed.data.minDurationMinutes > parsed.data.maxDurationMinutes) {
      setError("minDurationMinutes", {
        message: "Durasi minimum tidak boleh melebihi maksimum.",
      });
      toast("Durasi minimum tidak boleh melebihi maksimum.", { variant: "error" });
      return;
    }

    startTransition(async () => {
      const result = await saveSettingsAction(parsed.data);
      if (!result.ok) {
        toast(result.message, { variant: "error" });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.length) {
              setError(field as keyof SettingsFormValues, { message: messages[0] });
            }
          }
        }
        return;
      }
      toast(result.message ?? "Pengaturan disimpan.", { variant: "success" });
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <section className="surface rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-violet" />
          Identitas lounge
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Nama lounge" htmlFor="loungeName" error={errors.loungeName?.message}>
            <input id="loungeName" className="field" {...register("loungeName")} />
          </FormField>
          <FormField label="Tagline" htmlFor="tagline" error={errors.tagline?.message}>
            <input id="tagline" className="field" {...register("tagline")} />
          </FormField>
          <FormField
            label="Zona waktu"
            htmlFor="timezone"
            error={errors.timezone?.message}
            hint="Contoh: Asia/Jakarta. Semua jadwal disimpan dalam UTC."
          >
            <input
              id="timezone"
              className="field font-mono text-xs"
              placeholder="Asia/Jakarta"
              {...register("timezone")}
            />
          </FormField>
          <div className="flex items-end">
            <p className="rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5 text-xs leading-relaxed text-white/45">
              Lokasi dan kontak di bawah tampil di footer serta halaman kontak.
            </p>
          </div>
        </div>
      </section>

      <section className="surface rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-cyan" />
          Jam operasional & aturan booking
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FormField label="Buka" htmlFor="openTime" error={errors.openTime?.message}>
            <input id="openTime" type="time" className="field" {...register("openTime")} />
          </FormField>
          <FormField label="Tutup" htmlFor="closeTime" error={errors.closeTime?.message}>
            <input id="closeTime" type="time" className="field" {...register("closeTime")} />
          </FormField>
          <FormField
            label="Durasi minimum (menit)"
            htmlFor="minDurationMinutes"
            error={errors.minDurationMinutes?.message}
          >
            <input
              id="minDurationMinutes"
              type="number"
              min={30}
              step={15}
              className="field"
              {...register("minDurationMinutes", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Durasi maksimum (menit)"
            htmlFor="maxDurationMinutes"
            error={errors.maxDurationMinutes?.message}
          >
            <input
              id="maxDurationMinutes"
              type="number"
              min={60}
              step={15}
              className="field"
              {...register("maxDurationMinutes", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Interval slot (menit)"
            htmlFor="slotIntervalMinutes"
            error={errors.slotIntervalMinutes?.message}
            hint="Jarak antar pilihan waktu mulai."
          >
            <input
              id="slotIntervalMinutes"
              type="number"
              min={15}
              step={15}
              className="field"
              {...register("slotIntervalMinutes", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Batas bayar (menit)"
            htmlFor="paymentExpirationMinutes"
            error={errors.paymentExpirationMinutes?.message}
            hint="Booking PENDING otomatis kedaluwarsa."
          >
            <input
              id="paymentExpirationMinutes"
              type="number"
              min={5}
              step={5}
              className="field"
              {...register("paymentExpirationMinutes", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Batal gratis (jam)"
            htmlFor="cancellationHours"
            error={errors.cancellationHours?.message}
            hint="Batas waktu pembatalan sebelum sesi."
          >
            <input
              id="cancellationHours"
              type="number"
              min={0}
              step={1}
              className="field"
              {...register("cancellationHours", { valueAsNumber: true })}
            />
          </FormField>
        </div>
      </section>

      <section className="surface rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-violet" />
          Kontak & lokasi
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Telepon" htmlFor="phone" error={errors.phone?.message}>
            <input id="phone" className="field" {...register("phone")} />
          </FormField>
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <input id="email" type="email" className="field" {...register("email")} />
          </FormField>
          <FormField label="Instagram" htmlFor="instagram" error={errors.instagram?.message}>
            <input
              id="instagram"
              className="field"
              placeholder="@levelup.gaming"
              {...register("instagram")}
            />
          </FormField>
          <FormField
            label="Google Maps URL"
            htmlFor="mapsUrl"
            error={errors.mapsUrl?.message}
            hint="URL publik lengkap, termasuk https://."
          >
            <input
              id="mapsUrl"
              className="field font-mono text-xs"
              placeholder="https://maps.google.com/…"
              {...register("mapsUrl")}
            />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="Alamat" htmlFor="address" error={errors.address?.message}>
            <input id="address" className="field" {...register("address")} />
          </FormField>
        </div>
      </section>

      <section className="surface rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CreditCard className="h-4 w-4 text-emerald-300" />
          Pembayaran
        </h2>
        <p className="mt-1 text-xs text-muted">
          Instruksi ini ditampilkan ke pelanggan setelah booking dibuat.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FormField label="Bank" htmlFor="bankName" error={errors.bankName?.message}>
            <input id="bankName" className="field" {...register("bankName")} />
          </FormField>
          <FormField
            label="Nomor rekening"
            htmlFor="bankAccountNumber"
            error={errors.bankAccountNumber?.message}
          >
            <input
              id="bankAccountNumber"
              className="field font-mono text-xs"
              {...register("bankAccountNumber")}
            />
          </FormField>
          <FormField
            label="Atas nama"
            htmlFor="bankAccountName"
            error={errors.bankAccountName?.message}
          >
            <input id="bankAccountName" className="field" {...register("bankAccountName")} />
          </FormField>
        </div>
      </section>

      <section className="surface rounded-2xl p-5">
        <h2 className="text-sm font-semibold">Kebijakan pembatalan</h2>
        <div className="mt-4">
          <FormField
            label="Teks kebijakan"
            htmlFor="cancellationPolicy"
            error={errors.cancellationPolicy?.message}
            hint="Ditampilkan di halaman booking dan konfirmasi."
          >
            <textarea
              id="cancellationPolicy"
              rows={3}
              className="field"
              {...register("cancellationPolicy")}
            />
          </FormField>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-white/35">
          {isDirty ? "Ada perubahan yang belum disimpan." : "Semua perubahan tersimpan."}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-violet-bright to-violet px-6 text-sm font-semibold text-[#0a0a12] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan pengaturan
        </button>
      </div>

      <div className="glass-subtle rounded-2xl px-4 py-3 text-[0.7rem] leading-relaxed text-white/40">
        Perubahan durasi, interval slot, dan batas pembayaran langsung dipakai oleh mesin booking
        pada request berikutnya. Booking yang sudah ada tidak dihitung ulang.
      </div>
    </form>
  );
}
