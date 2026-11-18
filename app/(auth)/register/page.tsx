import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/src/components/auth/AuthForm";
import { getCurrentUser } from "@/src/lib/auth/guards";
import { safeNextPath } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daftar",
  description: "Buat akun LEVELUP dan mulai reservasi setup gaming premium.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = rawNext ? safeNextPath(rawNext) : undefined;

  const user = await getCurrentUser();
  if (user) {
    const fallback = user.role === "ADMIN" || user.role === "STAFF" ? "/admin" : "/dashboard";
    redirect(nextPath ?? fallback);
  }

  return <AuthForm mode="register" nextPath={nextPath} />;
}
