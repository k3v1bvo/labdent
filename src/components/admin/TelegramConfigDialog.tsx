"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  MessageSquare,
  Bot,
  Box,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TelegramConfigDialog({ open, onOpenChange }: Props) {
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (!open) return;

    async function checkStatus() {
      setLoadingStatus(true);
      try {
        const res = await fetch("/api/telegram/test");
        const data = await res.json();
        setIsConfigured(Boolean(data.configured));
      } catch (e) {
        console.warn("Error consultando estado Telegram:", e);
      } finally {
        setLoadingStatus(false);
      }
    }

    checkStatus();
  }, [open]);

  async function handleTestSend() {
    setTesting(true);
    toast.loading("Enviando mensaje de prueba a Telegram...", { id: "tg-test" });

    try {
      const res = await fetch("/api/telegram/test", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        toast.success("✅ ¡Mensaje de prueba recibido con éxito en Telegram!", { id: "tg-test" });
        setIsConfigured(true);
      } else {
        toast.error(
          data.message || data.error || "No se pudo conectar con Telegram",
          { id: "tg-test" }
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Fallo al conectar con Telegram", { id: "tg-test" });
    } finally {
      setTesting(false);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-[10px] font-black text-sky-800 dark:text-sky-300 uppercase tracking-wider mb-0.5">
                Servidor & Notificaciones
              </div>
              <DialogTitle className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                Bot de Telegram & Servidor 3D STL/OBJ
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Conecta el bot de Telegram para que cada nueva orden clínica y sus archivos de escaneo 3D (STL / OBJ) lleguen instantáneamente a tu canal o grupo de trabajo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
          {/* Tarjeta de estado actual */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              isConfigured
                ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                : "bg-amber-50 border-amber-200 text-amber-950"
            }`}
          >
            <div className="flex items-center gap-3">
              {isConfigured ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="font-bold text-xs sm:text-sm">
                  {isConfigured
                    ? "Bot de Telegram Activo y Vinculado"
                    : "Bot de Telegram Pendiente de Configurar"}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {isConfigured
                    ? "Las órdenes clínicas y escaneos STL/OBJ se están despachando automáticamente."
                    : "Requiere TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en variables de entorno."}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleTestSend}
              disabled={testing}
              className={`font-bold text-xs h-9 rounded-xl shrink-0 ${
                isConfigured
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1" />
              )}
              Probar Bot
            </Button>
          </div>

          {/* Guía paso a paso de configuración */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#3C1C6C] dark:text-purple-300">
              📋 Pasos para crear y activar tu Bot en 2 minutos:
            </h4>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  Crear el Bot con BotFather
                </p>
                <p className="text-slate-500 text-[11px]">
                  Abre Telegram y busca <code className="font-mono text-purple-700 font-bold">@BotFather</code>. Envía el comando <code className="font-mono text-purple-700 font-bold">/newbot</code>, asígnale un nombre (ej. <i>Guisela Dental Bot</i>) y un usuario terminado en <i>bot</i>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  Copiar el Token de Acceso
                </p>
                <p className="text-slate-500 text-[11px]">
                  BotFather te entregará un token HTTP API largo. Guárdalo como:
                </p>
                <div className="p-2 bg-slate-900 text-sky-300 font-mono text-[11px] rounded-lg flex items-center justify-between">
                  <span>TELEGRAM_BOT_TOKEN=123456789:ABCdef...</span>
                  <button
                    onClick={() => copyText("TELEGRAM_BOT_TOKEN=")}
                    className="text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  Obtener el Chat ID del Grupo o Canal
                </p>
                <p className="text-slate-500 text-[11px]">
                  Crea un grupo de Telegram para tu taller (o chat directo), añade a tu nuevo bot como administrador. Escribe un mensaje en el grupo y obtén el ID buscando <code className="font-mono text-purple-700 font-bold">@userinfobot</code> o <code className="font-mono text-purple-700 font-bold">@myidbot</code>:
                </p>
                <div className="p-2 bg-slate-900 text-sky-300 font-mono text-[11px] rounded-lg flex items-center justify-between">
                  <span>TELEGRAM_CHAT_ID=-100123456789</span>
                  <button
                    onClick={() => copyText("TELEGRAM_CHAT_ID=")}
                    className="text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-slate-200 text-xs h-9"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
