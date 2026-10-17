"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { ItemCatalogo, CATALOGO_OFICIAL, fetchCatalogo, calculateTrabajoPrice } from "@/lib/catalog";
import { getCachedExchangeRate } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { DualPrice } from "@/components/common/DualPrice";
import {
  Sparkles,
  Search,
  Check,
  Plus,
  Tag,
  Layers,
  GraduationCap,
  Percent,
  Calculator,
  ChevronDown,
} from "lucide-react";

export interface TrabajoSelectorProps {
  selectedTrabajo?: string;
  initialTrabajo?: string;
  piezas?: string | number;
  initialPiezas?: string | number;
  tipoTarifa?: string; // 'regular' | 'descuento_normal' | 'institucional_universidad'
  descuentoPorcentaje?: number;
  onSelect?: (trabajo: ItemCatalogo, precioBs: number, piezasCount?: number) => void;
  onPriceCalculated?: (data: {
    nombreTrabajo: string;
    piezas: number;
    unitarioUsd: number;
    totalBs: number;
    totalUsd: number;
    descuentoPct: number;
  }) => void;
  className?: string;
}

export function TrabajoSelector({
  selectedTrabajo,
  initialTrabajo = "",
  piezas,
  initialPiezas = "1",
  tipoTarifa = "regular",
  descuentoPorcentaje = 0,
  onSelect,
  onPriceCalculated,
  className = "",
}: TrabajoSelectorProps) {
  const currentInitialTrabajo = selectedTrabajo !== undefined ? selectedTrabajo : initialTrabajo;
  const currentInitialPiezas = piezas !== undefined ? piezas : initialPiezas;
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>(CATALOGO_OFICIAL);
  const [query, setQuery] = useState(initialTrabajo);
  const [selectedItem, setSelectedItem] = useState<ItemCatalogo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [piezasCount, setPiezasCount] = useState<number>(() => {
    const p = parseInt(String(initialPiezas), 10);
    return isNaN(p) || p <= 0 ? 1 : p;
  });

  // Modo trabajo personalizado
  const [isCustom, setIsCustom] = useState(false);
  const [customPriceUsd, setCustomPriceUsd] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar catálogo de Supabase si está disponible
  useEffect(() => {
    fetchCatalogo().then((items) => setCatalogo(items));
  }, []);

  // Preseleccionar si initialTrabajo coincide
  useEffect(() => {
    if (!initialTrabajo) return;
    const match = catalogo.find(
      (c) => c.nombre.toLowerCase() === initialTrabajo.trim().toLowerCase()
    );
    if (match) {
      setSelectedItem(match);
      setQuery(match.nombre);
    } else {
      setQuery(initialTrabajo);
    }
  }, [initialTrabajo, catalogo]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrado de trabajos
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogo.slice(0, 30);
    return catalogo.filter(
      (it) =>
        it.nombre.toLowerCase().includes(q) ||
        (it.marca && it.marca.toLowerCase().includes(q)) ||
        it.categoria.toLowerCase().includes(q)
    );
  }, [query, catalogo]);

  // Cálculo automático del precio
  const pricing = useMemo(() => {
    return calculateTrabajoPrice({
      item: isCustom ? null : selectedItem,
      customNombre: query,
      customPrecioUsd: customPriceUsd,
      cantidadPiezas: piezasCount,
      tipoTarifa,
      descuentoPorcentaje,
      tipoCambio: getCachedExchangeRate(),
    });
  }, [selectedItem, isCustom, query, customPriceUsd, piezasCount, tipoTarifa, descuentoPorcentaje]);

  // Notificar al componente padre
  useEffect(() => {
    onPriceCalculated?.({
      nombreTrabajo: pricing.nombreTrabajo,
      piezas: pricing.cantidad,
      unitarioUsd: pricing.unitarioUsd,
      totalBs: pricing.totalBs,
      totalUsd: pricing.totalUsd,
      descuentoPct: pricing.descuentoPct,
    });
  }, [pricing, onPriceCalculated]);

  function handleSelectItem(item: ItemCatalogo) {
    setSelectedItem(item);
    setIsCustom(false);
    setQuery(item.nombre);
    setIsOpen(false);
  }

  function handleEnableCustom() {
    setIsCustom(true);
    setSelectedItem(null);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className={`space-y-3 ${className}`}>
      {/* Selector de Catálogo o Personalizado */}
      <div className="relative">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Trabajo Dental (Catálogo Oficial de Precios)</span>
            <span className="text-red-500">*</span>
          </span>
          {tipoTarifa === "institucional_universidad" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
              <GraduationCap className="w-3.5 h-3.5" /> Convenio Institucional (Univalle)
            </span>
          )}
        </label>

        {!isCustom ? (
          <div className="relative mt-1">
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedItem(null);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder="Buscar trabajo en catálogo (ej: Corona Metal Cerámica, Carilla Emax...)"
                className="pr-10 font-medium"
              />
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in duration-150">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500">
                  <span>{filteredItems.length} trabajos disponibles</span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleEnableCustom();
                    }}
                    className="text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar trabajo no listado
                  </button>
                </div>

                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectItem(item);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                        isSelected ? "bg-purple-100/60 dark:bg-purple-900/40" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 truncate">
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                          <span className="truncate">{item.nombre}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          {item.marca && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                              {item.marca}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">{item.categoria}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-sm text-purple-700 dark:text-purple-400">
                          ${item.precioUsd.toFixed(2)} USD
                        </p>
                        <p className="text-[11px] font-medium text-slate-500">
                          Bs {item.precioBs.toFixed(2)}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {filteredItems.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500">
                    <p>No se encontró &quot;{query}&quot; en el catálogo.</p>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleEnableCustom();
                      }}
                      className="mt-2 text-xs font-bold text-purple-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Cotizar como trabajo personalizado
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-1 p-3.5 rounded-2xl border border-purple-200 bg-purple-50/50 dark:bg-purple-950/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Trabajo Personalizado / No Listado
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCustom(false);
                  setQuery("");
                }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
              >
                Volver al catálogo oficial
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Nombre del trabajo
                </label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej: Corona especial sobre implante no convencional"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Precio Unitario ($ USD)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={customPriceUsd || ""}
                  onChange={(e) => setCustomPriceUsd(parseFloat(e.target.value) || 0)}
                  placeholder="Ej: 45.00"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selector de Cantidad de Piezas y Resumen de Cotización Automática */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Cantidad de Piezas
          </label>
          <div className="flex items-center gap-1.5 mt-1">
            <Input
              type="number"
              min="1"
              max="32"
              value={piezasCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setPiezasCount(isNaN(val) || val <= 0 ? 1 : val);
              }}
              className="text-center font-bold text-base"
            />
            <span className="text-xs font-medium text-slate-500">pza(s)</span>
          </div>
        </div>

        {/* Tarjeta de Resumen de Cotización */}
        <div className="md:col-span-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5" />
              <span>
                {piezasCount} pza(s) × ${pricing.unitarioUsd.toFixed(2)} USD
              </span>
            </p>
            {pricing.descuentoPct > 0 && (
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Percent className="w-3 h-3" />
                <span>Descuento aplicado: {pricing.descuentoPct}% (-Bs {pricing.descuentoMontoBs.toFixed(2)})</span>
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">Total a Pagar</p>
            <DualPrice amountBs={pricing.totalBs} size="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
