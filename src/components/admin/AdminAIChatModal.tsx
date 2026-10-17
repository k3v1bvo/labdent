"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Copy,
  Settings,
  KeyRound,
  RotateCcw,
  Check,
  TrendingDown,
  AlertCircle,
  HelpCircle,
  X,
  MessageSquare,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
}

const QUICK_PROMPTS = [
  "📊 ¿Cuál es el balance de cobranza y deuda total hoy?",
  "👨‍⚕️ ¿Quiénes son los doctores que más dinero nos deben y sus teléfonos?",
  "⚙️ ¿Cuántos pedidos tenemos en producción y en qué estación?",
  "💬 Redáctame un mensaje formal de cobranza para WhatsApp",
  "📋 Hazme un resumen ejecutivo del estado del laboratorio para hoy",
];

export function AdminAIChatModal() {
  const [open, setOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [inputKey, setInputKey] = useState("");

  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "¡Hola! Soy **Guisela AI**, tu asistente ejecutivo inteligente conectado en tiempo real a la base de datos de tu laboratorio. Puedo darte balances financieros, reportes de doctores con deudas, estado de producción por estación y redactar comunicados oficiales. ¿En qué te puedo apoyar hoy?",
      time: "Ahora",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("guisela_gemini_api_key") || "";
      setGeminiApiKey(savedKey);
      setInputKey(savedKey);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, open]);

  function handleSaveApiKey() {
    const clean = inputKey.trim();
    setGeminiApiKey(clean);
    if (typeof window !== "undefined") {
      localStorage.setItem("guisela_gemini_api_key", clean);
    }
    setApiKeyModalOpen(false);
    toast.success("✅ Clave de Google Gemini guardada con éxito");
  }

  async function handleSendMessage(promptToSend?: string) {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          history: historyPayload,
          apiKey: geminiApiKey || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const errorMsg: Message = {
          id: `err_${Date.now()}`,
          role: "assistant",
          text: `⚠️ ${
            data.error ||
            "No se pudo conectar con Google Gemini. Por favor verifica tu clave API."
          }\n\nPuedes configurar tu Google Gemini API Key presionando el botón de **Configurar API Key** arriba a la derecha.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        text: data.text || "No obtuve respuesta.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("Error en chat:", err);
      toast.error(err?.message || "Error al enviar mensaje");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopiedId(null), 1800);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  return (
    <>
      {/* Botón flotante exclusivo del Administrador (Abajo a la derecha) */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#3C1C6C] via-[#5B239A] to-[#1C0B33] text-white font-bold text-xs shadow-xl shadow-purple-950/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all border border-purple-400/30"
          title="Abrir Asistente Ejecutivo IA con Google Gemini"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#3C1C6C]" />
          </div>
          <span className="hidden sm:inline font-extrabold tracking-wide">
            Asistente IA del Dueño
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-black text-amber-200">
            Gemini
          </span>
        </button>
      </div>

      {/* Modal Principal del Chatbot Ejecutivo */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl h-[88vh] max-h-[850px] p-0 rounded-3xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900 shadow-2xl flex flex-col overflow-hidden">
          {/* Header del Chat */}
          <div className="px-5 py-4 border-b border-purple-100 dark:border-purple-900/50 bg-gradient-to-r from-purple-50/80 via-white to-purple-50/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#3C1C6C] text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-[#190B2E] dark:text-white leading-tight">
                    Guisela AI · Asistente Ejecutivo
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-[#3C1C6C] border border-purple-200">
                    Solo Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Conectado en vivo a órdenes, estados de cuenta, cartera y taller
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setApiKeyModalOpen(true)}
                className="h-8 px-2.5 rounded-xl text-slate-600 hover:text-[#3C1C6C] hover:bg-purple-100/60 text-xs gap-1 font-semibold"
                title="Configurar Google Gemini API Key"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {geminiApiKey ? "API Key Activa" : "Configurar API Key"}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setMessages([
                    {
                      id: "welcome",
                      role: "assistant",
                      text: "Conversación reiniciada. ¿Qué consulta o reporte necesitas sobre el laboratorio?",
                      time: "Ahora",
                    },
                  ])
                }
                className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-slate-600"
                title="Reiniciar chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-[#3C1C6C] text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <Bot className="w-4 h-4 text-purple-200" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#3C1C6C] text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>

                  <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[10px] opacity-70">
                    <span>{m.time}</span>
                    {m.role === "assistant" && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.id, m.text)}
                        className="hover:opacity-100 flex items-center gap-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copiar respuesta
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {m.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-purple-200 text-[#3C1C6C] flex items-center justify-center shrink-0 mt-1 font-bold text-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-[#3C1C6C] text-white flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-purple-200" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-purple-200 rounded-2xl p-4 shadow-xs flex items-center gap-2.5 text-xs text-purple-800 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin text-[#3C1C6C]" />
                  Consultando base de datos y analizando con Gemini AI...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias Rápidas */}
          <div className="px-4 py-2 border-t border-purple-100 dark:border-purple-900/30 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Preguntas sugeridas:
            </span>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                disabled={loading}
                onClick={() => handleSendMessage(prompt)}
                className="text-[11px] px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-[#3C1C6C] dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium whitespace-nowrap shrink-0 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Formulario de Entrada */}
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <Input
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Pregúntale a Guisela AI (ej: ¿Cuáles son las mayores deudas pendientes hoy?)"
                className="h-11 rounded-2xl text-xs sm:text-sm border-purple-200 dark:border-purple-900 focus-visible:ring-[#3C1C6C] bg-slate-50/50"
              />
              <Button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputPrompt.trim() || loading}
                className="h-11 w-11 rounded-2xl bg-[#3C1C6C] hover:bg-[#2C1450] text-white shrink-0 shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Configurar Google Gemini API Key */}
      <Dialog open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Configurar Clave API de Google Gemini
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ingresa tu clave de Google AI Studio para activar el modelo Gemini 1.5/2.0 Flash. Si no tienes una, puedes generarla gratis en Google AI Studio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Google Gemini API Key:
              </label>
              <Input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="h-10 rounded-xl font-mono text-xs"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              💡 La clave se guardará de forma segura y solo se utilizará para tus consultas administrativas privadas.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setApiKeyModalOpen(false)}
              className="rounded-xl border-slate-200 text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveApiKey}
              className="rounded-xl bg-[#3C1C6C] hover:bg-[#2C1450] text-white font-bold text-xs h-9 px-4 shadow-sm"
            >
              Guardar Clave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
