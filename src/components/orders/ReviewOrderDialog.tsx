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
      <DialogContent className="sm:max-w-lg">
        <AnimatePresence>
          {!successAnim ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-blue-700">Revisar / Completar pedido</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-700">Paciente</label>
                    <Input value={order?.paciente_nombre || ""} readOnly className="bg-gray-100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700">Doctor</label>
                    <Input value={order?.doctor_nombre || ""} readOnly className="bg-gray-100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700">N° Requerimiento</label>
                    <Input value={order?.numero_requerimiento || ""} readOnly className="bg-gray-100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700">Estado</label>
                    <Input value={order?.estado || ""} readOnly className="bg-gray-100" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-800 mb-2">Completar datos administrativos</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-700">Total *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                        placeholder="Ej: 120.00"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-700">Anticipo</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={anticipo}
                        onChange={(e) => setAnticipo(e.target.value)}
                        placeholder="Ej: 50.00"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-700">Caja</label>
                      <Input value={caja} onChange={(e) => setCaja(e.target.value)} placeholder="00" maxLength={2} />
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mt-2">
                    💰 Saldo restante:{" "}
                    <span className="font-semibold text-green-700">
                      ${Number.isFinite(saldo) ? saldo.toFixed(2) : "0.00"}
                    </span>
                  </p>

                  <div className="mt-3">
                    <label className="text-xs text-gray-700">Observaciones</label>
                    <Input
                      value={obs}
                      onChange={(e) => setObs(e.target.value)}
                      placeholder="Notas internas / correcciones..."
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-red-700 mb-2">Rechazar pedido</p>
                  <Input
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    placeholder="Ej: Rechazado por falta de pago inicial"
                  />
                </div>
              </div>

              <DialogFooter className="mt-4 flex flex-col md:flex-row md:justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancelar
                </Button>

                <Button variant="destructive" onClick={reject} disabled={saving}>
                  ❌ Rechazar
                </Button>

                <Button className="bg-blue-700 hover:bg-blue-800 text-white" onClick={approve} disabled={saving}>
                  {saving ? "Guardando..." : "✅ Aprobar (guardar y enviar)"}
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
