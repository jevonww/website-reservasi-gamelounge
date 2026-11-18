"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/db";
import { getCurrentUser } from "@/src/lib/auth/guards";
import {
  actionError,
  actionOk,
  type ActionFailure,
  type ActionResult,
} from "@/src/lib/action-result";
import {
  roleUpdateSchema,
  settingsFormSchema,
  setupFormSchema,
} from "@/src/lib/validation/schemas";
import { slugify } from "@/src/lib/utils";
import { detectSetupImageMime, SETUP_IMAGE_MAX_BYTES } from "@/src/lib/setup-image";

async function requireAdminAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

async function requireStaffAction() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) return null;
  return user;
}

function splitList(value?: string) {
  if (!value) return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type SetupPayload =
  | { error: ActionFailure }
  | {
      data: {
        name: string;
        slug: string;
        category: string;
        description: string;
        hourlyRate: number;
        status: "AVAILABLE" | "MAINTENANCE" | "INACTIVE";
        featured: boolean;
        imageUrl: string;
        gallery: string[];
        facilities: string[];
        specs: Record<string, string>;
      };
    };

function setupPayload(input: unknown): SetupPayload {
  const parsed = setupFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: actionError("Periksa kembali data setup.", parsed.error.flatten().fieldErrors) };
  }
  const data = parsed.data;
  const specs: Record<string, string> = {
    processor: data.processor ?? "",
    graphics: data.graphics ?? "",
    memory: data.memory ?? "",
    storage: data.storage ?? "",
    display: data.display ?? "",
    accessories: data.accessories ?? "",
    console: data.console ?? "",
    audio: data.audio ?? "",
    seating: data.seating ?? "",
    stations: data.stations ?? "",
    room: data.room ?? "",
  };
  for (const key of Object.keys(specs)) {
    if (!specs[key]) delete specs[key];
  }
  const gallery = splitList(data.gallery);
  return {
    data: {
      name: data.name,
      slug: slugify(data.slug || data.name),
      category: data.category,
      description: data.description,
      hourlyRate: data.hourlyRate,
      status: data.status,
      featured: data.featured,
      imageUrl: data.imageUrl,
      gallery: gallery.length ? gallery : [data.imageUrl],
      facilities: splitList(data.facilities),
      specs,
    },
  };
}

export async function saveSetupAction(
  input: unknown,
  setupId?: string,
): Promise<ActionResult<{ id: string }>> {
  const staff = await requireStaffAction();
  if (!staff) return actionError("Akses ditolak.");

  const payload = setupPayload(input);
  if ("error" in payload) return payload.error;

  try {
    if (setupId) {
      const existing = await prisma.setup.findUnique({ where: { id: setupId }, select: { id: true } });
      if (!existing) return actionError("Setup tidak ditemukan.");
      const setup = await prisma.setup.update({ where: { id: setupId }, data: payload.data });
      await prisma.auditLog.create({
        data: {
          actorId: staff.id,
          action: "setup.updated",
          entityType: "Setup",
          entityId: setup.id,
          metadata: { name: setup.name },
        },
      });
      revalidatePath("/admin/setups");
      revalidatePath("/setups");
      revalidatePath(`/setups/${setup.slug}`);
      return actionOk("Setup berhasil diperbarui.", { id: setup.id });
    }

    const setup = await prisma.setup.create({ data: payload.data });
    await prisma.auditLog.create({
      data: {
        actorId: staff.id,
        action: "setup.created",
        entityType: "Setup",
        entityId: setup.id,
        metadata: { name: setup.name },
      },
    });
    revalidatePath("/admin/setups");
    revalidatePath("/setups");
    return actionOk("Setup berhasil dibuat.", { id: setup.id });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return actionError("Slug sudah digunakan. Pilih slug lain.", {
        slug: ["Slug sudah digunakan."],
      });
    }
    console.error("saveSetupAction failed", error);
    return actionError("Setup gagal disimpan.");
  }
}

/**
 * Stores an uploaded setup image in Postgres and returns a URL that can be
 * saved on `Setup.imageUrl` / `Setup.gallery`. Keeping bytes in the database
 * means uploads survive redeploys on hosts with an ephemeral filesystem.
 */
export async function uploadSetupImageAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const staff = await requireStaffAction();
  if (!staff) return actionError("Akses ditolak. Login sebagai staff atau admin.");

  const file = formData.get("file");
  if (!(file instanceof File)) return actionError("Pilih file gambar terlebih dahulu.");
  if (file.size === 0) return actionError("File gambar kosong.");
  if (file.size > SETUP_IMAGE_MAX_BYTES) {
    return actionError("Ukuran gambar maksimal 5 MB.");
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectSetupImageMime(bytes);
    if (!mimeType) {
      return actionError("Format gambar harus JPG, PNG, WebP, AVIF, atau GIF.");
    }

    const image = await prisma.setupImage.create({
      data: { mimeType, size: bytes.byteLength, data: bytes },
      select: { id: true },
    });

    return actionOk("Gambar berhasil diunggah.", { url: `/api/setup-images/${image.id}` });
  } catch (error) {
    console.error("uploadSetupImageAction failed", error);
    return actionError("Gambar gagal diunggah. Coba lagi.");
  }
}

export async function setSetupStatusAction(
  setupId: string,
  status: "AVAILABLE" | "MAINTENANCE" | "INACTIVE",
): Promise<ActionResult> {
  const staff = await requireStaffAction();
  if (!staff) return actionError("Akses ditolak.");
  try {
    const setup = await prisma.setup.update({
      where: { id: setupId },
      data: { status },
    });
    await prisma.auditLog.create({
      data: {
        actorId: staff.id,
        action: `setup.status.${status.toLowerCase()}`,
        entityType: "Setup",
        entityId: setup.id,
        metadata: { name: setup.name },
      },
    });
    revalidatePath("/admin/setups");
    revalidatePath("/setups");
    return actionOk(`Status ${setup.name} diperbarui.`);
  } catch (error) {
    console.error("setSetupStatusAction failed", error);
    return actionError("Status setup gagal diperbarui.");
  }
}

export async function deleteSetupAction(setupId: string): Promise<ActionResult> {
  const staff = await requireStaffAction();
  if (!staff) return actionError("Akses ditolak.");

  try {
    const setup = await prisma.setup.findUnique({
      where: { id: setupId },
      include: { _count: { select: { bookings: true } } },
    });
    if (!setup) return actionError("Setup tidak ditemukan.");
    if (setup._count.bookings > 0) {
      return actionError(
        "Setup ini memiliki riwayat booking sehingga tidak dapat dihapus. Ubah statusnya menjadi nonaktif.",
      );
    }

    await prisma.setup.delete({ where: { id: setup.id } });
    await prisma.auditLog.create({
      data: {
        actorId: staff.id,
        action: "setup.deleted",
        entityType: "Setup",
        entityId: setup.id,
        metadata: { name: setup.name, slug: setup.slug },
      },
    });
    revalidatePath("/admin/setups");
    revalidatePath("/setups");
    return actionOk(`${setup.name} dihapus.`);
  } catch (error) {
    console.error("deleteSetupAction failed", error);
    return actionError("Setup gagal dihapus.");
  }
}

export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminAction();
  if (!admin) return actionError("Akses ditolak.");

  const parsed = settingsFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Periksa kembali pengaturan.", parsed.error.flatten().fieldErrors);
  }
  if (parsed.data.minDurationMinutes > parsed.data.maxDurationMinutes) {
    return actionError("Durasi minimum tidak boleh lebih besar dari maksimum.");
  }

  try {
    await prisma.loungeSettings.upsert({
      where: { id: "default" },
      update: parsed.data,
      create: { id: "default", ...parsed.data },
    });
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "settings.updated",
        entityType: "LoungeSettings",
        entityId: "default",
        metadata: { loungeName: parsed.data.loungeName },
      },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/");
    revalidatePath("/setups");
    return actionOk("Pengaturan lounge berhasil disimpan.");
  } catch (error) {
    console.error("saveSettingsAction failed", error);
    return actionError("Pengaturan gagal disimpan.");
  }
}

export async function updateUserRoleAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminAction();
  if (!admin) return actionError("Akses ditolak.");

  const parsed = roleUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("Data pengguna tidak valid.");

  if (parsed.data.userId === admin.id) {
    return actionError("Kamu tidak dapat mengubah role akunmu sendiri.");
  }

  try {
    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target) return actionError("Pengguna tidak ditemukan.");

    if (target.role === "ADMIN" && parsed.data.role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return actionError("Minimal harus ada satu admin aktif.");
      }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { role: parsed.data.role },
    });
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "user.role.updated",
        entityType: "User",
        entityId: target.id,
        metadata: { from: target.role, to: parsed.data.role },
      },
    });
    revalidatePath("/admin/users");
    return actionOk("Role pengguna diperbarui.");
  } catch (error) {
    console.error("updateUserRoleAction failed", error);
    return actionError("Role pengguna gagal diperbarui.");
  }
}
