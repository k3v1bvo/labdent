"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ReviewOrder = {
  id: string;
  paciente_nombre: string;
  doctor_nombre?: string | null;
  numero_requerimiento?: string | null;
  estado: string;

  total?: number | null;
  anticipo?: number | null;
  numero_caja?: string | null;
  observaciones?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: ReviewOrder | null;
  onUpdated?: () => void; // para refrescar tabla
};

export function ReviewOrderDialog({ open, onOpenChange, order, onUpdated }: Props) {
  const [successAnim, setSuccessAnim] = useState(false);
  const [saving, setSaving] = useState(false);

  const [total, setTotal] = useState("");
  const [anticipo, setAnticipo] = useState("");
  const [caja, setCaja] = useState("00");
  const [obs, setObs] = useState("");

  const [motivoRechazo, setMotivoRechazo] = useState("Rechazado por falta de pago inicial");

  // Cada vez que se abre con otra orden, precargamos
  useMemo(() => {
    if (!open || !order) return;
    setSuccessAnim(false);
    setSaving(false);
    setTotal(order.total != null ? String(order.total) : "");
    setAnticipo(order.anticipo != null ? String(order.anticipo) : "");
    setCaja(order.numero_caja ?? "00");
    setObs(order.observaciones ?? "");
    setMotivoRechazo("Rechazado por falta de pago inicial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id]);

  const totalNum = useMemo(() => Number(total || 0), [total]);
  const anticipoNum = useMemo(() => Number(anticipo || 0), [anticipo]);
  const saldo = useMemo(() => totalNum - anticipoNum, [totalNum, anticipoNum]);

  function validateForApprove() {
    if (!order) return false;

    if (!total.trim()) {
      toast.error("Debes ingresar el TOTAL para aprobar.");
      return false;
    }
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      toast.error("El TOTAL debe ser un número mayor que 0.");
      return false;
    }
    if (anticipo.trim() && (!Number.isFinite(anticipoNum) || anticipoNum < 0)) {
      toast.error("Anticipo inválido.");
      return false;
    }
    if (anticipoNum > totalNum) {
      toast.error("El anticipo no puede ser mayor al total.");
      return false;
    }
    return true;
  }

  async function getCurrentUserId(): Promise<string | null> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id;
  }

  async function approve() {
    if (!order) return;
    if (!validateForApprove()) return;

    setSaving(true);

    const reviewerId = await getCurrentUserId();
    if (!reviewerId) {
      setSaving(false);
      toast.error("Sesión inválida. Vuelve a iniciar sesión.");
      return;
    }

    const { error } = await supabase
      .from("pedidos")
      .update({
        total: totalNum,
        anticipo: anticipo.trim() ? anticipoNum : 0,
        numero_caja: (caja?.trim() || "00").slice(0, 2),
        observaciones: obs,
        estado: "pendiente", // ✅ pasa a producción
        motivo_rechazo: null,
        revisado_por: reviewerId,
        revisado_en: new Date().toISOString(),
      })
      .eq("id", order.id);

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error(`Error aprobando: ${error.message}`);
      return;
    }

    toast.success("✅ Aprobado. Enviado a producción.");
    setSuccessAnim(true);
    onUpdated?.();

    setTimeout(() => {
      setSuccessAnim(false);
      onOpenChange(false);
    }, 1200);
  }

  async function reject() {
    if (!order) return;

    const motivo = motivoRechazo.trim();
    if (!motivo) {
      toast.error("Ingresa el motivo de rechazo.");
      return;
    }

    setSaving(true);

    const reviewerId = await getCurrentUserId();
    if (!reviewerId) {
      setSaving(false);
      toast.error("Sesión inválida. Vuelve a iniciar sesión.");
      return;
    }

    const { error } = await supabase
      .from("pedidos")
      .update({
        estado: "rechazado",
        motivo_rechazo: motivo,
        revisado_por: reviewerId,
        revisado_en: new Date().toISOString(),
      })
      .eq("id", order.id);

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error(`Error rechazando: ${error.message}`);
      return;
    }

    toast.success("❌ Pedido rechazado");
    onUpdated?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <AnimatePresence>
          {!successAnim ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#3C1C6C] font-bold text-lg sm:text-xl">
                  Revisar / Completar Pedido
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Paciente</label>
                    <Input value={order?.paciente_nombre || ""} readOnly className="bg-slate-50 border-slate-200 text-slate-800" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Doctor</label>
                    <Input value={order?.doctor_nombre || ""} readOnly className="bg-slate-50 border-slate-200 text-slate-800" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">N° Requerimiento</label>
                    <Input value={order?.numero_requerimiento || ""} readOnly className="bg-slate-50 border-slate-200 text-slate-800" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Estado</label>
                    <Input value={order?.estado || ""} readOnly className="bg-slate-50 border-slate-200 text-slate-800 capitalize" />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-bold text-[#3C1C6C] mb-3">Completar datos administrativos</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Total ($) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                        placeholder="Ej: 120.00"
                        className="rounded-xl border-slate-200 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Anticipo ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={anticipo}
                        onChange={(e) => setAnticipo(e.target.value)}
                        placeholder="Ej: 50.00"
                        className="rounded-xl border-slate-200 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Caja N°</label>
                      <Input
                        value={caja}
                        onChange={(e) => setCaja(e.target.value)}
                        placeholder="00"
                        maxLength={2}
                        className="rounded-xl border-slate-200 font-mono text-center font-bold"
                      />
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-slate-700">💰 Saldo restante:</span>
                    <span className="font-extrabold text-[#3C1C6C] text-sm sm:text-base">
                      ${Number.isFinite(saldo) ? saldo.toFixed(2) : "0.00"}
                    </span>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-semibold text-slate-600">Observaciones</label>
                    <Input
                      value={obs}
                      onChange={(e) => setObs(e.target.value)}
                      placeholder="Notas internas / correcciones..."
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-bold text-red-600 mb-2">Rechazar pedido</p>
                  <Input
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    placeholder="Ej: Rechazado por falta de pago inicial o falta de datos"
                    className="rounded-xl border-red-200 text-red-800 placeholder:text-red-300"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="w-full sm:w-auto rounded-xl border-slate-200 h-11"
                >
                  Cancelar
                </Button>

                <Button
                  variant="destructive"
                  onClick={reject}
                  disabled={saving}
                  className="w-full sm:w-auto rounded-xl h-11"
                >
                  ❌ Rechazar
                </Button>

                <Button
                  className="w-full sm:w-auto bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-11 shadow-md"
                  onClick={approve}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "✅ Aprobar & Enviar"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <motion.div
                initial={{ rotate: -90 }}
                animate={{ rotate: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-green-100 text-green-700 rounded-full p-4 mb-3"
              >
                <CheckCircle className="w-10 h-10" />
              </motion.div>
              <p className="text-green-700 font-semibold text-lg">Pedido aprobado y enviado a producción</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
