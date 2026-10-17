"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  CajaSesion,
  CajaMovimiento,
  getActiveCajaSession,
  openCajaSession,
  addCajaMovimiento,
  closeCajaSession,
} from "@/lib/cashService";
import { getCachedExchangeRate, formatDualCurrency } from "@/lib/currency";
import { toBoliviaYMD, formatBoliviaDate, formatBoliviaTime } from "@/lib/dateUtils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Coins,
  Banknote,
  QrCode,
  TrendingDown,
  TrendingUp,
  Receipt,
  Lock,
  Unlock,
  Printer,
  RefreshCcw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface CashRegisterViewProps {
  role: "admin" | "secretaria";
}

export function CashRegisterView({ role }: CashRegisterViewProps) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<CajaSesion | null>(null);
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
  const [userProfile, setUserProfile] = useState<{ id: string; nombre: string } | null>(null);

  // Modales
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [montoAperturaBs, setMontoAperturaBs] = useState("200");
  const [montoAperturaUsd, setMontoAperturaUsd] = useState("0");

  const [gastoModalOpen, setGastoModalOpen] = useState(false);
  const [gastoConcepto, setGastoConcepto] = useState("");
  const [gastoMonto, setGastoMonto] = useState("");
  const [gastoMoneda, setGastoMoneda] = useState<"BOB" | "USD">("BOB");
  const [gastoRecibo, setGastoRecibo] = useState("");

  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [conteoBs, setConteoBs] = useState("");
  const [conteoUsd, setConteoUsd] = useState("");
  const [cierreObservaciones, setCierreObservaciones] = useState("");

  const rate = getCachedExchangeRate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("nombre")
          .eq("id", user.id)
          .maybeSingle();

        setUserProfile({
          id: user.id,
          nombre: prof?.nombre || "Personal de Turno",
        });
      }

      const res = await getActiveCajaSession();
      setSession(res.session);
      setMovimientos(res.movimientos);
    } catch (e) {
      console.error("Error cargando caja:", e);
    } finally {
      setLoading(false);
    }
  }

  // Cálculos en vivo del arqueo
  const resumen = useMemo(() => {
    const baseBs = session?.monto_apertura_bs || 0;
    const baseUsd = session?.monto_apertura_usd || 0;

    let efectivoCobradoBs = 0;
    let efectivoCobradoUsd = 0;
    let qrCobradoBs = 0;
    let gastosBs = 0;
    let gastosUsd = 0;

    for (const m of movimientos) {
      if (m.tipo === "ingreso") {
        if (m.metodo_pago === "efectivo") {
          if (m.moneda === "USD") efectivoCobradoUsd += m.monto;
          else efectivoCobradoBs += m.monto;
        } else if (m.metodo_pago === "qr_transferencia") {
          qrCobradoBs += m.monto_bs_equivalente;
        }
      } else if (m.tipo === "egreso") {
        if (m.moneda === "USD") gastosUsd += m.monto;
        else gastosBs += m.monto;
      }
    }

    // Saldo teórico que debe haber en la gaveta física
    const totalFisicoEsperadoBs = baseBs + efectivoCobradoBs - gastosBs;
    const totalFisicoEsperadoUsd = baseUsd + efectivoCobradoUsd - gastosUsd;
    const saldoTeoricoTotalBs = totalFisicoEsperadoBs + totalFisicoEsperadoUsd * rate;

    return {
      baseBs,
      baseUsd,
      efectivoCobradoBs,
      efectivoCobradoUsd,
      qrCobradoBs,
      gastosBs,
      gastosUsd,
      totalFisicoEsperadoBs,
      totalFisicoEsperadoUsd,
      saldoTeoricoBs: saldoTeoricoTotalBs,
      totalEfectivoBs: efectivoCobradoBs,
      totalEfectivoUsd: efectivoCobradoUsd,
      totalQrBs: qrCobradoBs,
      totalGastosBs: gastosBs + gastosUsd * rate,
    };
  }, [session, movimientos, rate]);

  async function handleOpenCaja() {
    const baseBs = parseFloat(montoAperturaBs) || 0;
    const baseUsd = parseFloat(montoAperturaUsd) || 0;

    if (baseBs < 0 || baseUsd < 0) {
      toast.error("El monto de apertura no puede ser negativo");
      return;
    }

    try {
      const newSess = await openCajaSession({
        montoAperturaBs: baseBs,
        montoAperturaUsd: baseUsd,
        userId: userProfile?.id,
        userName: userProfile?.nombre,
      });

      setSession(newSess);
      setMovimientos([]);
      setOpenModalOpen(false);
      toast.success("✅ Caja del día abierta con éxito");
    } catch (err: any) {
      toast.error(err.message || "Error al abrir caja");
    }
  }

  async function handleAddGasto() {
    if (!session) return;
    const monto = parseFloat(gastoMonto) || 0;
    if (monto <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    if (!gastoConcepto.trim()) {
      toast.error("Especifica el concepto o motivo del gasto");
      return;
    }

    try {
      const mov = await addCajaMovimiento({
        sesionId: session.id,
        tipo: "egreso",
        origen: "gasto_caja_chica",
        metodoPago: "efectivo",
        moneda: gastoMoneda,
        monto,
        concepto: gastoConcepto.trim(),
        numeroRecibo: gastoRecibo.trim() || undefined,
        userId: userProfile?.id,
        userName: userProfile?.nombre,
      });

      setMovimientos((prev) => [mov, ...prev]);
      setGastoModalOpen(false);
      setGastoConcepto("");
      setGastoMonto("");
      setGastoRecibo("");
      toast.success("✅ Gasto de caja chica registrado");
    } catch (e: any) {
      toast.error(e.message || "Error al registrar gasto");
    }
  }

  async function handleCloseCaja() {
    if (!session) return;
    const realBs = parseFloat(conteoBs) || 0;
    const realUsd = parseFloat(conteoUsd) || 0;

    try {
      await closeCajaSession({
        sessionId: session.id,
        efectivoRealBs: realBs,
        efectivoRealUsd: realUsd,
        observaciones: cierreObservaciones,
        userId: userProfile?.id,
        userName: userProfile?.nombre,
        resumen,
      });

      setCloseModalOpen(false);
      setSession(null);
      toast.success("🔒 Caja diaria cerrada y arqueo archivado");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Error al cerrar caja");
    }
  }

  function handlePrintArqueo() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <RefreshCcw className="w-8 h-8 text-[#3C1C6C] animate-spin" />
        <p className="text-xs text-slate-500 font-bold">Cargando estado de caja diaria...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Encabezado y Estado de Caja */}
      <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-[#3C1C6C] via-[#4D2088] to-[#1C0B33] p-6 sm:p-8 text-white shadow-xl shadow-purple-950/15 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                session
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                  : "bg-rose-500/20 text-rose-300 border-rose-400/30"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  session ? "bg-emerald-400 animate-ping" : "bg-rose-400"
                }`}
              />
              {session ? "CAJA ABIERTA (OPERACIONES EN CURSO)" : "CAJA CERRADA"}
            </span>
            <span className="text-xs text-purple-200/70">
              · {formatBoliviaDate(new Date())} (Cochabamba GMT-4)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Caja Diaria, Caja Chica & Arqueo
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl">
            Control de ingresos en efectivo (Bs / USD), pagos QR bancarios con comprobante, y gastos menores de taller.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {session ? (
            <>
              <Button
                onClick={() => setGastoModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs h-10 px-4 gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" /> Gasto de Caja Chica
              </Button>

              <Button
                onClick={handlePrintArqueo}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-bold h-10 px-3.5 gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimir Arqueo
              </Button>

              <Button
                onClick={() => setCloseModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs h-10 px-4 gap-1.5 shadow-md"
              >
                <Lock className="w-4 h-4" /> Cerrar Caja Diaria
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setOpenModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-sm h-11 px-6 gap-2 shadow-lg shadow-emerald-950/20"
            >
              <Unlock className="w-4 h-4" /> Abrir Caja del Día
            </Button>
          )}
        </div>
      </div>

      {/* Si no hay caja abierta */}
      {!session ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#3C1C6C] flex items-center justify-center mx-auto shadow-inner">
            <Coins className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800">
              No hay una sesión de caja abierta hoy
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Abre la caja para iniciar la jornada con el fondo fijo sugerido de <strong>Bs 200.00</strong> para dar cambio y registrar cobros y gastos.
            </p>
          </div>
          <Button
            onClick={() => setOpenModalOpen(true)}
            className="bg-[#3C1C6C] hover:bg-[#2C1550] text-white font-bold rounded-xl text-xs px-5 h-10 gap-2"
          >
            <Unlock className="w-4 h-4" /> Iniciar Apertura con Bs 200
          </Button>
        </div>
      ) : (
        <>
          {/* Tarjetas de Métricas de Arqueo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Fondo de Apertura */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Fondo de Apertura
              </span>
              <p className="text-xl font-black text-slate-800">
                Bs {resumen.baseBs.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400">
                Base fija de inicio en gaveta
              </p>
            </div>

            {/* 2. Efectivo Recaudado */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" /> Efectivo en Mano
              </span>
              <p className="text-xl font-black text-emerald-900">
                Bs {resumen.efectivoCobradoBs.toFixed(2)}
              </p>
              {resumen.efectivoCobradoUsd > 0 && (
                <p className="text-xs font-bold text-emerald-700">
                  + $ {resumen.efectivoCobradoUsd.toFixed(2)} USD
                </p>
              )}
            </div>

            {/* 3. Pagos QR / Bancos */}
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3C1C6C] flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" /> Pagos QR / Bancos
              </span>
              <p className="text-xl font-black text-[#3C1C6C]">
                Bs {resumen.qrCobradoBs.toFixed(2)}
              </p>
              <p className="text-[10px] text-purple-700/80">
                Conciliados con comprobante
              </p>
            </div>

            {/* 4. Gastos Caja Chica */}
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Egresos Caja Chica
              </span>
              <p className="text-xl font-black text-rose-900">
                Bs -{resumen.gastosBs.toFixed(2)}
              </p>
              <p className="text-[10px] text-rose-700/80">
                Compras menores con recibo
              </p>
            </div>

            {/* 5. Saldo Teórico Gaveta */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-300 shadow-xs space-y-1 ring-2 ring-amber-500/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" /> Total Físico Gaveta
              </span>
              <p className="text-xl font-black text-amber-950">
                Bs {resumen.totalFisicoEsperadoBs.toFixed(2)}
              </p>
              {resumen.totalFisicoEsperadoUsd > 0 && (
                <p className="text-xs font-bold text-amber-800">
                  + $ {resumen.totalFisicoEsperadoUsd.toFixed(2)} USD
                </p>
              )}
            </div>
          </div>

          {/* Tabla de Movimientos de Caja */}
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#3C1C6C]" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                  Movimientos Registrados en el Turno ({movimientos.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadData}
                className="text-xs text-slate-500 hover:text-slate-800 h-8"
              >
                <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Refrescar
              </Button>
            </div>

            {movimientos.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aún no hay movimientos registrados hoy. Aparecerán aquí al cobrar pedidos o registrar gastos menores.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Hora</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Concepto / Detalle</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                      <th className="py-3 px-4">Comprobante</th>
                      <th className="py-3 px-4">Registrado por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {formatBoliviaTime(m.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          {m.tipo === "ingreso" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-extrabold text-[10px] bg-emerald-100 text-emerald-800">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Ingreso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-extrabold text-[10px] bg-rose-100 text-rose-800">
                              <ArrowUpRight className="w-3 h-3 text-rose-600" /> Gasto Caja Chica
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                          {m.concepto}
                          {m.numero_recibo && (
                            <span className="ml-1 text-[11px] text-slate-400 font-mono">
                              (Recibo: #{m.numero_recibo})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {m.metodo_pago === "efectivo" ? (
                            <span className="font-bold text-emerald-700 flex items-center gap-1">
                              <Banknote className="w-3.5 h-3.5" /> Efectivo
                            </span>
                          ) : (
                            <span className="font-bold text-purple-700 flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5" /> QR / Transf.
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-black ${
                            m.tipo === "ingreso" ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {m.tipo === "ingreso" ? "+" : "-"} {m.moneda === "USD" ? "$" : "Bs"}{" "}
                          {m.monto.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          {m.comprobante_url ? (
                            <a
                              href={m.comprobante_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-600 hover:text-purple-800 underline font-bold flex items-center gap-1"
                            >
                              Ver Foto <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 truncate max-w-[120px]">
                          {m.registrado_por_nombre || "Personal"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Apertura de Caja */}
      <Dialog open={openModalOpen} onOpenChange={setOpenModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-[#3C1C6C] font-black text-lg flex items-center gap-2">
              <Unlock className="w-5 h-5 text-[#3C1C6C]" />
              Apertura de Caja Diaria
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              Ingresa el monto de fondo fijo en efectivo con el que se inicia la caja hoy (base estándar sugerida: <strong>Bs 200.00</strong>).
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Fondo Base en Bolivianos (Bs):
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={montoAperturaBs}
                onChange={(e) => setMontoAperturaBs(e.target.value)}
                placeholder="200.00"
                className="font-black text-sm rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Fondo Base en Dólares ($ USD - Opcional):
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={montoAperturaUsd}
                onChange={(e) => setMontoAperturaUsd(e.target.value)}
                placeholder="0.00"
                className="font-black text-sm rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenModalOpen(false)}
              className="rounded-xl border-slate-200"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleOpenCaja}
              className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white font-bold rounded-xl"
            >
              Confirmar Apertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar Gasto de Caja Chica */}
      <Dialog open={gastoModalOpen} onOpenChange={setGastoModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-rose-700 font-black text-lg flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-600" />
              Registrar Gasto de Caja Chica
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Concepto / Motivo del Gasto:
              </label>
              <Input
                value={gastoConcepto}
                onChange={(e) => setGastoConcepto(e.target.value)}
                placeholder="Ej. Compra de yeso piedra, gas para mechero, motoenvío..."
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Monto:</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={gastoMonto}
                  onChange={(e) => setGastoMonto(e.target.value)}
                  placeholder="0.00"
                  className="font-black text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Moneda:</label>
                <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setGastoMoneda("BOB")}
                    className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                      gastoMoneda === "BOB"
                        ? "bg-[#3C1C6C] text-white shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    Bs
                  </button>
                  <button
                    type="button"
                    onClick={() => setGastoMoneda("USD")}
                    className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                      gastoMoneda === "USD"
                        ? "bg-[#3C1C6C] text-white shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    USD $
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                N° de Recibo o Factura (Opcional):
              </label>
              <Input
                value={gastoRecibo}
                onChange={(e) => setGastoRecibo(e.target.value)}
                placeholder="Ej. Factura #8491 / Recibo #23"
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setGastoModalOpen(false)}
              className="rounded-xl border-slate-200"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddGasto}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
            >
              Guardar Gasto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cierre Diario & Arqueo */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-[#3C1C6C] font-black text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#3C1C6C]" />
              Arqueo & Cierre de Caja Diaria
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Comparativa */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="font-black text-slate-800 text-sm">Resumen del Turno:</p>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <span>(+) Fondo Inicial:</span>
                <span className="font-bold text-right">Bs {resumen.baseBs.toFixed(2)}</span>
                <span>(+) Efectivo Cobrado:</span>
                <span className="font-bold text-right text-emerald-700">
                  Bs {resumen.efectivoCobradoBs.toFixed(2)}
                </span>
                <span>(-) Gastos Caja Chica:</span>
                <span className="font-bold text-right text-rose-700">
                  Bs -{resumen.gastosBs.toFixed(2)}
                </span>
                <span className="font-black text-slate-800 pt-1 border-t">
                  (=) Saldo Físico Esperado:
                </span>
                <span className="font-black text-right text-slate-900 pt-1 border-t text-sm">
                  Bs {resumen.totalFisicoEsperadoBs.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Inputs de conteo real */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Efectivo Físico Contado (Bs):
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={conteoBs}
                  onChange={(e) => setConteoBs(e.target.value)}
                  placeholder={resumen.totalFisicoEsperadoBs.toFixed(2)}
                  className="font-black text-sm rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Efectivo Contado (USD $):
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={conteoUsd}
                  onChange={(e) => setConteoUsd(e.target.value)}
                  placeholder={resumen.totalFisicoEsperadoUsd.toFixed(2)}
                  className="font-black text-sm rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Observaciones de Cierre (Opcional):
              </label>
              <Textarea
                value={cierreObservaciones}
                onChange={(e) => setCierreObservaciones(e.target.value)}
                placeholder="Anotaciones sobre sobrantes, faltantes o billetes apartados..."
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setCloseModalOpen(false)}
              className="rounded-xl border-slate-200"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCloseCaja}
              className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white font-bold rounded-xl"
            >
              Finalizar y Cerrar Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
