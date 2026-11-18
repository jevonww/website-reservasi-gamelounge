"use client";

import { useRef, useState } from "react";
import { ImageOff, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { uploadSetupImageAction } from "@/src/actions/admin";
import { useToast } from "@/src/components/ui/ToastProvider";
import { SETUP_IMAGE_ACCEPT, SETUP_IMAGE_MAX_BYTES } from "@/src/lib/setup-image";
import { cn } from "@/src/lib/utils";

const MAX_DIMENSION = 1800;

async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size <= 900 * 1024) {
      bitmap.close();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "setup";
    return new File([blob], `${base}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}

type UploadResult = { ok: true; url: string } | { ok: false; message: string };

async function uploadImage(file: File): Promise<UploadResult> {
  if (file.size > SETUP_IMAGE_MAX_BYTES) {
    return { ok: false, message: "Ukuran gambar maksimal 5 MB." };
  }

  try {
    const prepared = await compressImage(file);
    if (prepared.size > SETUP_IMAGE_MAX_BYTES) {
      return { ok: false, message: "Ukuran gambar maksimal 5 MB." };
    }

    const formData = new FormData();
    formData.set("file", prepared);
    const result = await uploadSetupImageAction(formData);
    if (!result.ok) return { ok: false, message: result.message };
    if (!result.data?.url) return { ok: false, message: "URL gambar tidak diterima." };
    return { ok: true, url: result.data.url };
  } catch {
    return { ok: false, message: "Gambar gagal diunggah. Coba lagi." };
  }
}

function ImagePreview({ value, className }: { value: string; className?: string }) {
  if (!value) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted",
          className,
        )}
      >
        <ImageOff className="h-5 w-5" />
        <span className="text-[0.68rem]">Belum ada gambar</span>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="Pratinjau gambar setup"
      className={cn("h-full w-full bg-cover bg-center", className)}
      style={{ backgroundImage: `url("${value.replace(/"/g, "%22")}")` }}
    />
  );
}

export function SetupImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setPending(true);
    const result = await uploadImage(file);
    setPending(false);
    if (inputRef.current) inputRef.current.value = "";

    if (!result.ok) {
      toast(result.message, { variant: "error" });
      return;
    }

    onChange(result.url);
    toast("Gambar berhasil diunggah. Jangan lupa simpan setup.", { variant: "success" });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative h-36 w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] sm:w-52">
          <ImagePreview value={value} />
          {pending ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="h-5 w-5 animate-spin text-violet-bright" />
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-medium text-white/80 transition hover:border-violet/40 hover:text-white disabled:pointer-events-none disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : value ? (
                <Upload className="h-3.5 w-3.5" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              {pending ? "Mengunggah…" : value ? "Ganti gambar" : "Unggah gambar"}
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={pending}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 px-3 text-xs text-muted transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                Kosongkan
              </button>
            ) : null}
          </div>

          <input
            type="url"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/images/setups/pc-alpha.svg atau https://…"
            className="field font-mono text-xs"
          />
          <p className="text-[0.68rem] leading-relaxed text-muted">
            Unggah JPG, PNG, WebP, AVIF, atau GIF (maks 5 MB). Gambar otomatis diperkecil sebelum
            diunggah. Anda juga bisa menempel path/URL yang sudah ada.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={SETUP_IMAGE_ACCEPT}
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}

export function SetupGalleryUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  const images = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  function removeImage(url: string) {
    onChange(images.filter((image) => image !== url).join("\n"));
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    setPending(true);
    const uploaded: string[] = [];
    let failure: string | null = null;

    for (const file of Array.from(files)) {
      const result = await uploadImage(file);
      if (result.ok) uploaded.push(result.url);
      else failure = result.message;
    }

    setPending(false);
    if (inputRef.current) inputRef.current.value = "";

    if (uploaded.length) {
      onChange([...images, ...uploaded].join("\n"));
    }
    if (failure) {
      toast(failure, { variant: "error" });
    } else if (uploaded.length) {
      toast(
        `${uploaded.length} gambar galeri diunggah. Jangan lupa simpan setup.`,
        { variant: "success" },
      );
    }
  }

  return (
    <div className="space-y-3">
      {images.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image) => (
            <div
              key={image}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"
            >
              <ImagePreview value={image} />
              <button
                type="button"
                onClick={() => removeImage(image)}
                disabled={pending}
                aria-label="Hapus gambar dari galeri"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white/80 opacity-0 transition group-hover:opacity-100 hover:text-red-300 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-muted">
          Belum ada gambar galeri.
        </p>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-medium text-white/80 transition hover:border-violet/40 hover:text-white disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImagePlus className="h-3.5 w-3.5" />
        )}
        {pending ? "Mengunggah…" : "Tambah gambar galeri"}
      </button>

      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={"/images/setups/pc-pro.svg\n/images/setups/room-main.svg"}
        aria-label="URL gambar galeri"
        className="field font-mono text-xs"
      />

      <input
        ref={inputRef}
        type="file"
        accept={SETUP_IMAGE_ACCEPT}
        multiple
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}
