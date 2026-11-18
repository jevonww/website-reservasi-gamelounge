import { cn } from "@/src/lib/utils";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  ROLE_LABELS,
  SETUP_STATUS_LABELS,
} from "@/src/lib/constants";

const BOOKING_STYLES: Record<string, string> = {
  PENDING: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  CONFIRMED: "border-cyan/30 bg-cyan/10 text-cyan",
  CHECKED_IN: "border-violet/30 bg-violet/12 text-violet-bright",
  ACTIVE: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  COMPLETED: "border-white/12 bg-white/[0.06] text-white/70",
  CANCELLED: "border-rose-300/25 bg-rose-300/10 text-rose-200",
  EXPIRED: "border-white/10 bg-white/[0.04] text-muted",
};

const SETUP_STYLES: Record<string, string> = {
  AVAILABLE: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  MAINTENANCE: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  INACTIVE: "border-white/10 bg-white/[0.05] text-muted",
};

const PAYMENT_STYLES: Record<string, string> = {
  UNPAID: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  PENDING: "border-cyan/25 bg-cyan/10 text-cyan",
  VERIFIED: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  REJECTED: "border-rose-300/25 bg-rose-300/10 text-rose-200",
  REFUNDED: "border-white/12 bg-white/[0.06] text-white/70",
};

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "border-violet/30 bg-violet/12 text-violet-bright",
  STAFF: "border-cyan/25 bg-cyan/10 text-cyan",
  CUSTOMER: "border-white/12 bg-white/[0.06] text-white/75",
};

const DOT_STYLES: Record<string, string> = {
  PENDING: "bg-amber-300",
  CONFIRMED: "bg-cyan",
  CHECKED_IN: "bg-violet",
  ACTIVE: "bg-emerald-300",
  COMPLETED: "bg-white/50",
  CANCELLED: "bg-rose-300",
  EXPIRED: "bg-white/30",
  AVAILABLE: "bg-emerald-300",
  MAINTENANCE: "bg-amber-300",
  INACTIVE: "bg-white/30",
  UNPAID: "bg-amber-300",
  VERIFIED: "bg-emerald-300",
  REJECTED: "bg-rose-300",
  REFUNDED: "bg-white/40",
  ADMIN: "bg-violet",
  STAFF: "bg-cyan",
  CUSTOMER: "bg-white/40",
};

export function StatusBadge({
  status,
  kind = "booking",
  className,
  dot = true,
}: {
  status: string;
  kind?: "booking" | "setup" | "payment" | "role";
  className?: string;
  dot?: boolean;
}) {
  const styles =
    kind === "setup"
      ? SETUP_STYLES
      : kind === "payment"
        ? PAYMENT_STYLES
        : kind === "role"
          ? ROLE_STYLES
          : BOOKING_STYLES;

  const labels =
    kind === "setup"
      ? SETUP_STATUS_LABELS
      : kind === "payment"
        ? PAYMENT_STATUS_LABELS
        : kind === "role"
          ? ROLE_LABELS
          : BOOKING_STATUS_LABELS;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium tracking-wide",
        styles[status] ?? "border-white/10 bg-white/[0.05] text-muted",
        className,
      )}
    >
      {dot ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[status] ?? "bg-white/40")}
          aria-hidden
        />
      ) : null}
      {labels[status] ?? status}
    </span>
  );
}
