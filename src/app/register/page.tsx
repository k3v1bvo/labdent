"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Building2,
  Phone,
  Stethoscope,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [clinica, setClinica] = useState("");
  const [telefono, setTelefono] = useState("");
  const [especialidad, setEspecialidad] = useState("Rehabilitación Oral");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      nombre.trim().length >= 3 &&
      email.trim().length > 3 &&
      password.length >= 6 &&
      !loading &&
      !googleLoading
    );
  }, [nombre, email, password, loading, googleLoading]);

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(`Error con Google: ${error.message}`);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al registrarse con Google");
      setGoogleLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nombre: nombre.trim(),
            rol: "doctor",
            clinica: clinica.trim() || `Clínica Dr(a). ${nombre.trim()}`,
            telefono: telefono.trim() || null,
            especialidad: especialidad.trim(),
          },
        },
      });

      if (error) {
        toast.error(`Error en registro: ${error.message}`);
        setLoading(false);
        return;
      }

      // Si el usuario se creó exitosamente, asegurar que exista su perfil y registro en doctores
      if (data?.user) {
        // Intentar inserción o actualización de perfil
        await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            nombre: nombre.trim(),
            telefono: telefono.trim() || null,
            rol: "doctor",
          });

        // Registrar en doctores
        await supabase
          .from("doctores")
          .insert({
            profile_id: data.user.id,
            clinica: clinica.trim() || `Clínica Dr(a). ${nombre.trim()}`,
            especialidad: especialidad.trim(),
          });

        // 📧 Disparar correo propio de bienvenida con logo del laboratorio (segundo plano)
        fetch("/api/mailer/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: email.trim(),
            name: nombre.trim(),
            role: "doctor",
            clinic: clinica.trim() || `Clínica Dr(a). ${nombre.trim()}`,
          }),
        }).catch((err) =>
          console.warn("Aviso: No se pudo enviar correo de bienvenida", err)
        );
      }

      toast.success("✅ Cuenta de clínica registrada con éxito.");
      router.push("/login");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Ocurrió un error inesperado al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFCFE] via-[#F8F5FC] to-[#F1ECF8] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Panel lateral branding Guisela */}
        <div className="hidden lg:flex flex-col justify-between rounded-3xl border border-purple-900/40 bg-gradient-to-br from-[#3C1C6C] via-[#2E1553] to-[#1C0B33] p-10 shadow-2xl shadow-purple-950/20 min-h-[580px] text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-[#D0B9FF] mb-6">
              <ShieldCheck className="w-3.5 h-3.5 text-[#A57CFA]" /> Portal de Clínicas Odontológicas
            </div>

            <div className="relative h-18 w-52 mb-6">
              <Image
                src="/images/brand/guisela-logo-secondary-dark.png"
                alt="Guisela Laboratorio Dental"
                fill
                className="object-contain"
                priority
                unoptimized
              />
            </div>

            <h2 className="text-2xl font-bold tracking-tight mb-3 text-white">
              Únete a nuestra red de clínicas aliadas
            </h2>
            <p className="text-sm text-purple-200/80 leading-relaxed max-w-md">
              Envía tus órdenes digitales, adjunta archivos STL y sigue la fabricación de tus prótesis y coronas en tiempo real desde cualquier dispositivo.
            </p>

            <div className="mt-8 space-y-3 text-xs text-purple-200/90">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#A57CFA]" />
                <span>Recepción y validación de órdenes en menos de 2 horas.</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#A57CFA]" />
                <span>Trazabilidad paso a paso por escaneo, fresado y cerámica.</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#A57CFA]" />
                <span>Historial clínico de piezas, colores y remisiones.</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-purple-800/40 text-xs text-purple-300/70 flex justify-between items-center">
            <span>Guisela Laboratorio Dental © 2026</span>
            <Link href="/" className="hover:text-white transition-colors underline">
              Volver al inicio
            </Link>
          </div>
        </div>

        {/* Tarjeta de Registro */}
        <div className="w-full">
          <div className="lg:hidden mb-2 text-left">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3C1C6C] hover:text-[#A57CFA] p-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
            </Link>
          </div>

          <Card className="w-full rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100 bg-white dark:bg-gray-900 overflow-hidden">
            <CardHeader className="space-y-2 pt-6 sm:pt-8 pb-3 sm:pb-4 px-4 sm:px-8 text-center">
              <div className="relative h-14 sm:h-16 w-48 sm:w-52 mx-auto mb-2 lg:hidden">
                <Image
                  src="/images/brand/guisela-logo-primary.png"
                  alt="Guisela Laboratorio Dental"
                  fill
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-black text-[#3C1C6C] tracking-tight">
                Crear Cuenta de Clínica
              </CardTitle>
              <p className="text-xs sm:text-sm text-slate-500">
                Ingresa los datos del doctor u odontólogo para iniciar
              </p>
            </CardHeader>

          <CardContent className="px-6 sm:px-8 pb-8 pt-2">
            {/* Botón de Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={loading || googleLoading}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-sm hover:shadow hover:border-slate-300 disabled:opacity-50 mb-5"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#3C1C6C]" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Registrarse con Google</span>
            </button>

            <div className="relative mb-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative bg-white px-3 text-xs text-slate-400 font-medium">
                o registrar con formulario
              </span>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Nombre y Clínica */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Nombre del Doctor(a) *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="Ej: Dr. Roberto Gómez"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="pl-9 rounded-xl border-slate-200 focus:border-[#3C1C6C] focus:ring-[#3C1C6C] text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Clínica / Consultorio
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="Ej: Dental Premium Care"
                      value={clinica}
                      onChange={(e) => setClinica(e.target.value)}
                      className="pl-9 rounded-xl border-slate-200 focus:border-[#3C1C6C] focus:ring-[#3C1C6C] text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Teléfono y Especialidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Teléfono / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="tel"
                      placeholder="Ej: 71234567"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="pl-9 rounded-xl border-slate-200 focus:border-[#3C1C6C] focus:ring-[#3C1C6C] text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Especialidad
                  </label>
                  <div className="relative">
                    <Stethoscope className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={especialidad}
                      onChange={(e) => setEspecialidad(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#3C1C6C] text-slate-800"
                    >
                      <option value="Rehabilitación Oral">Rehabilitación Oral</option>
                      <option value="Prótesis Fija & Removible">Prótesis Fija & Removible</option>
                      <option value="Implantología">Implantología</option>
                      <option value="Ortodoncia">Ortodoncia</option>
                      <option value="Estética Dental">Estética Dental</option>
                      <option value="Odontología General">Odontología General</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    placeholder="doctor@clinica.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 rounded-xl border-slate-200 focus:border-[#3C1C6C] focus:ring-[#3C1C6C] text-sm"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Contraseña (mínimo 6 caracteres) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 rounded-xl border-slate-200 focus:border-[#3C1C6C] focus:ring-[#3C1C6C] text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={showPass ? "Ocultar" : "Mostrar"}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl py-2.5 font-medium shadow-md shadow-purple-900/20 transition-all hover:scale-[1.01]"
                disabled={!canSubmit}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando clínica...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Completar Registro <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">¿Ya tienes cuenta de doctor?</span>
                <Link href="/login" className="font-semibold text-[#3C1C6C] hover:text-[#52298F] hover:underline">
                  Iniciar sesión
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
}
