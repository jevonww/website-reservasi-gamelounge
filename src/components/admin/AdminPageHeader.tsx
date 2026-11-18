import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-4 sm:flex-row sm:items-end",
        className,
      )}
    >
      <div>
        {eyebrow ? (
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-violet">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-foreground"
    >
      <ArrowUpRight className="h-3.5 w-3.5 rotate-180" />
      {label}
    </Link>
  );
}
