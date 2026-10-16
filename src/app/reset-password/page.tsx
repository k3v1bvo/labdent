"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Escuchar el cambio de estado de sesión para capturar el token de recuperación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          setSessionReady(true);
        }
      }
    );

    // Verificar si ya hay sesión activa proveniente del link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast.success("¡Contraseña actualizada con éxito!");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFCFE] via-[#F8F5FC] to-[#F1ECF8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-purple-100 p-8 shadow-2xl shadow-purple-950/5">
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">¡Contraseña Actualizada!</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Tu clave ha sido reestablecida correctamente. Redirigiendo al login...
            </p>
            <Link
              href="/login"
              className="w-full block py-3.5 bg-gradient-to-r from-[#3C1C6C] to-[#2E1553] text-white rounded-xl font-bold text-sm text-center shadow-lg shadow-purple-900/20 hover:opacity-95 transition-all"
            >
              Ir a Iniciar Sesión Ahora
            </Link>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-100/60 text-purple-900 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-[#2E1553]">Nueva Contraseña</h1>
              <p className="text-xs text-slate-500 mt-1">
                Ingresa y confirma tu nueva clave de acceso seguro.
              </p>
            </div>

            {!sessionReady && (
              <div className="bg-amber-50 rounded-2xl p-3 text-xs text-amber-800 mb-4 border border-amber-200/60 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Validando token de seguridad... Puedes escribir tu nueva contraseña mientras se verifica el enlace.
                </span>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700 transition-all text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
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
                    Actualizando contraseña...
                  </>
                ) : (
                  "Guardar Nueva Contraseña"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
