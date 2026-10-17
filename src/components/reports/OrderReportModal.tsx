"use client";

import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  X,
  ShieldCheck,
  Box,
  Stethoscope,
  User,
  Calendar,
  CreditCard,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { formatDualCurrency, getCachedExchangeRate } from "@/lib/currency";
import { LISTA_COMPONENTES_OFICIAL } from "@/components/orders/ControlComponentes";

export interface OrderReportData {
  id: string;
  numero_requerimiento?: string | null;
  numero_caja?: string | null;
  fecha_ingreso?: string | null;
  fecha_entrega?: string | null;
  doctor_nombre?: string | null;
  doctor_telefono?: string | null;
  clinica?: string | null;
  direccion_entrega?: string | null;
  paciente_nombre?: string | null;
  paciente_telefono?: string | null;
  trabajo_realizar?: string | null;
  pieza_numero?: string | null;
  color_pieza?: string | null;
  colimetro?: string | null;
  total?: number | null;
  anticipo?: number | null;
  observaciones?: string | null;
  estado?: string | null;
  componentes_caja?: any[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderReportData | null;
}

export function OrderReportModal({ open, onOpenChange, order }: Props) {
  if (!order) return null;

  const rate = getCachedExchangeRate();
  const total = Number(order.total || 0);
  const anticipo = Number(order.anticipo || 0);
  const saldo = Math.max(0, total - anticipo);

  const totalDual = formatDualCurrency(total, rate);
  const anticipoDual = formatDualCurrency(anticipo, rate);
  const saldoDual = formatDualCurrency(saldo, rate);

  // Procesar componentes de la caja
  const componentsList = useMemo(() => {
    let list: { nombre: string; checked: boolean; cantidad: number }[] = [];

    if (Array.isArray(order.componentes_caja) && order.componentes_caja.length > 0) {
      list = order.componentes_caja;
    } else if (order.observaciones && order.observaciones.includes("[COMPONENTES:")) {
      const match = order.observaciones.match(/\[COMPONENTES:\s*([^\]]+)\]/);
      if (match) {
        const parts = match[1].split(",").map((s) => s.trim());
        list = parts.map((p) => {
          const qtyMatch = p.match(/^(\d+)x\s*(.*)$/);
          if (qtyMatch) {
            return { cantidad: parseInt(qtyMatch[1], 10), nombre: qtyMatch[2], checked: true };
          }
          return { cantidad: 1, nombre: p, checked: true };
        });
      }
    }

    return LISTA_COMPONENTES_OFICIAL.map((nombre) => {
      const found = list.find((it) => it.nombre.toLowerCase() === nombre.toLowerCase());
      return {
        nombre,
        checked: !!found?.checked,
        cantidad: found?.cantidad || 1,
      };
    });
  }, [order.componentes_caja, order.observaciones]);

  const activeComponentsCount = componentsList.filter((c) => c.checked).length;

  function handlePrint() {
    window.print();
  }

  const reqCode = order.numero_requerimiento
    ? order.numero_requerimiento.toUpperCase()
    : `REQ-${order.id.slice(0, 8).toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[96vh] overflow-y-auto p-0 bg-slate-100 dark:bg-slate-950 border-none shadow-2xl print:m-0 print:p-0 print:max-w-none print:max-h-none print:shadow-none print:bg-white print:overflow-visible">
        <DialogHeader className="sr-only">
          <DialogTitle>Nota de Entrega / Hoja de Remisión Dental</DialogTitle>
          <DialogDescription>Documento oficial de entrega y garantía técnica para odontólogos</DialogDescription>
        </DialogHeader>

        {/* Barra superior de control (Oculta al imprimir) */}
        <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-between print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#3C1C6C] dark:text-purple-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#6A2CB0]" />
              Resumen Oficial • Hoja de Remisión
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-mono font-bold">
              #{reqCode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl gap-2 font-bold text-xs h-9 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Imprimir / Guardar </span>PDF (A4)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-slate-200 text-xs h-9 cursor-pointer"
            >
              <X className="w-4 h-4" /> Cerrar
            </Button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* HOJA DE REPORTE OFICIAL TIPO CERTIFICADO (A4 STANDARD)          */}
        {/* ============================================================== */}
        <div
          id="guisela-report-container"
          className="p-4 sm:p-8 md:p-11 bg-white text-slate-900 relative overflow-hidden print:p-6 print:m-0 w-full max-w-[210mm] mx-auto min-h-[297mm] shadow-xl print:shadow-none border border-slate-200 print:border-none"
        >
          {/* MARCA DE AGUA DE SEGURIDAD (DIAGONAL REPETITIVA Y LOGO CENTRAL) */}
          <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.045] print:opacity-[0.055] rotate-[-28deg] z-0">
            <div className="text-center space-y-4">
              <div className="relative w-80 h-80 mx-auto">
                <Image
                  src="/images/guisela-symbol.png"
                  alt="Watermark Emblem"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <p className="text-6xl font-black tracking-widest text-[#3C1C6C] uppercase">
                GUISELA LAB
              </p>
              <p className="text-xl font-black tracking-[0.25em] text-slate-800 uppercase">
                CONTROL DE CALIDAD & CAD/CAM • LA PAZ
              </p>
            </div>
          </div>

          {/* MARCA DE AGUA SECUNDARIA DE ESQUINAS */}
          <div className="absolute top-10 right-10 pointer-events-none select-none text-[80px] font-black text-purple-900/4 rotate-12 z-0">
            ORIGINAL
          </div>

          {/* CONTENIDO ESTRUCTURADO FORMAL (Z-10) */}
          <div className="relative z-10 space-y-5 text-xs sm:text-[13px] leading-relaxed">
            {/* 1. ENCABEZADO INSTITUCIONAL FORMAL */}
            <div className="flex flex-col sm:flex-row items-start justify-between pb-4 border-b-2 border-slate-900 gap-3 sm:gap-4 print:flex-row">
              <div className="flex items-center gap-3.5">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                  <Image
                    src="/images/brand/guisela-symbol-primary.png"
                    alt="Logo Guisela Lab"
                    width={60}
                    height={60}
                    className="object-contain w-full h-full"
                    unoptimized
                  />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-black text-[#3C1C6C] tracking-tight uppercase leading-none">
                    GUISELA LABORATORIO DENTAL
                  </h1>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-700 tracking-wide mt-1">
                    SISTEMA INTEGRAL DE PRÓTESIS DENTAL, CAD/CAM & ESTÉTICA
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">
                    La Paz - Bolivia · WhatsApp: 7663... · Email: glb.7663@gmail.com
                  </p>
                </div>
              </div>

              {/* RECUADRO REMISIÓN & CAJA */}
              <div className="text-left sm:text-right shrink-0 space-y-1 w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start pt-1 sm:pt-0 print:text-right print:w-auto print:block">
                <div className="inline-block px-3.5 py-1.5 bg-[#3C1C6C] text-white rounded-lg text-center shadow-xs">
                  <p className="text-[9px] uppercase tracking-widest font-extrabold text-purple-200">
                    HOJA DE REMISIÓN TÉCNICA
                  </p>
                  <p className="text-base font-black font-mono tracking-tight">{reqCode}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-0.5">
                  <span className="text-[11px] font-bold text-slate-600">CAJA N°:</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-950 font-black text-sm border border-purple-200">
                    #{order.numero_caja || "00"}
                  </span>
                </div>

                {/* Código de barras simulado para aspecto formal de trazabilidad */}
                <div className="hidden sm:flex flex-col items-end pt-1 print:flex">
                  <svg className="w-28 h-6 text-slate-800" viewBox="0 0 120 24" fill="currentColor">
                    <rect x="0" y="0" width="3" height="24" />
                    <rect x="5" y="0" width="2" height="24" />
                    <rect x="10" y="0" width="4" height="24" />
                    <rect x="17" y="0" width="2" height="24" />
                    <rect x="22" y="0" width="6" height="24" />
                    <rect x="31" y="0" width="2" height="24" />
                    <rect x="36" y="0" width="3" height="24" />
                    <rect x="42" y="0" width="5" height="24" />
                    <rect x="50" y="0" width="2" height="24" />
                    <rect x="55" y="0" width="4" height="24" />
                    <rect x="62" y="0" width="2" height="24" />
                    <rect x="67" y="0" width="5" height="24" />
                    <rect x="75" y="0" width="3" height="24" />
                    <rect x="81" y="0" width="2" height="24" />
                    <rect x="86" y="0" width="6" height="24" />
                    <rect x="95" y="0" width="3" height="24" />
                    <rect x="101" y="0" width="2" height="24" />
                    <rect x="106" y="0" width="4" height="24" />
                    <rect x="113" y="0" width="2" height="24" />
                    <rect x="118" y="0" width="2" height="24" />
                  </svg>
                  <span className="text-[8px] font-mono tracking-widest text-slate-500">
                    *{reqCode}*
                  </span>
                </div>
              </div>
            </div>

            {/* 2. DATOS CLÍNICOS DEL ODONTÓLOGO Y DEL PACIENTE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl border border-slate-300 bg-slate-50/70 print:grid-cols-2">
              <div className="space-y-1 sm:border-r border-slate-200 sm:pr-3 print:border-r print:pr-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#3C1C6C] flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>ODONTÓLOGO / CLÍNICA SOLICITANTE</span>
                </p>
                <p className="font-extrabold text-sm text-slate-900">
                  {order.doctor_nombre || "Doctor / Odontólogo no registrado"}
                </p>
                {order.clinica && (
                  <p className="text-slate-600 text-xs">
                    <span className="font-semibold text-slate-700">Clínica:</span> {order.clinica}
                  </p>
                )}
                {order.doctor_telefono && (
                  <p className="text-slate-600 text-xs">
                    <span className="font-semibold text-slate-700">Teléfono:</span>{" "}
                    {order.doctor_telefono}
                  </p>
                )}
                {order.direccion_entrega && (
                  <p className="text-slate-600 text-xs">
                    <span className="font-semibold text-slate-700">Despacho:</span>{" "}
                    {order.direccion_entrega}
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:pl-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 print:border-t-0 print:pl-1 print:pt-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#3C1C6C] flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>PACIENTE & CRONOGRAMA DE PRODUCCIÓN</span>
                </p>
                <p className="font-extrabold text-sm text-slate-900">
                  {order.paciente_nombre || "Paciente"}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-0.5">
                  <div>
                    <span className="font-semibold text-slate-700 block text-[11px]">
                      Fecha Ingreso:
                    </span>
                    <span className="font-medium">
                      {order.fecha_ingreso
                        ? new Date(order.fecha_ingreso).toLocaleDateString("es-BO")
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 block text-[11px]">
                      Fecha Entrega:
                    </span>
                    <span className="font-medium text-purple-950">
                      {order.fecha_entrega
                        ? new Date(order.fecha_entrega).toLocaleDateString("es-BO")
                        : "Programada"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 pt-0.5">
                  <span className="font-semibold text-slate-700">Estado de Control:</span>{" "}
                  <span className="uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                    {order.estado || "Control de Calidad Conforme"}
                  </span>
                </p>
              </div>
            </div>

            {/* 3. ESPECIFICACIÓN TÉCNICA DEL TRABAJO PROTÉSICO */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                ESPECIFICACIÓN TÉCNICA DE LA RESTAURACIÓN DENTAL:
              </p>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-[11px] font-extrabold border-b border-slate-300">
                    <th className="p-2.5 text-left border-r border-slate-300">
                      Trabajo / Restauración a Realizar
                    </th>
                    <th className="p-2.5 text-center border-r border-slate-300 w-24">Pieza(s) N°</th>
                    <th className="p-2.5 text-center border-r border-slate-300 w-28">Color / Tono</th>
                    <th className="p-2.5 text-center w-28">Guía / Colímetro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="p-2.5 text-slate-900 font-black border-r border-slate-300 text-sm">
                      {order.trabajo_realizar || "Trabajo de Rehabilitación Protésica"}
                    </td>
                    <td className="p-2.5 text-center font-bold text-slate-900 border-r border-slate-300 font-mono text-sm">
                      {order.pieza_numero || "—"}
                    </td>
                    <td className="p-2.5 text-center font-bold text-purple-900 border-r border-slate-300">
                      {order.color_pieza || "—"}
                    </td>
                    <td className="p-2.5 text-center text-slate-700 font-medium">
                      {order.colimetro || "Vita Clásico"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. CONTROL DE COMPONENTES EN CAJA (LOS 15 COMPONENTES OFICIALES) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <Box className="w-3.5 h-3.5 text-purple-700" />
                  <span>
                    CONTROL DE COMPONENTES & ADITAMENTOS ({activeComponentsCount} seleccionados):
                  </span>
                </p>
                <span className="text-[10px] text-slate-500 italic">
                  Verificación física de piezas de entrada y devolución
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded-xl border border-slate-300 bg-slate-50/50">
                {componentsList.map((comp) => (
                  <div
                    key={comp.nombre}
                    className={`flex items-center gap-2 text-xs p-1 rounded transition-colors ${
                      comp.checked ? "font-bold text-slate-900 bg-purple-50/90" : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold border ${
                        comp.checked
                          ? "bg-[#3C1C6C] text-white border-[#3C1C6C]"
                          : "border-slate-300 bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="w-5 text-center font-mono font-bold text-[11px]">
                      {comp.checked ? `${comp.cantidad}x` : "—"}
                    </span>
                    <span className="truncate">{comp.nombre}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. OBSERVACIONES & INSTRUCCIONES TÉCNICAS */}
            {order.observaciones && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  OBSERVACIONES & INSTRUCCIONES CLÍNICAS:
                </p>
                <p className="text-slate-700 italic text-xs leading-relaxed">
                  {order.observaciones}
                </p>
              </div>
            )}

            {/* 6. RESUMEN ECONÓMICO EN DOBLE MONEDA (Bs Y USD CON SALDO EN ROJO) */}
            <div className="p-3.5 rounded-xl border-2 border-slate-900 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 print:flex-row print:items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#3C1C6C]">
                  ESTADO DE CUENTA DE ESTE TRABAJO:
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Tipo de cambio oficial aplicado:{" "}
                  <span className="font-bold text-slate-900">1 USD = {rate.toFixed(2)} Bs</span>
                </p>
                <p className="text-[10px] text-slate-500 italic mt-0.5">
                  Validez contable según normativa de facturación y remisión.
                </p>
              </div>

              <div className="text-left sm:text-right space-y-0.5 w-full sm:w-auto shrink-0 print:text-right print:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                <div className="flex items-baseline justify-between sm:justify-end gap-3 text-xs">
                  <span className="text-slate-600 font-semibold">Total Trabajo:</span>
                  <span className="font-bold text-slate-900 text-sm">{totalDual.combined}</span>
                </div>

                <div className="flex items-baseline justify-between sm:justify-end gap-3 text-xs">
                  <span className="text-slate-600 font-semibold">Anticipo Recibido:</span>
                  <span className="font-bold text-emerald-700">{anticipoDual.combined}</span>
                </div>

                <div className="flex items-baseline justify-between sm:justify-end gap-3 pt-1 border-t border-slate-300">
                  <span className="text-xs font-black text-rose-600 uppercase tracking-wide">
                    SALDO PENDIENTE:
                  </span>
                  <span className="text-base font-black text-rose-600 tracking-tight">
                    {saldoDual.bsFormatted}{" "}
                    <span className="text-xs font-bold text-rose-500">({saldoDual.usdFormatted})</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 7. CERTIFICADO DE GARANTÍA Y BIOMATERIALES */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-[10px] text-slate-500 leading-normal space-y-1">
              <p className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-700" />
                Certificado de Calidad & Adaptación Marginal
              </p>
              <p>
                Guisela Laboratorio Dental certifica que esta prótesis dental ha sido confeccionada
                con materiales biocompatibles certificados internacionalmente (Zirconio multicapa,
                Disilicato de Litio o aleaciones libres de níquel/berilio) bajo protocolos de
                fresado CAD/CAM de alta precisión y cocción estandarizada.
              </p>
            </div>

            {/* 8. FIRMAS DE CONFORMIDAD LEGAL Y RECEPCIÓN */}
            <div className="pt-8 grid grid-cols-2 gap-10 text-center text-xs">
              <div className="space-y-1">
                <div className="border-t-2 border-slate-800 w-4/5 mx-auto pt-1.5" />
                <p className="font-black text-slate-900 uppercase tracking-tight">
                  Guisela Laboratorio Dental
                </p>
                <p className="text-[10px] text-slate-500">
                  Responsable Técnico CAD/CAM & Control de Calidad
                </p>
              </div>

              <div className="space-y-1">
                <div className="border-t-2 border-slate-800 w-4/5 mx-auto pt-1.5" />
                <p className="font-black text-slate-900 uppercase tracking-tight">
                  Recibí Conforme
                </p>
                <p className="text-[10px] text-slate-500">
                  Firma / Sello del Odontólogo o Recepción Clínica
                </p>
              </div>
            </div>

            {/* Pie de página institucional */}
            <div className="pt-4 border-t border-slate-200 text-center text-[9px] text-slate-400 flex items-center justify-between">
              <span>
                Documento Oficial de Remisión · Guisela Laboratorio Dental · La Paz, Bolivia
              </span>
              <span>Generado el {new Date().toLocaleString("es-BO")}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
