"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteSetupAction, setSetupStatusAction } from "@/src/actions/admin";
import { useToast } from "@/src/components/ui/ToastProvider";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { cn } from "@/src/lib/utils";

type SetupStatus = "AVAILABLE" | "MAINTENANCE" | "INACTIVE";

export function SetupRowActions({
  setupId,
  setupName,
  status,
}: {
  setupId: string;
  setupName: string;
  status: SetupStatus;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const onChange = (next: SetupStatus) => {
    if (next === status) return;
    startTransition(async () => {
      const result = await setSetupStatusAction(setupId, next);
      if (result.ok) {
        toast(result.message ?? "Status diperbarui.", { variant: "success" });
        router.refresh();
      } else {
        toast(result.message, { variant: "error" });
      }
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        aria-label={`Ubah status ${setupName}`}
        value={status}
        disabled={pending || deletePending}
        onChange={(event) => onChange(event.target.value as SetupStatus)}
        className={cn("field h-8 w-auto py-0 text-xs", pending && "opacity-60")}
      >
        <option value="AVAILABLE">Tersedia</option>
        <option value="MAINTENANCE">Maintenance</option>
        <option value="INACTIVE">Nonaktif</option>
      </select>
      <Link
        href={`/admin/setups/${setupId}/edit`}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[0.7rem] text-muted transition hover:border-white/20 hover:text-foreground"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
        Edit
      </Link>
      <button
        type="button"
        disabled={pending || deletePending}
        onClick={() => setDeleteOpen(true)}
        aria-label={`Hapus ${setupName}`}
        title="Hapus setup"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/20 bg-rose-300/[0.05] text-rose-200 transition hover:bg-rose-300/[0.12] disabled:opacity-50"
      >
        {deletePending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </button>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Hapus ${setupName}?`}
        description="Setup tanpa riwayat booking akan dihapus permanen. Jika sudah pernah dibooking, ubah statusnya menjadi nonaktif agar riwayat tetap tersimpan."
        confirmLabel="Ya, hapus"
        onConfirm={() => {
          startDelete(async () => {
            const result = await deleteSetupAction(setupId);
            if (result.ok) {
              toast(result.message ?? "Setup dihapus.", { variant: "success" });
              router.refresh();
            } else {
              toast(result.message, { variant: "error" });
            }
          });
        }}
      />
    </div>
  );
}
