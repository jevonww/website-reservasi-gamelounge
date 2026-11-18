import { cn } from "@/src/lib/utils";

export function DataTable({
  columns,
  children,
  footer,
  className,
  caption,
}: {
  columns: { key: string; label: string; className?: string }[];
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  caption?: string;
}) {
  return (
    <div className={cn("surface overflow-hidden rounded-2xl", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-white/8 bg-white/[0.025]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted",
                    column.className,
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.055]">{children}</tbody>
        </table>
      </div>
      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/8 px-4 py-3 text-xs text-muted">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function TableCell({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3.5 align-middle", className)}>
      {children}
    </td>
  );
}

export function TableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={cn("transition hover:bg-white/[0.025]", className)}>{children}</tr>;
}
