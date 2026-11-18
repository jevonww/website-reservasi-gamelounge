"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Loader2, Save, Sparkles } from "lucide-react";
import { setupFormSchema } from "@/src/lib/validation/schemas";
import { saveSetupAction } from "@/src/actions/admin";
import { CATEGORY_OPTIONS } from "@/src/lib/constants";
import { FormField } from "@/src/components/ui/FormField";
import { useToast } from "@/src/components/ui/ToastProvider";
import {
  SetupGalleryUploader,
  SetupImageUploader,
} from "@/src/components/admin/SetupImageUploader";
import { slugify } from "@/src/lib/utils";

export interface SetupFormValues {
  name: string;
  slug: string;
  category: string;
  description: string;
  hourlyRate: number;
  status: "AVAILABLE" | "MAINTENANCE" | "INACTIVE";
  featured: boolean;
  imageUrl: string;
  gallery: string;
  facilities: string;
  processor: string;
  graphics: string;
  memory: string;
  storage: string;
  display: string;
  accessories: string;
  console: string;
  audio: string;
  seating: string;
  stations: string;
  room: string;
}

const EMPTY: SetupFormValues = {
  name: "",
  slug: "",
  category: "PC Gaming",
  description: "",
  hourlyRate: 15000,
  status: "AVAILABLE",
  featured: false,
  imageUrl: "/images/setups/pc-alpha.svg",
  gallery: "",
  facilities: "",
  processor: "",
  graphics: "",
  memory: "",
  storage: "",
  display: "",
  accessories: "",
  console: "",
  audio: "",
  seating: "",
  stations: "",
  room: "",
};

const SPEC_FIELDS: { key: keyof SetupFormValues; label: string; placeholder: string }[] = [
  { key: "processor", label: "CPU / Processor", placeholder: "Intel Core i7-14700KF" },
  { key: "graphics", label: "GPU", placeholder: "NVIDIA RTX 4070 Super" },
  { key: "memory", label: "RAM", placeholder: "32GB DDR5" },
  { key: "storage", label: "Storage", placeholder: "2TB NVMe" },
  { key: "display", label: "Display", placeholder: '27" QHD 240Hz' },
  { key: "accessories", label: "Aksesori", placeholder: "Headset, mouse, keyboard" },
  { key: "console", label: "Console", placeholder: "PlayStation 5 Slim" },
  { key: "audio", label: "Audio", placeholder: "Soundbar Dolby Atmos" },
  { key: "seating", label: "Seating", placeholder: "Sofa 3 seater" },
  { key: "stations", label: "Stations", placeholder: "4x PC Pro" },
  { key: "room", label: "Ruang", placeholder: "Private room 24m²" },
];

export function SetupForm({
  setupId,
  initial,
}: {
  setupId?: string;
  initial?: Partial<SetupFormValues>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

  const form = useForm<SetupFormValues>({
    defaultValues: { ...EMPTY, ...initial },
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = form;

  const imageUrl = useWatch({ control, name: "imageUrl" });
  const gallery = useWatch({ control, name: "gallery" });
  const featured = useWatch({ control, name: "featured" });

  const onSubmit = handleSubmit((values) => {
    const payload = {
      ...values,
      hourlyRate: Number(values.hourlyRate),
      featured: Boolean(values.featured),
    };

    const parsed = setupFormSchema.safeParse(payload);
    if (!parsed.success) {
      for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (messages?.length) {
          setError(field as keyof SetupFormValues, { message: messages[0] });
        }
      }
      toast("Periksa kembali data setup.", { variant: "error" });
      return;
    }

    startTransition(async () => {
      const result = await saveSetupAction(parsed.data, setupId);
      if (!result.ok) {
        toast(result.message, { variant: "error" });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.length) {
              setError(field as keyof SetupFormValues, { message: messages[0] });
            }
          }
        }
        return;
      }
      toast(result.message ?? "Setup disimpan.", { variant: "success" });
      router.push("/admin/setups");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <section className="surface rounded-2xl p-5">
        <h2 className="text-sm font-semibold">Informasi dasar</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Nama setup" htmlFor="name" error={errors.name?.message}>
            <input
              id="name"
              className="field"
              placeholder="LEVELUP PC Titan"
              {...register("name", {
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  if (!slugTouched) {
                    setValue("slug", slugify(event.target.value), { shouldValidate: false });
                  }
                },
              })}
            />
          </FormField>

          <FormField
            label="Slug"
            htmlFor="slug"
            error={errors.slug?.message}
            hint="Dipakai di URL /setups/[slug]. Huruf kecil, angka, tanda hubung."
          >
            <input
              id="slug"
              className="field font-mono text-xs"
              placeholder="levelup-pc-titan"
              {...register("slug", {
                onChange: () => setSlugTouched(true),
              })}
            />
          </FormField>

          <FormField label="Kategori" htmlFor="category" error={errors.category?.message}>
            <select id="category" className="field" {...register("category")}>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Harga per jam (Rp)"
            htmlFor="hourlyRate"
            error={errors.hourlyRate?.message}
            hint="Bilangan bulat, minimal Rp1.000."
          >
            <input
              id="hourlyRate"
              type="number"
              min={1000}
              step={1000}
              className="field"
              {...register("hourlyRate", { valueAsNumber: true })}
            />
          </FormField>

          <FormField label="Status" htmlFor="status" error={errors.status?.message}>
            <select id="status" className="field" {...register("status")}>
              <option value="AVAILABLE">Tersedia</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </FormField>

          <div className="flex items-end">
            <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-black/25 px-3.5 py-2.5 text-sm text-white/75 transition hover:border-white/15">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#9b7bff]"
                checked={Boolean(featured)}
                onChange={(event) => setValue("featured", event.target.checked)}
              />
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet" />
                Tampilkan sebagai featured
              </span>
            </label>
          </div>
        </div>

        <div className="mt-4">
          <FormField
            label="Deskripsi"
            htmlFor="description"
            error={errors.description?.message}
            hint="Minimal 20 karakter. Jelaskan pengalaman dan target pengguna."
          >
            <textarea
              id="description"
              rows={4}
              className="field"
              placeholder="Stasiun PC performa tinggi untuk ranked dan streaming…"
              {...register("description")}
            />
          </FormField>
        </div>
      </section>

      <section className="surface rounded-2xl p-5">
        <h2 className="text-sm font-semibold">Media</h2>
        <div className="mt-4 space-y-5">
          <FormField label="Gambar utama" error={errors.imageUrl?.message}>
            <SetupImageUploader
              value={imageUrl}
              onChange={(value) =>
                setValue("imageUrl", value, { shouldValidate: true, shouldDirty: true })
              }
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Galeri"
              hint="Unggah beberapa gambar atau tempel URL per baris. Kosongkan untuk memakai gambar utama."
            >
              <SetupGalleryUploader
                value={gallery}
                onChange={(value) => setValue("gallery", value, { shouldDirty: true })}
              />
            </FormField>
            <FormField
              label="Fasilitas"
              htmlFor="facilities"
              hint="Satu fasilitas per baris."
            >
              <textarea
                id="facilities"
                rows={3}
                className="field text-xs"
                placeholder={"Kursi gaming ergonomis\nHeadset studio\nWiFi 1Gbps"}
                {...register("facilities")}
              />
            </FormField>
          </div>
        </div>
      </section>

      <section className="surface rounded-2xl p-5">
        <h2 className="text-sm font-semibold">Spesifikasi</h2>
        <p className="mt-1 text-xs text-muted">
          Isi hanya yang relevan. Baris kosong tidak akan ditampilkan ke pelanggan.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SPEC_FIELDS.map((field) => (
            <FormField key={field.key} label={field.label} htmlFor={field.key}>
              <input
                id={field.key}
                className="field"
                placeholder={field.placeholder}
                {...register(field.key)}
              />
            </FormField>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/admin/setups"
          className="inline-flex h-10 items-center justify-center rounded-full border border-white/12 px-5 text-sm text-muted transition hover:bg-white/[0.06] hover:text-foreground"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-violet-bright to-violet px-6 text-sm font-semibold text-[#0a0a12] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {setupId ? "Simpan perubahan" : "Buat setup"}
        </button>
      </div>
    </form>
  );
}
