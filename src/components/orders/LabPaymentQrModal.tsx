"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  QrCode,
  Download,
  Copy,
  CheckCircle2,
  UploadCloud,
  Loader2,
  Building2,
  CreditCard,
  Edit3,
  ExternalLink,
} from "lucide-react";
import {
  getLabPaymentConfig,
  updateLabPaymentConfig,
  LabPaymentConfig,
} from "@/lib/qrPaymentService";
import { DualPrice } from "@/components/common/DualPrice";

interface LabPaymentQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  montoBs?: number;
  montoUsd?: number;
  isAdmin?: boolean;
}

export function LabPaymentQrModal({
  open,
  onOpenChange,
  montoBs = 0,
  montoUsd = 0,
  isAdmin = false,
}: LabPaymentQrModalProps) {
  const [config, setConfig] = useState<LabPaymentConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    banco_nombre: "",
    titular_cuenta: "",
    numero_cuenta: "",
  });

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  useEffect(() => {
    function onUpdated(e: any) {
      if (e.detail) setConfig(e.detail);
    }
    window.addEventListener("guisela_payment_qr_updated", onUpdated);
    return () => window.removeEventListener("guisela_payment_qr_updated", onUpdated);
  }, []);

  async function loadConfig() {
    const cfg = await getLabPaymentConfig();
    setConfig(cfg);
    setEditForm({
      banco_nombre: cfg.banco_nombre,
      titular_cuenta: cfg.titular_cuenta,
      numero_cuenta: cfg.numero_cuenta,
    });
  }

  // Descargar la imagen del QR
  async function handleDownloadQr() {
    if (!config?.qr_pago_url) return;

    try {
      const toastId = toast.loading("Descargando imagen del QR...");
      const response = await fetch(config.qr_pago_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_PAGO_GUISELA_DENTAL_LAB_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("✅ QR descargado correctamente", { id: toastId });
    } catch (err) {
      // Fallback si fetch directo da CORS
      window.open(config.qr_pago_url, "_blank");
      toast.success("Abriendo imagen en nueva pestaña para guardar");
    }
  }

  // Copiar datos bancarios
  function handleCopyData() {
    if (!config) return;
    const text = `Guisela Dental Lab\nBanco: ${config.banco_nombre}\nTitular: ${config.titular_cuenta}\nCuenta/Ref: ${config.numero_cuenta}`;
    navigator.clipboard.writeText(text);
    toast.success("📋 Datos de transferencia copiados");
  }

  // Subir nuevo QR (Admin)
  async function handleUploadNewQr(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Subiendo nuevo QR oficial...");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch("/api/upload-imgbb", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: base64,
              name: `qr_oficial_lab_${Date.now()}`,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Fallo al subir a ImgBB");
          }

          const newUrl = data.url;
          await updateLabPaymentConfig({ qr_pago_url: newUrl });
          setConfig((prev) => (prev ? { ...prev, qr_pago_url: newUrl } : null));
          toast.success("✅ QR oficial actualizado con éxito", { id: toastId });
        } catch (err: any) {
          toast.error(err.message || "Error al subir QR", { id: toastId });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      toast.error("Error al procesar archivo", { id: toastId });
    }
  }

  async function handleSaveBankDetails() {
    await updateLabPaymentConfig(editForm);
    setConfig((prev) => (prev ? { ...prev, ...editForm } : null));
    setIsEditing(false);
    toast.success("✅ Datos bancarios guardados");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-purple-100 shadow-2xl">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3C1C6C] to-purple-800 text-white flex items-center justify-center shadow-md">
            <QrCode className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
            Código QR Oficial de Cobro
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Escanea desde cualquier aplicación de banca móvil de Bolivia (Simple QR).
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Monto sugerido a pagar */}
          {montoBs > 0 && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50 via-purple-100/50 to-indigo-50 border border-purple-200/80 text-center">
              <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 block mb-0.5">
                Monto a Transferir / Pagar
              </span>
              <div className="flex items-center justify-center gap-2">
                <DualPrice amountBs={montoBs} size="lg" />
              </div>
            </div>
          )}

          {/* Tarjeta Visual del QR */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3 shadow-inner">
            <div className="relative p-3 bg-white rounded-2xl border-2 border-purple-200 shadow-md">
              {config?.qr_pago_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.qr_pago_url}
                  alt="QR Oficial de Pago"
                  className="w-56 h-56 object-contain rounded-xl select-none"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-xl">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
              )}
            </div>

            <div className="text-center space-y-0.5">
              <p className="text-xs font-black text-slate-800">
                {config?.titular_cuenta || "Guisela Dental Lab"}
              </p>
              <p className="text-[11px] font-semibold text-purple-800">
                {config?.banco_nombre || "Simple QR / Banco Unión / BCP"}
              </p>
              {config?.numero_cuenta && (
                <p className="text-[10px] text-slate-500 font-mono">
                  Cta: {config.numero_cuenta}
                </p>
              )}
            </div>
          </div>

          {/* Botones de Acción: Descargar QR y Copiar datos */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={handleDownloadQr}
              className="bg-[#3C1C6C] hover:bg-[#2e1553] text-white rounded-xl font-bold text-xs h-10 shadow-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Descargar QR
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyData}
              className="border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-xs h-10 flex items-center justify-center gap-1.5"
            >
              <Copy className="w-4 h-4" /> Copiar Datos
            </Button>
          </div>

          {/* Edición de Administrador */}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-100">
              {!isEditing ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-500">
                    Opciones de Administrador:
                  </span>
                  <div className="flex gap-2">
                    <label className="text-purple-700 hover:text-purple-900 font-bold cursor-pointer flex items-center gap-1 text-xs">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={handleUploadNewQr}
                      />
                      {uploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="w-3.5 h-3.5" />
                      )}
                      Subir nuevo QR
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 text-xs ml-2 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Editar datos
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-purple-50/70 border border-purple-200 rounded-2xl">
                  <p className="text-xs font-black text-purple-900">
                    Editar Datos Bancarios:
                  </p>
                  <Input
                    placeholder="Banco / Medio (ej: Simple QR / Banco Unión)"
                    value={editForm.banco_nombre}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, banco_nombre: e.target.value }))
                    }
                    className="h-8 text-xs bg-white"
                  />
                  <Input
                    placeholder="Titular de la cuenta"
                    value={editForm.titular_cuenta}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, titular_cuenta: e.target.value }))
                    }
                    className="h-8 text-xs bg-white"
                  />
                  <Input
                    placeholder="Número de cuenta o referencia"
                    value={editForm.numero_cuenta}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, numero_cuenta: e.target.value }))
                    }
                    className="h-8 text-xs bg-white"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                      className="h-7 text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveBankDetails}
                      className="h-7 text-xs bg-[#3C1C6C] text-white"
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-slate-500 font-bold text-xs"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
