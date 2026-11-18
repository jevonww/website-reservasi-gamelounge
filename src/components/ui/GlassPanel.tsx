import { cn } from "@/src/lib/utils";

type GlassTone = "default" | "subtle" | "strong";

export function GlassPanel({
  children,
  className,
  tone = "default",
  sheen = false,
  as: Component = "div",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: GlassTone;
  sheen?: boolean;
  as?: "div" | "section" | "aside" | "article";
}) {
  return (
    <Component
      className={cn(
        tone === "subtle" ? "glass-subtle" : tone === "strong" ? "glass-strong" : "glass",
        sheen && "glass-sheen",
        "rounded-3xl",
        className,
      )}
    >
      {children}
    </Component>
  );
}

export function GlassCard({
  children,
  className,
  tone = "default",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: GlassTone;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        tone === "subtle" ? "glass-subtle" : tone === "strong" ? "glass-strong" : "glass",
        "glass-sheen rounded-3xl",
        interactive &&
          "transition duration-300 ease-out hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_30px_80px_-32px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
