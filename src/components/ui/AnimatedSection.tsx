"use client";

import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

export function AnimatedSection({
  children,
  className,
  delay = 0,
  y = 24,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.section>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 20,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
