"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile } from "@/lib/getUserProfile";
import { logAudit } from "@/lib/auditLogger";
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
import { CheckCircle, Lock, ShieldAlert, AlertTriangle } from "lucide-react";
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
  const [userRole, setUserRole] = useState<string | null>(null);

  const [total, setTotal] = useState("");
  const [anticipo, setAnticipo] = useState("");
  const [caja, setCaja] = useState("00");
  const [obs, setObs] = useState("");
  const [motivoAdmin, setMotivoAdmin] = useState("");

  const [motivoRechazo, setMotivoRechazo] = useState("Rechazado por falta de pago inicial");

  // Cargar rol del usuario al abrir
  useEffect(() => {
    async function loadRole() {
      const { profile } = await getUserProfile();
      if (profile?.rol) {
        setUserRole(profile.rol);
      }
    }
    if (open) {
      loadRole();
    }
  }, [open]);

  // Cada vez que se abre con otra orden, precargamos
  useEffect(() => {
    if (!open || !order) return;
    setSuccessAnim(false);
    setSaving(false);
    setTotal(order.total != null ? String(order.total) : "");
    setAnticipo(order.anticipo != null ? String(order.anticipo) : "");
    setCaja(order.numero_caja ?? "00");
    setObs(order.observaciones ?? "");
    setMotivoAdmin("");
    setMotivoRechazo("Rechazado por falta de pago inicial");
  }, [open, order]);

  const totalNum = useMemo(() => Number(total || 0), [total]);
  const anticipoNum = useMemo(() => Number(anticipo || 0), [anticipo]);
  const saldo = useMemo(() => totalNum - anticipoNum, [totalNum, anticipoNum]);

  // Determinamos si la orden ya está aprobada
  const isPendingReview = order?.estado === "pendiente_revision";
  const isAdmin = userRole === "admin";
  const isReadOnly = !isPendingReview && !isAdmin;

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

    if (isReadOnly) {
      toast.error("Acción denegada: Los montos están bloqueados contra edición.");
      return;
    }

    if (!validateForApprove()) return;

    setSaving(true);

    const reviewerId = await getCurrentUserId();
    if (!reviewerId) {
      setSaving(false);
      toast.error("Sesión inválida. Vuelve a iniciar sesión.");
      return;
    }

    const anteriorTotal = order.total;
    const anteriorAnticipo = order.anticipo;

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

    // REGISTRO DE AUDITORÍA INMUTABLE
    await logAudit({
      pedidoId: order.id,
      accion: "APROBACION",
      campoModificado: "estado, total, anticipo, caja",
      valorAnterior: JSON.stringify({ estado: order.estado, total: anteriorTotal, anticipo: anteriorAnticipo }),
      valorNuevo: JSON.stringify({ estado: "pendiente", total: totalNum, anticipo: anticipoNum, caja: (caja?.trim() || "00").slice(0, 2) }),
      motivo: isPendingReview ? "Aprobación inicial de requerimiento clínico" : "Modificación aprobada por administrador",
    });

    toast.success("✅ Aprobado. Enviado a producción y registrado en auditoría.");
    setSuccessAnim(true);
    onUpdated?.();

    setTimeout(() => {
      setSuccessAnim(false);
      onOpenChange(false);
    }, 1200);
  }

  async function handleAdminUpdate() {
    if (!order) return;
    if (!isAdmin) return;

    if (!motivoAdmin.trim()) {
      toast.error("⚠️ Como Administrador debes ingresar el MOTIVO del cambio para la auditoría.");
      return;
    }

    if (!validateForApprove()) return;

    setSaving(true);
    const reviewerId = await getCurrentUserId();

    const { error } = await supabase
      .from("pedidos")
      .update({
        total: totalNum,
        anticipo: anticipo.trim() ? anticipoNum : 0,
        numero_caja: (caja?.trim() || "00").slice(0, 2),
        observaciones: obs,
      })
      .eq("id", order.id);

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error(`Error actualizando: ${error.message}`);
      return;
    }

    // Log de auditoría para modificación de Admin
    await logAudit({
      pedidoId: order.id,
      accion: "MODIFICACION_MONTO",
      campoModificado: "total, anticipo, caja, obs",
      valorAnterior: JSON.stringify({ total: order.total, anticipo: order.anticipo, caja: order.numero_caja }),
      valorNuevo: JSON.stringify({ total: totalNum, anticipo: anticipoNum, caja }),
      motivo: motivoAdmin.trim(),
    });

    toast.success("🛡️ Modificación administrativa guardada en auditoría.");
    onUpdated?.();
    onOpenChange(false);
  }

  async function reject() {
    if (!order) return;

    if (isReadOnly) {
      toast.error("Acción denegada: Este pedido ya no puede ser rechazado.");
      return;
    }

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

    // REGISTRO DE AUDITORÍA INMUTABLE
    await logAudit({
      pedidoId: order.id,
      accion: "RECHAZO",
      campoModificado: "estado, motivo_rechazo",
      valorAnterior: order.estado,
      valorNuevo: "rechazado",
      motivo: motivo,
    });

    toast.success("❌ Pedido rechazado y auditado");
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
                <DialogTitle className="text-[#3C1C6C] font-bold text-lg sm:text-xl flex items-center justify-between">
                  <span>{isReadOnly ? "Detalle de Pedido (Protegido)" : isPendingReview ? "Revisar / Completar Pedido" : "Ajuste Administrativo de Pedido"}</span>
                  {isReadOnly && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      <Lock className="w-3.5 h-3.5" /> Bloqueado
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              {/* AVISO DE CANDADO PARA SECRETARIA SI YA FUE APROBADO */}
              {isReadOnly && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Montos y Datos Clínicos Bloqueados</p>
                    <p className="mt-0.5 text-amber-800/90 leading-relaxed">
                      Este pedido ya fue aprobado y está en producción. Para evitar alteraciones no autorizadas o fraudes, la secretaria solo tiene permisos de lectura. Cualquier ajuste de precio debe ser autorizado por el Administrador.
                    </p>
                  </div>
                </div>
              )}

              {/* AVISO PARA ADMINISTRADOR SI EDITA UNA ORDEN YA EN CURSO */}
              {!isPendingReview && isAdmin && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-3.5 text-xs text-purple-900 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-[#3C1C6C] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Modo Administrador — Registro de Auditoría</p>
                    <p className="mt-0.5 text-purple-800/90 leading-relaxed">
                      Como administrador puedes corregir montos o datos. Cualquier cambio quedará firmado a tu nombre en la tabla inmutable de auditoría.
                    </p>
                  </div>
                </div>
              )}

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
                    <Input value={order?.estado || ""} readOnly className="bg-slate-50 border-slate-200 text-slate-800 capitalize font-medium" />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-bold text-[#3C1C6C] mb-3 flex items-center justify-between">
                    <span>Datos administrativos & finanzas</span>
                    {isReadOnly && <span className="text-[11px] font-normal text-slate-400">Solo lectura</span>}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Total (Bs) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isReadOnly}
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                        placeholder="Ej: 120.00"
                        className={`rounded-xl border-slate-200 font-semibold ${isReadOnly ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Anticipo (Bs)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isReadOnly}
                        value={anticipo}
                        onChange={(e) => setAnticipo(e.target.value)}
                        placeholder="Ej: 50.00"
                        className={`rounded-xl border-slate-200 font-semibold ${isReadOnly ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Caja N°</label>
                      <Input
                        value={caja}
                        disabled={isReadOnly}
                        onChange={(e) => setCaja(e.target.value)}
                        placeholder="00"
                        maxLength={2}
                        className={`rounded-xl border-slate-200 font-mono text-center font-bold ${isReadOnly ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
                      />
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-slate-700">💰 Saldo restante:</span>
                    <span className="font-extrabold text-[#3C1C6C] text-sm sm:text-base">
                      Bs {Number.isFinite(saldo) ? saldo.toFixed(2) : "0.00"}
                    </span>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-semibold text-slate-600">Observaciones</label>
                    <Input
                      value={obs}
                      disabled={isReadOnly}
                      onChange={(e) => setObs(e.target.value)}
                      placeholder="Notas internas / correcciones..."
                      className={`rounded-xl border-slate-200 ${isReadOnly ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
                    />
                  </div>

                  {/* CAMPO DE JUSTIFICACIÓN SI EL ADMIN ESTÁ MODIFICANDO UNA ORDEN YA EN CURSO */}
                  {!isPendingReview && isAdmin && (
                    <div className="mt-3 pt-3 border-t border-purple-100">
                      <label className="text-xs font-bold text-[#3C1C6C] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Motivo del Ajuste de Precio / Datos (Obligatorio para Auditoría):
                      </label>
                      <Input
                        value={motivoAdmin}
                        onChange={(e) => setMotivoAdmin(e.target.value)}
                        placeholder="Ej: Corrección autorizada por el Dr. Pérez / Ajuste de pieza extra"
                        className="rounded-xl border-purple-200 mt-1 bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* OPCIÓN DE RECHAZO SOLO SI ESTÁ PENDIENTE DE REVISIÓN */}
                {isPendingReview && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-sm font-bold text-red-600 mb-2">Rechazar pedido</p>
                    <Input
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      placeholder="Ej: Rechazado por falta de pago inicial o falta de datos"
                      className="rounded-xl border-red-200 text-red-800 placeholder:text-red-300"
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="w-full sm:w-auto rounded-xl border-slate-200 h-11"
                >
                  {isReadOnly ? "Cerrar" : "Cancelar"}
                </Button>

                {isPendingReview && (
                  <>
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
                  </>
                )}

                {!isPendingReview && isAdmin && (
                  <Button
                    className="w-full sm:w-auto bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-11 shadow-md"
                    onClick={handleAdminUpdate}
                    disabled={saving}
                  >
                    {saving ? "Registrando..." : "🛡️ Guardar Ajuste con Auditoría"}
                  </Button>
                )}
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
              <p className="text-green-700 font-semibold text-lg">Operación registrada en auditoría exitosamente</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
