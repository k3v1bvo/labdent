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
import { CheckCircle, Lock, ShieldAlert, AlertTriangle, ExternalLink, QrCode, UploadCloud, ImageIcon, Box, FileCode, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadToImgbb } from "@/lib/imgbb";

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
  const [uploadingVoucher, setUploadingVoucher] = useState(false);

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

    // 🔔 Notificaciones en vivo para el doctor y taller
    const targetCaja = (caja?.trim() || "00").slice(0, 2);
    try {
      const { data: pedInfo } = await supabase
        .from("pedidos")
        .select("creado_por, doctor_id, doctor_nombre, paciente_nombre, numero_requerimiento, trabajo_realizar")
        .eq("id", order.id)
        .single();

      if (pedInfo?.creado_por) {
        await supabase.from("notificaciones").insert({
          tipo: "doctor",
          receptor_id: pedInfo.creado_por,
          pedido_id: order.id,
          mensaje: `Tu orden #${order.numero_requerimiento || ""} (${order.paciente_nombre}) fue aprobada y pasó a producción (Caja #${targetCaja}). Total: Bs ${totalNum}.`,
          leida: false,
        });
      }

      await supabase.from("notificaciones").insert({
        tipo: "tecnico",
        pedido_id: order.id,
        mensaje: `Nueva orden #${order.numero_requerimiento || ""} (${order.paciente_nombre}) ingresó a producción (Caja #${targetCaja}).`,
        leida: false,
      });

      // Disparar correo al odontólogo en segundo plano
      fetch("/api/mailer/order-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId: order.id,
          doctorName: order.doctor_nombre || pedInfo?.doctor_nombre,
          pacienteNombre: order.paciente_nombre,
          numeroRequerimiento: order.numero_requerimiento,
          numeroCaja: targetCaja,
          estado: "en_proceso",
          trabajoRealizar: pedInfo?.trabajo_realizar,
        }),
      }).catch((e) => console.warn("Aviso email aprobacion:", e));
    } catch (notifErr) {
      console.warn("No se pudo insertar notificación:", notifErr);
    }

    toast.success("✅ Aprobado. Enviado a producción y notificado al doctor.");
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

    // 🔔 Notificación in-app y correo al doctor
    try {
      const { data: pedInfo } = await supabase
        .from("pedidos")
        .select("creado_por, doctor_nombre, paciente_nombre, numero_requerimiento")
        .eq("id", order.id)
        .single();

      if (pedInfo?.creado_por) {
        await supabase.from("notificaciones").insert({
          tipo: "doctor",
          receptor_id: pedInfo.creado_por,
          pedido_id: order.id,
          mensaje: `Tu pedido #${order.numero_requerimiento || ""} (${order.paciente_nombre}) fue observado o rechazado: ${motivo}`,
          leida: false,
        });
      }

      fetch("/api/mailer/order-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId: order.id,
          doctorName: order.doctor_nombre || pedInfo?.doctor_nombre,
          pacienteNombre: order.paciente_nombre,
          numeroRequerimiento: order.numero_requerimiento,
          estado: "rechazado",
          trabajoRealizar: `Observación de Secretaría: ${motivo}`,
        }),
      }).catch((e) => console.warn("Aviso email rechazo:", e));
    } catch (notifErr) {
      console.warn("Aviso notificacion rechazo:", notifErr);
    }

    toast.success("❌ Pedido observado y notificado al doctor.");
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

                  {/* 📸 VISOR & SUBIDA DE COMPROBANTE QR / ANTICIPO (ImgBB) */}
                  {(() => {
                    const qrMatch = obs.match(/\[📸 COMPROBANTE QR:\s*(https?:\/\/[^\s\]]+)\]/i) || obs.match(/(https?:\/\/(?:i\.)?ibb\.co\/[^\s]+)/i);
                    const qrUrl = qrMatch ? qrMatch[1] || qrMatch[0] : null;

                    return (
                      <div className="mt-3 p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <QrCode className="w-3.5 h-3.5 text-purple-700" /> Comprobante de Pago QR / Anticipo:
                          </span>
                          {!isReadOnly && (
                            <label className="text-[11px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer flex items-center gap-1">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingVoucher}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setUploadingVoucher(true);
                                  toast.loading("Subiendo comprobante a ImgBB...", { id: "rev-qr" });
                                  const res = await uploadToImgbb(file, `voucher_${order?.numero_requerimiento || Date.now()}`);
                                  setUploadingVoucher(false);
                                  if (res.success && res.url) {
                                    setObs((prev) => `${prev} [📸 COMPROBANTE QR: ${res.url}]`);
                                    toast.success("✅ Comprobante adjuntado con éxito", { id: "rev-qr" });
                                  } else {
                                    toast.error(res.error || "Error al subir comprobante", { id: "rev-qr" });
                                  }
                                }}
                              />
                              <UploadCloud className="w-3.5 h-3.5" />
                              {uploadingVoucher ? "Subiendo..." : "Adjuntar Comprobante"}
                            </label>
                          )}
                        </div>

                        {qrUrl ? (
                          <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-purple-200 shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <div className="relative w-10 h-10 rounded-md overflow-hidden border border-slate-200 shrink-0 bg-slate-50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qrUrl} alt="Comprobante QR" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-slate-800">Comprobante verificado en ImgBB</p>
                                <a
                                  href={qrUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-purple-700 font-semibold hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Ver imagen completa
                                </a>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 rounded-lg text-purple-800 border-purple-200 hover:bg-purple-50"
                              onClick={() => window.open(qrUrl, "_blank")}
                            >
                              Abrir
                            </Button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            No hay comprobante QR adjunto para esta orden.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* 📦 Archivo Digital 3D CAD/CAM (Telegram Cloud Drive) */}
                  {(() => {
                    const rawObs = obs || "";
                    const tgMatch = rawObs.match(/\[📦 TELEGRAM 3D:\s*file_id=([^|\s\]]+)(?:\s*\|\s*name=([^\]]+))?\]/i);
                    const linkMatch = rawObs.match(/\[🔗 ENLACE 3D:\s*(https?:\/\/[^\s\]]+)\]/i);
                    const nameMatch = rawObs.match(/\[📦 ESCANEO 3D CAD\/CAM:\s*([^(\]]+)/i);

                    const tgFileId = tgMatch ? tgMatch[1] : null;
                    const tgFileName = (tgMatch && tgMatch[2]) ? tgMatch[2].trim() : (nameMatch ? nameMatch[1].trim() : "escaneo_3d_clinico.stl");
                    const directUrl = linkMatch ? linkMatch[1] : null;

                    const downloadUrl = tgFileId
                      ? `/api/telegram/download?fileId=${encodeURIComponent(tgFileId)}&fileName=${encodeURIComponent(tgFileName)}`
                      : directUrl;

                    if (!downloadUrl && !tgMatch && !nameMatch) return null;

                    return (
                      <div className="mt-3 p-3 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Box className="w-3.5 h-3.5 text-purple-700" /> Escaneo 3D Digital (CAD/CAM):
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            Telegram Cloud Drive
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#3C1C6C] text-white flex items-center justify-center font-black text-xs shrink-0">
                              <FileCode className="w-4 h-4 text-purple-200" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {tgFileName}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Archivo clínico listo para diseño en Exocad / 3Shape
                              </p>
                            </div>
                          </div>

                          {downloadUrl && (
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={tgFileName}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" /> Descargar 3D
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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
