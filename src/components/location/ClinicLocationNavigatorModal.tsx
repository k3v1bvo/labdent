"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  ExternalLink,
  Navigation,
  Car,
  Copy,
  Share2,
  Check,
  Send,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface ClinicLocationNavigatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaNombre: string;
  direccion?: string;
  lat: number;
  lng: number;
}

export function ClinicLocationNavigatorModal({
  open,
  onOpenChange,
  clinicaNombre,
  direccion,
  lat,
  lng,
}: ClinicLocationNavigatorModalProps) {
  const [copied, setCopied] = useState(false);

  // Enlaces de navegación directa
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const yangoUrl = `https://yango.com/r/?lat=${lat}&lon=${lng}`;
  const indriveDeepLink = `indriver://route?lat=${lat}&lon=${lng}`;
  const universalGeoUrl = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(clinicaNombre)})`;

  const whatsappMessage = encodeURIComponent(
    `📍 *Ubicación del Consultorio / Clínica*\n*${clinicaNombre}*\n🏢 Dirección: ${direccion || "Ver mapa adjunto"}\n🗺️ Google Maps: https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`;

  function handleCopyCoords() {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopied(true);
    toast.success("📋 Coordenadas GPS copiadas al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyFullLink() {
    navigator.clipboard.writeText(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    toast.success("📋 Enlace de Google Maps copiado");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border border-purple-200 shadow-2xl bg-white text-left">
        {/* Cabecera */}
        <DialogHeader className="p-4 bg-gradient-to-r from-[#1B0B2E] via-[#3C1C6C] to-[#6329B7] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Navigation className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Ruta & Transporte a la Clínica
              </DialogTitle>
              <p className="text-xs text-purple-200">
                Selecciona tu aplicación favorita para abrir la ruta
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tarjeta de Destino */}
        <div className="p-4 bg-purple-50/60 border-b border-purple-100 space-y-1.5">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-[#3C1C6C] mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-black text-slate-900 leading-tight">
                {clinicaNombre || "Consultorio Dental"}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                {direccion || "Ubicación fijada con coordenadas GPS"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-mono text-purple-800 bg-purple-100/80 px-2.5 py-0.5 rounded-md border border-purple-200 font-semibold">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyCoords}
              className="h-7 text-[11px] font-bold text-[#3C1C6C] hover:bg-purple-100 gap-1 px-2 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copiado" : "Copiar GPS"}
            </Button>
          </div>
        </div>

        {/* Lista de Apps de Mapas y Transporte */}
        <div className="p-4 space-y-2.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            ¿Cómo deseas llegar o pedir móvil?
          </p>

          {/* 1. Selector Nativo Celular (Android / iOS) */}
          <a
            href={universalGeoUrl}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3C1C6C] text-white flex items-center justify-center font-bold shadow-xs">
                📱
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  Abrir con App del Teléfono
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-200 text-[#3C1C6C]">
                    Recomendado Celular
                  </span>
                </p>
                <p className="text-[11px] text-slate-600">
                  Pregunta si deseas abrir en Yango, InDrive, Maps o Waze
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-[#A57CFA] group-hover:translate-x-0.5 transition-transform" />
          </a>

          {/* 2. Google Maps Directo */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-purple-300 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                🗺️
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Google Maps</p>
                <p className="text-[11px] text-slate-500">Navegación paso a paso en tiempo real</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </a>

          {/* 3. Waze Directo */}
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-purple-300 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-lg border border-cyan-100">
                🚗
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Waze</p>
                <p className="text-[11px] text-slate-500">Ruta más rápida con alerta de tráfico</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
          </a>

          {/* 4. Yango / InDrive Rápido */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={yangoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-black">
                Y
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-rose-950">Yango</p>
                <p className="text-[10px] text-rose-700 truncate">Pedir viaje aquí</p>
              </div>
            </a>

            <a
              href={indriveDeepLink}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                iD
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-950">InDrive</p>
                <p className="text-[10px] text-emerald-700 truncate">Pedir móvil</p>
              </div>
            </a>
          </div>

          {/* 5. Compartir por WhatsApp con Repartidor / Chofer */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Enviar Ubicación por WhatsApp al Repartidor
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
