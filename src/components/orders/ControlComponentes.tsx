"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Box, CheckSquare, Sparkles } from "lucide-react";

export interface ComponenteItem {
  nombre: string;
  checked: boolean;
  cantidad: number;
}

export const LISTA_COMPONENTES_OFICIAL: string[] = [
  // Columna 1
  "Cubeta",
  "Mordida",
  "Modelo Duplicado",
  "Transfer",
  "Tornillo Transferencia",
  "UCLA Base Metalica",
  "Tornillo",
  "Articulador",
  // Columna 2
  "Antagonista",
  "Modelo Trabajo",
  "STL",
  "Analogo",
  "UCLA",
  "Pilar Metalico",
  "Coping",
];

interface Props {
  value?: ComponenteItem[] | Record<string, any> | null;
  initialValue?: ComponenteItem[] | Record<string, any> | null;
  onChange?: (components: ComponenteItem[]) => void;
  readOnly?: boolean;
  className?: string;
}

export function ControlComponentes({
  value,
  initialValue,
  onChange,
  readOnly = false,
  className = "",
}: Props) {
  const currentVal = value !== undefined ? value : initialValue;

  const [items, setItems] = useState<ComponenteItem[]>(() => {
    if (Array.isArray(currentVal) && currentVal.length > 0) {
      return LISTA_COMPONENTES_OFICIAL.map((nombre) => {
        const found = currentVal.find(
          (it) => it.nombre.toLowerCase() === nombre.toLowerCase()
        );
        return {
          nombre,
          checked: !!found?.checked,
          cantidad: found?.cantidad && found.cantidad > 0 ? found.cantidad : 1,
        };
      });
    }

    return LISTA_COMPONENTES_OFICIAL.map((nombre) => ({
      nombre,
      checked: false,
      cantidad: 1,
    }));
  });

  useEffect(() => {
    if (Array.isArray(currentVal) && currentVal.length > 0) {
      setItems((prev) =>
        prev.map((it) => {
          const found = currentVal.find(
            (iv) => iv.nombre.toLowerCase() === it.nombre.toLowerCase()
          );
          return found ? { ...it, checked: !!found.checked, cantidad: found.cantidad || 1 } : it;
        })
      );
    }
  }, [currentVal]);

  function handleToggle(index: number) {
    if (readOnly) return;
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], checked: !next[index].checked };
      onChange?.(next);
      return next;
    });
  }

  function handleQuantityChange(index: number, val: number) {
    if (readOnly) return;
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        cantidad: Math.max(1, val || 1),
        checked: true, // Si cambia cantidad, marcar automáticamente
      };
      onChange?.(next);
      return next;
    });
  }

  const col1 = items.slice(0, 8);
  const col2 = items.slice(8);

  const selectedCount = items.filter((it) => it.checked).length;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Box className="w-4 h-4 text-purple-600" />
          <span>Control de Componentes:</span>
        </label>
        {selectedCount > 0 && (
          <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded-full">
            {selectedCount} componente(s) en caja
          </span>
        )}
      </div>

      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 shadow-inner">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {/* Columna 1 */}
          <div className="space-y-2">
            {col1.map((item, idx) => (
              <div
                key={item.nombre}
                className={`flex items-center gap-2.5 p-1.5 rounded-xl transition-colors ${
                  item.checked
                    ? "bg-purple-100/60 dark:bg-purple-950/40 font-semibold"
                    : "hover:bg-white/80 dark:hover:bg-slate-800/60"
                }`}
              >
                <input
                  type="checkbox"
                  id={`comp-${idx}`}
                  checked={item.checked}
                  disabled={readOnly}
                  onChange={() => handleToggle(idx)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-[#3C1C6C]"
                />
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={item.cantidad}
                  disabled={readOnly}
                  onChange={(e) =>
                    handleQuantityChange(idx, parseInt(e.target.value, 10))
                  }
                  className="w-12 h-7 text-center font-bold text-xs p-0 rounded-lg bg-white dark:bg-slate-800 border-slate-300"
                />
                <label
                  htmlFor={`comp-${idx}`}
                  className="text-xs text-slate-700 dark:text-slate-200 cursor-pointer select-none flex-1 truncate"
                >
                  {item.nombre}
                </label>
              </div>
            ))}
          </div>

          {/* Columna 2 */}
          <div className="space-y-2">
            {col2.map((item, relIdx) => {
              const actualIdx = relIdx + 8;
              return (
                <div
                  key={item.nombre}
                  className={`flex items-center gap-2.5 p-1.5 rounded-xl transition-colors ${
                    item.checked
                      ? "bg-purple-100/60 dark:bg-purple-950/40 font-semibold"
                      : "hover:bg-white/80 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`comp-${actualIdx}`}
                    checked={item.checked}
                    disabled={readOnly}
                    onChange={() => handleToggle(actualIdx)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-[#3C1C6C]"
                  />
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={item.cantidad}
                    disabled={readOnly}
                    onChange={(e) =>
                      handleQuantityChange(actualIdx, parseInt(e.target.value, 10))
                    }
                    className="w-12 h-7 text-center font-bold text-xs p-0 rounded-lg bg-white dark:bg-slate-800 border-slate-300"
                  />
                  <label
                    htmlFor={`comp-${actualIdx}`}
                    className="text-xs text-slate-700 dark:text-slate-200 cursor-pointer select-none flex-1 truncate"
                  >
                    {item.nombre}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function parseComponentesFromObservaciones(observaciones?: string | null): ComponenteItem[] {
  if (!observaciones) return [];
  const match = observaciones.match(/\[COMPONENTES:\s*([^\]]+)\]/i);
  if (!match || !match[1]) return [];

  const parts = match[1].split(",").map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => {
    const qtyMatch = p.match(/^(\d+)x\s+(.+)$/i);
    if (qtyMatch) {
      return {
        cantidad: parseInt(qtyMatch[1], 10),
        nombre: qtyMatch[2].trim(),
        checked: true,
      };
    }
    return { cantidad: 1, nombre: p, checked: true };
  });
}

export function formatComponentesForObservaciones(
  components: ComponenteItem[],
  existingObs?: string | null
): string {
  const active = (components || []).filter((c) => c.checked && c.cantidad > 0);
  const compStr = active.length > 0
    ? `[COMPONENTES: ${active.map((c) => `${c.cantidad}x ${c.nombre}`).join(", ")}]`
    : null;

  const cleanObs = existingObs ? existingObs.replace(/\[COMPONENTES:[^\]]*\]/gi, "").trim() : "";
  const trimmed = cleanObs.replace(/^[|\s]+|[|\s]+$/g, "").trim();

  return [compStr, trimmed || null].filter(Boolean).join(" | ");
}
