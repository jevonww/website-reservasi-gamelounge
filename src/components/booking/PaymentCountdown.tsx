"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function PaymentCountdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const target = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()));
  const refreshed = useRef(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = Math.max(0, target - Date.now());
      setRemaining(next);
      if (next === 0 && !refreshed.current) {
        refreshed.current = true;
        window.setTimeout(() => router.refresh(), 800);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [target, router]);

  if (remaining <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3.5 py-2.5 text-xs text-rose-200">
        <Timer className="h-4 w-4" />
        Waktu pembayaran habis. Slot akan dilepas otomatis.
      </div>
    );
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < 5 * 60 * 1000;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs",
        urgent
          ? "border-rose-300/25 bg-rose-300/[0.06] text-rose-200"
          : "border-amber-300/20 bg-amber-300/[0.05] text-amber-200",
      )}
    >
      <Timer className="h-4 w-4" />
      Sisa waktu pembayaran:{" "}
      <span className="font-mono font-semibold">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
