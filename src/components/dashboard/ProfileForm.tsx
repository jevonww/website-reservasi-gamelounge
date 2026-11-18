"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { profileSchema } from "@/src/lib/validation/schemas";
import { updateProfileAction } from "@/src/actions/bookings";
import { useToast } from "@/src/components/ui/ToastProvider";
import { FormField } from "@/src/components/ui/FormField";

interface ProfileValues {
  name: string;
  phone: string;
}

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileValues>({ defaultValues: initial });

  const onSubmit = handleSubmit((values) => {
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (messages?.length) setError(field as keyof ProfileValues, { message: messages[0] });
      }
      return;
    }

    startTransition(async () => {
      const result = await updateProfileAction(parsed.data);
      if (!result.ok) {
        toast(result.message, { variant: "error" });
        return;
      }
      toast(result.message ?? "Profil diperbarui.", { variant: "success" });
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField label="Nama lengkap" htmlFor="name" error={errors.name?.message}>
        <input id="name" className="field" autoComplete="name" {...register("name")} />
      </FormField>
      <FormField
        label="Nomor telepon"
        htmlFor="phone"
        error={errors.phone?.message}
        hint="Dipakai staff untuk menghubungimu jika ada perubahan jadwal."
      >
        <input
          id="phone"
          className="field"
          autoComplete="tel"
          placeholder="+62 812 …"
          {...register("phone")}
        />
      </FormField>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-violet-bright to-violet px-5 text-sm font-semibold text-[#0a0a12] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Simpan perubahan
      </button>
    </form>
  );
}
