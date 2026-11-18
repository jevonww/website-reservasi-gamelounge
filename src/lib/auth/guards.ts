import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@/src/generated/prisma/enums";
import { prisma } from "@/src/lib/db";
import { readSessionToken, verifySessionToken } from "@/src/lib/auth/session";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  createdAt: Date;
}

/**
 * Resolve the current user from the signed session cookie and re-read the role
 * from the database so a stale token can never grant elevated privileges.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await readSessionToken();
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    });
    return user;
  } catch {
    return null;
  }
});

export async function requireUser(nextPath = "/dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

export async function requireStaff(nextPath = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(nextPath);
  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    redirect("/dashboard");
  }
  return user;
}

export async function requireAdmin(nextPath = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(nextPath);
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return user;
}
