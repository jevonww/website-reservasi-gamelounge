"use client";

import Link from "next/link";
import { cn } from "@/src/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const BASE =
  "btn-shine relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-3 disabled:pointer-events-none disabled:opacity-55";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-violet-bright to-violet text-[#0b0b14] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_14px_34px_-12px_rgba(155,123,255,0.65)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_22px_44px_-14px_rgba(155,123,255,0.8)] active:translate-y-0",
  secondary:
    "glass text-foreground hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08] active:translate-y-0",
  outline:
    "border border-white/15 bg-white/[0.02] text-foreground hover:-translate-y-0.5 hover:border-violet/40 hover:bg-violet/10",
  ghost: "text-muted hover:bg-white/[0.06] hover:text-foreground",
  danger:
    "border border-rose-400/25 bg-rose-500/10 text-rose-200 hover:-translate-y-0.5 hover:border-rose-400/40 hover:bg-rose-500/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8125rem]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[0.95rem]",
  icon: "h-10 w-10",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

interface ButtonProps
  extends CommonProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> {
  href?: undefined;
}

interface LinkProps extends CommonProps {
  href: string;
  target?: string;
  prefetch?: boolean;
}

export function GlassButton(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", className, children, fullWidth } = props;
  const classes = cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );

  if ("href" in props && props.href) {
    const { href, target, prefetch } = props;
    return (
      <Link href={href} target={target} prefetch={prefetch} className={classes}>
        {children}
      </Link>
    );
  }

  const { href: _href, ...buttonProps } = props as ButtonProps;
  void _href;
  return (
    <button {...buttonProps} className={classes}>
      {children}
    </button>
  );
}
