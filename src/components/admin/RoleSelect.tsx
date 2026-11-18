"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateUserRoleAction } from "@/src/actions/admin";
import { useToast } from "@/src/components/ui/ToastProvider";
import { ROLE_LABELS } from "@/src/lib/constants";
import { cn } from "@/src/lib/utils";

type Role = "CUSTOMER" | "STAFF" | "ADMIN";

export function RoleSelect({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: Role;
  isSelf: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const onChange = (next: Role) => {
    if (next === role) return;
    startTransition(async () => {
      const result = await updateUserRoleAction({ userId, role: next });
      if (result.ok) {
        toast(result.message ?? "Role diperbarui.", { variant: "success" });
        router.refresh();
      } else {
        toast(result.message, { variant: "error" });
      }
    });
  };

  if (isSelf) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-white/35">
        Akun kamu
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        aria-label={`Ubah role ${ROLE_LABELS[role] ?? role}`}
        value={role}
        disabled={pending}
        onChange={(event) => onChange(event.target.value as Role)}
        className={cn(
          "field h-8 w-auto appearance-none py-0 pr-8 text-xs",
          pending && "opacity-60",
        )}
      >
        {(Object.keys(ROLE_LABELS) as Role[]).map((value) => (
          <option key={value} value={value}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </select>
      {pending ? (
        <Loader2 className="pointer-events-none absolute right-2.5 h-3 w-3 animate-spin text-violet" />
      ) : null}
    </div>
  );
}
