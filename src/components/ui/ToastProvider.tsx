"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/src/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (title: string, options?: { description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "text-emerald-300",
  error: "text-rose-300",
  info: "text-cyan",
};

const VARIANT_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    (title, options) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [
        ...current.slice(-3),
        {
          id,
          title,
          description: options?.description,
          variant: options?.variant ?? "info",
        },
      ]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-6 sm:left-auto sm:px-0"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const Icon = VARIANT_ICONS[item.variant];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto glass-strong glass-sheen flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3.5"
                role="status"
              >
                <Icon className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", VARIANT_STYLES[item.variant])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="rounded-md p-1 text-muted transition hover:bg-white/10 hover:text-foreground"
                  aria-label="Tutup notifikasi"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast harus dipakai di dalam ToastProvider");
  }
  return context;
}
