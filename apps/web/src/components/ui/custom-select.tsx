"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type CustomSelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type CustomSelectProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  triggerClassName?: string;
  menuClassName?: string;
  renderOption?: (option: CustomSelectOption, selected: boolean) => ReactNode;
  renderValue?: (option: CustomSelectOption | null) => ReactNode;
};

const DEFAULT_TRIGGER_CLASS =
  "flex h-11 w-full items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-ink)] px-3 text-left text-[var(--color-bone)] transition hover:border-[var(--color-amber)]/40 disabled:cursor-not-allowed disabled:opacity-60";

const DEFAULT_MENU_CLASS =
  "absolute z-20 mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-ink-elevated)] p-1 shadow-xl";

export function CustomSelect({
  id,
  name,
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  triggerClassName,
  menuClassName,
  renderOption,
  renderValue,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <>
      {name ? <input type="hidden" id={id} name={name} value={value} /> : null}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          id={id}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={triggerClassName ?? DEFAULT_TRIGGER_CLASS}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
        >
          <span className="min-w-0 truncate text-sm font-medium">
            {renderValue
              ? renderValue(selected)
              : (selected?.label ?? placeholder ?? "Select option")}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--color-bone-faint)] transition ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open ? (
          <div className={menuClassName ?? DEFAULT_MENU_CLASS}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value === "" ? "__empty" : option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? "bg-[var(--color-amber)]/15 text-[var(--color-bone)]"
                      : "text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    {renderOption ? renderOption(option, isSelected) : option.label}
                  </span>
                  {isSelected ? <CheckCircle2 className="ml-2 h-4 w-4 text-[var(--color-amber)]" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}
