import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/src/components/auth/AuthForm";
import { getCurrentUser } from "@/src/lib/auth/guards";
import { safeNextPath } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login",
  description: "Masuk ke akun LEVELUP untuk mengelola reservasi.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  // Only carry an explicit ?next= target. Without this, an admin logging in
  // would inherit the "/dashboard" default and skip the staff area.
  const nextPath = rawNext ? safeNextPath(rawNext) : undefined;

  const user = await getCurrentUser();
  if (user) {
    const fallback = user.role === "ADMIN" || user.role === "STAFF" ? "/admin" : "/dashboard";
    redirect(nextPath ?? fallback);
  }

  return <AuthForm mode="login" nextPath={nextPath} />;
}
