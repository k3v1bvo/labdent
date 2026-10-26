"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  X,
  Coins,
  Banknote,
  QrCode,
  TrendingDown,
  Receipt,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  User,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { CajaSesion, CajaMovimiento } from "@/lib/cashService";
import { formatDualCurrency, getCachedExchangeRate } from "@/lib/currency";
import { formatBoliviaDate, formatBoliviaTime } from "@/lib/dateUtils";

interface CashRegisterReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CajaSesion | null;
  resumen: {
    baseBs: number;
    efectivoCobradoBs: number;
    efectivoCobradoUsd: number;
    qrCobradoBs: number;
    gastosBs: number;
    totalFisicoEsperadoBs: number;
    totalFisicoEsperadoUsd: number;
  };
  movimientos: CajaMovimiento[];
  cajeroNombre?: string;
}

export function CashRegisterReportModal({
  open,
  onOpenChange,
  session,
  resumen,
  movimientos,
  cajeroNombre = "Responsable de Caja",
}: CashRegisterReportModalProps) {
  const rate = getCachedExchangeRate();

  function handlePrint() {
    window.print();
  }

  const codigoArqueo = useMemo(() => {
    if (!session?.fecha) return `ARQ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
    return `ARQ-${session.fecha.replace(/-/g, "")}`;
  }, [session?.fecha]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[96vh] overflow-y-auto p-0 bg-slate-100 dark:bg-slate-950 border-none shadow-2xl print:m-0 print:p-0 print:max-w-none print:max-h-none print:shadow-none print:bg-white print:overflow-visible">
        <DialogHeader className="sr-only">
          <DialogTitle>Acta Oficial de Cierre & Arqueo Diario de Caja</DialogTitle>
          <DialogDescription>
            Documento contable oficial de liquidación de caja diaria y caja chica
          </DialogDescription>
        </DialogHeader>

        {/* Barra superior de control (Oculta al imprimir) */}
        <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-between print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#3C1C6C] dark:text-purple-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#6A2CB0]" />
              Acta Oficial de Arqueo & Liquidación Diaria
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-mono font-bold">
              #{codigoArqueo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl gap-2 font-bold text-xs h-9 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Imprimir / Guardar </span>Acta PDF (A4)
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
        {/* HOJA DE REPORTE OFICIAL TIPO ACTA DE ARQUEO (A4 STANDARD)       */}
        {/* ============================================================== */}
        <div
          id="guisela-cash-container"
          className="p-5 sm:p-8 md:p-11 bg-white text-slate-900 relative overflow-hidden print:p-6 print:m-0 w-full max-w-[210mm] mx-auto min-h-[297mm] shadow-xl print:shadow-none border border-slate-200 print:border-none"
        >
          {/* MARCA DE AGUA CORPORATIVA ELEGANTE */}
          <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.04] print:opacity-[0.05] rotate-[-28deg] z-0">
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
                ARQUEO CONTABLE & FINANZAS
              </p>
            </div>
          </div>

          {/* CONTENIDO FORMAL */}
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
                    DEPARTAMENTO CONTABLE · CONTROL DE CAJA DIARIA & ARQUEO
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">
                    Cochabamba / Bolivia · GMT-4 · Tel/WhatsApp: 7663... · Email: glb.7663@gmail.com
                  </p>
                </div>
              </div>

              {/* RECUADRO CÓDIGO & ESTADO */}
              <div className="text-left sm:text-right shrink-0 space-y-1 w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start pt-1 sm:pt-0 print:text-right print:w-auto print:block">
                <div className="inline-block px-3.5 py-1.5 bg-[#3C1C6C] text-white rounded-lg text-center shadow-xs">
                  <p className="text-[9px] uppercase tracking-widest font-extrabold text-purple-200">
                    ACTA OFICIAL DE ARQUEO
                  </p>
                  <p className="text-base font-black font-mono tracking-tight">{codigoArqueo}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      session?.estado === "cerrada"
                        ? "bg-rose-100 text-rose-800 border-rose-200"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    ● {session?.estado === "cerrada" ? "SESIÓN CERRADA" : "SESIÓN ABIERTA (EN CURSO)"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. METADATOS DEL ARQUEO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/80">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Fecha de Jornada:
                </span>
                <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                  {session?.fecha ? formatBoliviaDate(session.fecha) : formatBoliviaDate(new Date())}
                </p>
                <p className="text-[10px] text-slate-500">
                  Horario: {session?.hora_apertura || "08:00"} {session?.hora_cierre ? `— ${session.hora_cierre}` : "— En curso"}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Cajero / Responsable:
                </span>
                <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                  {session?.abierta_por_nombre || cajeroNombre}
                </p>
                <p className="text-[10px] text-slate-500">
                  Cierre por: {session?.cerrada_por_nombre || "Pendiente de cierre"}
                </p>
              </div>

              <div className="space-y-0.5 text-left sm:text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Tipo de Cambio Referencial:
                </span>
                <p className="font-mono font-bold text-purple-950 text-xs">
                  1 USD = {rate.toFixed(2)} BOB
                </p>
                <p className="text-[10px] text-slate-500">
                  Emisión: {formatBoliviaDate(new Date())} {formatBoliviaTime(new Date())}
                </p>
              </div>
            </div>

            {/* 3. RESUMEN FINANCIERO DE LIQUIDACIÓN Y GAVETA */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#3C1C6C] flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#A57CFA]" /> Balance y Conciliación Financiera del Turno
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Fondo Inicio</span>
                  <p className="font-black text-slate-800 text-sm">Bs {resumen.baseBs.toFixed(2)}</p>
                  <span className="text-[9px] text-slate-400">Base fija gaveta</span>
                </div>

                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">Efectivo Cobrado</span>
                  <p className="font-black text-emerald-950 text-sm">Bs {resumen.efectivoCobradoBs.toFixed(2)}</p>
                  {resumen.efectivoCobradoUsd > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 block">
                      + $ {resumen.efectivoCobradoUsd.toFixed(2)} USD
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#3C1C6C] block">QR / Bancos</span>
                  <p className="font-black text-[#3C1C6C] text-sm">Bs {resumen.qrCobradoBs.toFixed(2)}</p>
                  <span className="text-[9px] text-purple-700">Comprobantes válidos</span>
                </div>

                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-rose-800 block">Gastos Caja Chica</span>
                  <p className="font-black text-rose-950 text-sm">Bs -{resumen.gastosBs.toFixed(2)}</p>
                  <span className="text-[9px] text-rose-700">Compras menores</span>
                </div>

                <div className="p-3 rounded-xl border-2 border-amber-300 bg-amber-50/70 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-black uppercase text-amber-900 block">Total Gaveta Físico</span>
                  <p className="font-black text-amber-950 text-base">Bs {resumen.totalFisicoEsperadoBs.toFixed(2)}</p>
                  {resumen.totalFisicoEsperadoUsd > 0 && (
                    <span className="text-[10px] font-bold text-amber-800 block">
                      + $ {resumen.totalFisicoEsperadoUsd.toFixed(2)} USD
                    </span>
                  )}
                </div>
              </div>

              {/* Si la sesión ya fue cerrada, mostrar cotejo de arqueo */}
              {session?.estado === "cerrada" && session.saldo_real_bs != null && (
                <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-purple-900">Resultado del Conteo Físico: </span>
                    <span className="font-mono font-black text-slate-800">
                      Bs {Number(session.saldo_real_bs).toFixed(2)} declarados en gaveta
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-purple-900">Diferencia: </span>
                    <span
                      className={`font-black font-mono ${
                        (session.diferencia_bs || 0) === 0
                          ? "text-emerald-700"
                          : (session.diferencia_bs || 0) > 0
                          ? "text-blue-700"
                          : "text-rose-700"
                      }`}
                    >
                      {(session.diferencia_bs || 0) === 0
                        ? "✓ CUADRADO EXACTO (Bs 0.00)"
                        : (session.diferencia_bs || 0) > 0
                        ? `+ Bs ${(session.diferencia_bs || 0).toFixed(2)} (SOBRANTE)`
                        : `- Bs ${Math.abs(session.diferencia_bs || 0).toFixed(2)} (FALTANTE)`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. DETALLE DE MOVIMIENTOS CRONOLÓGICOS */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#3C1C6C] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#A57CFA]" /> Detalle Cronológico de Transacciones ({movimientos.length})
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Ingresos en efectivo, transferencias QR y vales de egreso
                </span>
              </h2>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-200">
                      <th className="py-2 px-3">Hora</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3">Concepto / Detalle</th>
                      <th className="py-2 px-3">Método</th>
                      <th className="py-2 px-3 text-right">Monto</th>
                      <th className="py-2 px-3">Comprobante</th>
                      <th className="py-2 px-3">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movimientos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                          No se registraron movimientos en esta sesión de caja.
                        </td>
                      </tr>
                    ) : (
                      movimientos.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                            {formatBoliviaTime(m.created_at)}
                          </td>
                          <td className="py-2 px-3">
                            {m.tipo === "ingreso" ? (
                              <span className="font-bold text-emerald-700">Ingreso</span>
                            ) : (
                              <span className="font-bold text-rose-700">Egreso</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800 max-w-[200px] truncate">
                            {m.concepto}
                            {m.numero_requerimiento && (
                              <span className="ml-1 text-[10px] text-purple-700 font-mono font-bold">
                                (#{m.numero_requerimiento})
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 capitalize text-slate-600">
                            {m.metodo_pago === "qr_transferencia"
                              ? "QR Bancario"
                              : m.metodo_pago === "efectivo"
                              ? "Efectivo"
                              : m.metodo_pago}
                          </td>
                          <td className="py-2 px-3 text-right font-black font-mono whitespace-nowrap">
                            {m.tipo === "egreso" ? "-" : "+"} {m.moneda === "USD" ? `$ ${Number(m.monto).toFixed(2)} USD` : `Bs ${Number(m.monto).toFixed(2)}`}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-500 text-[10px]">
                            {m.numero_recibo || (m.comprobante_url ? "Verificado" : "—")}
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[10px] truncate max-w-[100px]">
                            {m.registrado_por_nombre || "Cajero"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. CERTIFICACIÓN LEGAL & FIRMAS FORMALES */}
            <div className="pt-6 border-t-2 border-slate-900 space-y-6">
              <p className="text-[10px] text-slate-500 text-justify leading-normal italic">
                El presente documento certifica la exactitud de los ingresos y egresos registrados durante el turno. Los fondos físicos y comprobantes adjuntos fueron cotejados bajo las normas administrativas de Guísela Laboratorio Dental. Cualquier discrepancia o alteración no autorizada está sujeta a auditoría forense.
              </p>

              <div className="grid grid-cols-2 gap-10 pt-4 text-center">
                <div className="space-y-1">
                  <div className="border-b border-slate-800 w-3/4 mx-auto pb-8" />
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                    {session?.abierta_por_nombre || cajeroNombre}
                  </p>
                  <p className="text-[9px] text-slate-500 uppercase font-semibold">
                    Responsable de Caja / Operador de Turno
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="border-b border-slate-800 w-3/4 mx-auto pb-8" />
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                    {session?.cerrada_por_nombre || "Administración Central"}
                  </p>
                  <p className="text-[9px] text-slate-500 uppercase font-semibold">
                    Revisión Contable & Auditoría Laboratorio Guísela
                  </p>
                </div>
              </div>

              {/* Pie con Copyright y Hash de Trazabilidad */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                <span>© {new Date().getFullYear()} Guísela Laboratorio Dental · Sistema ERP Pro</span>
                <span>ID-SESIÓN: {session?.id ? session.id.slice(0, 16) : "SIN-ID"} · BO-GMT-4</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
