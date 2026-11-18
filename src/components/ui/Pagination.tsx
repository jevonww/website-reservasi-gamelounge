import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((item) => {
    if (totalPages <= 7) return true;
    return item === 1 || item === totalPages || Math.abs(item - page) <= 1;
  });

  return (
    <nav aria-label="Paginasi" className="mt-8 flex items-center justify-center gap-1.5">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-muted transition hover:border-white/20 hover:text-foreground",
          page <= 1 && "pointer-events-none opacity-40",
        )}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      {pages.map((item, index) => {
        const previous = pages[index - 1];
        const showGap = previous && item - previous > 1;
        return (
          <span key={item} className="flex items-center gap-1.5">
            {showGap ? <span className="px-1 text-xs text-white/25">…</span> : null}
            <Link
              href={hrefFor(item)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-xs transition",
                item === page
                  ? "border-violet/40 bg-violet/15 text-violet-bright"
                  : "border-white/10 text-muted hover:border-white/20 hover:text-foreground",
              )}
            >
              {item}
            </Link>
          </span>
        );
      })}
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-muted transition hover:border-white/20 hover:text-foreground",
          page >= totalPages && "pointer-events-none opacity-40",
        )}
        aria-label="Halaman berikutnya"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
