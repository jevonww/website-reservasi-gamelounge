"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, Sparkles, User } from "lucide-react";
import { loginSchema, registerSchema } from "@/src/lib/validation/schemas";
import { loginUser, registerUser } from "@/src/actions/auth";
import { FormField } from "@/src/components/ui/FormField";
import { useToast } from "@/src/components/ui/ToastProvider";
import { cn } from "@/src/lib/utils";

interface AuthFormValues {
  name?: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export function AuthForm({
  mode,
  nextPath,
}: {
  mode: "login" | "register";
  nextPath?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isLogin = mode === "login";

  const form = useForm<AuthFormValues>({
    defaultValues: isLogin
      ? { email: "", password: "" }
      : { name: "", email: "", password: "", confirmPassword: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);

    const parsed = (isLogin ? loginSchema : registerSchema).safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (messages?.length) {
          setError(field as keyof AuthFormValues, { message: messages[0] });
        }
      }
      return;
    }

    startTransition(async () => {
      const result = isLogin ? await loginUser(parsed.data, nextPath) : await registerUser(parsed.data);

      if (!result.ok) {
        setServerError(result.message);
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.length) {
              setError(field as keyof AuthFormValues, { message: messages[0] });
            }
          }
        }
        toast(result.message, { variant: "error" });
        return;
      }

      toast(result.message ?? (isLogin ? "Login berhasil." : "Akun dibuat."), {
        variant: "success",
      });
      router.push(result.data?.redirectTo ?? "/dashboard");
      router.refresh();
    });
  });

  return (
    <div className="relative w-full max-w-md">
      <div className="pointer-events-none absolute -inset-10 -z-10">
        <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-violet/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-cyan/15 blur-3xl" />
      </div>

      <div className="glass-strong glass-sheen rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet/15 text-violet">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-white/40">
              {isLogin ? "Selamat datang kembali" : "Gabung LEVELUP"}
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {isLogin ? "Masuk ke akunmu" : "Buat akun baru"}
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          {isLogin
            ? "Kelola reservasi, cek status pembayaran, dan lihat riwayat sesi dari satu dashboard."
            : "Daftar gratis untuk memesan setup, melacak booking, dan menyimpan riwayat sesi."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {!isLogin ? (
            <FormField label="Nama lengkap" htmlFor="name" error={errors.name?.message}>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="name"
                  autoComplete="name"
                  autoFocus
                  disabled={pending}
                  aria-invalid={Boolean(errors.name)}
                  className={cn("field pl-10", errors.name && "field-error")}
                  placeholder="Nama kamu"
                  {...register("name")}
                />
              </div>
            </FormField>
          ) : null}

          <FormField
            label={isLogin ? "Email atau username" : "Email"}
            htmlFor="email"
            error={errors.email?.message}
          >
            <div className="relative">
              {isLogin ? (
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              ) : (
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              )}
              <input
                id="email"
                type={isLogin ? "text" : "email"}
                autoComplete={isLogin ? "username" : "email"}
                autoFocus={isLogin}
                disabled={pending}
                aria-invalid={Boolean(errors.email)}
                className={cn("field pl-10", errors.email && "field-error")}
                placeholder={isLogin ? "Email atau username" : "nama@email.com"}
                {...register("email")}
              />
            </div>
          </FormField>

          <FormField
            label="Password"
            htmlFor="password"
            error={errors.password?.message}
            hint={isLogin ? undefined : "Minimal 8 karakter, maksimal 72 karakter."}
          >
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                disabled={pending}
                aria-invalid={Boolean(errors.password)}
                className={cn("field pl-10 pr-10", errors.password && "field-error")}
                placeholder={isLogin ? "Password" : "Minimal 8 karakter"}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={pending}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-white/[0.06] hover:text-foreground disabled:opacity-50"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>

          {!isLogin ? (
            <FormField
              label="Konfirmasi password"
              htmlFor="confirmPassword"
              error={errors.confirmPassword?.message}
            >
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={pending}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  className={cn(
                    "field pl-10 pr-10",
                    errors.confirmPassword && "field-error",
                  )}
                  placeholder="Ulangi password"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  disabled={pending}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-white/[0.06] hover:text-foreground disabled:opacity-50"
                  aria-label={
                    showConfirmPassword
                      ? "Sembunyikan konfirmasi password"
                      : "Tampilkan konfirmasi password"
                  }
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </FormField>
          ) : null}

          {serverError ? (
            <p
              role="alert"
              className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3.5 py-2.5 text-xs text-rose-200"
            >
              {serverError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="btn-shine inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-violet-bright to-violet text-sm font-semibold text-[#0a0a12] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_36px_-14px_rgba(155,123,255,0.7)] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Memproses…" : isLogin ? "Masuk" : "Buat akun"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">
          {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
          <Link
            href={`${isLogin ? "/register" : "/login"}${nextPath && nextPath !== "/dashboard" ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
            className="font-medium text-violet-bright transition hover:text-white"
          >
            {isLogin ? "Daftar sekarang" : "Masuk di sini"}
          </Link>
        </p>
      </div>

      <p className="mt-4 text-center text-[0.68rem] leading-relaxed text-white/30">
        Dengan melanjutkan, kamu menyetujui kebijakan reservasi dan pembatalan lounge.
      </p>
    </div>
  );
}
