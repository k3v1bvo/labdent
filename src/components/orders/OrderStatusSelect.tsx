"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const ORDER_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    shortLabel: string;
    emoji: string;
    pillClass: string;
    dotClass: string;
    description: string;
  }
> = {
  pendiente_revision: {
    label: "En Revisión (Por Aprobar)",
    shortLabel: "Revisión",
    emoji: "📋",
    pillClass: "bg-amber-50 text-amber-900 border-amber-200/80 hover:bg-amber-100",
    dotClass: "bg-amber-500",
    description: "Revisión técnica y cotización pendiente",
  },
  pendiente: {
    label: "Pendiente (Cola de Taller)",
    shortLabel: "Pendiente",
    emoji: "⏳",
    pillClass: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200",
    dotClass: "bg-slate-500",
    description: "Aprobado, esperando asignación a estación",
  },
  en_proceso: {
    label: "En Proceso CAD/CAM",
    shortLabel: "En Proceso",
    emoji: "⚙️",
    pillClass: "bg-blue-50 text-blue-900 border-blue-200/80 hover:bg-blue-100",
    dotClass: "bg-blue-500",
    description: "En producción en estaciones técnicas",
  },
  finalizado: {
    label: "Finalizado (Listo para Entrega)",
    shortLabel: "Finalizado",
    emoji: "✨",
    pillClass: "bg-emerald-50 text-emerald-900 border-emerald-200/80 hover:bg-emerald-100",
    dotClass: "bg-emerald-500",
    description: "Control de calidad aprobado, listo para entrega",
  },
  entregado: {
    label: "Entregado a Clínica",
    shortLabel: "Entregado",
    emoji: "📦",
    pillClass: "bg-purple-50 text-purple-900 border-purple-200/80 hover:bg-purple-100",
    dotClass: "bg-purple-600",
    description: "Trabajo recibido por el doctor con nota",
  },
  rechazado: {
    label: "Rechazado",
    shortLabel: "Rechazado",
    emoji: "❌",
    pillClass: "bg-rose-50 text-rose-900 border-rose-200/80 hover:bg-rose-100",
    dotClass: "bg-rose-500",
    description: "Rechazado por incongruencia o cancelación",
  },
};

interface OrderStatusSelectProps {
  status: string;
  onChange: (newStatus: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function OrderStatusSelect({
  status,
  onChange,
  disabled = false,
  size = "sm",
  className,
}: OrderStatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = ORDER_STATUS_CONFIG[status] || {
    label: status,
    shortLabel: status,
    emoji: "⚡",
    pillClass: "bg-gray-100 text-gray-800 border-gray-200",
    dotClass: "bg-gray-400",
    description: "",
  };

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative inline-block select-none", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 font-bold border transition-all duration-150 rounded-xl cursor-pointer shadow-2xs hover:shadow-xs",
          size === "sm" ? "px-2.5 py-1 text-xs h-7.5" : "px-3.5 py-1.5 text-xs h-9",
          current.pillClass,
          disabled && "opacity-60 cursor-not-allowed",
          isOpen && "ring-2 ring-purple-400/30 scale-[1.02]"
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: "currentColor" }} />
        <span>{current.emoji}</span>
        <span className="font-extrabold">{current.shortLabel}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 opacity-60 transition-transform duration-200",
            isOpen && "rotate-180 opacity-100"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 w-64 min-w-[240px] right-0 rounded-2xl border border-slate-200/90 bg-white/98 backdrop-blur-md p-1.5 shadow-xl",
            "animate-in fade-in-0 zoom-in-95 duration-100 ease-out origin-top-right"
          )}
        >
          <div className="px-2 py-1 mb-1 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Cambiar Estado del Pedido
            </p>
          </div>

          <div className="space-y-1">
            {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => {
              const isSelected = key === status;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors",
                    isSelected
                      ? "bg-purple-50 text-[#3C1C6C] font-bold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base shrink-0">{config.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-[11px] leading-tight">
                        {config.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-normal truncate leading-tight">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#3C1C6C] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
