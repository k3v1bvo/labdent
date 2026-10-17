"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Banknote,
  QrCode,
  UploadCloud,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

export interface PaymentDetails {
  monto: number;
  moneda: "BOB" | "USD";
  metodoPago: "efectivo" | "qr_transferencia";
  comprobanteUrl?: string | null;
}

interface PaymentMethodSelectorProps {
  monto: number | string;
  totalOrderBs: number;
  moneda: "BOB" | "USD";
  metodoPago: "efectivo" | "qr_transferencia";
  comprobanteUrl?: string | null;
  onMontoChange: (val: string) => void;
  onMonedaChange: (moneda: "BOB" | "USD") => void;
  onMetodoPagoChange: (metodo: "efectivo" | "qr_transferencia") => void;
  onComprobanteUrlChange: (url: string | null) => void;
  readOnlyMonto?: boolean;
}

export function PaymentMethodSelector({
  monto,
  totalOrderBs,
  moneda,
  metodoPago,
  comprobanteUrl,
  onMontoChange,
  onMonedaChange,
  onMetodoPagoChange,
  onComprobanteUrlChange,
  readOnlyMonto = false,
}: PaymentMethodSelectorProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen (PNG, JPG, WEBP)");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Subiendo comprobante de pago...");

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
              name: `comprobante_pago_${Date.now()}`,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Fallo al subir a ImgBB");
          }

          onComprobanteUrlChange(data.url);
          toast.success("✅ Comprobante de pago QR subido con éxito", { id: toastId });
        } catch (err: any) {
          console.error("Error subiendo comprobante:", err);
          toast.error(err.message || "Error al subir comprobante", { id: toastId });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploading(false);
      toast.error("Error al procesar el archivo", { id: toastId });
    }
  }

  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-4">
      {/* Selector de Moneda y Monto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
            Monto a Cobrar / Anticipo:
          </label>
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={(e) => onMontoChange(e.target.value)}
              placeholder="0.00"
              disabled={readOnlyMonto}
              className="bg-white font-black text-sm pr-12 rounded-xl"
            />
            <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
              {moneda}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
            Moneda del Pago:
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200/80">
            <button
              type="button"
              onClick={() => onMonedaChange("BOB")}
              className={`py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                moneda === "BOB"
                  ? "bg-[#3C1C6C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🇧🇴 Bolivianos (Bs)
            </button>
            <button
              type="button"
              onClick={() => onMonedaChange("USD")}
              className={`py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                moneda === "USD"
                  ? "bg-[#3C1C6C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🇺🇸 Dólares ($)
            </button>
          </div>
        </div>
      </div>

      {/* Selector de Método de Pago: Efectivo vs QR */}
      <div className="space-y-2 pt-1 border-t border-purple-100">
        <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
          Modalidad de Pago:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Opción Efectivo */}
          <button
            type="button"
            onClick={() => {
              onMetodoPagoChange("efectivo");
            }}
            className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              metodoPago === "efectivo"
                ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                : "bg-white/80 border-slate-200 hover:border-slate-300 opacity-80"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                metodoPago === "efectivo"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Banknote className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-xs text-slate-800">Efectivo en Caja</p>
              <p className="text-[11px] text-slate-500 truncate">
                Recibido en mano / ventanilla
              </p>
            </div>
          </button>

          {/* Opción QR Transferencia */}
          <button
            type="button"
            onClick={() => onMetodoPagoChange("qr_transferencia")}
            className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              metodoPago === "qr_transferencia"
                ? "bg-white border-[#3C1C6C] ring-2 ring-purple-600/20 shadow-xs"
                : "bg-white/80 border-slate-200 hover:border-slate-300 opacity-80"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                metodoPago === "qr_transferencia"
                  ? "bg-[#3C1C6C] text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-xs text-slate-800">Pago QR / Transferencia</p>
              <p className="text-[11px] text-slate-500 truncate">
                Subir comprobante bancario
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Si es Efectivo: Mensaje de confirmación */}
      {metodoPago === "efectivo" && (
        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Pago en efectivo:</strong> Ingresa directamente al conteo de caja diaria. No requiere comprobante adjunto.
          </span>
        </div>
      )}

      {/* Si es QR: Zona de Carga de Comprobante (ImgBB) */}
      {metodoPago === "qr_transferencia" && (
        <div className="p-3.5 rounded-2xl bg-white border border-purple-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-purple-700" />
              Comprobante de Pago QR / Transferencia:
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              Alojado en ImgBB
            </span>
          </div>

          {!comprobanteUrl ? (
            <label className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/30 hover:bg-purple-50 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                  <span className="text-xs font-bold text-purple-700">
                    Subiendo comprobante bancario...
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-purple-600" />
                  <span className="text-xs font-bold text-slate-700">
                    Haga clic aquí para seleccionar la captura del QR
                  </span>
                  <span className="text-[11px] text-slate-400">
                    PNG, JPG, JPEG o captura de pantalla bancaria
                  </span>
                </>
              )}
            </label>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/70 border border-purple-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-purple-200 bg-white shrink-0">
                  <img
                    src={comprobanteUrl}
                    alt="Comprobante"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Comprobante guardado
                  </p>
                  <a
                    href={comprobanteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-purple-700 hover:underline flex items-center gap-0.5 truncate"
                  >
                    Ver imagen original <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onComprobanteUrlChange(null)}
                className="text-rose-600 hover:bg-rose-50 h-8 px-2 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Quitar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
