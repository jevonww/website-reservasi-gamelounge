"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TimerReset } from "lucide-react";
import { expireBookingsAction } from "@/src/actions/bookings";
import { useToast } from "@/src/components/ui/ToastProvider";

export function ExpireBookingsButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await expireBookingsAction();
          if (result.ok) {
            toast(result.message ?? "Booking kedaluwarsa dirilis.", {
              variant: "success",
            });
            router.refresh();
          } else {
            toast(result.message, { variant: "error" });
          }
        });
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs text-muted transition hover:border-white/20 hover:text-foreground disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <TimerReset className="h-3.5 w-3.5" />
      )}
      Rilis kedaluwarsa
    </button>
  );
}
