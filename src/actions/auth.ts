"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/db";
import { hashPassword, verifyPassword } from "@/src/lib/auth/password";
import {
  clearSessionCookie,
  safeNextPath,
  setSessionCookie,
} from "@/src/lib/auth/session";
import { checkRateLimit, resetRateLimit } from "@/src/lib/auth/rate-limit";
import { loginSchema, registerSchema } from "@/src/lib/validation/schemas";
import { actionError, actionOk, type ActionResult } from "@/src/lib/action-result";

export async function registerUser(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Periksa kembali data pendaftaran.", parsed.error.flatten().fieldErrors);
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return actionError("Email sudah terdaftar. Silakan login.", {
        email: ["Email sudah terdaftar."],
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: "CUSTOMER" },
      select: { id: true, name: true, email: true, role: true },
    });

    await setSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return actionOk("Akun berhasil dibuat.", { redirectTo: "/dashboard" });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return actionError("Email sudah terdaftar. Silakan login.", {
        email: ["Email sudah terdaftar."],
      });
    }
    console.error("registerUser failed", error);
    return actionError("Pendaftaran gagal. Coba lagi beberapa saat lagi.");
  }
}

export async function loginUser(
  input: unknown,
  nextPath?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Periksa kembali data login.", parsed.error.flatten().fieldErrors);
  }

  const { email, password } = parsed.data;
  const limit = checkRateLimit(`login:${email}`);
  if (!limit.allowed) {
    return actionError("Terlalu banyak percobaan login. Coba lagi dalam 15 menit.");
  }

  try {
    const select = { id: true, name: true, email: true, role: true, passwordHash: true } as const;
    const user =
      (await prisma.user.findUnique({ where: { email }, select })) ??
      (await prisma.user.findUnique({ where: { username: email }, select }));

    // Constant-ish behaviour: always compare against a hash to reduce timing clues.
    const hash = user?.passwordHash ?? "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7yFq8sV3aVBoJk9e1XQ3n0eG9n0Y3nG";
    const valid = await verifyPassword(password, hash);

    if (!user || !valid) {
      return actionError("Email atau password salah.");
    }

    resetRateLimit(`login:${email}`);
    await setSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const isStaff = user.role === "ADMIN" || user.role === "STAFF";
    const fallback = isStaff ? "/admin" : "/dashboard";
    return actionOk("Selamat datang kembali.", {
      redirectTo: safeNextPath(nextPath, fallback),
    });
  } catch (error) {
    console.error("loginUser failed", error);
    return actionError("Login gagal. Coba lagi beberapa saat lagi.");
  }
}

export async function logoutUser(): Promise<ActionResult> {
  try {
    await clearSessionCookie();
    return actionOk("Kamu telah logout.");
  } catch (error) {
    console.error("logoutUser failed", error);
    return actionError("Logout gagal. Coba lagi.");
  }
}

/** Form-friendly logout used by the navbar and dashboard shell. */
export async function logoutFormAction(): Promise<void> {
  "use server";
  await clearSessionCookie();
  redirect("/");
}
