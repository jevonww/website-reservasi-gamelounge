"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface FilterSelectOption {
  value: string;
  label: string;
}

export function FilterSelect({
  id,
  value,
  options,
  onChange,
  label,
  className,
  buttonClassName,
}: {
  id?: string;
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
  label: string;
  className?: string;
  buttonClassName?: string;
}) {
  const generatedId = useId();
  const triggerId = id ?? `filter-${generatedId}`;
  const listId = `${triggerId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  const selected = options[selectedIndex] ?? options[0];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const openMenu = (index = selectedIndex) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + direction + options.length) % options.length);
      return;
    }

    if (!open) {
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={cn(
          "field flex w-full items-center justify-between gap-3 pr-3 text-left",
          open && "border-violet/60 bg-ink/85 ring-4 ring-violet/10",
          buttonClassName,
        )}
      >
        <span className="truncate">{selected?.label ?? ""}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180 text-violet-bright",
          )}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.4rem)] z-40 w-full min-w-[13rem] max-w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/12 bg-[#10101b] p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.07)]">
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={triggerId}
            className="max-h-64 overflow-y-auto overscroll-contain"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <li
                  key={option.value || "all"}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(index)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    isSelected ? "text-violet-bright" : "text-white/70",
                    isActive && "bg-white/[0.07] text-foreground",
                    isSelected && isActive && "bg-violet/15 text-violet-bright",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
