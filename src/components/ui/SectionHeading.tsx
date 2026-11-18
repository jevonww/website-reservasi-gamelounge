import { cn } from "@/src/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-violet">
          <span className="h-1 w-1 rounded-full bg-cyan" />
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-[0.95rem] leading-relaxed text-muted">{description}</p>
      ) : null}
    </div>
  );
}
