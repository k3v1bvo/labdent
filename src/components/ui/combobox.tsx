"use client";

import * as React from "react";
import { useState, useRef, useEffect, useId } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  icon?: React.ReactNode;
  clearable?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Seleccionar opción...",
  searchPlaceholder = "Buscar...",
  searchable,
  disabled = false,
  className,
  triggerClassName,
  dropdownClassName,
  icon,
  clearable = false,
  size = "md",
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const isSearchable =
    searchable !== undefined ? searchable : options.length > 5;

  const selectedOption = options.find((opt) => opt.value === value);

  // Filtrado de opciones
  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [options, search]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Auto focus al abrir si es searchable
  useEffect(() => {
    if (isOpen && isSearchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen, isSearchable]);

  // Tecla Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const sizeClasses = {
    sm: "h-8 px-2.5 text-xs rounded-lg",
    md: "h-10 px-3.5 text-xs sm:text-sm rounded-xl",
    lg: "h-12 px-4 text-sm sm:text-base rounded-2xl",
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full select-none", className)}
    >
      {/* Botón Trigger Principal */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "w-full flex items-center justify-between gap-2 border bg-white text-left font-semibold transition-all duration-150 outline-none",
          "border-slate-200/90 hover:border-[#A57CFA] focus:border-[#3C1C6C] focus:ring-2 focus:ring-[#A57CFA]/20",
          "shadow-2xs hover:shadow-xs",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50",
          isOpen && "border-[#3C1C6C] ring-2 ring-[#A57CFA]/25 shadow-xs",
          sizeClasses[size],
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && (
            <span className="text-[#3C1C6C] shrink-0 opacity-80">{icon}</span>
          )}
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span
            className={cn(
              "truncate block",
              selectedOption
                ? "text-slate-900 font-bold"
                : "text-slate-400 font-normal"
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={cn(
                "ml-1.5 px-2 py-0.5 text-[10px] font-extrabold rounded-full shrink-0",
                selectedOption.badgeColor ||
                  "bg-purple-100 text-[#3C1C6C] border border-purple-200"
              )}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              title="Limpiar selección"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200 text-slate-400",
              isOpen && "rotate-180 text-[#3C1C6C]"
            )}
          />
        </div>
      </button>

      {/* Popover / Menú Desplegable Flotante */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute z-50 mt-1.5 w-full min-w-[200px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/98 backdrop-blur-md shadow-xl",
            "animate-in fade-in-0 zoom-in-95 duration-100 ease-out origin-top",
            dropdownClassName
          )}
        >
          {/* Barra de Búsqueda Rápida */}
          {isSearchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/60 sticky top-0 z-10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-[#3C1C6C] focus:ring-1 focus:ring-[#A57CFA]/30 text-slate-800"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lista de Opciones */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <p className="font-medium">No se encontraron opciones</p>
                {search && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    para &quot;{search}&quot;
                  </p>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs rounded-xl text-left font-medium transition-colors",
                      isSelected
                        ? "bg-purple-50 text-[#3C1C6C] font-bold"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="min-w-0 flex-1">
                        <span className="truncate block">{opt.label}</span>
                        {opt.description && (
                          <span className="text-[11px] text-slate-400 font-normal block truncate">
                            {opt.description}
                          </span>
                        )}
                      </div>
                      {opt.badge && (
                        <span
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0",
                            opt.badgeColor ||
                              "bg-purple-100 text-[#3C1C6C] border border-purple-200"
                          )}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#3C1C6C] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
