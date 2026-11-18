"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  onConfirm,
  tone = "danger",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  tone?: "danger" | "primary";
}) {
  const [pending, setPending] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [open, pending, onOpenChange]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!pending) onOpenChange(false);
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="glass-strong glass-sheen w-full max-w-md rounded-3xl p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                    tone === "danger" ? "bg-rose-500/12 text-rose-300" : "bg-violet/12 text-violet",
                  )}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="confirm-title" className="text-base font-semibold text-foreground">
                    {title}
                  </h2>
                  {description ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={pending}
                className="rounded-lg p-1.5 text-muted transition hover:bg-white/10 hover:text-foreground disabled:opacity-50"
                aria-label="Tutup dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={pending}
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/12 px-5 text-sm text-muted transition hover:bg-white/[0.06] hover:text-foreground disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  try {
                    await onConfirm();
                    onOpenChange(false);
                  } finally {
                    setPending(false);
                  }
                }}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition disabled:opacity-60",
                  tone === "danger"
                    ? "bg-rose-500/85 text-white hover:bg-rose-500"
                    : "bg-violet text-[#0b0b14] hover:bg-violet-bright",
                )}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
