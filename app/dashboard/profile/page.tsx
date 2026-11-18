import type { Metadata } from "next";
import { UserCircle } from "lucide-react";
import { requireUser } from "@/src/lib/auth/guards";
import { ProfileForm } from "@/src/components/dashboard/ProfileForm";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const user = await requireUser("/dashboard/profile");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-violet">Account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Profil kamu</h1>
        <p className="mt-1.5 text-sm text-muted">
          Perbarui nama dan nomor telepon agar staff mudah menghubungimu.
        </p>
      </div>

      <div className="glass glass-sheen rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet/12 text-violet">
              <UserCircle className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={user.role} kind="role" />
            <span className="text-[0.7rem] text-white/35">
              Member sejak{" "}
              {new Intl.DateTimeFormat("id-ID", {
                month: "long",
                year: "numeric",
              }).format(user.createdAt)}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <ProfileForm initial={{ name: user.name, phone: user.phone ?? "" }} />
        </div>

        <div className="mt-6 grid gap-3 border-t border-white/8 pt-5 sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">Email</p>
            <p className="mt-1 text-sm text-white/75">{user.email}</p>
            <p className="mt-1 text-[0.68rem] text-white/30">
              Email tidak dapat diubah. Hubungi staff jika perlu.
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <p className="text-[0.62rem] uppercase tracking-[0.1em] text-white/35">Keamanan</p>
            <p className="mt-1 text-sm text-white/75">Password terenkripsi</p>
            <p className="mt-1 text-[0.68rem] text-white/30">
              Password disimpan sebagai hash bcrypt, bukan teks biasa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
