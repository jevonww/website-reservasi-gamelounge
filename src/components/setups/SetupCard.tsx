import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Gamepad2, Monitor, Sparkles } from "lucide-react";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { formatIDR } from "@/src/lib/utils";
import { specEntries } from "@/src/lib/specs";
import type { Setup } from "@/src/generated/prisma/client";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "PC Gaming": <Monitor className="h-3.5 w-3.5" />,
  Console: <Gamepad2 className="h-3.5 w-3.5" />,
  "Private Room": <Sparkles className="h-3.5 w-3.5" />,
};

type SetupCardData = Pick<
  Setup,
  "name" | "slug" | "category" | "description" | "specs" | "imageUrl" | "hourlyRate" | "status"
>;

export function SetupCard({ setup, priority = false }: { setup: SetupCardData; priority?: boolean }) {
  const specs = specEntries(setup.specs, 3);
  const available = setup.status === "AVAILABLE";

  return (
    <article className="glass glass-sheen group relative flex flex-col overflow-hidden rounded-3xl transition duration-300 ease-out hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_34px_80px_-34px_rgba(0,0,0,0.95)]">
      <Link
        href={`/setups/${setup.slug}`}
        className="relative block aspect-[16/10] overflow-hidden"
        aria-label={`Lihat detail ${setup.name}`}
      >
        <Image
          src={setup.imageUrl}
          alt={setup.name}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080810] via-transparent to-transparent opacity-90" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/12 bg-black/40 px-2.5 py-1 text-[0.68rem] font-medium text-white/80 backdrop-blur-md">
            {CATEGORY_ICONS[setup.category] ?? <Monitor className="h-3.5 w-3.5" />}
            {setup.category}
          </span>
          <StatusBadge status={setup.status} kind="setup" />
        </div>
        <div className="absolute bottom-3 right-4 rounded-full border border-white/12 bg-black/45 px-3 py-1 text-[0.7rem] text-white/80 backdrop-blur-md">
          {available ? "Siap dimainkan" : setup.status === "MAINTENANCE" ? "Maintenance" : "Nonaktif"}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[1.05rem] font-semibold tracking-tight text-foreground">
              <Link href={`/setups/${setup.slug}`} className="hover:text-violet-bright">
                {setup.name}
              </Link>
            </h3>
            <p className="mt-1.5 line-clamp-2 text-[0.82rem] leading-relaxed text-muted">
              {setup.description}
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          {specs.map((spec) => (
            <li key={spec.key} className="flex items-center gap-2 text-[0.78rem]">
              <span className="h-1 w-1 shrink-0 rounded-full bg-violet/70" aria-hidden />
              <span className="text-white/40">{spec.label}</span>
              <span className="truncate text-white/75">{spec.value}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/8 pt-4">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.1em] text-white/35">Mulai dari</p>
            <p className="text-lg font-semibold text-foreground">
              {formatIDR(setup.hourlyRate)}
              <span className="ml-1 text-xs font-normal text-muted">/jam</span>
            </p>
          </div>
          <Link
            href={available ? `/setups/${setup.slug}` : `/setups/${setup.slug}`}
            className="group/btn inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-4 text-[0.8rem] font-medium text-foreground transition hover:border-violet/40 hover:bg-violet/15 hover:text-white"
          >
            {available ? "Book Now" : "Lihat Detail"}
            <ArrowUpRight className="h-3.5 w-3.5 transition group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
