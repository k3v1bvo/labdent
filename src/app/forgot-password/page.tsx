"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mailer/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo enviar el correo");
      }

      setSent(true);
      toast.success("Correo de recuperación enviado exitosamente");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Ocurrió un error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFCFE] via-[#F8F5FC] to-[#F1ECF8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-purple-100 p-8 shadow-2xl shadow-purple-950/5">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-purple-900/70 hover:text-purple-950 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Inicio de Sesión
        </Link>

        {sent ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">¡Revisa tu Correo!</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Hemos enviado las instrucciones para restablecer tu contraseña a:
              <br />
              <strong className="text-purple-900 font-bold">{email}</strong>
            </p>
            <div className="bg-purple-50/60 rounded-2xl p-4 text-xs text-purple-900/80 mb-6 border border-purple-100 flex items-start gap-2.5 text-left">
              <ShieldCheck className="w-4 h-4 text-purple-700 mt-0.5 shrink-0" />
              <span>
                El enlace es de un solo uso por seguridad. Si no lo ves en tu bandeja principal, revisa la carpeta de Spam.
              </span>
            </div>
            <Link
              href="/login"
              className="w-full block py-3.5 bg-gradient-to-r from-[#3C1C6C] to-[#2E1553] text-white rounded-xl font-bold text-sm text-center shadow-lg shadow-purple-900/20 hover:opacity-95 transition-all"
            >
              Regresar al Login
            </Link>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-100/60 text-purple-900 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-[#2E1553]">¿Olvidaste tu contraseña?</h1>
              <p className="text-xs text-slate-500 mt-1">
                Ingresa tu correo y te enviaremos un enlace seguro para crear una nueva clave.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@tuclinica.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700 transition-all text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#3C1C6C] to-[#2E1553] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 hover:opacity-95 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando enlace...
                  </>
                ) : (
                  "Enviar Enlace de Recuperación"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
