"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, XCircle } from "lucide-react";
import { useToast } from "@/src/components/ui/ToastProvider";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { cancelBookingAction } from "@/src/actions/bookings";

export function CopyButton({ value, label = "Salin" }: { value: string; label?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast("Disalin ke clipboard.", { variant: "success" });
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          toast("Gagal menyalin. Salin manual ya.", { variant: "error" });
        }
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[0.7rem] text-muted transition hover:border-white/20 hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Tersalin" : label}
    </button>
  );
}

export function CancelBookingButton({
  bookingId,
  disabledReason,
}: {
  bookingId: string;
  disabledReason?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (disabledReason) {
    return <p className="text-xs text-white/35">{disabledReason}</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-300/25 bg-rose-300/[0.06] px-4 text-xs font-medium text-rose-200 transition hover:bg-rose-300/[0.12]"
      >
        <XCircle className="h-3.5 w-3.5" />
        Batalkan booking
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Batalkan booking ini?"
        description="Slot akan dilepas dan tidak dapat dikembalikan. Jika pembayaran sudah diverifikasi, hubungi staff untuk proses refund."
        confirmLabel="Ya, batalkan"
        onConfirm={() => {
          if (pending) return;
          startTransition(async () => {
            const result = await cancelBookingAction(bookingId);
            if (result.ok) {
              toast(result.message ?? "Booking dibatalkan.", { variant: "success" });
              router.refresh();
            } else {
              toast(result.message, { variant: "error" });
            }
          });
        }}
      />
    </>
  );
}

export function PendingSpinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}
