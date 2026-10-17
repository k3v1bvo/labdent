"use client";

import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  X,
  Stethoscope,
  DollarSign,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  Phone,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  QrCode,
} from "lucide-react";
import Image from "next/image";
import { formatDualCurrency, getCachedExchangeRate } from "@/lib/currency";

export interface KardexOrderItem {
  id: string;
  numero_requerimiento?: string | null;
  numero_caja?: string | null;
  fecha_ingreso?: string | null;
  paciente_nombre?: string | null;
  trabajo_realizar?: string | null;
  pieza_numero?: string | null;
  total?: number | null;
  anticipo?: number | null;
  estado?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorNombre: string;
  clinica?: string | null;
  doctorTelefono?: string | null;
  periodo?: string | null;
  orders: KardexOrderItem[];
}

export function DoctorKardexReportModal({
  open,
  onOpenChange,
  doctorNombre,
  clinica,
  doctorTelefono,
  periodo,
  orders = [],
}: Props) {
  const rate = getCachedExchangeRate();

  const totals = useMemo(() => {
    let sumTotal = 0;
    let sumAnticipo = 0;

    orders.forEach((o) => {
      sumTotal += Number(o.total || 0);
      sumAnticipo += Number(o.anticipo || 0);
    });

    const sumSaldo = Math.max(0, sumTotal - sumAnticipo);

    return {
      total: formatDualCurrency(sumTotal, rate),
      anticipo: formatDualCurrency(sumAnticipo, rate),
      saldo: formatDualCurrency(sumSaldo, rate),
      rawSaldo: sumSaldo,
      rawTotal: sumTotal,
      rawAnticipo: sumAnticipo,
      count: orders.length,
    };
  }, [orders, rate]);

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[96vh] overflow-y-auto p-0 bg-slate-100 dark:bg-slate-950 border-none shadow-2xl print:m-0 print:p-0 print:max-w-none print:max-h-none print:shadow-none print:bg-white print:overflow-visible">
        <DialogHeader className="sr-only">
          <DialogTitle>Estado de Cuenta Clínico • KARDEX</DialogTitle>
          <DialogDescription>Historial consolidado de pedidos y balance financiero de la clínica</DialogDescription>
        </DialogHeader>

        {/* Barra superior de control (Oculta al imprimir) */}
        <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-between print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#3C1C6C] dark:text-purple-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-[#6A2CB0]" />
              Estado de Cuenta Clínico • KARDEX
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold">
              {doctorNombre}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl gap-2 font-bold text-xs h-9 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Imprimir </span>Estado de Cuenta / PDF
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
        {/* HOJA DE REPORTE KARDEX FORMAL (A4 STANDARD)                    */}
        {/* ============================================================== */}
        <div
          id="guisela-kardex-container"
          className="p-4 sm:p-8 md:p-11 bg-white text-slate-900 relative overflow-hidden print:p-6 print:m-0 w-full max-w-[210mm] mx-auto min-h-[297mm] shadow-xl print:shadow-none border border-slate-200 print:border-none"
        >
          {/* MARCA DE AGUA CORPORATIVA ELEGANTE */}
          <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.04] print:opacity-[0.05] rotate-[-28deg] z-0">
            <div className="text-center space-y-4">
              <div className="relative w-80 h-80 mx-auto">
                <Image
                  src="/images/guisela-symbol.png"
                  alt="Watermark Kardex"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <p className="text-5xl font-black tracking-widest text-[#3C1C6C] uppercase">
                ESTADO DE CUENTA
              </p>
              <p className="text-xl font-black tracking-[0.2em] text-slate-700 uppercase">
                GUISELA LABORATORIO DENTAL • FINANZAS
              </p>
            </div>
          </div>

          {/* CONTENIDO (Z-10) */}
          <div className="relative z-10 space-y-5 text-xs sm:text-[13px] leading-relaxed">
            {/* 1. ENCABEZADO INSTITUCIONAL */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative w-16 h-16 shrink-0 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
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
                  <h1 className="text-xl sm:text-2xl font-black text-[#3C1C6C] tracking-tight uppercase leading-none">
                    GUISELA LABORATORIO DENTAL
                  </h1>
                  <p className="text-[11px] font-bold text-slate-700 tracking-wide mt-1">
                    DEPARTAMENTO DE ADMINISTRACIÓN & LIQUIDACIÓN CONTABLE
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    La Paz - Bolivia · Teléfono/WhatsApp: 7663... · Email: glb.7663@gmail.com
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-1">
                <div className="inline-block px-3.5 py-1.5 bg-[#3C1C6C] text-white rounded-lg text-center shadow-xs">
                  <p className="text-[9px] uppercase tracking-widest font-extrabold text-purple-200">
                    DOCUMENTO CONTABLE OFICIAL
                  </p>
                  <p className="text-sm font-black tracking-tight">KARDEX DE CLIENTE</p>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Fecha de Emisión: {new Date().toLocaleDateString("es-BO")}
                </p>
                <p className="text-[10px] font-mono text-purple-900 font-bold">
                  Tipo de Cambio: 1 USD = {rate.toFixed(2)} Bs
                </p>
              </div>
            </div>

            {/* 2. DATOS DEL ODONTÓLOGO Y RESUMEN GENERAL DE SALDOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-300 bg-slate-50/70">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#3C1C6C] flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>CLIENTE / CUENTA ODONTOLÓGICA:</span>
                </p>
                <p className="text-base font-extrabold text-slate-900">{doctorNombre}</p>
                {clinica && (
                  <p className="text-slate-600 text-xs">
                    <span className="font-semibold text-slate-700">Clínica / Consultorio:</span>{" "}
                    {clinica}
                  </p>
                )}
                {doctorTelefono && (
                  <p className="text-slate-600 text-xs">
                    <span className="font-semibold text-slate-700">Contacto:</span>{" "}
                    {doctorTelefono}
                  </p>
                )}
                <p className="text-[11px] text-slate-500 pt-1">
                  Total de órdenes registradas en este reporte:{" "}
                  <span className="font-bold text-slate-800">{totals.count} trabajos</span>
                </p>
              </div>

              {/* CARD DE SALDO TOTAL DEUDOR EN ROJO */}
              <div className="p-3.5 rounded-xl border-2 border-slate-900 bg-white text-right space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  ESTADO DE SALDO CONSOLIDADO:
                </p>
                <p
                  className={`text-2xl font-black tracking-tight ${
                    totals.rawSaldo > 0 ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {totals.saldo.bsFormatted}
                </p>
                <p
                  className={`text-xs font-bold ${
                    totals.rawSaldo > 0 ? "text-rose-500" : "text-emerald-600"
                  }`}
                >
                  {totals.saldo.usdFormatted} (Equivalente en Dólares)
                </p>
                {totals.rawSaldo > 0 ? (
                  <div className="pt-1 flex items-center justify-end gap-1 text-[11px] font-bold text-rose-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Saldo pendiente de liquidación</span>
                  </div>
                ) : (
                  <div className="pt-1 flex items-center justify-end gap-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Cuenta al día (Sin deudas pendientes)</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. RESUMEN FINANCIERO EN DOBLE MONEDA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-center print:grid-cols-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Facturado
                </p>
                <p className="text-sm font-black text-slate-900">{totals.total.bsFormatted}</p>
                <p className="text-[10px] text-slate-500 font-semibold">{totals.total.usdFormatted}</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-emerald-50/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Total Abonado
                </p>
                <p className="text-sm font-black text-emerald-700">{totals.anticipo.bsFormatted}</p>
                <p className="text-[10px] text-emerald-600 font-semibold">
                  {totals.anticipo.usdFormatted}
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  totals.rawSaldo > 0
                    ? "border-rose-300 bg-rose-50/60"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <p
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    totals.rawSaldo > 0 ? "text-rose-700" : "text-slate-500"
                  }`}
                >
                  Saldo Pendiente
                </p>
                <p
                  className={`text-sm font-black ${
                    totals.rawSaldo > 0 ? "text-rose-600" : "text-slate-900"
                  }`}
                >
                  {totals.saldo.bsFormatted}
                </p>
                <p
                  className={`text-[10px] font-semibold ${
                    totals.rawSaldo > 0 ? "text-rose-500" : "text-slate-500"
                  }`}
                >
                  {totals.saldo.usdFormatted}
                </p>
              </div>
            </div>

            {/* 4. TABLA DETALLADA DE TRABAJOS & MOVIMIENTOS */}
            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  DETALLE DE TRABAJOS Y MOVIMIENTOS CONTABLES:
                </p>
                <span className="text-[10px] text-slate-500 italic">
                  Precios en Bolivianos (Tipo de cambio 1 USD = {rate.toFixed(2)} Bs)
                </span>
              </div>

              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full min-w-[580px] sm:min-w-0 border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300 text-[11px]">
                    <th className="p-2 text-left border-r border-slate-300">Req #</th>
                    <th className="p-2 text-center border-r border-slate-300 w-12">Caja</th>
                    <th className="p-2 text-left border-r border-slate-300">Paciente</th>
                    <th className="p-2 text-left border-r border-slate-300">Trabajo Realizado</th>
                    <th className="p-2 text-right border-r border-slate-300">Total (Bs)</th>
                    <th className="p-2 text-right border-r border-slate-300">Abono (Bs)</th>
                    <th className="p-2 text-right">Saldo (Bs)</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, idx) => {
                    const oTotal = Number(o.total || 0);
                    const oAnticipo = Number(o.anticipo || 0);
                    const oSaldo = Math.max(0, oTotal - oAnticipo);
                    return (
                      <tr
                        key={o.id || idx}
                        className={`border-b border-slate-200 ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                        }`}
                      >
                        <td className="p-2 font-mono font-bold text-slate-800 border-r border-slate-200">
                          {o.numero_requerimiento || o.id.slice(0, 6).toUpperCase()}
                        </td>
                        <td className="p-2 text-center font-bold text-purple-950 border-r border-slate-200">
                          {o.numero_caja || "—"}
                        </td>
                        <td className="p-2 font-semibold text-slate-800 border-r border-slate-200">
                          {o.paciente_nombre || "—"}
                        </td>
                        <td className="p-2 text-slate-700 border-r border-slate-200">
                          <span className="font-semibold text-slate-900">{o.trabajo_realizar}</span>
                          {o.pieza_numero && (
                            <span className="text-[10px] text-slate-500 block">
                              Pieza(s): #{o.pieza_numero}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right font-medium border-r border-slate-200">
                          Bs {oTotal.toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-medium text-emerald-700 border-r border-slate-200">
                          Bs {oAnticipo.toFixed(2)}
                        </td>
                        <td
                          className={`p-2 text-right font-bold ${
                            oSaldo > 0 ? "text-rose-600 font-black" : "text-slate-600"
                          }`}
                        >
                          Bs {oSaldo.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-900 text-xs">
                    <td colSpan={4} className="p-2 text-right uppercase tracking-wider border-r border-slate-300">
                      TOTALES CONSOLIDADOS:
                    </td>
                    <td className="p-2 text-right border-r border-slate-300">
                      Bs {totals.rawTotal.toFixed(2)}
                    </td>
                    <td className="p-2 text-right text-emerald-700 border-r border-slate-300">
                      Bs {totals.rawAnticipo.toFixed(2)}
                    </td>
                    <td
                      className={`p-2 text-right text-sm ${
                        totals.rawSaldo > 0 ? "text-rose-600 font-black" : "text-slate-900"
                      }`}
                    >
                      Bs {totals.rawSaldo.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>

            {/* 5. DATOS DE LIQUIDACIÓN Y PAGO BANCARIO */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 text-xs print:flex-row print:items-center">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                  <span>Métodos de Pago & Cuentas Bancarias Autorizadas</span>
                </p>
                <p className="text-slate-600 text-[11px]">
                  • Banco Mercantil Santa Cruz (BMSC): Cta. Cte. N° 4010-XXXXXX (Moneda Nacional)
                </p>
                <p className="text-slate-600 text-[11px]">
                  • Banco Nacional de Bolivia (BNB): Cta. de Ahorros N° 150-XXXXXX
                </p>
                <p className="text-slate-600 text-[11px]">
                  • Pagos vía QR Simple GLB: Enviar comprobante al WhatsApp de Administración.
                </p>
              </div>

              <div className="border border-purple-200 bg-white p-2 rounded-lg text-center shrink-0 self-center sm:self-auto">
                <QrCode className="w-10 h-10 text-[#3C1C6C] mx-auto" />
                <span className="text-[9px] font-bold text-purple-900 block mt-0.5">
                  QR SIMPLE
                </span>
              </div>
            </div>

            {/* 6. FIRMAS DE CONFORMIDAD Y AUDITORÍA CONTABLE */}
            <div className="pt-6 sm:pt-8 grid grid-cols-2 gap-4 sm:gap-10 text-center text-xs">
              <div className="space-y-1">
                <div className="border-t-2 border-slate-800 w-4/5 mx-auto pt-1.5" />
                <p className="font-black text-slate-900 uppercase tracking-tight">
                  Guisela Laboratorio Dental
                </p>
                <p className="text-[10px] text-slate-500">
                  Departamento de Administración & Cobranzas
                </p>
              </div>

              <div className="space-y-1">
                <div className="border-t-2 border-slate-800 w-4/5 mx-auto pt-1.5" />
                <p className="font-black text-slate-900 uppercase tracking-tight">
                  Conformidad del Odontólogo
                </p>
                <p className="text-[10px] text-slate-500">
                  Firma / Sello de Revisión de Estado de Cuenta
                </p>
              </div>
            </div>

            {/* Pie de página */}
            <div className="pt-4 border-t border-slate-200 text-center text-[9px] text-slate-400 flex items-center justify-between">
              <span>
                Extracto Contable Oficial · Guisela Laboratorio Dental · La Paz, Bolivia
              </span>
              <span>Impreso el {new Date().toLocaleString("es-BO")}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
