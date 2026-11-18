"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function SetupGallery({
  images,
  name,
  priority = false,
}: {
  images: string[];
  name: string;
  priority?: boolean;
}) {
  const gallery = images.length ? images : ["/images/setups/room-main.svg"];
  const [index, setIndex] = useState(0);
  const active = gallery[Math.min(index, gallery.length - 1)];

  const go = (direction: 1 | -1) => {
    setIndex((current) => (current + direction + gallery.length) % gallery.length);
  };

  return (
    <div>
      <div className="glass-strong glass-sheen relative overflow-hidden rounded-3xl p-2">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[1.35rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={active}
                alt={`${name} — tampilan ${index + 1}`}
                fill
                priority={priority}
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080810]/55 via-transparent to-transparent" />

          {gallery.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Gambar sebelumnya"
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition hover:bg-black/60 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Gambar berikutnya"
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition hover:bg-black/60 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {gallery.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {gallery.map((image, imageIndex) => (
            <button
              key={image + imageIndex}
              type="button"
              onClick={() => setIndex(imageIndex)}
              aria-label={`Tampilkan gambar ${imageIndex + 1}`}
              aria-pressed={imageIndex === index}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition",
                imageIndex === index
                  ? "border-violet/60 shadow-[0_0_0_1px_rgba(155,123,255,0.4)]"
                  : "border-white/10 opacity-60 hover:opacity-100",
              )}
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
